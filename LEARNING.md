# Learning path: OpenChamber + GitHub + Cloudflare

You'll build **Snip**, a URL shortener, through 11 missions. Each mission teaches one workflow. Tick the boxes as you go (editing this file is fine; it's your notebook).

> **Golden rule:** one task = one session. Start a fresh session for each mission unless it says otherwise.

```
Mission map

 0  Tour                     OpenChamber basics: chats vs projects, In work
 1  First commit             git basics in the Git tab
 2  Publish to GitHub        remotes, push
 3  Run it                   Project Actions + browser panel
 4  Write issues             GitHub issues, labels
 5  Fix a bug                branch → fix → "Closes #1" → merge
 6  Prepare for worktrees    setup commands (the .dev.vars / node_modules trap)
 7  Two agents in parallel   worktrees from issues, Integrate
 8  Merge conflict           two worktrees edit the same code on purpose
 9  Ship it                  deploy to Cloudflare, secrets, Workers Builds
10  Pull request + preview   PR flow, preview URLs, merge on GitHub
11  Observe & tidy up        Cloudflare MCP logs, cleanup, scheduled task
```

---

## Mission 0: Tour (10 min)

**Goal:** know where things live in OpenChamber.

- [ ] In the sidebar, click **+ next to "chats"** and ask: *"In one paragraph, what is Cloudflare Workers KV?"* That's a **chat**: it has no project and no git, and it's good for throwaway questions.
- [ ] Find this folder in the sidebar as a **project**. Every session you start here runs with this folder as its working directory.
- [ ] Hover any session → press the **eye** icon → it moves to **In work**. Press the **check** to mark it done. Use In work for "things I haven't finished".

**What you learned:** chats are for questions, projects are for real work, and In work is your to-do list of sessions.

---

## Mission 1: First commit (10 min)

**Goal:** save a first snapshot of the project.

A **commit** is a save point. Git only records what you **stage** (pick) and then **commit**.

