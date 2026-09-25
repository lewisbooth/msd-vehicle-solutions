import { adminApi } from "./admin";
import { contactApi } from "./contact";
import { HttpError, json } from "./model";
import { publicApi } from "./public";
import type { RuntimeEnv } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) {
        // A missing non-navigation static file can reach the script despite static routing.
        return new Response("Not Found", { status: 404 });
      }
      const runtime = env as RuntimeEnv;
      if (url.pathname === "/api") return json({ error: "Endpoint not found" }, 404);
      if (url.pathname.startsWith("/api/media/") && !runtime.MEDIA) {
        return json({ error: "Media storage is not configured for this preview" }, 503);
      }
      if (url.pathname !== "/api/contact" && !url.pathname.startsWith("/api/media/") && !runtime.DB) {
        return json({ error: "Database is not configured for this preview" }, 503);
      }
      if (url.pathname.startsWith("/api/admin/")) return await adminApi(request, runtime, url);
      if (url.pathname === "/api/contact") return await contactApi(request, runtime);
      return await publicApi(request, runtime, url);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error(JSON.stringify({ event: "api_error", route: url.pathname, error: String(error) }));
      return json({ error: "Temporary server error" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
