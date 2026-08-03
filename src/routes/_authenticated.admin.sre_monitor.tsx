import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/sre_monitor")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/sre-monitor" });
  },
});
