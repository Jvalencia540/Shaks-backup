import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Ingresar — Shaks" },
      { name: "description", content: "Ingreso del personal y del administrador de Shaks." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const err = await signIn(email.trim(), password);
    setSubmitting(false);
    // Si el ingreso funciona, el guard del layout raíz redirige según el rol.
    if (err) setError(err);
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border-4 border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-3xl text-primary-foreground">🍔</span>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-primary">SHAKS</h1>
          <p className="mt-1 text-lg text-muted-foreground">Ingrese con su cuenta de personal o de administrador.</p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-lg font-bold">Correo</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-xl border-2 border-input bg-background px-4 text-lg outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-lg font-bold">Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-14 rounded-xl border-2 border-input bg-background px-4 text-lg outline-none focus:border-primary"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-destructive px-4 py-3 text-base font-bold text-destructive-foreground">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 min-h-16 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-lg transition-transform enabled:active:scale-95 disabled:opacity-50"
          >
            {submitting ? "Ingresando…" : "INGRESAR"}
          </button>
        </form>
      </div>
    </main>
  );
}
