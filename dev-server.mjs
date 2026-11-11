// خادم تجربة محلي فقط (لا يُنشر): يشغّل ملفات api/ نفسها، ويخزّن في مجلد .local-store بدل Vercel Blob.
// التشغيل:  ADMIN_PASSWORD=... LOCAL_STORE_DIR=.local-store node dev-server.mjs
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(".");
const STORE = path.resolve(process.env.LOCAL_STORE_DIR || ".local-store");
process.env.LOCAL_STORE_DIR = STORE;
const PORT = +process.env.PORT || 5174;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".css": "text/css" };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const name = url.pathname.slice(5).replace(/[^a-z]/g, "");
      const mod = await import(pathToFileURL(path.join(ROOT, "api", name + ".js")).href);
      const fn = mod[req.method];
      if (!fn) { res.writeHead(405); return res.end(); }
      const chunks = []; for await (const c of req) chunks.push(c);
      const body = ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks);
      const r = await fn(new Request(url, { method: req.method, headers: req.headers, body }));
      const h = {}; r.headers.forEach((v, k) => (h[k] = v));
      res.writeHead(r.status, h);
      return res.end(Buffer.from(await r.arrayBuffer()));
    }
    let file = url.pathname.startsWith("/local-store/")
      ? path.join(STORE, decodeURIComponent(url.pathname.slice(13)))
      : path.join(ROOT, decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname));
    const base = url.pathname.startsWith("/local-store/") ? STORE : ROOT;
    if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
    const data = await fs.readFile(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  } catch (e) {
    res.writeHead(e.code === "ENOENT" ? 404 : 500); res.end(String(e.code || e.message));
  }
}).listen(PORT, () => console.log(`dev server http://localhost:${PORT}`));