- [ ] Open the **Git** tab in the right sidebar. You'll see every file as "unstaged". Notice that `node_modules/`, `.wrangler/` and `.dev.vars` aren't listed: `.gitignore` hides them.
- [ ] Click a file to see its diff. Then stage everything.
- [ ] Use the **generate commit message** button (it uses this session's model), or write `chore: initial snip starter`. Commit.
- [ ] Look at the history view. One commit on branch `main`.

**What you learned:** stage → commit. `.gitignore` keeps junk and secrets out of git.

---

## Mission 2: Publish to GitHub (10 min)

**Goal:** back the repo up on GitHub. GitHub becomes the **remote** called `origin`.

- [ ] Connect GitHub once in OpenChamber: **Settings → Integrations → GitHub → Connect GitHub**.
- [ ] Create the GitHub repo. Ask the agent in a session: *"Create a **private** GitHub repo called `snip-lab` from this folder with `gh` and push `main`. Explain each step."*
- [ ] Open the repo on github.com and find your commit.

**What you learned:** a remote is the online copy, and **push** sends commits there. From now on, `main` on GitHub is the "official" version.

---

## Mission 3: Run it with a Project Action (10 min)

**Goal:** a one-click dev server.

- [ ] Create `.dev.vars` from the example: in a session type `!cp .dev.vars.example .dev.vars` (the `!` runs a shell command).
- [ ] Run `!npm install` (if you haven't).
- [ ] **Settings → Projects → (this project) → Project Actions → Add**: name `Dev server`, command `npm run dev`, icon `rocket`, turn **auto-open URL** on.
- [ ] Run it from the actions menu in the header. Open the app in the **browser panel** and shorten a link.
- [ ] Visit `http://localhost:8787/api/health`. `adminTokenConfigured` should be `true`. Remember that; it matters in Mission 6.
- [ ] Optional: in Settings → Projects, use **Move to repository** on the action. It's saved to `.openchamber/project.json` and will be committed with the code.

**What you learned:** Project Actions are saved commands, and the browser panel lets you (and the agent) view the running app.

---

## Mission 4: Write the issues (15 min)

**Goal:** turn the work into GitHub issues, the repo's to-do list.

The drafts are in `issues/`. The order matters, because GitHub numbers issues #1, #2, … and the missions refer to those numbers.

- [ ] **By hand, on github.com:** open your repo → **Issues → New issue**. Copy the title and body from `issues/01-block-dangerous-urls.md` and add the labels `bug` and `good first issue`. Submit. That's **#1**.
- [ ] **By agent:** in a session: *"Create GitHub issues from issues/02 to issues/06, in order, using the title and labels from each file's front matter and the rest as the body. Use gh."* These become #2–#6.
- [ ] Back in OpenChamber, open the composer's **+ menu → GitHub**. You should see your issues.

**What you learned:** an issue = one well-described piece of work. Good issues are what make agents effective: clear "what", "why", and acceptance criteria.

---

## Mission 5: Fix a bug the normal way (20 min)

**Goal:** the basic loop of **branch → change → commit → merge → push**, without worktrees. Use it whenever only one task is running in a repo.

- [ ] Git tab → create and switch to a new branch: `fix/dangerous-urls`.
- [ ] New session. **+ menu → GitHub → pick issue #1**, then type: *"Fix this issue."* Send.
- [ ] Reproduce the bug first, then check the fix: try `javascript:alert(1)` in the browser panel before and after.
- [ ] Commit in the Git tab. Make sure the message body contains `Closes #1`.
- [ ] Merge into `main`. Ask the agent: *"Merge fix/dangerous-urls into main, delete the branch, and push main."*
- [ ] On GitHub: issue #1 is **closed automatically** and links to your commit. 🎉

**What you learned:** branches keep `main` clean while you work, and `Closes #N` links code to issues.

---

## Mission 6: Prepare for worktrees (15 min)

**Goal:** see the worktree trap for yourself, then fix it once.

A worktree is a fresh checkout from git, so anything git ignores **isn't there**: no `node_modules`, no `.dev.vars`.

- [ ] Branch menu above the composer → **Quick worktree**. In that session run `!npm run dev`. It fails (`wrangler: command not found`). That's the trap.
- [ ] Archive that session and let OpenChamber delete the worktree and branch.
- [ ] **Settings → Projects → (this project) → Worktree setup commands**, add:
  ```
  npm install
  cp "$ROOT_PROJECT_PATH/.dev.vars" .dev.vars
  ```
  and turn on **wait for setup**. (`$ROOT_PROJECT_PATH` = this main folder.)
- [ ] Create another Quick worktree. Dev server works, and `/api/health` says `adminTokenConfigured: true`. Archive it again.

**What you learned:** worktrees are separate folders, and setup commands make every new one usable immediately.

---

## Mission 7: Two agents in parallel (30 min)

**Goal:** run two tasks at the same time without them overwriting each other.

Issues **#2 (click counter, backend only)** and **#3 (QR code, frontend only)** touch different files, so they're safe to run in parallel.

- [ ] New session → branch menu → **New worktree… → Start from: issue → #2**. The branch gets the issue's name and the issue is attached. Type *"Implement this issue."* and send.
- [ ] Right away, do the same for **#3** in a second worktree. Both agents are now working at the same time.
- [ ] While they work: put both sessions **In work** (eye icon). Open the Git tab in each and notice that each one only sees its own changes.
- [ ] Test each one with the Dev server action **from inside that worktree's session**. Each worktree runs its own copy of the app. (If port 8787 is busy, stop the other dev server first.)
- [ ] When #2 is good: commit (with `Closes #2`) → **Integrate** into `main`. Then the same for #3.
- [ ] Push `main`. Issues #2 and #3 close. Mark both sessions done and archive them (delete worktree + branch).

**What you learned:** worktrees + Integrate = parallel agents with no collisions.

---

## Mission 8: A merge conflict, on purpose (30 min)

**Goal:** stay calm when git says "conflict".

Issues **#4 (custom codes)** and **#5 (link expiry)** both change `createLink()` in `src/index.ts` and the form in `public/index.html`. Run them in parallel anyway.

- [ ] Start a worktree from **#4** and one from **#5** (same as Mission 7). Let both agents finish.
- [ ] Integrate **#4** into `main` first. Smooth.
- [ ] Integrate **#5**. 💥 **Conflict.** Git doesn't know how to combine two edits to the same lines.
- [ ] Open the conflicted file and read the markers before fixing anything:
  ```
  <<<<<<< one side
  ...
  =======
  ...
  >>>>>>> other side
  ```
- [ ] Hand the conflict to the agent from the conflict view. Tell it: *"Keep both features: custom codes AND expiry must both work."*
- [ ] Test that both features work together, finish the merge, push. #4 and #5 close.

**What you learned:** conflicts are normal. You resolve them by deciding what the combined code should be. To avoid them, split parallel work by area (Mission 7) and merge often.

---

## Mission 9: Ship it to Cloudflare (20 min)

**Goal:** Snip goes live on `snip-lab.<your-subdomain>.workers.dev`.

- [ ] `!npx wrangler login` (opens the browser) and then `!npx wrangler whoami`.
- [ ] `!npm run deploy`. Wrangler **creates the KV namespace automatically** and writes its `id` into `wrangler.jsonc`.
- [ ] Look at the Git tab: `wrangler.jsonc` changed. Commit it (`chore: add KV namespace id`) and push. Tools change files too, and those changes belong in git.
- [ ] Set the production admin token **without putting it in git or chat**: run `npx wrangler secret put ADMIN_TOKEN` in a terminal and type a strong value at the prompt.
- [ ] Open your live URL and shorten a link from your phone. 🚀
- [ ] **Auto-deploy from GitHub:** in the Cloudflare dashboard → **Workers & Pages → snip-lab → Settings → Builds → Connect** your `snip-lab` repo, production branch `main`, and enable **preview builds**. From now on, pushing to `main` deploys automatically.

**What you learned:** `wrangler deploy` = manual deploy, Workers Builds = deploy on push. Secrets live on Cloudflare, never in git.

---

## Mission 10: Pull request + preview URL (30 min)

**Goal:** the "proper" flow, even when you work alone. You review a change **before** it reaches `main`, on a live preview.

- [ ] Start a worktree from issue **#6 (admin page)**.
- [ ] Switch the agent selector from **Build** to **Plan** and ask: *"Plan how to implement this issue."* Read the plan and push back on anything unclear. Then switch to **Build**: *"Implement the plan."*
- [ ] Ask the agent: *"Why does the token comparison need to be timing-safe?"* 🧠
- [ ] Commit, then push the **branch** (not main) from the Git tab.
- [ ] **PR tab → Create pull request.** Let OpenChamber generate the title and description. Make sure it says `Closes #6`.
- [ ] On GitHub, open the PR: Workers Builds comments a **preview URL**. Test the admin page there. (Check the Cloudflare Previews docs on whether previews share production KV; ask the agent to look it up.)
- [ ] Look at the **Files changed** tab on GitHub and leave yourself a review comment.
- [ ] Merge the PR (on GitHub or from the PR tab). Production auto-deploys. Pull `main` locally.

**What you learned:** a PR = a reviewable proposal with its own preview environment. Solo, you merge it yourself; on a team, someone else reviews it first.

---

## Mission 11: Observe and tidy up (15 min)

- [ ] Ask the agent: *"Use the Cloudflare observability tools to show me the last hour of requests and errors for the snip-lab Worker."* The Cloudflare MCP reads your production logs.
- [ ] Clean up: Git tab → delete merged branches; archive finished sessions; mark In work items done.
- [ ] Optional: **Scheduled task**, weekly: *"List open GitHub issues in snip-lab and suggest which two can safely run in parallel worktrees."*
- [ ] Optional: write a new issue of your own (ideas: link preview cards, password-protected links, rate limiting with Durable Objects) and run it through the full flow without reading this file.

---

## Cheat sheet

| I want to… | Do this |
|---|---|
| Ask a quick question | **Chat** (+ next to chats) |
| Work on one task | Session in the project, on a branch |
| Run tasks in parallel | One **worktree** per task |
| Start from an issue | New worktree → start from issue (or + menu → GitHub) |
| Save progress | Git tab → stage → commit |
| Bring a worktree back | Git tab → **Integrate** |
| Close an issue with code | `Closes #N` in commit or PR |
| Review before main | Push branch → **PR tab** → create PR |
| Deploy | Push to `main` (Workers Builds) or `npm run deploy` |
| Not lose track | **In work** (eye icon) |

## Glossary

- **Repository (repo):** a folder whose history git tracks.
- **Commit:** a save point with a message.
- **Branch:** a separate line of commits; `main` is the official one.
- **Merge / Integrate:** bring one branch's commits into another.
- **Conflict:** two branches changed the same lines, so a human (or agent) decides the result.
- **Remote / origin:** the copy on GitHub. **Push** = send, **pull** = receive.
- **Worktree:** an extra folder with the same repo checked out on a different branch.
- **Issue:** a described piece of work on GitHub, numbered `#N`.
- **Pull request (PR):** a proposal to merge a branch, with diff, discussion, and preview.
