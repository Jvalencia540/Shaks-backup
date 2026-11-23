import { useEffect, useState } from "react";

// Modo claro / oscuro. La preferencia se guarda en cada equipo (la tablet de
// cocina puede quedar en oscuro sin afectar a la caja). Sin preferencia
// guardada, se usa la del sistema operativo.
const KEY = "shaks-tema";
export type Tema = "claro" | "oscuro";

// Se ejecuta en <head> antes de pintar la página, para que no parpadee en claro.
export const TEMA_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t?t==="oscuro":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark");}catch(e){}})();`;

function temaActual(): Tema {
  if (typeof document === "undefined") return "claro";
  return document.documentElement.classList.contains("dark") ? "oscuro" : "claro";
}

export function useTema() {
  const [tema, setTema] = useState<Tema>("claro");

  // En el servidor no se conoce el tema; se lee al montar en el navegador.
  useEffect(() => setTema(temaActual()), []);

  const cambiar = (nuevo: Tema) => {
    document.documentElement.classList.toggle("dark", nuevo === "oscuro");
    try {
      localStorage.setItem(KEY, nuevo);
    } catch {
      // Sin almacenamiento (modo privado): el tema dura hasta recargar.
    }
    setTema(nuevo);
  };

  return { tema, alternar: () => cambiar(tema === "oscuro" ? "claro" : "oscuro") };
}

export function BotonTema({ className = "" }: { className?: string }) {
  const { tema, alternar } = useTema();
  const oscuro = tema === "oscuro";
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={oscuro ? "Modo claro" : "Modo oscuro"}
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-border bg-card text-xl transition-colors hover:bg-secondary ${className}`}
    >
      {oscuro ? "☀️" : "🌙"}
    </button>
  );
}
