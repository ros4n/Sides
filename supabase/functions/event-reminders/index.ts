// Fires "starting soon" reminders. Schedule this to run every few minutes
// (Supabase cron, or an external scheduler hitting this URL).
//
//   supabase functions deploy event-reminders
//   -- then add a schedule in the dashboard, or:
//   select cron.schedule('event-reminders','*/5 * * * *',
//     $$ select net.http_post('https://<ref>.supabase.co/functions/v1/event-reminders',
//        headers := jsonb_build_object('Authorization','Bearer <service_role>')) $$);

import { createClient } from "jsr:@supabase/supabase-js@2";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async () => {
  const { data, error } = await admin.rpc("send_due_event_reminders", {});
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  return new Response(JSON.stringify({ events_reminded: data ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
