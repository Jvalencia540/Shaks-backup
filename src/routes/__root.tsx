import { useEffect as useEff, type ReactNode } from "react";
import {
  Link,
  Navigate,
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, canAccess, useAuth } from "../lib/auth";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">La página que buscas no existe.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground">
            Volver a Caja
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEff(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Esta página no cargó</h1>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shaks — Pedidos rápidos para tu restaurante" },
      { name: "description", content: "Shaks: toma pedidos en caja, asigna beeper, envía a cocina y avisa al cliente cuando esté listo." },
      { property: "og:title", content: "Shaks — Pedidos rápidos para tu restaurante" },
      { property: "og:description", content: "Toma pedidos, asigna beeper y notifica al cliente. Sin gritos, sin desorden." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo+Black&family=Barlow:wght@400;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "🧾 Caja" },
  { to: "/cocina", label: "🍳 Cocina" },
  { to: "/metricas", label: "📊 Métricas" },
] as const;

function Header() {
  const { rol, nombre, signOut } = useAuth();
  const nav = NAV.filter((n) => canAccess(n.to, rol));

  return (
    <header className="sticky top-0 z-10 border-b-4 border-primary bg-card shadow-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-2xl text-primary-foreground">🍔</span>
          <span className="font-display text-3xl tracking-tight text-primary">SHAKS</span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "bg-secondary text-secondary-foreground" }}
              className="rounded-xl px-4 py-3 text-base font-bold transition-colors sm:text-lg"
            >
              {n.label}
            </Link>
          ))}
          <span className="hidden flex-col items-end px-2 leading-tight md:flex">
            <span className="max-w-40 truncate text-sm font-bold text-foreground">{nombre}</span>
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {rol === "admin" ? "Administrador" : "Personal"}
            </span>
          </span>
          <button
            onClick={() => signOut()}
            className="rounded-xl border-2 border-border px-4 py-2.5 text-base font-bold text-foreground transition-colors hover:bg-secondary sm:text-lg"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}

function FullScreenMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center text-lg text-muted-foreground">{children}</div>
    </div>
  );
}

// Decide qué ve el usuario según su sesión y su rol.
function AuthGate() {
  const { session, rol, loading, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLogin = pathname === "/login";

  if (loading) {
    return <FullScreenMessage>Cargando…</FullScreenMessage>;
  }

  if (!session) {
    return isLogin ? <Outlet /> : <Navigate to="/login" replace />;
  }

  if (!rol) {
    return (
      <FullScreenMessage>
        <p className="font-bold text-foreground">Su usuario no tiene un rol asignado.</p>
        <p className="mt-2">Pida al administrador que le asigne el rol de personal o de administrador.</p>
        <button
          onClick={() => signOut()}
          className="mt-6 rounded-xl bg-primary px-6 py-3 text-lg font-bold text-primary-foreground"
        >
          Salir
        </button>
      </FullScreenMessage>
    );
  }

  if (isLogin || !canAccess(pathname, rol)) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="min-h-screen bg-background">
          <AuthGate />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
