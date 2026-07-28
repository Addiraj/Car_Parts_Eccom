import { supabase } from "@/integrations/supabase/client";

export async function checkProfileComplete(userId: string): Promise<boolean> {
  if (!userId) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, customer_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;

  const fullName = (data?.full_name ?? "").toString().trim();
  const customerType = (data?.customer_type ?? "").toString().trim();

  return Boolean(fullName && customerType);
}
