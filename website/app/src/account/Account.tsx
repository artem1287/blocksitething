import { useState } from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { CompletedPlan } from "../quiz/Quiz";

interface AccountProps {
  plan: CompletedPlan;
  onSaved: () => void;
}

/** Saves the just-built plan to `plans`/`plan_sites`, keyed to whichever user just signed in —
 *  this is the row the extension's welcome tab reads on first run (Section 3), and the same one
 *  the web dashboard edits later (Section 5). One write path, not two. */
async function savePlanForUser(userId: string, plan: CompletedPlan) {
  if (!supabase) return;

  await supabase.from("plans").upsert({
    user_id: userId,
    goal_id: plan.goalId,
    pace_tier: { ease_in: "gentle", steady: "moderate", cut_now: "aggressive" }[plan.paceLabel],
    devices: plan.devices,
  });

  const siteRows = plan.selections.flatMap((selection) =>
    selection.confirmedDomains.map((domain) => ({
      user_id: userId,
      domain,
      category: selection.categoryId,
      baseline_minutes: plan.baselines[domain] ?? 60,
    })),
  );
  if (siteRows.length > 0) {
    await supabase.from("plan_sites").upsert(siteRows, { onConflict: "user_id,domain" });
  }

  if (plan.worstOffenderDomain) {
    const { data: site } = await supabase
      .from("plan_sites")
      .select("id")
      .eq("user_id", userId)
      .eq("domain", plan.worstOffenderDomain)
      .maybeSingle();
    if (site) {
      await supabase
        .from("plans")
        .update({
          worst_offender_site_id: site.id,
          worst_offender_schedule: { enabled: true, days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1439 },
        })
        .eq("user_id", userId);
    }
  }
}

export function Account({ plan, onSaved }: AccountProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/install" },
    });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
    }
    // On success the browser navigates away to Google, then back to redirectTo — nothing more
    // to do here; App.tsx picks the session up from there.
  }

  async function handleEmailSignUp() {
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }
    if (data.user) {
      await savePlanForUser(data.user.id, plan);
      onSaved();
    }
    setBusy(false);
  }

  if (!supabaseConfigured) {
    return (
      <div className="quiz-shell">
        <div className="quiz-body">
          <div className="quiz-card">
            <span className="quiz-eyebrow">Save your plan</span>
            <h1 className="quiz-title">Not connected yet.</h1>
            <p className="quiz-sub">
              This screen needs a Supabase project configured (see website/app/.env.example) —
              it's built and ready, just waiting on real credentials.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-shell">
      <div className="quiz-body">
        <div className="quiz-card">
          <span className="quiz-eyebrow">Your plan is built</span>
          <h1 className="quiz-title">Save my plan</h1>
          <p className="quiz-sub">One tap — this is what makes it show up in the extension automatically.</p>

          <button className="btn-primary" onClick={() => void handleGoogleSignIn()} disabled={busy}>
            Continue with Google
          </button>

          {!showEmailForm ? (
            <button className="btn-text" onClick={() => setShowEmailForm(true)}>
              Use email instead
            </button>
          ) : (
            <div style={{ marginTop: 16 }}>
              <input
                type="email"
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="add-site-row"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line-strong)",
                  marginBottom: 10,
                  fontSize: 15,
                }}
              />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line-strong)",
                  marginBottom: 10,
                  fontSize: 15,
                  boxSizing: "border-box",
                }}
              />
              <button className="btn-primary" onClick={() => void handleEmailSignUp()} disabled={busy || !email || !password}>
                Save My Plan
              </button>
            </div>
          )}

          {error && <p style={{ color: "#a11", fontSize: 13.5, marginTop: 10 }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
