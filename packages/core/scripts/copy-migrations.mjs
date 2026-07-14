import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "src", "db", "migrations");
const dest = path.join(process.cwd(), "dist", "db", "migrations");

fs.mkdirSync(dest, { recursive: true });
for (const file of fs.readdirSync(src)) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
