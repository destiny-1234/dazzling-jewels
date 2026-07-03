// supabase/functions/delete-user/index.ts
//
// Deletes a user completely: removes their Supabase Auth login AND their
// profiles row. Only callable by an authenticated admin.
//
// Deploy with:
//   supabase functions deploy delete-user
//
// The service_role key lives only in this function's environment
// (Supabase sets SUPABASE_SERVICE_ROLE_KEY automatically for you) and is
// NEVER sent to the browser.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Client scoped to the CALLER's JWT — used only to verify who is
    //    calling and whether they're an admin. Cannot bypass RLS.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Confirm the caller actually has the admin role (uses the same
    //    has_role() logic your RLS policies rely on).
    const { data: isAdmin, error: roleError } = await callerClient.rpc("has_role", {
      uid: caller.id,
      r: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Parse the target user id to delete.
    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety: don't let an admin delete their own account through this tool.
    if (userId === caller.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Privileged client using the service_role key — this is the ONLY
    //    place in the codebase that should ever use this key.
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Delete the real Auth account first (this is the part the old
    // client-side "delete" was silently skipping).
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete auth user: ${authDeleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean up the profile row too, in case there's no cascading FK/trigger
    // set up to do this automatically. Safe to attempt even if it's already gone.
    const { error: profileDeleteError } = await adminClient.from("profiles").delete().eq("id", userId);
    if (profileDeleteError) {
      // Auth user is already gone at this point, so we still report success
      // but flag that profile cleanup needs a look.
      console.error("Auth user deleted but profile cleanup failed:", profileDeleteError);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-user function error:", err);
    return new Response(JSON.stringify({ error: "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
