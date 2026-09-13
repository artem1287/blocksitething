# @taper/extension

Phase 2 built a flat manual blocklist, one flat daily schedule, and a redirect-based block page
with today-only stats — the free tier. Phase 3 layers a premium taper plan on top, per-domain,
without changing that free-tier data model: pace-tier curves, a hard-blocked "worst offender"
during focus hours, real active+focused-tab time tracking, the escape valve, and streaks.

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

## Try the taper plan (Premium preview)

The "Premium" gate here is a local toggle only — real billing/entitlement enforcement is Phase 4.

1. In options, add a domain if you haven't, then under **Taper plan (Premium)** click **Enable
   taper plan**. This anchors day 1 to today and switches that domain from schedule-based to
   allowance-based blocking — the schedule section above stops applying.
2. Pick a pace tier. To see a block quickly without waiting around, temporarily set a very small
   floor (e.g. 0) — day 1's allowance is `baseline × (1 − frontLoadPct)`, e.g. ~76 minutes for a
   90-minute default baseline on Gentle, so realistically you'd want to lower the per-site
   baseline via a fresh **1–2h** vs **under 30 min** bucket pick when adding the domain, or just
   let it run — the extension tracks real time on the domain (active *and* focused tab only) and
   flushes every ~30s, so leaving the tab focused and idle-clicking around it will accumulate.
3. Optionally set that same domain as **Worst offender** with focus hours covering right now —
   it'll hard-block immediately regardless of any remaining allowance.
4. Once the allowance is exhausted, visiting the domain redirects to the blocked page showing
   minutes used/allowed, a suggestion, and (if the 7-day cooldown hasn't been used) an escape
   valve — request it, wait out the 10-minute countdown shown on the page, and it should redirect
   you back in with a one-time bonus for today only.
5. Try **Preview change** → **Confirm** on a pace-tier edit while the plan is already active — it
   should show "adds ~N days" and stage the change for tomorrow rather than applying it now (the
   ratchet from Section 2.3). There's no way to fast-forward local midnight from the UI to see it
   actually apply; that's inherently a multi-day test.
6. The 48h baseline reconciliation and the day-3+ streak/reclaimed-time numbers are also
   real-time-dependent — I could not exercise either end-to-end without days actually passing.
   The logic each depends on (`computeDayIndex`, `reconciledEntryBaseline`, `nextStreakCount`,
   `dayOutcomeRespected`) is unit-tested in isolation; the integration is unverified live.

## What I could not verify from here

This was built and unit-tested (`npm run test --workspace=@taper/extension`) and typechecks and
builds cleanly, but actually loading an unpacked MV3 extension and clicking through it requires a
real Chrome/Firefox profile with extension management — the sandboxed preview browser used for
other web work in this project can't do that. Please run through the golden path above once and
report back anything that doesn't behave as expected.
