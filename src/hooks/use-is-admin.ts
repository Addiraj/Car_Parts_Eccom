import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";
import { useAuth } from "@/hooks/use-auth";

export function useIsAdmin() {
  const { user } = useAuth();
  const checkAdmin = useServerFn(checkIsAdmin);
  const { data } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: () => checkAdmin(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  return !!data?.isAdmin;
}
