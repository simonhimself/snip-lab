// Snip: a tiny URL shortener.
//
// Routes (everything else is a static file from ./public):
//   POST /api/links      { "url": "https://..." } -> { code, shortUrl }
//   GET  /api/health     -> basic status, incl. whether ADMIN_TOKEN is set
//   GET  /api/links/:code -> { code, url, clicks, createdAt } (or 404)
//   GET  /s/:code        -> 302 redirect to the stored URL (and counts a click)
//
// Storage: KV namespace LINKS, key = short code, value = JSON LinkRecord.

interface LinkRecord {
  url: string;
  clicks: number;
  createdAt: string; // ISO date
}

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes (l/1, o/0)
const CODE_LENGTH = 6;

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);

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
  let body: { url?: unknown };
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

  const code = generateCode();
  const record: LinkRecord = { url: body.url, clicks: 0, createdAt: new Date().toISOString() };
  await env.LINKS.put(code, JSON.stringify(record));

  return Response.json({ code, shortUrl: `${origin}/s/${code}` }, { status: 201 });
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
  ctx.waitUntil(env.LINKS.put(code, JSON.stringify(record)));

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
  return env.LINKS.get<LinkRecord>(code, "json");
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
