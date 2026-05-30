import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

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

        // Look up the original URL
        const { data, error } = await supabaseAdmin
          .from("links")
          .select("id, original_url, click_count, expires_at, is_expired")
          .eq("slug", slug)
          .maybeSingle();

        if (error || !data) {
          return new Response(
            `<!doctype html><html><head><title>Link not found</title>
            <style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;
            align-items:center;justify-content:center;margin:0;background:#fafafa}
            div{text-align:center;padding:2rem}h1{font-size:2rem;margin:0 0 .5rem}
            p{color:#666;margin:0 0 1.5rem}a{color:#3b82f6;text-decoration:none;font-weight:500}
            </style></head><body><div><h1>Link not found</h1>
            <p>This short link doesn't exist or has been removed.</p>
            <a href="/">← Create a new short link</a></div></body></html>`,
            { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }

        // Check if link is expired
        const now = new Date();
        const isExpired =
          data.is_expired ||
          (data.expires_at && new Date(data.expires_at) < now);

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
            { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
          );
        }

        // Parse device type and referrer
        const userAgent = request.headers.get("user-agent") || "";
        const referrer = request.headers.get("referer") || "direct";
        const deviceType = getDeviceType(userAgent);

        // Record click with details (fire-and-forget)
        void supabaseAdmin.from("clicks").insert({
          link_id: data.id,
          referrer,
          device_type: deviceType,
        });

        // Increment click count (fire-and-forget)
        void supabaseAdmin
          .from("links")
          .update({ click_count: data.click_count + 1 })
          .eq("id", data.id);

        // 302 so browsers re-hit us each time (better for analytics)
        return new Response(null, {
          status: 302,
          headers: { Location: data.original_url },
        });
      },
    },
  },
});