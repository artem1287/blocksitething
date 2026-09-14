import { useEffect, useMemo, useState } from "react";
import {
  SITE_CATALOG,
  findCategory,
  GOALS,
  findGoal,
  DEVICE_OPTIONS,
  type DeviceId,
  baselinesForSelections,
  pickWorstOffenderCandidate,
  type CategorySelection,
  type PaceLabel,
  PULL_LEVEL_TO_USAGE,
  recommendedPaceFromPullLevels,
  type PullLevel,
  normalizeDomain,
} from "@taper/plan-builder";

export interface CompletedPlan {
  goalId: string;
  selections: CategorySelection[];
  paceLabel: PaceLabel;
  worstOffenderDomain: string | null;
  devices: DeviceId[];
  baselines: Record<string, number>;
}

const TOTAL_STEPS = 8;

const PACE_OPTIONS: { value: PaceLabel; name: string; desc: string }[] = [
  { value: "ease_in", name: "Ease me in", desc: "Small daily cuts, gentle and steady." },
  { value: "steady", name: "Steady pace", desc: "A solid pace most people can keep." },
  { value: "cut_now", name: "Cut it now", desc: "Fast cuts if you want quick results." },
];

const PULL_OPTIONS: { value: PullLevel; label: string }[] = [
  { value: "barely_notice", label: "I barely notice it" },
  { value: "sometimes_hard", label: "Sometimes hard to put down" },
  { value: "hard_to_stop", label: "Hard to stop once I start" },
];

