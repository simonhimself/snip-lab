// Admin API for Snip. Every route needs `Authorization: Bearer <ADMIN_TOKEN>`.
//
//   GET    /api/admin/links        -> { links: AdminLink[] } (all keys in KV)
//   DELETE /api/admin/links/:code  -> 204 (or 404 if the code doesn't exist)
//
// Locally ADMIN_TOKEN comes from .dev.vars; in production it is a secret
// (`npx wrangler secret put ADMIN_TOKEN`). Never commit the real token.

interface AdminLink {
  code: string;
  url: string;
  clicks: number | null; // null for legacy entries (no counter stored)
  createdAt: string | null;
  expiresAt: string | null;
  expired: boolean; // past expiresAt but KV hasn't deleted the key yet
  legacy: boolean; // old value stored as a plain URL string, not JSON
}

const LINKS_PREFIX = "/api/admin/links";

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  // Check auth before routing so unauthenticated callers learn nothing,
  // not even which admin routes exist.
  if (!(await isAuthorized(request, env))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": "Bearer" } },
    );
  }

  if (url.pathname === LINKS_PREFIX && request.method === "GET") {
    return Response.json({ links: await listLinks(env) });
  }

  if (url.pathname.startsWith(`${LINKS_PREFIX}/`) && request.method === "DELETE") {
    return deleteLink(url.pathname.slice(LINKS_PREFIX.length + 1), env);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

// A plain `===` stops at the first differing character, so response times
// would leak how much of a guessed token is right. We hash both sides first:
// timingSafeEqual needs equal-length inputs, and comparing fixed-size SHA-256
// digests also avoids leaking the real token's length.
async function isAuthorized(request: Request, env: Env): Promise<boolean> {
  const expected = env.ADMIN_TOKEN;
  // An unset/empty token must never match an empty "Bearer " header.
  if (!expected) return false;

  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) return false;

  const encoder = new TextEncoder();
  const [given, wanted] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(match[1])),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(given, wanted);
}

// KV list() returns at most 1000 keys per call, so follow the cursor until
// list_complete. Fine for a hobby project; a big dataset would want paging
// in the API too.
async function listLinks(env: Env): Promise<AdminLink[]> {
  const links: AdminLink[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.LINKS.list({ cursor });
    const values = await Promise.all(page.keys.map((key) => env.LINKS.get(key.name)));
    page.keys.forEach((key, i) => {
      const link = toAdminLink(key.name, values[i]);
      if (link) links.push(link);
    });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  // Newest first; legacy entries (no createdAt) go last.
  return links.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
}

// Values are normally JSON LinkRecords, but some old local test keys hold a
// plain URL string. Show those as legacy instead of failing the whole list.
function toAdminLink(code: string, raw: string | null): AdminLink | null {
  if (raw === null) return null; // deleted between list() and get()

  let record: unknown;
  try {
    record = JSON.parse(raw);
  } catch {
    record = undefined;
  }

  if (isRecord(record)) {
    const expiresAt = typeof record.expiresAt === "string" ? record.expiresAt : null;
    return {
      code,
      url: record.url,
      clicks: typeof record.clicks === "number" ? record.clicks : 0,
      createdAt: typeof record.createdAt === "string" ? record.createdAt : null,
      expiresAt,
      expired: expiresAt !== null && Date.parse(expiresAt) <= Date.now(),
      legacy: false,
    };
  }

  return {
    code,
    url: raw,
    clicks: null,
    createdAt: null,
    expiresAt: null,
    expired: false,
    legacy: true,
  };
}

function isRecord(value: unknown): value is { url: string; [key: string]: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { url?: unknown }).url === "string"
  );
}

async function deleteLink(rawCode: string, env: Env): Promise<Response> {
  let code: string;
  try {
    code = decodeURIComponent(rawCode);
  } catch {
    return Response.json({ error: "Invalid code" }, { status: 400 });
  }
  if (!code || (await env.LINKS.get(code)) === null) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  await env.LINKS.delete(code);
  return new Response(null, { status: 204 });
}
