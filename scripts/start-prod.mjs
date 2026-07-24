import { existsSync } from "fs";
import { spawnSync } from "child_process";

/**
 * Arranque en Render: opcionalmente siembra la DB una vez (SEED_ON_BOOT=true)
 * y luego levanta Next.js.
 */
if (process.env.SEED_ON_BOOT === "true") {
  console.log("[boot] Running prisma db seed…");
  const seed = spawnSync("npx", ["prisma", "db", "seed"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (seed.status !== 0) {
    console.warn("[boot] Seed finished with errors (puede ser datos ya existentes). Continuando…");
  }
}

const nextBin = existsSync("node_modules/next/dist/bin/next")
  ? "node_modules/next/dist/bin/next"
  : "next";

const child = spawnSync("node", [nextBin, "start"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

process.exit(child.status ?? 1);
