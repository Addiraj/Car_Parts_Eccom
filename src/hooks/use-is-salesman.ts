import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoleInfo } from "@/lib/admin.salesmen.functions";
import { useAuth } from "@/hooks/use-auth";

export function useIsSalesman() {
  const { user } = useAuth();
  const fn = useServerFn(getMyRoleInfo);
  const { data } = useQuery({
    queryKey: ["my-role-info", user?.id],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
  return !!data?.isSalesman;
}
