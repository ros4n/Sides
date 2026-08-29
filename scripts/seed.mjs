// Dev seed: creates a few users with profiles + a friendship.
// Usage: node scripts/seed.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

const users = [
  { email: "alex@example.com", password: "password123", username: "alex", display_name: "Alex" },
  { email: "bailey@example.com", password: "password123", username: "bailey", display_name: "Bailey" },
  { email: "casey@example.com", password: "password123", username: "casey", display_name: "Casey" },
  { email: "devon@example.com", password: "password123", username: "devon", display_name: "Devon" },
];

const ids = {};

for (const u of users) {
  const { data: list } = await admin.auth.admin.listUsers();
  let user = list.users.find((x) => x.email === u.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log("created", u.email);
  } else {
    console.log("exists", u.email);
  }
  ids[u.username] = user.id;
  const { error: pErr } = await admin
    .from("profiles")
    .update({ username: u.username, display_name: u.display_name })
    .eq("id", user.id);
  if (pErr) console.warn("profile update:", pErr.message);
}

// alex <-> bailey and alex <-> casey accepted friendships
async function friend(a, b) {
  const low = a < b ? a : b;
  const high = a < b ? b : a;
  const { error } = await admin
    .from("friendships")
    .upsert(
      { user_low: low, user_high: high, requested_by: a, status: "accepted" },
      { onConflict: "user_low,user_high" },
    );
  if (error) console.warn("friend:", error.message);
}
await friend(ids.alex, ids.bailey);
await friend(ids.alex, ids.casey);

console.log("\nUsers (all password: password123):");
for (const u of users) console.log(`  ${u.email}  →  @${u.username}  ${ids[u.username]}`);
console.log("\nFriends: alex↔bailey, alex↔casey");
