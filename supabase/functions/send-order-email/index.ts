// Deploy: supabase functions deploy send-order-email
// Secrets: supabase secrets set MAILGUN_API_KEY=... MAILGUN_DOMAIN=... MAILGUN_FROM="Shop <shop@your-domain>"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { order_id } = await req.json();
    // Use caller's JWT so RLS ensures they can only read their own order.
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: o, error } = await sb.from("orders").select("*").eq("id", order_id).single();
    if (error || !o) return new Response("Order not found", { status: 404, headers: cors });

    const lines = (o.items as any[]).map((i) => `<li>${esc(i.name)} (${esc(i.size)}) × ${Number(i.qty)} — $${(i.price * i.qty).toFixed(2)}</li>`).join("");
    const html = `<h2>Thanks for your order, ${esc(o.full_name)}!</h2><ul>${lines}</ul><p><b>Total: $${Number(o.total).toFixed(2)}</b></p><p>Order ID: ${o.id}</p>`;
    const form = new FormData();
    form.set("from", Deno.env.get("MAILGUN_FROM")!);
    form.set("to", o.email);
    form.set("subject", `Order confirmation ${o.id}`);
    form.set("html", html);
    const r = await fetch(`https://api.mailgun.net/v3/${Deno.env.get("MAILGUN_DOMAIN")}/messages`, {
      method: "POST",
      headers: { Authorization: "Basic " + btoa("api:" + Deno.env.get("MAILGUN_API_KEY")) },
      body: form,
    });
    if (!r.ok) return new Response(await r.text(), { status: 502, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: cors });
  }
});
