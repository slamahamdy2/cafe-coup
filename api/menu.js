// GET /api/menu — آخر نسخة محفوظة من المنيو (يقرؤها المنيو العام واللوحة).
import { loadMenu } from "./_lib/store.js";

export async function GET() {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*", // نسخة GitHub Pages تقرأ من هنا أيضاً
    "cache-control": "public, max-age=0, s-maxage=5, stale-while-revalidate=60",
  };
  try {
    const data = await loadMenu();
    return new Response(JSON.stringify(data || { items: null }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ items: null, error: "unavailable" }), { status: 503, headers: { ...headers, "cache-control": "no-store" } });
  }
}
