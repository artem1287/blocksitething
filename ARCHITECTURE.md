# Architecture note — Phase 1

Working codename: **taper**. Used for the repo folder, npm package scopes (`@taper/*`), and internal
naming only — renaming later is a find-and-replace, not an architecture change, so it isn't blocking
anything.

## Repo structure

Single monorepo, npm workspaces (no extra tooling like Turborepo/Nx for now — three projects don't
need it yet, and it's easy to add later if builds get slow):

```
taper/
  package.json            root workspace config
  tsconfig.base.json       shared strict TS config, extended by each project
  packages/
    taper-engine/          pure TS taper-curve module — Section 2. No chrome.* or DOM deps.
  extension/                Manifest V3 extension (Chrome + Firefox + Edge)
  backend/                  Supabase project (Postgres schema, Auth, Edge Functions)
  website/                  Next.js marketing site
```

Each of `extension/`, `backend/`, `website/` deploys independently (extension → store zip, backend →
Supabase project, website → Vercel) even though they live in one repo. `packages/taper-engine` is
consumed by `extension` as a workspace dependency; it has zero browser-API or Node dependencies so it
stays independently unit-testable and portable if a mobile app ever needs the same curve math.

## Confirmed stack choices (Section 7, as amended by your answers)

| Layer | Choice | Why |
|---|---|---|
| Extension language/target | TypeScript, Manifest V3 | Per brief. |
| Browser scope | **Chrome + Firefox + Edge from day one** | You chose this over Chrome-only-at-launch. Pulls in `webextension-polyfill` from Phase 2 onward, and means the MV3 background logic (2.5) is written against polyfilled promise-based APIs, not raw `chrome.*` callbacks, from the start. Adds a second store review (AMO) to the launch checklist (Phase 7). |
| Bundler/UI | Vite + CRXJS + React | Per brief; CRXJS handles MV3 manifest/HMR wiring for Vite. |
| Taper engine | Pure TS module, `packages/taper-engine`, Vitest | Per brief — zero `chrome.*` deps, tests written alongside/before implementation in Phase 3. |
| Backend | **Supabase** (Postgres + Auth + Storage + Edge Functions) | You asked for "anything free I can test with and send to a few people." Supabase's free tier covers Postgres, auth, and edge functions with no cost to stand up and share with a small test group, and gives us a real Postgres underneath if we outgrow it later — no rewrite, just a paid tier or self-hosting the same schema. |
| Billing | Stripe, added in Phase 4 | Will run in **test mode** first (test API keys, test-mode webhooks) so the "send to a few people" milestone doesn't require live billing or a finished merchant-of-record setup (Section 9). Flip to live keys when that's actually ready. |
| Website | Next.js on Vercel | Needs componentized hero/copy variants per traffic source (Section 6) — plain static HTML makes that harder to maintain than a component-based framework. Vercel free tier covers early traffic. |
| Analytics | **PostHog** | You confirmed this. Free tier (1M events/mo) covers early testing; bundled feature flags are useful later for A/B-testing pace-tier framing and paywall copy without extra tooling. |

## What Phase 1 does *not* include yet

- No real extension code (manifest, background worker, popup UI) — that's Phase 2.
- No taper-curve math — `packages/taper-engine` currently exports a version constant and one smoke
  test, just to prove the workspace/test toolchain resolves correctly. Real implementation and full
  unit coverage is Phase 3, written test-first per your instruction.
- No Supabase project has actually been created yet (no `supabase/` folder with migrations) — that's
  Phase 4, once accounts/billing are in scope.
- No Next.js scaffold yet — that's Phase 6.

## Still open (Section 9, deferred until they block something)

- **Product/brand name + domain** — using `taper` as a placeholder everywhere. Cheap to change later,
  so not blocking.
- **Price points + trial length** — needed before Phase 4's Stripe products/prices are created. Will
  ask before building that part.
- **Native mobile app scope** — per the brief's own default, treating this as out of scope for v1
  unless you say otherwise. Not revisited unless it becomes relevant.
- **Business formation / merchant-of-record status** — flagged as a prerequisite outside engineering
  scope; will ask about it again once Phase 4 (real Stripe billing) is imminent, since test-mode
  billing doesn't need it but live billing does.
