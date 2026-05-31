import { createFileRoute } from "@tanstack/react-router";

function getDeviceType(userAgent: string): string {
  if (/mobile/i.test(userAgent)) return "mobile";
  if (/tablet|ipad/i.test(userAgent)) return "tablet";
  return "desktop";
}

export const Route = createFileRoute("/r/$slug")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const { slug } = params;

        const cfEnv = (globalThis as any).__cloudflare_env__ || {};
        const SUPABASE_URL = "https://msnjdakfrndjepbvykwm.supabase.co";
        const SUPABASE_SERVICE_ROLE_KEY = cfEnv.SUPABASE_SERVICE_ROLE_KEY;

        if (!SUPABASE_SERVICE_ROLE_KEY) {
          return new Response("Server configuration error", { status: 500 });
        }

        const apiUrl = `${SUPABASE_URL}/rest/v1/links?slug=eq.${encodeURIComponent(slug)}&select=id,original_url,click_count,expires_at,is_expired&limit=1`;

        console.log("Fetching:", apiUrl);
        console.log("Key prefix:", SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20));

        const response = await fetch(apiUrl, {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        const responseHeaders = Object.fromEntries(response.headers.entries());
        console.log("Response status:", response.status);
        console.log("Response headers:", JSON.stringify(responseHeaders));
        const text = await response.text();
        console.log("Response body:", text);

        if (!response.ok) {
          return new Response("Database error", { status: 500 });
        }

        const rows = JSON.parse(text);
        const data = rows[0] || null;

        if (!data) {
          return new Response(
            `<!doctype html><html><head><title>Link not found</title>
            <style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;
            align-items:center;justify-content:center;margin:0;background:#fafafa}
            div{text-align:center;padding:2rem}h1{font-size:2rem;margin:0 0 .5rem}
            p{color:#666;margin:0 0 1.5rem}a{color:#3b82f6;text-decoration:none;font-weight:500}
            </style></head><body><div><h1>Link not found</h1>
            <p>This short link doesn't exist or has been removed.</p>
            <a href="/">← Create a new short link</a></div></body></html>`,
            { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        const now = new Date();
        const isExpired = data.is_expired || (data.expires_at && new Date(data.expires_at) < now);

        if (isExpired) {
          return new Response(
            `<!doctype html><html><head><title>Link expired</title>
            <style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;
            align-items:center;justify-content:center;margin:0;background:#fafafa}
            div{text-align:center;padding:2rem}h1{font-size:2rem;margin:0 0 .5rem}
            p{color:#666;margin:0 0 1.5rem}a{color:#3b82f6;text-decoration:none;font-weight:500}
            </style></head><body><div><h1>Link expired</h1>
            <p>This short link has expired and is no longer available.</p>
            <a href="/">← Create a new short link</a></div></body></html>`,
            { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        const userAgent = request.headers.get("user-agent") || "";
        const referrer = request.headers.get("referer") || "direct";
        const deviceType = getDeviceType(userAgent);

        fetch(`${SUPABASE_URL}/rest/v1/clicks`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            link_id: data.id,
            referrer,
            device_type: deviceType,
          }),
        });

        fetch(`${SUPABASE_URL}/rest/v1/links?id=eq.${data.id}`, {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ click_count: data.click_count + 1 }),
        });

        return new Response(null, {
          status: 302,
          headers: { Location: data.original_url },
        });
      },
    },
  },
});
