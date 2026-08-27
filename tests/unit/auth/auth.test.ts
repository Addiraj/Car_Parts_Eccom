import { describe, it, expect, beforeEach, vi } from "vitest";
import { login, register, getSession } from "@/lib/auth.functions";
import { getSupabase, getDB } from "../../setup";
import { setTestContext } from "../../helpers/serverfn-mock";
import { invoke } from "../../helpers/invoke";
import jwt from "jsonwebtoken";

const USER_ID = "33333333-3333-3333-3333-333355555555";
const jwtSigningKey = process.env.JWT_SECRET!;

beforeEach(() => {
  setTestContext({ userId: "anon", isAdmin: false });
});

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Minimal Sequelize row for the `otps` table including `.increment()` */
function makeOtpRow(overrides: Record<string, any> = {}) {
  const row: any = {
    email: "test@example.com",
    otp_code: "654321",
    expires_at: new Date(Date.now() + 5 * 60 * 1000),
    attempts: 0,
    increment: async () => { row.attempts += 1; },
    destroy: async () => true,
    get: (_opts?: any) => row,
    update: async (u: any) => Object.assign(row, u),
    ...overrides,
  };
  return row;
}

/** Minimal Sequelize row for the `users` table */
function makeUserRow(overrides: Record<string, any> = {}) {
  const row: any = {
    id: USER_ID,
    email: "test@example.com",
    password_hash: "",
    last_active_at: new Date(),
    destroy: async () => true,
    get: (_opts?: any) => row,
    update: async (u: any) => Object.assign(row, u),
    ...overrides,
  };
  return row;
}

// ─── login tests ───────────────────────────────────────────────────────────

describe("login", () => {
  it("rejects when OTP is not provided for regular email", async () => {
    await expect(
      invoke(login, { data: { email: "test@example.com" } })
    ).rejects.toThrow(/OTP is required/);
  });

  it("rejects admin login without CAPTCHA token", async () => {
    await expect(
      invoke(login, { data: { email: "admin", password: "admin@123" } })
    ).rejects.toThrow(/CAPTCHA is required/);
  });

  it("rejects when OTP record does not exist", async () => {
    const db = getDB();
    // Return null from findByPk:otps so auth.functions sees "no OTP record"
    db.setResponse("findByPk:otps", null);

    await expect(
      invoke(login, { data: { email: "test@example.com", otp: "000000" } })
    ).rejects.toThrow(/No OTP requested or expired/);
  });

  it("rejects when OTP is expired", async () => {
    const db = getDB();
    const expiredRow = makeOtpRow({ expires_at: new Date(Date.now() - 1000) }); // past
    db.setResponse("findByPk:otps", expiredRow);

    await expect(
      invoke(login, { data: { email: "test@example.com", otp: "654321" } })
    ).rejects.toThrow(/OTP has expired/);
  });

  it("rejects when OTP code is wrong", async () => {
    const db = getDB();
    const otpRow = makeOtpRow({ otp_code: "999999" });
    db.setResponse("findByPk:otps", otpRow);

    await expect(
      invoke(login, { data: { email: "test@example.com", otp: "000000" } })
    ).rejects.toThrow(/Invalid OTP/);

    expect(otpRow.attempts).toBe(1); // increment was called
  });

  it("rejects when user account not found after OTP verification", async () => {
    const db = getDB();
    const otpRow = makeOtpRow({ otp_code: "654321" });
    db.setResponse("findByPk:otps", otpRow);
    db.setResponse("findOne:users", null);

    await expect(
      invoke(login, { data: { email: "test@example.com", otp: "654321" } })
    ).rejects.toThrow(/Account not found/);
  });

  it("returns token and user for valid OTP", async () => {
    const db = getDB();
    const otpRow = makeOtpRow({ otp_code: "654321" });
    const userRow = makeUserRow();
    db.setResponse("findByPk:otps", otpRow);
    db.setResponse("findOne:users", userRow);
    db.setResponse("findOne:salesmen", null); // no salesman → customer

    const res: any = await invoke(login, {
      data: { email: "test@example.com", otp: "654321" },
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe("test@example.com");
    expect(res.user.role).toBe("customer");
  });
});

// ─── register tests ────────────────────────────────────────────────────────

describe("register", () => {
  it("rejects when OTP field is missing (Zod validation)", async () => {
    await expect(
      invoke(register, {
        data: {
          email: "new@example.com",
          // otp intentionally omitted
          full_name: "New User",
          phone: "0501234567",
        } as any,
      })
    ).rejects.toThrow();
  });

  it("rejects if user already exists", async () => {
    const db = getDB();
    const existingUser = makeUserRow({ email: "existing@example.com" });
    db.setResponse("findOne:users", existingUser);

    await expect(
      invoke(register, {
        data: {
          email: "existing@example.com",
          otp: "111111",
          full_name: "Existing",
          phone: "0501234567",
        },
      })
    ).rejects.toThrow(/User already exists/);
  });

  it("rejects if OTP record does not exist", async () => {
    const db = getDB();
    db.setResponse("findOne:users", null);
    db.setResponse("findByPk:otps", null);

    await expect(
      invoke(register, {
        data: {
          email: "new@example.com",
          otp: "111111",
          full_name: "New User",
          phone: "0501234567",
        },
      })
    ).rejects.toThrow(/No OTP requested/);
  });

  it("registers a new user and returns a token", async () => {
    const db = getDB();
    const otpRow = makeOtpRow({ email: "brand-new@example.com", otp_code: "777777" });
    const newUser = makeUserRow({ id: "new-user-uuid", email: "brand-new@example.com" });

    db.setResponse("findOne:users", null);       // no existing user
    db.setResponse("findByPk:otps", otpRow);     // OTP found
    db.setResponse("create:users", newUser);      // newly created user
    db.setResponse("create:profiles", {});        // profile creation
    db.setResponse("findOne:salesmen", null);     // not a salesman → customer

    const res: any = await invoke(register, {
      data: {
        email: "brand-new@example.com",
        otp: "777777",
        full_name: "Brand New",
        phone: "0501234567",
      },
    });

    expect(res.token).toBeDefined();
    expect(res.user.email).toBe("brand-new@example.com");
  });
});

// ─── getSession tests ──────────────────────────────────────────────────────

describe("getSession", () => {
  it("returns user and profile for valid token", async () => {
    const sup = getSupabase();
    const token = jwt.sign({ sub: USER_ID, email: "test@example.com" }, jwtSigningKey);
    sup.setResponse("select:profiles", { data: { id: USER_ID, full_name: "Test User" } });

    const res: any = await invoke(getSession, { data: { token } });
    expect(res).toHaveProperty("user");
    expect(res).toHaveProperty("profile");
  });

  it("returns nulls for invalid token", async () => {
    const res: any = await invoke(getSession, {
      data: { token: "invalid.token.string" },
    });
    expect(res.user).toBeNull();
    expect(res.profile).toBeNull();
  });
});
