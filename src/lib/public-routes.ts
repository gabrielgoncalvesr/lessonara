const PUBLIC_PATHS = ["/pdf-assets", "/classroom", "/login", "/p", "/a", "/student", "/api/cron", "/api/preferences"];
const PUBLIC_PAGES = ["/pdf.worker.min.mjs", "/about", "/privacy", "/terms"];
export function isPublicPath(path: string) {
  return PUBLIC_PAGES.includes(path) || PUBLIC_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
