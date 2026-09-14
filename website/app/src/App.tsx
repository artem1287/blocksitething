import { useState } from "react";
import { Quiz, type CompletedPlan } from "./quiz/Quiz";

export function App() {
  const [plan, setPlan] = useState<CompletedPlan | null>(null);

  if (plan) {
    // Account creation, checkout, and the dashboard land once the backend (Supabase + Stripe)
    // is wired up — see ARCHITECTURE.md. This placeholder exists so the quiz's own "Save My
    // Plan" action has somewhere real to go, rather than a dead button, without pretending an
    // account was actually created.
    return (
      <div className="quiz-shell">
        <div className="quiz-body">
          <div className="quiz-card">
            <span className="quiz-eyebrow">Plan built</span>
            <h1 className="quiz-title">Almost there.</h1>
            <p className="quiz-sub">
              Account creation and checkout aren't wired up in this build yet — your answers are
              shown below exactly as they'd be saved once that's connected.
            </p>
            <pre
              style={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                padding: 16,
                fontSize: 12.5,
                overflowX: "auto",
              }}
            >
              {JSON.stringify(plan, null, 2)}
            </pre>
            <button className="btn-text" onClick={() => setPlan(null)}>
              Start over
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <Quiz onComplete={setPlan} />;
}
