import { useRouterState } from "@tanstack/react-router";

/**
 * Only allow same-origin, absolute-path redirects. Reject protocol-relative
 * (`//evil.com`), absolute URLs, and anything that isn't a leading single `/`.
 */
export function getSafeRedirect(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  if (!raw.startsWith("/")) return undefined;
  if (raw.startsWith("//")) return undefined;
  if (raw.startsWith("/\\")) return undefined;
  return raw;
}

/** Returns the current pathname + search + hash for use as a redirect target. */
export function useCurrentHref(): string {
  return useRouterState({ select: (s) => s.location.href });
}

/**
 * Current href suitable for use as a login `redirect` param.
 * Returns `""` when already on an /auth/* route so we don't loop back to
 * the login/signup page after authentication.
 */
export function useRedirectTargetHref(): string {
  const href = useCurrentHref();
  if (!href || href.startsWith("/auth")) return "";
  return href;
}

/**
 * Props for a <Link> that navigates to /auth/login preserving the current
 * page as the post-login redirect target.
 *
 *   const loginLink = useLoginLinkProps();
 *   <Link {...loginLink}>Sign in</Link>
 */
export function useLoginLinkProps() {
  const redirect = useRedirectTargetHref();
  return { to: "/auth/login" as const, search: { redirect } };
}

/** Same as useLoginLinkProps, but for /auth/signup. */
export function useSignupLinkProps() {
  const redirect = useRedirectTargetHref();
  return { to: "/auth/signup" as const, search: { redirect } };
}
