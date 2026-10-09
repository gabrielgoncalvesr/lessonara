const PUBLIC_PATHS = ["/login", "/a", "/student", "/api/cron", "/api/preferences"];
export function isPublicPath(path: string) {
  return PUBLIC_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
