// Chrome doesn't let a webpage finish installing an extension itself — the user still clicks
// "Add to Chrome" on the actual Web Store listing. This screen is the one clear step in between,
// not a wall of instructions.
//
// CHROME_WEB_STORE_URL is a placeholder: the extension isn't published to the Web Store yet
// (still test-build-only per extension/TESTER-INSTRUCTIONS.md), so this link doesn't go live
// until that listing exists.
const CHROME_WEB_STORE_URL = "https://chrome.google.com/webstore"; // TODO: real listing URL

export function Install() {
  return (
    <div className="quiz-shell">
      <div className="quiz-body">
        <div className="quiz-card">
          <span className="quiz-eyebrow">Plan saved</span>
          <h1 className="quiz-title">Install the extension</h1>
          <p className="quiz-sub">
            One click on the Chrome Web Store, then it opens itself already set up — just sign in
            once you land there.
          </p>
          <a className="btn-primary" style={{ textDecoration: "none", textAlign: "center" }} href={CHROME_WEB_STORE_URL}>
            Add to Chrome
          </a>
        </div>
      </div>
    </div>
  );
}
