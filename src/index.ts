// Snip: a tiny URL shortener.
//
// Routes (everything else is a static file from ./public):
//   POST /api/links      { "url": "https://..." } -> { code, shortUrl }
//   GET  /api/health     -> basic status, incl. whether ADMIN_TOKEN is set
//   GET  /s/:code        -> 302 redirect to the stored URL
//
// Storage: KV namespace LINKS, key = short code, value = target URL (plain string).

const CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no look-alikes (l/1, o/0)
const CODE_LENGTH = 6;

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/links" && request.method === "POST") {
      return createLink(request, env, url.origin);
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({ ok: true, adminTokenConfigured: Boolean(env.ADMIN_TOKEN) });
    }

    if (url.pathname.startsWith("/s/") && request.method === "GET") {
      return followLink(url.pathname.slice("/s/".length), env);
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
    return Response.json({ error: "Please provide a valid URL" }, { status: 400 });
  }

  const code = generateCode();
  await env.LINKS.put(code, body.url);

  return Response.json({ code, shortUrl: `${origin}/s/${code}` }, { status: 201 });
}

async function followLink(code: string, env: Env): Promise<Response> {
  const target = await env.LINKS.get(code);
  if (!target) {
    return new Response("Short link not found", { status: 404 });
  }
  return Response.redirect(target, 302);
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
