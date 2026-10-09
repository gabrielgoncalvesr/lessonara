import { headers } from "next/headers";

export async function getOrigin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/+$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
