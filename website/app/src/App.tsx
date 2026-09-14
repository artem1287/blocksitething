import { useState } from "react";
import { Quiz, type CompletedPlan } from "./quiz/Quiz";
import { Account } from "./account/Account";
import { Install } from "./install/Install";

type Stage = "quiz" | "account" | "install";

export function App() {
  const [stage, setStage] = useState<Stage>("quiz");
  const [plan, setPlan] = useState<CompletedPlan | null>(null);

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
