import { useState } from "react";
import { Landing } from "./marketing/Landing";
import { Quiz, type CompletedPlan } from "./quiz/Quiz";
import { Account } from "./account/Account";
import { Install } from "./install/Install";

type Stage = "landing" | "quiz" | "account" | "install";

export function App() {
  const [stage, setStage] = useState<Stage>("landing");
  const [plan, setPlan] = useState<CompletedPlan | null>(null);

  if (stage === "landing") {
    return <Landing onGetStarted={() => setStage("quiz")} />;
  }

  if (stage === "quiz" || !plan) {
    return (
      <Quiz
        onComplete={(p) => {
          setPlan(p);
          setStage("account");
        }}
      />
    );
  }

  if (stage === "account") {
    return <Account plan={plan} onSaved={() => setStage("install")} />;
  }

  return <Install />;
}
