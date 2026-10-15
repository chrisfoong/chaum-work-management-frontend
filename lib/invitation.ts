function invitationURL(value: string): URL {
  const url = new URL(value);
  const state = url.searchParams.get("liff.state");
  return state ? new URL(state, url.origin) : url;
}
export function invitationFromURL(value: string): string | null {
  try {
    const url = invitationURL(value);
    const token =
      new URLSearchParams(url.hash.slice(1)).get("invite") ||
      url.searchParams.get("invite");
    return token && /^[A-Za-z0-9_-]{54}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}
export function invitationPlatformFromURL(
  value: string,
): "web" | "worker" | null {
  try {
    const url = invitationURL(value);
    const platform = new URLSearchParams(url.hash.slice(1)).get("platform");
    return invitationFromURL(value) &&
      (platform === "web" || platform === "worker")
      ? platform
      : null;
  } catch {
    return null;
  }
}
// Only the invitation survives LINE redirects; LINE ID tokens remain in SDK memory.
export function captureInvitation(): string | null {
  const incoming = invitationFromURL(window.location.href);
  if (incoming) sessionStorage.setItem("chaum-invitation", incoming);
  const saved = sessionStorage.getItem("chaum-invitation");
  return saved && /^[A-Za-z0-9_-]{54}$/.test(saved) ? saved : null;
}
export function clearInvitation() {
  sessionStorage.removeItem("chaum-invitation");
}
export function invitationLoginRedirect(
  origin: string,
  platform: "web" | "worker",
  token: string | null,
): string {
  const url = new URL(platform === "worker" ? "/worker" : "/web", origin);
  if (token && /^[A-Za-z0-9_-]{54}$/.test(token))
    url.hash = new URLSearchParams({ invite: token, platform }).toString();
  return url.toString();
}
