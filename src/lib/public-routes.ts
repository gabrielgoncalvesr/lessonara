const PUBLIC_PATHS = ["/login", "/p", "/a", "/student", "/api/cron", "/api/preferences"];
const PUBLIC_PAGES = ["/about", "/privacy", "/terms"];
export function isPublicPath(path: string) {
  return PUBLIC_PAGES.includes(path) || PUBLIC_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
