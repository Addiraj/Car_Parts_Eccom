import { createFileRoute, redirect, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Check if JWT token exists in localStorage (client-side only)
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("jwt_token");
      if (!token) throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
    return {};
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth/login", search: { redirect: pathname }, replace: true });
    }
  }, [loading, user, navigate, pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return <Outlet />;
}

