// تخزين المنيو والصور.
// على Vercel: Vercel Blob (المخزن cafe-coup-menu، يتصل تلقائياً عبر BLOB_STORE_ID).
// على هذا الحاسوب فقط (للتجربة): مجلد محلي عبر LOCAL_STORE_DIR، حتى لا تلمس التجارب المنيو الحقيقي.
import { put, list, del } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

const LOCAL = process.env.LOCAL_STORE_DIR || "";
const KEEP_VERSIONS = 30; // نحتفظ بآخر 30 نسخة من المنيو (للرجوع عند الخطأ)

export async function loadMenu() {
  if (LOCAL) {
    const dir = path.join(LOCAL, "menu");
    const files = (await fs.readdir(dir).catch(() => [])).filter(f => f.endsWith(".json")).sort();
    if (!files.length) return null;
    return JSON.parse(await fs.readFile(path.join(dir, files[files.length - 1]), "utf8"));
  }
  const { blobs } = await list({ prefix: "menu/" });
  if (!blobs.length) return null;
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const r = await fetch(blobs[0].url, { cache: "no-store" });
  if (!r.ok) throw new Error("menu fetch failed " + r.status);
  return r.json();
}

export async function saveMenu(data) {
  const name = `menu/menu-${Date.now()}.json`;
  const body = JSON.stringify(data);
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, "menu"), { recursive: true });
    await fs.writeFile(path.join(LOCAL, name), body);
    return;
  }
  await put(name, body, { access: "public", addRandomSuffix: true, contentType: "application/json" });
  // حذف النسخ القديمة جداً
  const { blobs } = await list({ prefix: "menu/" });
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const old = blobs.slice(KEEP_VERSIONS).map(b => b.url);
  if (old.length) await del(old).catch(() => {});
}

export async function saveImage(buffer, contentType) {
  const ext = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[contentType] || "png";
  const name = `images/item-${Date.now()}.${ext}`;
  if (LOCAL) {
    await fs.mkdir(path.join(LOCAL, "images"), { recursive: true });
    await fs.writeFile(path.join(LOCAL, name), buffer);
    return `/local-store/${name}`;
  }
  const blob = await put(name, buffer, { access: "public", addRandomSuffix: true, contentType });
  return blob.url;
}
