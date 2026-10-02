import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
export const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
export const currency = () => Deno.env.get("PAYMENT_CURRENCY") ?? "NGN";
export const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
// Client scoped to the caller's JWT, so RLS limits them to their own orders.
export const asUser = (req: Request) =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
export const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
