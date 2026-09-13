import { useMemo, useState } from "react";
import browser from "webextension-polyfill";
import { DEFAULT_FLOOR_MINUTES, DEFAULT_MIN_TAPER_THRESHOLD_MINUTES } from "@taper/engine";
import { SITE_CATALOG, findCategory } from "../data/siteCatalog";
import {
  baselinesForSelections,
  paceTierForLabel,
  pickWorstOffenderCandidate,
  type CategorySelection,
  type PaceLabel,
  type UsageLevel,
} from "../lib/onboarding";
import { normalizeDomain, originPatternsFor } from "../lib/domain";
import { getStorage, setStorage, allocateRuleId } from "../shared/storage";
import { toLocalDateKey } from "../lib/stats";
import { AllowanceStepper } from "../components/AllowanceStepper";
import type { BlocklistEntry, TaperPlanState } from "../shared/types";

const TOTAL_STEPS = 6;

const PACE_OPTIONS: { value: PaceLabel; name: string; desc: string }[] = [
  { value: "ease_in", name: "Ease me in", desc: "Small daily cuts, gentle and steady." },
  { value: "steady", name: "Steady pace", desc: "A solid pace most people can keep." },
  { value: "cut_now", name: "Cut it now", desc: "Fast cuts if you want quick results." },
];