export function Quiz({ onComplete }: { onComplete: (plan: CompletedPlan) => void }) {
  const [step, setStep] = useState(1);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [domainsByCategory, setDomainsByCategory] = useState<Record<string, string[]>>({});
  const [addSiteInput, setAddSiteInput] = useState<Record<string, string>>({});
  const [pullByCategory, setPullByCategory] = useState<Record<string, PullLevel>>({});
  const [pullStepIndex, setPullStepIndex] = useState(0);
  const [paceLabel, setPaceLabel] = useState<PaceLabel | null>(null);
  const [devices, setDevices] = useState<DeviceId[]>([]);
  const [worstOffenderDomain, setWorstOffenderDomain] = useState<string | null>(null);

  const activeCategories = selectedCategoryIds.map((id) => findCategory(id)!).filter(Boolean);
  const categoriesWithSites = activeCategories.filter((c) => (domainsByCategory[c.id] ?? []).length > 0);

  const selections: CategorySelection[] = useMemo(
    () =>
      categoriesWithSites.map((category) => ({
        categoryId: category.id,
        usageLevel: PULL_LEVEL_TO_USAGE[pullByCategory[category.id] ?? "sometimes_hard"],
        confirmedDomains: domainsByCategory[category.id] ?? [],
      })),
    [categoriesWithSites, domainsByCategory, pullByCategory],
  );

  const allConfirmedDomains = selections.flatMap((s) => s.confirmedDomains);
  const recommendedPace = useMemo(
    () => recommendedPaceFromPullLevels(Object.values(pullByCategory)),
    [pullByCategory],
  );
  const effectivePace = paceLabel ?? recommendedPace;
  const worstOffenderCandidate = useMemo(() => pickWorstOffenderCandidate(selections), [selections]);
  const effectiveWorstOffender = worstOffenderDomain ?? worstOffenderCandidate?.domain ?? null;
  const baselines = useMemo(() => baselinesForSelections(selections), [selections]);

  function goTo(n: number) {
    setStep(Math.min(TOTAL_STEPS, Math.max(1, n)));
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        setDomainsByCategory((d) => {
          const { [id]: _removed, ...rest } = d;
          return rest;
        });
        return prev.filter((c) => c !== id);
      }
      const category = findCategory(id)!;
      setDomainsByCategory((d) => ({ ...d, [id]: category.sites.map((s) => s.domain) }));
      return [...prev, id];
    });
  }

  function toggleSite(categoryId: string, domain: string) {
    setDomainsByCategory((prev) => {
      const current = prev[categoryId] ?? [];
      const next = current.includes(domain) ? current.filter((d) => d !== domain) : [...current, domain];
      return { ...prev, [categoryId]: next };
    });
  }

  function addCustomSite(categoryId: string) {
    const domain = normalizeDomain(addSiteInput[categoryId] ?? "");
    if (!domain) return;
    setDomainsByCategory((prev) => {
      const current = prev[categoryId] ?? [];
      if (current.includes(domain)) return prev;
      return { ...prev, [categoryId]: [...current, domain] };
    });
    setAddSiteInput((s) => ({ ...s, [categoryId]: "" }));
  }

  function answerPull(categoryId: string, level: PullLevel) {
    setPullByCategory((p) => ({ ...p, [categoryId]: level }));
    if (pullStepIndex + 1 < categoriesWithSites.length) {
      setPullStepIndex((i) => i + 1);
    } else {
      goTo(5);
    }
  }

  function toggleDevice(id: DeviceId) {
    setDevices((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  }

  // "Building your plan" — a real (short) pause, not an instant jump-cut, then auto-advance.
  useEffect(() => {
    if (step !== 7) return;
    const id = setTimeout(() => goTo(8), 2800);
    return () => clearTimeout(id);
  }, [step]);

  function handleSavePlan() {
    onComplete({
      goalId: goalId!,
      selections,
      paceLabel: effectivePace,
      worstOffenderDomain: effectiveWorstOffender,
      devices,
      baselines,
    });
  }

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="quiz-shell">
      <div className="quiz-header">
        <span className="quiz-wordmark">Taper</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="quiz-body">
        <div className="quiz-card">
          {step === 1 && (
            <>
              <span className="quiz-eyebrow">Step 1 of {TOTAL_STEPS}</span>
              <h1 className="quiz-title">What do you want back?</h1>
              <p className="quiz-sub">Pick what matters most right now.</p>
              <div className="option-list">
                {GOALS.map((goal) => (
                  <button
                    key={goal.id}
                    className={`option-card ${goalId === goal.id ? "selected" : ""}`}
                    onClick={() => {
                      setGoalId(goal.id);
                      goTo(2);
                    }}
                  >
                    <span className="icon">{goal.icon}</span>
                    {goal.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <span className="quiz-eyebrow">Step 2 of {TOTAL_STEPS}</span>
              <h1 className="quiz-title">Where's it going?</h1>
              <p className="quiz-sub">Tap all that apply.</p>
              <div className="option-grid">
                {SITE_CATALOG.map((category) => (
                  <button
                    key={category.id}
                    className={`option-card compact ${selectedCategoryIds.includes(category.id) ? "selected" : ""}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span className="icon">{category.icon}</span>
                    {category.label}
                  </button>
                ))}
              </div>
              <button className="btn-primary" disabled={selectedCategoryIds.length === 0} onClick={() => goTo(3)}>
                Continue
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <span className="quiz-eyebrow">Step 3 of {TOTAL_STEPS}</span>
              <h1 className="quiz-title">Confirm your sites</h1>
              <p className="quiz-sub">Uncheck anything that doesn't apply.</p>
              {activeCategories.map((category) => (
                <div className="category-group" key={category.id}>
                  <h3>
                    {category.icon} {category.label}
                  </h3>
                  {category.sites.map((site) => (
                    <label className="site-check" key={site.domain}>
                      <input
                        type="checkbox"
                        checked={(domainsByCategory[category.id] ?? []).includes(site.domain)}
                        onChange={() => toggleSite(category.id, site.domain)}
                      />
                      {site.label}
                    </label>
                  ))}
                  {(domainsByCategory[category.id] ?? [])
                    .filter((d) => !category.sites.some((s) => s.domain === d))
                    .map((customDomain) => (
                      <label className="site-check" key={customDomain}>
                        <input type="checkbox" checked onChange={() => toggleSite(category.id, customDomain)} />
                        {customDomain}
                      </label>
                    ))}
                  <div className="add-site-row">
                    <input
                      type="text"
                      placeholder="Add a site"
                      value={addSiteInput[category.id] ?? ""}
                      onChange={(e) => setAddSiteInput((s) => ({ ...s, [category.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addCustomSite(category.id)}
                    />
                    <button className="btn-text" style={{ margin: 0 }} onClick={() => addCustomSite(category.id)}>
                      Add
                    </button>
                  </div>
                </div>
              ))}
              <button className="btn-primary" disabled={allConfirmedDomains.length === 0} onClick={() => goTo(4)}>
                Continue
              </button>
            </>
          )}

          {step === 4 &&
            (() => {
              const category = categoriesWithSites[pullStepIndex];
              if (!category) {
                goTo(5);
                return null;
              }
              return (
                <>
                  <span className="quiz-eyebrow">Step 4 of {TOTAL_STEPS}</span>
                  <h1 className="quiz-title">
                    How much of a pull is {category.label.toLowerCase()}?
                  </h1>
                  <p className="quiz-sub">
                    Category {pullStepIndex + 1} of {categoriesWithSites.length}.
                  </p>
                  <div className="option-list">
                    {PULL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        className={`option-card ${pullByCategory[category.id] === opt.value ? "selected" : ""}`}
                        onClick={() => answerPull(category.id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}

          {step === 5 && (
            <>
              <span className="quiz-eyebrow">Step 5 of {TOTAL_STEPS}</span>
              <h1 className="quiz-title">Pick your pace</h1>
              <p className="quiz-sub">We picked one based on your answers — change it if you'd rather.</p>
              <div className="option-list">
                {PACE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`option-card ${effectivePace === opt.value ? "selected" : ""}`}
                    onClick={() => {
                      setPaceLabel(opt.value);
                      goTo(6);
                    }}
                  >
                    <span className="option-main">
                      {opt.name}
                      <span className="option-desc">{opt.desc}</span>
                    </span>
                    {recommendedPace === opt.value && <span className="recommended-tag">Suggested</span>}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <span className="quiz-eyebrow">Step 6 of {TOTAL_STEPS}</span>
              <h1 className="quiz-title">Which devices?</h1>
              <p className="quiz-sub">We'll use this the moment it's ready — even if it's not yet.</p>
              <div className="option-grid">
                {DEVICE_OPTIONS.map((device) => (
                  <button
                    key={device.id}
                    className={`option-card compact ${devices.includes(device.id) ? "selected" : ""}`}
                    onClick={() => toggleDevice(device.id)}
                  >
                    <span className="icon">{device.icon}</span>
                    {device.label}
                    {!device.available && <span className="unavailable-tag">Coming soon</span>}
                  </button>
                ))}
              </div>
              <button className="btn-primary" onClick={() => goTo(7)}>
                Build My Plan
              </button>
            </>
          )}

          {step === 7 && (
            <div className="transition-screen">
              <div className="transition-spinner" />
              <h1 className="quiz-title">Building your plan…</h1>
              <p className="quiz-sub">Putting your answers together.</p>
            </div>
          )}

          {step === 8 && (
            <>
              <span className="quiz-eyebrow">Your plan</span>
              <h1 className="quiz-title">Here's what we'll do.</h1>
              <p className="quiz-sub">
                Built for: {findGoal(goalId ?? "")?.label ?? "getting your time back"}.
              </p>

              {effectiveWorstOffender && (
                <div className="worst-offender-callout">
                  <strong>{effectiveWorstOffender}</strong> gets blocked completely, all day — your
                  single biggest win, starting immediately.
                </div>
              )}

              <div className="plan-summary">
                <div className="plan-row">
                  <span className="plan-label">Blocking</span>
                  <span className="plan-value">
                    <div className="plan-chip-row">
                      {categoriesWithSites.map((c) => (
                        <span className="plan-chip" key={c.id}>
                          {c.icon} {c.label}
                        </span>
                      ))}
                    </div>
                  </span>
                </div>
                <div className="plan-row">
                  <span className="plan-label">Pace</span>
                  <span className="plan-value">{PACE_OPTIONS.find((p) => p.value === effectivePace)?.name}</span>
                </div>
                <div className="plan-row">
                  <span className="plan-label">Sites</span>
                  <span className="plan-value">{allConfirmedDomains.length} tracked</span>
                </div>
              </div>

              <button className="btn-primary" onClick={handleSavePlan}>
                Save My Plan
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
