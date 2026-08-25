import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { models } from "./db/index.server";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_dev_only_change_in_prod";

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().min(1), password: z.string().min(1) }))
  .handler(async ({ data: { email, password } }) => {
    const user = await models.users.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      throw new Error("Invalid credentials");
    }

    let isValid = false;
    const isBcrypt = user.password_hash.startsWith("$2a$") || user.password_hash.startsWith("$2b$") || user.password_hash.startsWith("$2y$");

    if (isBcrypt) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Plain text password comparison fallback
      isValid = (password === user.password_hash);
      if (isValid) {
        // Upgrade user's password_hash to bcrypt hash for security
        const newHash = await bcrypt.hash(password, 10);
        await user.update({ password_hash: newHash } as any);
      }
    }

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { token, user: { id: user.id, email: user.email } };
  });

export const register = createServerFn({ method: "POST" })
  .validator(z.object({ 
    email: z.string().email(), 
    password: z.string().min(6),
    full_name: z.string().min(1).optional(),
    phone: z.string().optional()
  }))
  .handler(async ({ data: { email, password, full_name, phone } }) => {
    const existing = await models.users.findOne({ where: { email } });
    if (existing) {
      throw new Error("User already exists with this email");
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await models.users.create({
      email,
      password_hash,
      raw_user_meta_data: { full_name, phone }
    });

    // Create the profile since Supabase trigger won't do it anymore
    await models.profiles.create({
      id: user.id,
      email: user.email,
      full_name,
      phone
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return { token, user: { id: user.id, email: user.email } };
  });

export const getSession = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data: { token } }) => {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { sub: string, email: string };
      const profile = await models.profiles.findByPk(decoded.sub);
      let profileData = null;
      if (profile) {
        profileData = {
          id: profile.id,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          phone: profile.phone,
          customer_type: profile.customer_type,
          admin_notes: profile.admin_notes,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };
      }
      return { user: { id: decoded.sub, email: decoded.email }, profile: profileData };
    } catch (err) {
      return { user: null, profile: null };
    }
  });
