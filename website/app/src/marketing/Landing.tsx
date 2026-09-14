interface LandingProps {
  onGetStarted: () => void;
}

export function Landing({ onGetStarted }: LandingProps) {
  return (
    <>
      <header className="site">
        <div className="nav-row">
          <button className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Taper<span className="dot">.</span>
          </button>
          <nav className="links">
            <a href="#how">How it works</a>
            <a href="#compare">Compare</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <button className="mkt-btn mkt-btn-primary mkt-btn-small" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="wrap-wide hero-grid">
          <div>
            <span className="eyebrow">
              <span className="pulse"></span>Early test build
            </span>
            <h1 className="hero-title">Get your time back.</h1>
            <p className="hero-sub">Blocks Instagram, TikTok, YouTube — whatever's eating your day.</p>
            <div className="hero-cta-row">
              <button className="mkt-btn mkt-btn-primary" onClick={onGetStarted}>
                Get Started →
              </button>
              <a className="mkt-btn mkt-btn-ghost" href="#how">
                See How
              </a>
            </div>
            <p className="fine-print">Free during testing. No account needed to try the quiz.</p>
          </div>
          <div className="mock-blocked">
            <span className="mock-chip">Blocked</span>
            <h5>instagram.com is blocked</h5>
            <p>You're out of time here today.</p>
            <p className="mock-suggest">Try this instead: take a 2-minute walk.</p>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="wrap">
          <span className="kicker">What it blocks</span>
          <h2 className="section-title">The usual suspects.</h2>
          <p className="lede">Pick from ready-made lists. Add your own too.</p>
          <div className="chip-row">
            <span className="chip">📱 Social Media</span>
            <span className="chip">📺 Video &amp; Streaming</span>
            <span className="chip">🛒 Shopping</span>
            <span className="chip">📰 News</span>
            <span className="chip">🎮 Gaming</span>
            <span className="chip">💬 Dating</span>
          </div>
        </div>
      </section>

      <section id="how" className="mkt-section section-alt">
        <div className="wrap">
          <span className="kicker">How it works</span>
          <h2 className="section-title">Three taps.</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num"></div>
              <div>
                <h4>Choose Your Sites</h4>
                <p>Pick from ready-made lists, or add your own.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num"></div>
              <div>
                <h4>Set Your Limit</h4>
                <p>Tell us how much time feels like too much.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num"></div>
              <div>
                <h4>Stay On Track</h4>
                <p>Go over, and you'll see a quick reminder screen instead.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="wrap">
          <span className="kicker">Why this works</span>
          <h2 className="section-title">A ramp, not a wall.</h2>
          <p className="lede">
            Most blockers just slam the door shut and people give up in a week. This one eases you
            out instead, so it actually sticks.
          </p>
          <div className="before-after">
            <div className="ba-stat">
              <div className="amount mono">2 hrs</div>
              <div className="label">Before, per day</div>
            </div>
            <div className="ba-arrow">→</div>
            <div className="ba-stat">
              <div className="amount mono after">20 min</div>
              <div className="label">A few weeks in</div>
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="mkt-section section-alt">
        <div className="wrap-wide">
          <span className="kicker">How it compares</span>
          <h2 className="section-title">Most stop at off.</h2>
          <p className="lede">Freedom, Cold Turkey, and Opal are all good hard blockers. That's the whole toolkit, though.</p>
          <div className="table-scroll">
            <table className="compare">
              <thead>
                <tr>
                  <th>App</th>
                  <th>Approach</th>
                  <th>Suggests what's next</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th>Taper</th>
                  <td>Shrinks over time, plus one instant block</td>
                  <td className="yes">Yes</td>
                  <td>Free now, ~$7/mo later</td>
                </tr>
                <tr>
                  <th>Freedom</th>
                  <td>Hard block only</td>
                  <td className="no">No</td>
                  <td>$8.99/mo</td>
                </tr>
                <tr>
                  <th>Cold Turkey</th>
                  <td>Hard block, locks you out</td>
                  <td className="no">No</td>
                  <td>One-time fee</td>
                </tr>
                <tr>
                  <th>Opal</th>
                  <td>Hard block, can't turn off</td>
                  <td className="no">No</td>
                  <td>$19.99/mo</td>
                </tr>
                <tr>
                  <th>One Sec</th>
                  <td>Pause screen first</td>
                  <td className="no">Some tips</td>
                  <td>Free + paid plans</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="price-note">Competitor prices as published on their own sites — check theirs before deciding.</p>
        </div>
      </section>

      <section id="pricing" className="mkt-section">
        <div className="wrap">
          <span className="kicker">Pricing</span>
          <h2 className="section-title">Free right now.</h2>
          <div className="price-banner">Free during testing. No card needed.</div>
          <div className="price-cards">
            <div className="price-card featured">
              <span className="tag">Best Value</span>
              <div className="amount">
                $3.33<span>/mo, billed $39.99/yr</span>
              </div>
              <div>
                <span className="was">$83.88/yr</span>{" "}
                <span style={{ fontSize: 12, color: "var(--muted)" }}>at the monthly rate</span>
              </div>
              <ul>
                <li>Everything in monthly</li>
                <li>7-day free trial</li>
                <li>Sync across devices</li>
              </ul>
            </div>
            <div className="price-card">
              <span className="tag">Monthly</span>
              <div className="amount">
                $6.99<span>/mo</span>
              </div>
              <ul>
                <li>All block plans</li>
                <li>Streaks &amp; history</li>
                <li>Emergency pass</li>
              </ul>
            </div>
          </div>
          <p className="price-note">These are planned prices. Nothing is charged yet.</p>
        </div>
      </section>

      <section id="faq" className="mkt-section section-alt">
        <div className="wrap">
          <span className="kicker">FAQ</span>
          <h2 className="section-title">Before you install it.</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h4>Will it actually block me?</h4>
              <p>Yes. One site blocks completely during hours you choose. Everything else gets a daily limit.</p>
            </div>
            <div className="faq-item">
              <h4>What about real emergencies?</h4>
              <p>You get one free pass a week. It waits 10 minutes, then unlocks for the day.</p>
            </div>
            <div className="faq-item">
              <h4>Does it work in private windows?</h4>
              <p>Yes, once you flip on one Chrome setting. We'll walk you through it.</p>
            </div>
            <div className="faq-item">
              <h4>Does it work on my phone?</h4>
              <p>Not yet — this is a browser extension for your computer.</p>
            </div>
            <div className="faq-item">
              <h4>Is my browsing private?</h4>
              <p>Yes. Everything stays on your device. We don't see it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mkt-section">
        <div className="wrap">
          <span className="kicker">Where this stands</span>
          <h2 className="section-title">No customers yet.</h2>
          <div className="note-card">
            <p>
              I built this because every blocker I tried was too easy to turn off. This is a small
              test group, not a finished product — tell me what's broken.
            </p>
            <div className="note-sig">— built by a solo developer, currently in private testing</div>
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <span className="kicker">Ready?</span>
          <h2>Try it free.</h2>
          <p className="lede" style={{ marginLeft: "auto", marginRight: "auto" }}>
            Takes about a minute to build your plan.
          </p>
          <div className="hero-cta-row">
            <button className="mkt-btn mkt-btn-primary" onClick={onGetStarted}>
              Get Started →
            </button>
            <a className="mkt-btn mkt-btn-ghost" href="mailto:dmitry.shishkin@gmail.com?subject=Taper%20feedback">
              Send Feedback
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="wrap-wide">
          <div className="footer-row">
            <div className="wordmark" style={{ fontSize: 17 }}>
              Taper<span className="dot">.</span>
            </div>
            <div className="footer-links">
              <a href="#privacy">Privacy</a>
              <a href="#how">How it works</a>
              <a href="#faq">FAQ</a>
            </div>
          </div>
          <div id="privacy">
            <h3>Privacy, plainly</h3>
            <p>No company or account system exists yet. Here's what that means today.</p>
            <h4>What stays on your device</h4>
            <p>
              Your blocklist, settings, and time spent on tracked sites stay in your browser. None
              of it is sent anywhere. Uninstalling deletes it all.
            </p>
            <h4>What I collect</h4>
            <p>Nothing automatically. If you email me, I have your message and your address — only to reply.</p>
            <h4>What changes later</h4>
            <p>A paid version will need an account and a server. This policy gets rewritten first, before that applies to you.</p>
            <h4>Questions</h4>
            <p>
              Email <a href="mailto:dmitry.shishkin@gmail.com">dmitry.shishkin@gmail.com</a>.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