const USAGE_OPTIONS: { value: UsageLevel; label: string }[] = [
  { value: "a_little", label: "A little" },
  { value: "a_lot", label: "A lot" },
  { value: "constantly", label: "Constantly" },
];

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [domainsByCategory, setDomainsByCategory] = useState<Record<string, string[]>>({});
  const [addSiteInput, setAddSiteInput] = useState<Record<string, string>>({});
  const [addSiteError, setAddSiteError] = useState<Record<string, string>>({});
  const [usageByCategory, setUsageByCategory] = useState<Record<string, UsageLevel>>({});
  const [paceLabel, setPaceLabel] = useState<PaceLabel | null>(null);
  const [worstOffenderDomain, setWorstOffenderDomain] = useState<string | null>(null);
  const [worstOffenderSkipped, setWorstOffenderSkipped] = useState(false);
  const [baselineOverrides, setBaselineOverrides] = useState<Record<string, number>>({});
  const [finishError, setFinishError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [done, setDone] = useState(false);

  const activeCategories = selectedCategoryIds.map((id) => findCategory(id)!).filter(Boolean);

  const selections: CategorySelection[] = useMemo(
    () =>
      activeCategories.map((category) => ({
        categoryId: category.id,
        usageLevel: usageByCategory[category.id] ?? "a_lot",
        confirmedDomains: domainsByCategory[category.id] ?? [],
      })),
    [activeCategories, domainsByCategory, usageByCategory],
  );

  const allConfirmedDomains = selections.flatMap((s) => s.confirmedDomains);
  const worstOffenderCandidate = useMemo(() => pickWorstOffenderCandidate(selections), [selections]);
  const effectiveWorstOffender = worstOffenderDomain ?? worstOffenderCandidate?.domain ?? null;
  const effectivePace = paceLabel ?? "steady";

  const smartBaselines = useMemo(() => baselinesForSelections(selections), [selections]);
  const finalBaselines = { ...smartBaselines, ...baselineOverrides };

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((c) => c !== id);
        setDomainsByCategory((d) => {
          const { [id]: _removed, ...rest } = d;
          return rest;
        });
        return next;
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
    const raw = addSiteInput[categoryId] ?? "";
    const domain = normalizeDomain(raw);
    if (!domain) {
      setAddSiteError((e) => ({ ...e, [categoryId]: "That doesn't look like a site." }));
      return;
    }
    setDomainsByCategory((prev) => {
      const current = prev[categoryId] ?? [];
      if (current.includes(domain)) return prev;
      return { ...prev, [categoryId]: [...current, domain] };
    });
    setAddSiteInput((s) => ({ ...s, [categoryId]: "" }));
    setAddSiteError((e) => ({ ...e, [categoryId]: "" }));
  }

  async function handleFinish() {
    setFinishing(true);
    setFinishError(null);

    const domains = allConfirmedDomains;
    if (domains.length === 0) {
      setFinishError("Pick at least one site before finishing.");
      setFinishing(false);
      return;
    }

    const origins = domains.flatMap(originPatternsFor);
    const granted = await browser.permissions.request({ origins });
    if (!granted) {
      setFinishError("We need permission to block these sites. Try again?");
      setFinishing(false);
      return;
    }

    const blocklist: BlocklistEntry[] = [];
    for (const selection of selections) {
      const category = findCategory(selection.categoryId)!;
      for (const domain of selection.confirmedDomains) {
        const ruleId = await allocateRuleId();
        blocklist.push({
          id: crypto.randomUUID(),
          domain,
          category: category.label,
          ruleId,
          addedAt: Date.now(),
          baselineMinutes: finalBaselines[domain] ?? 60,
        });
      }
    }

    const worstEntry = effectiveWorstOffender
      ? blocklist.find((e) => e.domain === effectiveWorstOffender)
      : undefined;

    const todayKey = toLocalDateKey(new Date());
    const taperPlan: TaperPlanState = {
      enabled: true,
      paceTier: paceTierForLabel(effectivePace),
      mode: "percentage",
      linearDailyReductionMinutes: 10,
      floorMinutes: DEFAULT_FLOOR_MINUTES,
      fullElimination: false,
      minTaperThresholdMinutes: DEFAULT_MIN_TAPER_THRESHOLD_MINUTES,
      planStartDate: todayKey,
      worstOffenderEntryId: worstEntry && !worstOffenderSkipped ? worstEntry.id : null,
      worstOffenderSchedule:
        worstEntry && !worstOffenderSkipped
          ? { enabled: true, days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1439 }
          : null,
      reconciledAt: null,
    };

    await setStorage({ blocklist, taperPlan, lastProcessedDateKey: todayKey });
    setFinishing(false);
    setDone(true);
  }

  function next() {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setStep((s) => Math.max(1, s - 1));
  }

  const canProceedStep1 = selectedCategoryIds.length > 0;
  const canProceedStep2 = allConfirmedDomains.length > 0;

  if (done) {
    return (
      <div className="wizard">
        <h1 className="step-title">You're set up.</h1>
        <p className="step-sub">Your allowances start today and get easier to beat every day.</p>
        <button className="primary" onClick={() => window.close()}>
          Start Browsing
        </button>
      </div>
    );
  }

  return (
    <div className="wizard">
      <div className="progress">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div key={i} className={`progress-dot ${i < step ? "done" : ""}`} />
        ))}
      </div>

      {step === 1 && (
        <>
          <h1 className="step-title">What's stealing your time?</h1>
          <p className="step-sub">Tap all that apply.</p>
          <div className="category-grid">
            {SITE_CATALOG.map((category) => (
              <div
                key={category.id}
                className={`category-card ${selectedCategoryIds.includes(category.id) ? "selected" : ""}`}
                onClick={() => toggleCategory(category.id)}
              >
                <span className="icon">{category.icon}</span>
                <span>{category.label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className="step-title">Confirm your sites</h1>
          <p className="step-sub">Uncheck anything that doesn't apply.</p>
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
                <button className="secondary" onClick={() => addCustomSite(category.id)}>
                  Add
                </button>
              </div>
              {addSiteError[category.id] && <p style={{ color: "#a11", fontSize: 12.5 }}>{addSiteError[category.id]}</p>}
            </div>
          ))}
        </>
      )}

      {step === 3 && (
        <>
          <h1 className="step-title">How much is too much?</h1>
          <p className="step-sub">Just a rough feel — we'll refine it automatically.</p>
          {activeCategories.map((category) => (
            <div className="usage-row" key={category.id}>
              <h3>
                {category.icon} {category.label}
              </h3>
              <div className="usage-options">
                {USAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`usage-btn ${(usageByCategory[category.id] ?? "a_lot") === opt.value ? "selected" : ""}`}
                    onClick={() => setUsageByCategory((u) => ({ ...u, [category.id]: opt.value }))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {step === 4 && (
        <>
          <h1 className="step-title">Pick your pace</h1>
          <p className="step-sub">You can change this anytime.</p>
          <div className="pace-list">
            {PACE_OPTIONS.map((opt) => (
              <div
                key={opt.value}
                className={`pace-card ${effectivePace === opt.value ? "selected" : ""}`}
                onClick={() => setPaceLabel(opt.value)}
              >
                <div className="pace-name">{opt.name}</div>
                <div className="pace-desc">{opt.desc}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {step === 5 && (
        <>
          <h1 className="step-title">Your worst offender</h1>
          <p className="step-sub">This one gets blocked completely, all day.</p>
          {effectiveWorstOffender && !worstOffenderSkipped ? (
            <div className="offender-chip">
              <span className="tag">Suggested</span>
              <div className="domain">{effectiveWorstOffender}</div>
            </div>
          ) : (
            <p className="empty-hint">No site picked — it'll just use the daily limit like everything else.</p>
          )}
          <div className="offender-actions">
            {allConfirmedDomains
              .filter((d) => d !== effectiveWorstOffender)
              .slice(0, 6)
              .map((d) => (
                <button
                  key={d}
                  className="secondary"
                  onClick={() => {
                    setWorstOffenderDomain(d);
                    setWorstOffenderSkipped(false);
                  }}
                >
                  Use {d} instead
                </button>
              ))}
            {!worstOffenderSkipped && (
              <button className="secondary" onClick={() => setWorstOffenderSkipped(true)}>
                Skip this
              </button>
            )}
            {worstOffenderSkipped && (
              <button className="secondary" onClick={() => setWorstOffenderSkipped(false)}>
                Actually, use the suggestion
              </button>
            )}
          </div>
        </>
      )}

      {step === 6 && (
        <>
          <h1 className="step-title">Review your allowances</h1>
          <p className="step-sub">These are today's starting numbers — adjust anything.</p>
          <div className="allowance-list">
            {allConfirmedDomains.map((domain) => (
              <AllowanceStepper
                key={domain}
                label={domain}
                minutes={finalBaselines[domain] ?? 60}
                onChange={(m) => setBaselineOverrides((o) => ({ ...o, [domain]: m }))}
              />
            ))}
          </div>
          {finishError && <p style={{ color: "#a11", fontSize: 13.5, marginBottom: 12 }}>{finishError}</p>}
        </>
      )}

      <div className="wizard-nav">
        {step > 1 ? (
          <button className="secondary" onClick={back}>
            Back
          </button>
        ) : (
          <span />
        )}
        {step < TOTAL_STEPS ? (
          <button
            className="primary"
            disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
            onClick={next}
          >
            Next
          </button>
        ) : (
          <button className="primary" disabled={finishing} onClick={() => void handleFinish()}>
            {finishing ? "Setting up…" : "Finish Setup"}
          </button>
        )}
      </div>
    </div>
  );
}
