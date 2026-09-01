import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { models } from "./db/index.server";
import { verifyTurnstileToken } from "./security.functions";

const getJwtSecret = () => process.env.JWT_SECRET || (() => { throw new Error("JWT_SECRET env var is not set"); })();

const getMailer = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendOtp = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), turnstileToken: z.string().min(1, "CAPTCHA is required") }))
  .handler(async ({ data: { email, turnstileToken } }) => {
    const isValid = await verifyTurnstileToken(turnstileToken);
    if (!isValid) throw new Error("Invalid or expired CAPTCHA");

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    await models.otps.upsert({
      email,
      otp_code: otp,
      expires_at: expiresAt,
      attempts: 0
    });

    if (process.env.SMTP_USER) {
      const mailer = getMailer();
      await mailer.sendMail({
        from: `"Carparts Dubai" <noreply@koncptai.tech>`,
        to: email,
        subject: "Your OTP for Carparts Dubai",
        text: `Your OTP is: ${otp}. It will expire in 10 minutes.`,
        html: `
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
  <h2 style="color: #000; margin-top: 0;">Welcome to Carparts Dubai</h2>
  <p style="font-size: 16px; line-height: 1.5;">Your trusted source for OEM and genuine aftermarket spare car parts across the UAE.</p>
  <p style="font-size: 16px; line-height: 1.5;">Here is your one-time password (OTP) to securely sign in to your account:</p>
  <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; padding: 24px; background-color: #f4f4f4; text-align: center; border-radius: 6px; margin: 32px 0;">
    ${otp}
  </div>
  <p style="font-size: 14px; color: #666; margin-bottom: 0;">This code is valid for the next 10 minutes. Please do not share this code with anyone. If you did not request this, please ignore this email.</p>
</div>
        `,
      });
    } else {
      console.log(`[OTP GENERATED] for ${email}: ${otp}`);
    }

    return { success: true };
  });

export const login = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().min(1), password: z.string().optional(), otp: z.string().optional(), turnstileToken: z.string().optional() }))
  .handler(async ({ data: { email, password, otp, turnstileToken } }) => {
    let user;

    if (email === "admin" || email === "superadmin") {
      if (!turnstileToken) throw new Error("CAPTCHA is required");
      const isValid = await verifyTurnstileToken(turnstileToken);
      if (!isValid) throw new Error("Invalid or expired CAPTCHA");

      if (password !== `${email}@123`) {
        throw new Error("Invalid admin credentials");
      }
      user = await models.users.findOne({ where: { email } });
      if (!user) {
        user = await models.users.create({ email, password_hash: "", last_active_at: new Date() });
      }
    } else {
      if (!otp) throw new Error("OTP is required");
      
      const otpRecord = await models.otps.findByPk(email);
      if (!otpRecord) throw new Error("No OTP requested or expired");
      if (new Date() > new Date(otpRecord.expires_at)) throw new Error("OTP has expired");
      if (otpRecord.attempts >= 5) throw new Error("Too many invalid attempts");
      if (otpRecord.otp_code !== otp) {
        await otpRecord.increment('attempts');
        throw new Error("Invalid OTP");
      }
      
      await otpRecord.destroy();
      
      user = await models.users.findOne({ where: { email } });
      if (!user) {
        throw new Error("Account not found. Please create an account first.");
      }
    }

    await user.update({ last_active_at: new Date() });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    const salesman = await models.salesmen.findOne({ where: { email: user.email } });
    const role = email === "admin" || email === "superadmin" ? "admin" : salesman ? "salesman" : "customer";

    return { token, user: { id: user.id, email: user.email, role } };
  });

export const register = createServerFn({ method: "POST" })
  .validator(z.object({ 
    email: z.string().email(), 
    otp: z.string(),
    full_name: z.string().min(1, "Full name is required"),
    phone: z.string().min(5, "Phone number is required")
  }))
  .handler(async ({ data: { email, otp, full_name, phone } }) => {
    const existing = await models.users.findOne({ where: { email } });
    if (existing) {
      throw new Error("User already exists with this email");
    }

    const otpRecord = await models.otps.findByPk(email);
    if (!otpRecord) throw new Error("No OTP requested");
    if (new Date() > new Date(otpRecord.expires_at)) throw new Error("OTP has expired");
    if (otpRecord.attempts >= 5) throw new Error("Too many invalid attempts");
    if (otpRecord.otp_code !== otp) {
      await otpRecord.increment('attempts');
      throw new Error("Invalid OTP");
    }
    
    await otpRecord.destroy();

    const user = await models.users.create({
      email,
      password_hash: "",
      raw_user_meta_data: { full_name, phone },
      last_active_at: new Date()
    });

    await models.profiles.create({
      id: user.id,
      email: user.email,
      full_name,
      phone
    });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    const salesman = await models.salesmen.findOne({ where: { email: user.email } });
    const role = salesman ? "salesman" : "customer";

    return { token, user: { id: user.id, email: user.email, role } };
  });

export const getSession = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data: { token } }) => {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as { sub: string, email: string };
      const user = await models.users.findByPk(decoded.sub);
      
      if (!user) throw new Error("User not found");

      if (user.last_active_at) {
        const diff = Date.now() - new Date(user.last_active_at).getTime();
        if (diff > 2 * 60 * 60 * 1000) {
          throw new Error("Session expired due to inactivity");
        }
      }

      await user.update({ last_active_at: new Date() });

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
          vin_catalog_enabled: profile.vin_catalog_enabled ?? false,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        };
      }
      
      const salesman = await models.salesmen.findOne({ where: { email: decoded.email } });
      const role = decoded.email === "admin" || decoded.email === "superadmin" ? "admin" : salesman ? "salesman" : "customer";

      return { user: { id: decoded.sub, email: decoded.email, role }, profile: profileData };
    } catch (err) {
      return { user: null, profile: null };
    }
  });
