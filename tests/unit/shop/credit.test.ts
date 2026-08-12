import { describe, it, expect, beforeEach } from "vitest";
import {
  getMyWallet,
  getCheckoutPaymentContext,
  adminActivateWallet,
  adminUpdateCodLimits
} from "@/lib/credit.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const WALLET_ID = "44444444-4444-4444-4444-444455555555";

beforeEach(() => {
  setTestContext({ userId: USER_ID, isAdmin: false });
});

describe("getMyWallet", () => {
  it("returns wallet if exists", async () => {
    const sup = getSupabase();
    sup.setResponse("select:credit_wallets", { data: { id: WALLET_ID, credit_limit: 5000, available_balance: 5000 } });
    const res: any = await invoke(getMyWallet, { data: {} });
    expect(res.id).toBe(WALLET_ID);
    expect(res.credit_limit).toBe(5000);
  });

  it("returns null if no wallet", async () => {
    const sup = getSupabase();
    sup.setResponse("select:credit_wallets", { data: null });
    const res: any = await invoke(getMyWallet, { data: {} });
    expect(res).toBeNull();
  });
});

describe("getCheckoutPaymentContext", () => {
  it("returns wallet, tier, and COD limits", async () => {
    const sup = getSupabase();
    sup.setResponse("select:credit_wallets", { data: { id: WALLET_ID, available_balance: 100 } });
    sup.setResponse("select:profiles", { data: { customer_type: "GAR" } });
    sup.setResponse("select:payment_settings", { 
      data: { setting_value: { GAR: { enabled: true, max_amount: 5000 } } } 
    });

    const res: any = await invoke(getCheckoutPaymentContext, { data: {} });
    expect(res.wallet.id).toBe(WALLET_ID);
    expect(res.customer_type).toBe("GAR");
    expect(res.cod_limits.GAR.enabled).toBe(true);
  });
});

describe("adminActivateWallet", () => {
  it("rejects non-admin", async () => {
    const sup = getSupabase();
    // Simulate has_role failure
    sup.setResponse("select:user_roles", { data: null });
    sup.setResponse("rpc:has_role", { data: false });
    
    await expect(
      invoke(adminActivateWallet, { data: { userId: USER_ID, credit_limit: 1000 } })
    ).rejects.toThrow(/Forbidden/);
  });

  it("activates wallet for user", async () => {
    const sup = getSupabase();
    setTestContext({ userId: "admin-1", isAdmin: true });
    sup.setResponse("rpc:has_role", { data: true });
    sup.setResponse("select:user_roles", { data: { role: "admin" } });
    sup.setResponse("select:credit_wallets", { data: null }); // No existing wallet
    sup.setResponse("insert:credit_wallets", { data: { id: WALLET_ID, credit_limit: 1000 } });
    sup.setResponse("insert:credit_transactions", { data: { id: "tx1" } });

    const res: any = await invoke(adminActivateWallet, { data: { userId: USER_ID, credit_limit: 1000 } });
    expect(res.id).toBe(WALLET_ID);
    
    const insertCalls = sup.calls.filter(c => c.table === "credit_wallets" && c.op === "insert");
    expect(insertCalls.length).toBeGreaterThan(0);
  });

  it("throws if wallet already exists", async () => {
    const sup = getSupabase();
    setTestContext({ userId: "admin-1", isAdmin: true });
    sup.setResponse("rpc:has_role", { data: true });
    sup.setResponse("select:user_roles", { data: { role: "admin" } });
    sup.setResponse("select:credit_wallets", { data: { id: WALLET_ID } });
    
    await expect(
      invoke(adminActivateWallet, { data: { userId: USER_ID, credit_limit: 1000 } })
    ).rejects.toThrow(/Wallet already exists/);
  });
});

describe("adminUpdateCodLimits", () => {
  it("updates COD limits successfully", async () => {
    const sup = getSupabase();
    setTestContext({ userId: "admin-1", isAdmin: true });
    sup.setResponse("rpc:has_role", { data: true });
    sup.setResponse("select:user_roles", { data: { role: "admin" } });
    
    // findOrCreate mock
    sup.setResponse("select:payment_settings", { data: null });
    sup.setResponse("insert:payment_settings", { data: { setting_key: "cod_limits" } });
    sup.setResponse("insert:audit_logs", { data: { id: "audit1" } });

    const res: any = await invoke(adminUpdateCodLimits, { 
      data: {
        IND: { enabled: true, max_amount: 1000 },
        GAR: { enabled: true, max_amount: 5000 },
        EXP: { enabled: false, max_amount: 0 }
      }
    });
    
    expect(res.ok).toBe(true);
  });
});
