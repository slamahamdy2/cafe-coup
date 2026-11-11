// POST /api/upload — رفع صورة صنف (لصاحب المقهى فقط). الجسم: ملف الصورة نفسه.
import { sessionRole, fromPanel, json } from "./_lib/auth.js";
import { saveImage } from "./_lib/store.js";

const TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX = 6 * 1024 * 1024;

export async function POST(request) {
  if (!fromPanel(request) || (await sessionRole(request)) !== "owner") return json({ error: "unauthorized" }, 401); // المالك فقط
  const type = (request.headers.get("content-type") || "").split(";")[0].trim();
  if (!TYPES.has(type)) return json({ error: "bad-type" }, 415);
  const buf = Buffer.from(await request.arrayBuffer());
  if (!buf.length || buf.length > MAX) return json({ error: "bad-size" }, 413);
  try { return json({ ok: true, url: await saveImage(buf, type) }); }
  catch (e) { return json({ error: "storage", detail: String(e.message || e) }, 500); }
}
