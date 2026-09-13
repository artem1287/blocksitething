# @taper/extension

Phase 2 MVP: flat manual blocklist, one flat daily schedule, a redirect-based block page, and
today-only stats. No taper curve yet — that's Phase 3, layered on top of this without changing
this phase's data model.

## Load it locally

```
npm install
npm run build --workspace=@taper/extension
```

Then in Chrome/Edge: `chrome://extensions` → enable Developer mode → **Load unpacked** →
select `extension/dist`. In Firefox: `about:debugging#/runtime/this-firefox` → **Load Temporary
Add-on** → select `extension/dist/manifest.json`.

For live-reloading during development, `npm run dev --workspace=@taper/extension` instead, and
load the same `dist` folder unpacked — CRXJS's dev server pushes updates into the loaded extension.

## Try the golden path

1. Open the popup (toolbar icon) → **Open full settings**.
2. Add a domain (e.g. `example.com`) — Chrome will prompt for permission on that one site only.
3. Enable the schedule, set a window that includes right now, save.
4. Visit the domain you added — it should redirect to the blocked page within ~1 minute (the
   background alarm tick) or immediately if you re-save the schedule/blocklist (storage changes
   trigger an immediate recompute, not just the alarm).
5. Check **Today's stats** in options — the blocked visit should be counted.

## What I could not verify from here

This was built and unit-tested (`npm run test --workspace=@taper/extension`) and typechecks and
builds cleanly, but actually loading an unpacked MV3 extension and clicking through it requires a
real Chrome/Firefox profile with extension management — the sandboxed preview browser used for
other web work in this project can't do that. Please run through the golden path above once and
report back anything that doesn't behave as expected.
