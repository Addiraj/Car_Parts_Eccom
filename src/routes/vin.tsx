import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/vin")({
  component: () => <Outlet />,
});
