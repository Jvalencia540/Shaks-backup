import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Rol = "admin" | "personal";

// Qué roles pueden entrar a cada pantalla. Las rutas que no estén aquí
// (por ejemplo /login) son públicas.
export const ROUTE_ROLES: Record<string, Rol[]> = {
  "/": ["admin", "personal"],
  "/cocina": ["admin", "personal"],
  "/metricas": ["admin"],
};

export function canAccess(path: string, rol: Rol | null): boolean {
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true;
  return rol !== null && allowed.includes(rol);
}

interface AuthState {
  session: Session | null;
  rol: Rol | null;
  nombre: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchPerfil(userId: string): Promise<{ rol: Rol | null; nombre: string | null }> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("rol, nombre")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return { rol: null, nombre: null };
  const rol = data.rol === "admin" || data.rol === "personal" ? data.rol : null;
  return { rol, nombre: data.nombre ?? null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [rol, setRol] = useState<Rol | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const apply = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (next) {
        const perfil = await fetchPerfil(next.user.id);
        if (!active) return;
        setRol(perfil.rol);
        setNombre(perfil.nombre ?? next.user.email ?? null);
      } else {
        setRol(null);
        setNombre(null);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      // Supabase recomienda no esperar otras llamadas dentro de este callback.
      setTimeout(() => apply(next), 0);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return "Correo o contraseña incorrectos.";
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return "Este correo todavía no está confirmado.";
    }
    return "No se pudo iniciar sesión. Intente de nuevo.";
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, rol, nombre, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
