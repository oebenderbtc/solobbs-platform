/**
 * Downloads demo gallery + story images for seed models.
 */
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "gallery");

function unsplash(id, w = 900) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&h=1200&q=80`;
}

/** Verified Unsplash portrait / fashion photo IDs (women). */
const POOL = [
  "photo-1529626455594-4ff0802cfb7e",
  "photo-1494790108377-be9c29b29330",
  "photo-1534528741775-53994a69daeb",
  "photo-1517841905240-472988babdf9",
  "photo-1524504388940-b1c1722653e1",
  "photo-1487412720507-e7ab37603c6f",
  "photo-1508214751196-bcfd4ca60f91",
  "photo-1500648767791-00dcc994a43e",
  "photo-1438761681033-6461ffad8d80",
  "photo-1544005313-94ddf0286df2",
  "photo-1548142813-c348350df52b",
  "photo-1516726817505-f5ed825624d8",
  "photo-1502823403499-6cc66b2fc756",
  "photo-1469334031218-e382a71b716b",
  "photo-1515886657613-9f3515b0c78f",
  "photo-1496747611176-843222e1e57c",
  "photo-1483985988355-763728e1935b",
  "photo-1503104834685-7205e8607eb9",
  "photo-1492106087820-71f1a00d2b11",
  "photo-1479936343636-73cdc5aae0c3",
  "photo-1580489944761-15a19d654956",
  "photo-1573496359142-b8d87734a5a2",
  "photo-1607746882042-944635dfe10e",
  "photo-1592621385612-4d7129426394",
  "photo-1539571696357-5a69c17a67c6",
  "photo-1526510747491-58f928ec870f",
  "photo-1500917293891-ef795e70e1f6",
  "photo-1524638431109-93d533c6f1f9",
  "photo-1616683693504-b037b5a1a5f5",
  "photo-1614283233556-f35b0c801ef1",
  "photo-1598550871331-5958873cfc94",
  "photo-1573497019940-1c28c88b4f3e",
  "photo-1552374196-c4e7ffc6e126",
  "photo-1488426862026-3ee34a7de85a",
  "photo-1496440737103-cd596325d314",
];

const MODELS = [
  { slug: "sofia", keepGallery: true },
  { slug: "lucia" },
  { slug: "camila" },
  { slug: "valentina" },
  { slug: "isabella" },
  { slug: "daniela" },
  { slug: "mariana" },
  { slug: "paula" },
  { slug: "andrea" },
  { slug: "natalia" },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  if (await exists(dest)) {
    console.log("skip", path.basename(path.dirname(dest)) + "/" + path.basename(dest));
    return true;
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "SoloBBsSeed/1.0" },
    redirect: "follow",
  });
  if (!res.ok) {
    console.warn("fail", res.status, url);
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) {
    console.warn("tiny", url);
    return false;
  }
  await writeFile(dest, buf);
  console.log("ok", path.basename(path.dirname(dest)) + "/" + path.basename(dest), `${Math.round(buf.length / 1024)}KB`);
  return true;
}

async function downloadWithFallback(ids, dest, w) {
  for (const id of ids) {
    const ok = await download(unsplash(id, w), dest);
    if (ok) return;
  }
  // last resort: pravatar
  const seed = path.basename(dest).replace(/\W/g, "");
  await download(`https://i.pravatar.cc/${w}?u=${seed}`, dest);
}

async function main() {
  // Verify pool first
  const good = [];
  for (const id of POOL) {
    const url = unsplash(id, 200);
    try {
      const res = await fetch(url, { method: "HEAD", redirect: "follow" });
      if (res.ok) good.push(id);
      else console.warn("pool drop", id, res.status);
    } catch {
      console.warn("pool err", id);
    }
  }
  console.log(`Pool OK: ${good.length}/${POOL.length}`);
  if (good.length < 30) {
    // also try GET if HEAD blocked
    for (const id of POOL) {
      if (good.includes(id)) continue;
      const ok = await download(unsplash(id, 200), path.join(root, `_probe_${id}.jpg`));
      if (ok) good.push(id);
    }
  }

  let cursor = 0;
  function take(n) {
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push(good[cursor % good.length]);
      cursor++;
    }
    return out;
  }

  for (const m of MODELS) {
    const dir = path.join(root, m.slug);
    await mkdir(dir, { recursive: true });

    if (!m.keepGallery) {
      const ids = take(4);
      for (let i = 0; i < 4; i++) {
        await downloadWithFallback([ids[i], ...good], path.join(dir, `${String(i + 1).padStart(2, "0")}.jpg`), 900);
      }
    }

    const storyIds = take(3);
    for (let i = 0; i < 3; i++) {
      await downloadWithFallback(
        [storyIds[i], ...good],
        path.join(dir, `story-${String(i + 1).padStart(2, "0")}.jpg`),
        720,
      );
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
