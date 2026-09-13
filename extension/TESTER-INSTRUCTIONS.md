# Trying out Taper (early test build)

This is an early test version — not on the Chrome Web Store yet, so there's one extra step to
install it. Takes about a minute.

## Install (Chrome or Edge)

1. Unzip the file you were sent — you'll get a folder.
2. Open `chrome://extensions` (or `edge://extensions` in Edge) in your browser's address bar.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked**, then select the unzipped folder.
5. You should see "Taper — gradual site blocker" appear in your extensions list, and its icon in
   your toolbar.

Chrome/Edge will show a "Developer mode extensions" warning banner sometimes — that's expected for
a test build like this, not a sign anything's wrong.

## Firefox

1. Unzip the file.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on**, then select the `manifest.json` file inside the unzipped
   folder.
4. Note: Firefox removes temporary add-ons when you restart the browser, so you'll need to redo
   this step after a restart.

## What to try

1. Click the toolbar icon, then **Open full settings**.
2. Add a site you actually want to cut back on.
3. Under **Taper plan (Premium)**, click **Enable taper plan** and pick a pace (Gentle, Moderate,
   or Aggressive). This is free during testing — no account or payment needed.
4. Use the internet normally. Once you've used up that site's daily allowance, visiting it will
   redirect to a blocked page instead.
5. If you're in a genuine bind, that blocked page offers one "I need a few more minutes" pass per
   week, with a short wait before it kicks in.

## Reporting back

Anything that feels wrong, confusing, or broken is useful feedback — including "it didn't block me
when I expected it to" and "the numbers don't make sense." No detail is too small.
