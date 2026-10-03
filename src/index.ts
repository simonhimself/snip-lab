// Snip: a tiny URL shortener.
//
// Routes (everything else is a static file from ./public):
//   POST /api/links      { "url": "https://...", "code"?: "my-talk", "expiresIn"?: seconds | null }
//                        -> { code, shortUrl, expiresAt }
//   GET  /api/health     -> basic status, incl. whether ADMIN_TOKEN is set
//   GET  /api/links/:code -> { code, url, clicks, createdAt, expiresAt } (or 404)
//   GET  /s/:code        -> 302 redirect to the stored URL (and counts a click)
//   /api/admin/*         -> token-protected admin API, see src/admin.ts
//
// Storage: KV namespace LINKS, key = short code, value = JSON LinkRecord.
// Expiring links use KV's own TTL so Cloudflare deletes the key for us.

import { handleAdmin } from "./admin";

interface LinkRecord {
  url: string;
  clicks: number;
  createdAt: string; // ISO date
  expiresAt?: string | null; // ISO date, or null/missing = never expires
}

// KV rejects TTLs shorter than 60 seconds.
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 365 * 24 * 60 * 60; // one year; keeps dates sane

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes (l/1, o/0)
const CODE_LENGTH = 6;
// Custom codes chosen by the user: 3–32 chars of lowercase letters, digits, dashes.
const CUSTOM_CODE_PATTERN = /^[a-z0-9-]{3,32}$/;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/admin/")) {
      return handleAdmin(request, env, url);
    }

    if (url.pathname === "/api/links" && request.method === "POST") {
      return createLink(request, env, url.origin);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({ ok: true, adminTokenConfigured: Boolean(env.ADMIN_TOKEN) });
    }

    if (url.pathname.startsWith("/api/links/") && request.method === "GET") {
      return getLinkStats(url.pathname.slice("/api/links/".length), env);
    }

    if (url.pathname.startsWith("/s/") && request.method === "GET") {
      return followLink(url.pathname.slice("/s/".length), env, ctx);
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
} satisfies ExportedHandler<Env>;

async function createLink(request: Request, env: Env, origin: string): Promise<Response> {
  let body: { url?: unknown; code?: unknown; expiresIn?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON" }, { status: 400 });
  }

  if (typeof body.url !== "string" || !isValidUrl(body.url)) {
    return Response.json(
      { error: "Please provide a valid web link starting with http:// or https://" },
      { status: 400 },
    );
  }

  // Missing or null means "never expires", same as before this option existed.
  const expiresIn = body.expiresIn ?? null;
  if (
    expiresIn !== null &&
    (typeof expiresIn !== "number" ||
      !Number.isInteger(expiresIn) ||
      expiresIn < MIN_TTL_SECONDS ||
      expiresIn > MAX_TTL_SECONDS)
  ) {
    return Response.json(
      {
        error: `expiresIn must be a whole number of seconds between ${MIN_TTL_SECONDS} and ${MAX_TTL_SECONDS}, or null`,
      },
      { status: 400 },
    );
  }

  // An empty or missing code means "pick one for me".
  let code: string;
  if (body.code === undefined || body.code === null || body.code === "") {
    code = generateCode();
  } else {
    if (typeof body.code !== "string" || !CUSTOM_CODE_PATTERN.test(body.code)) {
      return Response.json(
        { error: "Custom code must be 3–32 characters: lowercase letters, numbers and dashes" },
        { status: 400 },
      );
    }
    // Check-then-put is not atomic on KV, so two requests racing for the same
    // code could both succeed. Acceptable for a hobby project.
    // getLink() treats an expired-but-not-yet-deleted key as gone, so an
    // expired custom code can be reused.
    if ((await getLink(body.code, env)) !== null) {
      return Response.json({ error: "That code is taken" }, { status: 409 });
    }
    code = body.code;
  }

  const now = Date.now();
  const record: LinkRecord = {
    url: body.url,
    clicks: 0,
    createdAt: new Date(now).toISOString(),
    expiresAt: expiresIn === null ? null : new Date(now + expiresIn * 1000).toISOString(),
  };
  await putLink(code, record, env);

  return Response.json(
    { code, shortUrl: `${origin}/s/${code}`, expiresAt: record.expiresAt },
    { status: 201 },
  );
}

// Every write must re-apply the expiry: a KV put() without an expiration
// option clears the key's TTL, which would make an expiring link permanent.
// We use the absolute `expiration` (epoch seconds) derived from expiresAt so
// rewrites (e.g. the click counter) don't push the deadline back.
async function putLink(code: string, record: LinkRecord, env: Env): Promise<void> {
  if (!record.expiresAt) {
    await env.LINKS.put(code, JSON.stringify(record));
    return;
  }
  const expiresAtSeconds = Math.floor(Date.parse(record.expiresAt) / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  // KV needs the expiration to be at least 60s in the future. Near the end of
  // a link's life we keep the key a little longer; getLink() still treats it
  // as gone once expiresAt has passed.
  const expiration = Math.max(expiresAtSeconds, nowSeconds + MIN_TTL_SECONDS);
  await env.LINKS.put(code, JSON.stringify(record), { expiration });
}

async function followLink(code: string, env: Env, ctx: ExecutionContext): Promise<Response> {
  const record = await getLink(code, env);
  if (!record) {
    return new Response("Short link not found", { status: 404 });
  }

  // Read-modify-write on KV is not atomic and KV is eventually consistent, so
  // two clicks at nearly the same moment can both read the same count and one
  // gets lost. Good enough for a hobby counter; a Durable Object would be
  // needed for exact counts. waitUntil lets the redirect go out without
  // waiting for the write.
  record.clicks += 1;
  ctx.waitUntil(putLink(code, record, env));

  return Response.redirect(record.url, 302);
}

async function getLinkStats(code: string, env: Env): Promise<Response> {
  const record = await getLink(code, env);
  if (!record) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json({ code, ...record });
}

async function getLink(code: string, env: Env): Promise<LinkRecord | null> {
  if (!code) return null;
  const record = await env.LINKS.get<LinkRecord>(code, "json");
  if (!record) return null;
  // KV deletes expired keys on its own, but not to the second; an expired
  // link should look exactly like an unknown one.
  if (record.expiresAt && Date.parse(record.expiresAt) <= Date.now()) return null;
  return { ...record, expiresAt: record.expiresAt ?? null };
}

// Only web links can be shortened. `new URL()` alone also accepts schemes like
// javascript:, data:, mailto: and ftp:, which would let a short link run
// scripts or open phishing pages.
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function isValidUrl(value: string): boolean {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(value).protocol);
  } catch {
    return false;
  }
}

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
