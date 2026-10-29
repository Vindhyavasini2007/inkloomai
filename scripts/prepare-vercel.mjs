import { cpSync, mkdirSync, rmSync, existsSync } from "node:fs";

// Copy the Vite-built client into public/ (Vercel static output directory)
for (const dir of ["public"]) {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  mkdirSync(dir, { recursive: true });
  cpSync("client/dist", dir, { recursive: true });
}

console.log("✓ Copied client/dist → public/");
