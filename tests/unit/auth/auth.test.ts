import { describe, it, expect, beforeEach, vi } from "vitest";
import { login, register, getSession } from "@/lib/auth.functions";
import { getSupabase } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only_change_in_prod";

beforeEach(() => {
  setTestContext({ userId: "anon", isAdmin: false });
});

describe("login", () => {
  it("rejects invalid email", async () => {
    const sup = getSupabase();
    sup.setResponse("select:users", { data: null });
    await expect(
      invoke(login, { data: { email: "wrong@example.com", password: "password" } })
    ).rejects.toThrow(/Invalid credentials/);
  });

  it("rejects invalid password", async () => {
    const sup = getSupabase();
    const hash = await bcrypt.hash("correct-password", 1);
    sup.setResponse("select:users", { data: { id: USER_ID, email: "test@example.com", password_hash: hash } });
    
    await expect(
      invoke(login, { data: { email: "test@example.com", password: "wrong-password" } })
    ).rejects.toThrow(/Invalid credentials/);
  });

  it("returns token for valid credentials", async () => {
    const sup = getSupabase();
    const hash = await bcrypt.hash("correct-password", 1);
    sup.setResponse("select:users", { data: { id: USER_ID, email: "test@example.com", password_hash: hash } });
    
    const res: any = await invoke(login, { data: { email: "test@example.com", password: "correct-password" } });
    expect(res.token).toBeDefined();
    expect(res.user.id).toBe(USER_ID);
    expect(res.user.email).toBe("test@example.com");
  });
});

describe("register", () => {
  it("rejects if user already exists", async () => {
    const sup = getSupabase();
    sup.setResponse("select:users", { data: { id: USER_ID } });
    
    await expect(
      invoke(register, { data: { email: "existing@example.com", password: "password123" } })
    ).rejects.toThrow(/User already exists/);
  });

  it("registers new user and returns token", async () => {
    const sup = getSupabase();
    sup.setResponse("select:users", { data: null }); // no existing user
    sup.setResponse("insert:users", { data: { id: "new-user-id" } });
    sup.setResponse("insert:profiles", { data: { id: "new-user-id" } });

    const res: any = await invoke(register, { 
      data: { email: "new@example.com", password: "password123", full_name: "New User" } 
    });
    
    expect(res.token).toBeDefined();
    // In our mock, insert returns the provided data or default. Let's just check token
    // The user id will be what the mock returns (11111111-1111-1111-1111-111155555555 by default)
    expect(res.user.email).toBe("new@example.com");
  });
});

describe("getSession", () => {
  it("returns user and profile for valid token", async () => {
    const sup = getSupabase();
    const token = jwt.sign({ sub: USER_ID, email: "test@example.com" }, JWT_SECRET);
    sup.setResponse("select:profiles", { data: { id: USER_ID, full_name: "Test User" } });
    
    const res: any = await invoke(getSession, { data: { token } });
    expect(res.user.id).toBe(USER_ID);
    expect(res.profile.full_name).toBe("Test User");
  });

  it("returns nulls for invalid token", async () => {
    const res: any = await invoke(getSession, { data: { token: "invalid.token.string" } });
    expect(res.user).toBeNull();
    expect(res.profile).toBeNull();
  });
});
