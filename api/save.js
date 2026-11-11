// POST /api/save — حفظ المنيو كاملاً من اللوحة (لصاحب المقهى فقط)
import { isAuthed, fromPanel, json } from "./_lib/auth.js";
import { saveMenu } from "./_lib/store.js";

const SECTIONS = new Set(["drinks", "food", "games"]);
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const price = v => (Number.isFinite(+v) && +v >= 0 && +v <= 1_000_000 ? Math.round(+v) : null);

function clean(body) {
  if (!body || !Array.isArray(body.items) || body.items.length > 400) throw new Error("bad-items");
  const seen = new Set();
  const items = body.items.map(it => {
    const id = str(it.id, 60).toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(id) || seen.has(id)) throw new Error("bad-id");
    seen.add(id);
    if (!SECTIONS.has(it.section)) throw new Error("bad-section");
    const out = {
      id, section: it.section,
      name_ar: str(it.name_ar, 80), name_fr: str(it.name_fr, 80),
      desc_ar: str(it.desc_ar, 240), desc_fr: str(it.desc_fr, 240),
      image: str(it.image, 600),
    };
    if (!out.name_ar && !out.name_fr) throw new Error("no-name");
    if (out.image && !/^(images\/[\w.-]+|https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\/[\w./%-]+|\/local-store\/[\w./-]+)$/.test(out.image)) throw new Error("bad-image");
    if (it.section !== "games") {
      const p = price(it.price);
      if (p === null) throw new Error("bad-price");
      out.price = p;
    }
    if (it.hidden) out.hidden = true;
    return out;
  });
  const gp = price(body.gamesPassPrice);
  if (gp === null) throw new Error("bad-games-price");
  return { items, gamesPassPrice: gp, savedAt: new Date().toISOString() };
}

export async function POST(request) {
  if (!fromPanel(request) || !isAuthed(request)) return json({ error: "unauthorized" }, 401);
  let data;
  try { data = clean(await request.json()); }
  catch (e) { return json({ error: "invalid", detail: e.message }, 400); }
  try { await saveMenu(data); }
  catch (e) { return json({ error: "storage", detail: String(e.message || e) }, 500); }
  return json({ ok: true, savedAt: data.savedAt });
}
