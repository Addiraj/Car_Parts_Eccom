// Placeholder for future CAPTCHA integration (Cloudflare Turnstile / reCAPTCHA).
// Renders nothing when no site key is configured, and a soft badge otherwise.
export function CaptchaSlot() {
  const key = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  if (!key) return null;
  return (
    <div className="rounded-md border bg-surface px-3 py-2 text-[11px] text-muted-foreground">
      Protected by bot verification
    </div>
  );
}
