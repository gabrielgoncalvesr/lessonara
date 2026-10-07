import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const html = readFileSync(join(root, ".next/server/app/login.html"), "utf8");
const sheets = [...html.matchAll(/href="([^\"]+\.css(?:\?[^\"]*)?)"/g)].map((match) => match[1]);
if (!sheets.length) throw new Error("Login build contains no CSS links.");
const css = sheets.map((href) => {
  const pathname = decodeURIComponent(href.split("?")[0]);
  if (!pathname.startsWith("/_next/static/")) throw new Error(`Unexpected stylesheet path: ${pathname}`);
  return readFileSync(join(root, ".next", pathname.slice("/_next/".length)), "utf8");
}).join("\n");
for (const selector of [".login-art", ".login-form-side", ".sidebar", ".calendar-cell"]) {
  if (!css.includes(selector)) throw new Error(`Production stylesheet is missing ${selector}.`);
}
if (css.includes("#141412")) throw new Error("Production stylesheet contains the obsolete dark theme.");
console.log("Production CSS verified: login, sidebar and calendar styles are present.");
