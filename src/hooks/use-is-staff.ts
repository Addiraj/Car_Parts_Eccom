import { useIsAdmin } from "@/hooks/use-is-admin";
import { useIsSalesman } from "@/hooks/use-is-salesman";

export function useIsStaff() {
  const isAdmin = useIsAdmin();
  const isSalesman = useIsSalesman();
  return isAdmin || isSalesman;
}
