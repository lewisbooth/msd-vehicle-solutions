import { HttpError, json, readJsonObject } from "./model";
import type { RuntimeEnv } from "./env";

export async function contactApi(request: Request, env: RuntimeEnv): Promise<Response> {
  if (request.method !== "POST") throw new HttpError(405, "Method not allowed");
  // Until Email Service is enabled for the domain, callers must be shown a phone/mailto fallback.
  if (!env.EMAIL || !env.CONTACT_FROM || !env.CONTACT_TO) {
    return json({ ok: false, error: "The contact form is unavailable. Please call or email us directly." }, 503);
  }
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) throw new HttpError(403, "Invalid origin");
  const fields = await readJsonObject(request, 16384);
  const clean = (key: string, max: number, required = true): string => {
    const value = fields[key];
    if (value === undefined && !required) return "";
    if (typeof value !== "string" || value.trim().length < (required ? 1 : 0) || value.length > max) {
      throw new HttpError(400, `Invalid ${key}`);
    }
    return value.trim();
  };
  if (fields.website) return json({ ok: true }); // Honeypot, no email sent.
  const name = clean("name", 120);
  const email = clean("email", 254);
  const message = clean("message", 5000);
  const phone = clean("phone", 80, false);
  const subject = clean("subject", 160, false);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Invalid email");
  await env.EMAIL.send({
    to: env.CONTACT_TO,
    from: env.CONTACT_FROM,
    subject: `Website enquiry${subject ? `: ${subject}` : ""}`,
    text: [
      `Name: ${name}`, `Email: ${email}`, `Phone: ${phone || "not provided"}`,
      `Subject: ${subject || "general enquiry"}`, "", message,
    ].join("\n"),
  });
  return json({ ok: true }, 200);
}
