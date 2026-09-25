import { adminApi } from "./admin";
import { contactApi } from "./contact";
import { HttpError, json } from "./model";
import { publicApi } from "./public";
import { pageError, publicPage } from "./page-render";
import type { RuntimeEnv } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const isApi = url.pathname === "/api" || url.pathname.startsWith("/api/");
    try {
      const runtime = env as RuntimeEnv;
      if (!isApi) {
        if (request.method !== "GET" && request.method !== "HEAD") return pageError(405);
        // Unmatched assets also reach this Worker. Only navigation paths render HTML.
        const isPage = url.pathname === "/" || /^\/(sales|leasing|van-sizes|customs|servicing|contact|privacy|terms-and-conditions|vehicles)(\/|$)/.test(url.pathname);
        if (!isPage && url.pathname !== "/sitemap.xml" && request.headers.get("Accept")?.includes("text/html") !== true) {
          return new Response("Not Found", { status: 404 });
        }
        const needsDb = url.pathname === "/" || url.pathname === "/sales" || url.pathname === "/leasing" ||
          url.pathname === "/sitemap.xml" || url.pathname.startsWith("/vehicles/listing/") ||
          (url.pathname.startsWith("/vehicles/") && !url.pathname.startsWith("/vehicles/listing/"));
        if (needsDb && !runtime.DB) return pageError(503);
        const response = await publicPage(request, runtime, url);
        return request.method === "HEAD" ? new Response(null, response) : response;
      }
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
      if (error instanceof HttpError) return isApi ? json({ error: error.message }, error.status) : pageError(error.status);
      console.error(JSON.stringify({ event: isApi ? "api_error" : "page_error", route: url.pathname, error: String(error) }));
      return isApi ? json({ error: "Temporary server error" }, 500) : pageError(500);
    }
  },
} satisfies ExportedHandler<Env>;
