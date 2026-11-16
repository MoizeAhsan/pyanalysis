#!/usr/bin/env node
// Render docs/media/showcase/index.html to MP4 files and a poster image.
//
//   node scripts/render_showcase.mjs                 # all formats
//   node scripts/render_showcase.mjs --stills 2,10 --out /tmp/x   # PNG stills at those seconds
//
// Uses the Playwright that the frontend already installs (run `make setup` first)
// and the installed Google Chrome, whose WebCodecs can encode H.264. The MP4
// muxer (mp4-muxer) is loaded into the page from jsDelivr, so a network
// connection is needed.
import { createReadStream, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pageDir = join(root, "docs/media/showcase");
const outArg = process.argv.indexOf("--out");
const outDir = outArg > 0 ? resolve(process.argv[outArg + 1]) : join(root, "docs/media");
const require = createRequire(join(root, "frontend/package.json"));
const { chromium } = require("playwright-core");

const MUXER = "https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js";
const FORMATS = [
  { name: "showcase-16x9", w: 1920, h: 1080, bitrate: 2.5e6, poster: 20 },
  { name: "showcase-4x5", w: 1080, h: 1350, bitrate: 3e6 },
];

const types = { ".html": "text/html", ".js": "text/javascript" };
const server = createServer((req, res) => {
  const file = join(pageDir, new URL(req.url, "http://x").pathname.replace(/^\/$/, "/index.html"));
  if (!file.startsWith(pageDir)) return res.writeHead(403).end();
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).on("error", () => res.end()).pipe(res);
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const stillsArg = process.argv.indexOf("--stills");
const stills = stillsArg > 0 ? process.argv[stillsArg + 1].split(",").map(Number) : null;

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const f of FORMATS) {
    const page = await browser.newPage({ viewport: { width: f.w, height: f.h } });
    page.on("pageerror", e => console.error(e));
    await page.goto(`${base}?export&w=${f.w}&h=${f.h}`);
    await page.evaluate(() => document.fonts.ready);
    const shot = async (t, path) => {
      await page.evaluate(t => window.renderFrame(t), t);
      await page.locator("canvas").screenshot({ path });
    };
    if (stills) {
      for (const t of stills) await shot(t, join(outDir, `still-${f.name}-${t}.png`));
      console.log(`${f.name}: ${stills.length} stills`);
    } else {
      await page.addScriptTag({ url: MUXER });
      const started = Date.now();
      const b64 = await page.evaluate(bitrate => window.exportVideo({ fps: 30, bitrate }), f.bitrate);
      const file = join(outDir, `${f.name}.mp4`);
      writeFileSync(file, Buffer.from(b64, "base64"));
      console.log(`${file} (${(b64.length * 0.75 / 1e6).toFixed(1)} MB, ${((Date.now() - started) / 1000).toFixed(0)} s)`);
      if (f.poster != null) await shot(f.poster, join(outDir, "showcase-poster.png"));
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
