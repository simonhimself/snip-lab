# Operations

How Snip is deployed and configured. For using and developing Snip, see the [README](../README.md).

## Deployments

Snip is the Cloudflare Worker `snip-lab`, live at https://snip-lab.simons.workers.dev.

| Trigger | Result |
|---|---|
| Push or merge to `main` | **Workers Builds** runs `npx wrangler deploy` → production |
| Push any other branch | Workers Builds runs `npx wrangler preview` → a Preview at `<branch>-snip-lab.simons.workers.dev`, linked in the pull request |
| `npm run deploy` on your machine | Manual production deploy (avoid; it can ship uncommitted changes) |

Each build shows as a check on the commit or pull request in GitHub. After a deploy, verify with:

```sh
scripts/smoke-test.sh https://snip-lab.simons.workers.dev
```

Note: each smoke-test run creates one real `example.com` link in the target's KV.

## Storage

| Environment | KV namespace | Binding |
|---|---|---|
| Production | `snip-lab-links` (`e6961fe5…`) | `LINKS`, top level of `wrangler.jsonc` |
| All Previews | `snip-lab-preview-links` (`06bc2a7c…`) | `LINKS`, in the `previews` block |
| `wrangler dev` | Local simulation in `.wrangler/` | `LINKS` |

Keep the production `id` in `wrangler.jsonc`. Without it, a Workers Builds deploy could provision a second, empty namespace. Previews don't inherit production bindings, so the `previews` block is required for them to work; all Previews share one test namespace.

## Secrets

| Secret | Where it's set | How to change it |
|---|---|---|
| `ADMIN_TOKEN` (production) | Worker secret | `npx wrangler secret put ADMIN_TOKEN` (deploys immediately) |
| `ADMIN_TOKEN` (previews) | Previews Base config | `npx wrangler preview base-config secret put ADMIN_TOKEN` (applies to new Previews) |
| `ADMIN_TOKEN` (local) | `.dev.vars` (git-ignored) | Copy `.dev.vars.example` and edit |

Never commit token values. The maintainer keeps copies in the macOS Keychain under the service names `snip-lab-admin-token` and `snip-lab-preview-admin-token`:

```sh
security find-generic-password -s snip-lab-admin-token -w | pbcopy
```

## Previews

Preview URLs are public. Anyone with the link can use them, including `/admin` if they have the preview token. Delete a Preview once its pull request is merged:

```sh
npx wrangler preview delete --name <branch> --skip-confirmation
```

## Logs

Workers Logs are enabled (`observability` in `wrangler.jsonc`). View them in the Cloudflare dashboard under **Workers & Pages → snip-lab → Logs**, or query them with the Cloudflare observability MCP.
