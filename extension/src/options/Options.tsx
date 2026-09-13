import { useEffect, useMemo, useState } from "react";
import browser from "webextension-polyfill";
import {
  DEFAULT_FLOOR_MINUTES,
  DEFAULT_MIN_TAPER_THRESHOLD_MINUTES,
  PACE_TIERS,
  baselineMinutesFromBucket,
  cumulativeReclaimedMinutes,
  dailyAllowanceMinutes,
  milestoneReachedAt,
  nextLocalMidnight,
  planChangeDelayDays,
  type PaceTierName,
  type TaperConfig,
  type UsageBucket,
} from "@taper/engine";
import { getStorage, setStorage, allocateRuleId } from "../shared/storage";
import { normalizeDomain, originPatternsFor } from "../lib/domain";
import { minutesToTimeString, timeStringToMinutes } from "../lib/time";
import { toLocalDateKey } from "../lib/stats";
import { addDaysToDateKey } from "../lib/dates";
import { buildTaperConfigForEntry, computeDayIndex } from "../lib/taper";
import {
  CATEGORIES,
  DEFAULT_SCHEDULE,
  type BlocklistEntry,
  type DailyTaperRecord,
  type Schedule,
  type TaperPlanState,
} from "../shared/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const USAGE_BUCKETS: { value: UsageBucket; label: string }[] = [
  { value: "under_30m", label: "Under 30 min/day" },
  { value: "30_60m", label: "30–60 min/day" },
  { value: "1_2h", label: "1–2 hours/day" },
  { value: "2_4h", label: "2–4 hours/day" },
  { value: "4h_plus", label: "4+ hours/day" },
];

const REPRESENTATIVE_BASELINE = 100; // for the plan-change cost preview only — see handleSavePlan

function freshTaperPlan(): TaperPlanState {
  return {
    enabled: true,
    paceTier: "gentle",
    mode: "percentage",
    linearDailyReductionMinutes: 10,
    floorMinutes: DEFAULT_FLOOR_MINUTES,
    fullElimination: false,
    minTaperThresholdMinutes: DEFAULT_MIN_TAPER_THRESHOLD_MINUTES,
    planStartDate: toLocalDateKey(new Date()),
    worstOffenderEntryId: null,
    worstOffenderSchedule: null,
    reconciledAt: null,
  };
}

export function Options() {
  const [blocklist, setBlocklist] = useState<BlocklistEntry[]>([]);
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [todayStats, setTodayStats] = useState<Record<string, number>>({});
  const [taperPlan, setTaperPlan] = useState<TaperPlanState | null>(null);
  const [taperHistory, setTaperHistory] = useState<Record<string, DailyTaperRecord>>({});
  const [pendingPlanChange, setPendingPlanChange] = useState<
    { effectiveDate: string; changes: Partial<TaperPlanState> } | null
  >(null);
  const [loading, setLoading] = useState(true);

  const [domainInput, setDomainInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<string>(CATEGORIES[0]);
  const [bucketInput, setBucketInput] = useState<UsageBucket>("1_2h");
  const [addError, setAddError] = useState<string | null>(null);

  const [scheduleSaved, setScheduleSaved] = useState(false);

  // Local draft of the plan being edited — separate from `taperPlan` so a proposed loosening can
  // be priced (Section 2.3) before it's staged, without mutating the currently-active plan.
  const [draftPlan, setDraftPlan] = useState<TaperPlanState>(freshTaperPlan());
  const [planCostPreview, setPlanCostPreview] = useState<number | null>(null);

  async function reload() {
    const storage = await getStorage();
    setBlocklist(storage.blocklist);
    setSchedule(storage.schedule);
    const todayKey = toLocalDateKey(new Date());
    setTodayStats(storage.statsByDate[todayKey] ?? {});
    setTaperPlan(storage.taperPlan);
    setTaperHistory(storage.taperHistory);
    setPendingPlanChange(storage.pendingPlanChange);
    if (storage.taperPlan) setDraftPlan(storage.taperPlan);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleAddDomain() {
    setAddError(null);
    const domain = normalizeDomain(domainInput);
    if (!domain) {
      setAddError("That doesn't look like a valid domain.");
      return;
    }
    if (blocklist.some((entry) => entry.domain === domain)) {
      setAddError("Already on your blocklist.");
      return;
    }

    const granted = await browser.permissions.request({ origins: originPatternsFor(domain) });
    if (!granted) {
      setAddError("Permission wasn't granted, so nothing was added.");
      return;
    }

    const ruleId = await allocateRuleId();
    const entry: BlocklistEntry = {
      id: crypto.randomUUID(),
      domain,
      category: categoryInput,
      ruleId,
      addedAt: Date.now(),
      baselineMinutes: baselineMinutesFromBucket(bucketInput),
    };
    const next = [...blocklist, entry];
    setBlocklist(next);
    await setStorage({ blocklist: next });
    setDomainInput("");
  }

  async function handleRemoveDomain(entry: BlocklistEntry) {
    await browser.permissions.remove({ origins: originPatternsFor(entry.domain) });
    const next = blocklist.filter((e) => e.id !== entry.id);
    setBlocklist(next);
    await setStorage({ blocklist: next });
  }

  function toggleDay(day: number) {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter((d) => d !== day) : [...prev.days, day].sort(),
    }));
  }

  async function handleSaveSchedule() {
    await setStorage({ schedule });
    setScheduleSaved(true);
    setTimeout(() => setScheduleSaved(false), 2000);
  }

  function toggleWorstOffenderDay(day: number) {
    setDraftPlan((prev) => {
      const current = prev.worstOffenderSchedule ?? { ...DEFAULT_SCHEDULE, enabled: true };
      const days = current.days.includes(day) ? current.days.filter((d) => d !== day) : [...current.days, day].sort();
      return { ...prev, worstOffenderSchedule: { ...current, days } };
    });
  }

  async function handleEnableTaperFirstTime() {
    const fresh = freshTaperPlan();
    setDraftPlan(fresh);
    setTaperPlan(fresh);
    await setStorage({ taperPlan: fresh, lastProcessedDateKey: toLocalDateKey(new Date()) });
  }

  async function handleDisableTaper() {
    setTaperPlan(null);
    setDraftPlan(freshTaperPlan());
    await setStorage({ taperPlan: null, pendingPlanChange: null });
    setPendingPlanChange(null);
  }

  function representativeConfig(plan: TaperPlanState): TaperConfig {
    const tier = PACE_TIERS[plan.paceTier];
    return {
      baselineMinutes: REPRESENTATIVE_BASELINE,
      frontLoadPct: tier.frontLoadPct,
      weeklyReductionPct: tier.weeklyReductionPct,
      mode: plan.mode,
      linearDailyReductionMinutes: plan.linearDailyReductionMinutes,
      floorMinutes: plan.floorMinutes,
      fullElimination: plan.fullElimination,
      minTaperThresholdMinutes: plan.minTaperThresholdMinutes,
    };
  }

  function handlePreviewPlanChange() {
    if (!taperPlan) return;
    // The exact cost differs per entry (each has its own baseline); this preview uses a
    // representative 100-minute baseline purely to give an illustrative "~N days" figure rather
    // than computing and reconciling a separate number per blocklist entry.
    const days = planChangeDelayDays(representativeConfig(taperPlan), representativeConfig(draftPlan), draftPlan.floorMinutes);
    setPlanCostPreview(Number.isFinite(days) ? days : null);
  }

  async function handleConfirmPlanChange() {
    if (!taperPlan) return;
    const effectiveDate = toLocalDateKey(nextLocalMidnight(new Date()));
    const change = { effectiveDate, changes: draftPlan };
    setPendingPlanChange(change);
    await setStorage({ pendingPlanChange: change });
    setPlanCostPreview(null);
  }

  async function handleCancelPendingChange() {
    setPendingPlanChange(null);
    await setStorage({ pendingPlanChange: null });
  }

  async function handleSaveWorstOffender(entryId: string | null) {
    setDraftPlan((prev) => ({
      ...prev,
      worstOffenderEntryId: entryId,
      worstOffenderSchedule: entryId ? (prev.worstOffenderSchedule ?? { ...DEFAULT_SCHEDULE, enabled: true }) : null,
    }));
  }

  const todayKey = toLocalDateKey(new Date());
  const sortedStats = Object.entries(todayStats).sort(([, a], [, b]) => b - a);

  const currentStreak = useMemo(() => {
    const record = taperHistory[addDaysToDateKey(todayKey, -1)];
    return record?.streakAfter ?? 0;
  }, [taperHistory, todayKey]);

  const reclaimedThisWeek = useMemo(() => {
    const days = Object.entries(taperHistory)
      .filter(([date]) => date <= todayKey)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 7)
      .flatMap(([, record]) =>
        Object.keys(record.minutesUsedByDomain).map((domain) => ({
          baselineMinutes: blocklist.find((e) => e.domain === domain)?.baselineMinutes ?? 0,
          allowanceMinutes: record.allowanceByDomain[domain] ?? 0,
        })),
      );
    return Math.round(cumulativeReclaimedMinutes(days));
  }, [taperHistory, blocklist, todayKey]);

  const todayUsage = useMemo(() => {
    if (!taperPlan) return [];
    const dayIndex = Math.max(computeDayIndex(taperPlan.planStartDate, todayKey), 1);
    const used = taperHistory[todayKey]?.minutesUsedByDomain ?? {};
    return blocklist.map((entry) => {
      const config = buildTaperConfigForEntry(taperPlan, entry.baselineMinutes);
      const allowance = dailyAllowanceMinutes(config, dayIndex);
      return { domain: entry.domain, usedMinutes: Math.round(used[entry.domain] ?? 0), allowanceMinutes: Math.round(allowance) };
    });
  }, [taperPlan, taperHistory, blocklist, todayKey]);

  if (loading) return null;

  return (
    <div className="page">
      <h1>Taper settings</h1>
      <p className="subtitle">
        {taperPlan?.enabled
          ? "Taper plan active — allowances shrink daily; the schedule below is unused while this is on."
          : "Free plan: a manual blocklist and schedule, with today's stats only."}
      </p>

      <section>
        <h2>Blocklist</h2>
        <div className="add-form">
          <input
            type="text"
            placeholder="e.g. instagram.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleAddDomain()}
          />
          <select value={categoryInput} onChange={(e) => setCategoryInput(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={bucketInput} onChange={(e) => setBucketInput(e.target.value as UsageBucket)}>
            {USAGE_BUCKETS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
          <button onClick={() => void handleAddDomain()}>Add</button>
        </div>
        {addError && <p className="error">{addError}</p>}

        {blocklist.length === 0 ? (
          <p className="empty">Nothing blocked yet.</p>
        ) : (
          <ul className="entry-list">
            {blocklist.map((entry) => {
              const usage = todayUsage.find((u) => u.domain === entry.domain);
              return (
                <li key={entry.id}>
                  <span>
                    {entry.domain}
                    <span className="category-tag">{entry.category}</span>
                    {usage && (
                      <span className="category-tag">
                        {usage.usedMinutes}/{usage.allowanceMinutes} min today
                      </span>
                    )}
                  </span>
                  <button className="remove" onClick={() => void handleRemoveDomain(entry)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Schedule {taperPlan?.enabled && <small>(inactive while the taper plan is on)</small>}</h2>
        <label>
          <input
            type="checkbox"
            checked={schedule.enabled}
            onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
          />{" "}
          Block on a schedule
        </label>

        <div className="day-row" style={{ marginTop: 12 }}>
          {DAY_LABELS.map((label, day) => (
            <label key={day}>
              <input type="checkbox" checked={schedule.days.includes(day)} onChange={() => toggleDay(day)} />
              {label}
            </label>
          ))}
        </div>

        <div className="time-row">
          <label>
            From
            <input
              type="time"
              value={minutesToTimeString(schedule.startMinute)}
              onChange={(e) =>
                setSchedule((prev) => ({ ...prev, startMinute: timeStringToMinutes(e.target.value) }))
              }
            />
          </label>
          <label>
            Until
            <input
              type="time"
              value={minutesToTimeString(schedule.endMinute)}
              onChange={(e) =>
                setSchedule((prev) => ({ ...prev, endMinute: timeStringToMinutes(e.target.value) }))
              }
            />
          </label>
        </div>

        <button onClick={() => void handleSaveSchedule()}>Save schedule</button>
        {scheduleSaved && <p className="saved">Saved.</p>}
      </section>

      <section>
        <h2>Taper plan (Premium)</h2>
        <p className="subtitle" style={{ marginBottom: 12 }}>
          Local preview toggle — real billing/entitlement enforcement lands in Phase 4.
        </p>

        {!taperPlan?.enabled ? (
          <button onClick={() => void handleEnableTaperFirstTime()}>Enable taper plan</button>
        ) : (
          <>
            <div className="day-row" style={{ marginBottom: 14 }}>
              {(Object.keys(PACE_TIERS) as PaceTierName[]).map((tier) => (
                <label key={tier} style={{ flexDirection: "row", gap: 4 }}>
                  <input
                    type="radio"
                    name="paceTier"
                    checked={draftPlan.paceTier === tier}
                    onChange={() => setDraftPlan((prev) => ({ ...prev, paceTier: tier }))}
                  />
                  {tier} ({Math.round(PACE_TIERS[tier].weeklyReductionPct * 100)}%/wk)
                </label>
              ))}
            </div>

            <div className="time-row">
              <label>
                Maintenance floor (min/day)
                <input
                  type="number"
                  min={0}
                  value={draftPlan.floorMinutes}
                  disabled={draftPlan.fullElimination}
                  onChange={(e) => setDraftPlan((prev) => ({ ...prev, floorMinutes: Number(e.target.value) }))}
                  style={{ width: 70, marginLeft: 6 }}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={draftPlan.fullElimination}
                  onChange={(e) => setDraftPlan((prev) => ({ ...prev, fullElimination: e.target.checked }))}
                />{" "}
                Taper all the way to a full block instead
              </label>
            </div>

            <div className="time-row">
              <label>
                Worst offender
                <select
                  value={draftPlan.worstOffenderEntryId ?? ""}
                  onChange={(e) => void handleSaveWorstOffender(e.target.value || null)}
                  style={{ marginLeft: 6 }}
                >
                  <option value="">None</option>
                  {blocklist.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.domain}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {draftPlan.worstOffenderEntryId && draftPlan.worstOffenderSchedule && (
              <>
                <p className="subtitle">Hard-blocked (no allowance, no exceptions) during:</p>
                <div className="day-row">
                  {DAY_LABELS.map((label, day) => (
                    <label key={day}>
                      <input
                        type="checkbox"
                        checked={draftPlan.worstOffenderSchedule!.days.includes(day)}
                        onChange={() => toggleWorstOffenderDay(day)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="time-row">
                  <label>
                    From
                    <input
                      type="time"
                      value={minutesToTimeString(draftPlan.worstOffenderSchedule.startMinute)}
                      onChange={(e) =>
                        setDraftPlan((prev) => ({
                          ...prev,
                          worstOffenderSchedule: {
                            ...prev.worstOffenderSchedule!,
                            startMinute: timeStringToMinutes(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                  <label>
                    Until
                    <input
                      type="time"
                      value={minutesToTimeString(draftPlan.worstOffenderSchedule.endMinute)}
                      onChange={(e) =>
                        setDraftPlan((prev) => ({
                          ...prev,
                          worstOffenderSchedule: {
                            ...prev.worstOffenderSchedule!,
                            endMinute: timeStringToMinutes(e.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                </div>
              </>
            )}

            <div style={{ marginTop: 12 }}>
              <button onClick={handlePreviewPlanChange}>Preview change</button>{" "}
              {planCostPreview !== null && (
                <span>
                  This adds ~{planCostPreview} day{planCostPreview === 1 ? "" : "s"} to reach your floor.{" "}
                  <button onClick={() => void handleConfirmPlanChange()}>Confirm (applies tomorrow)</button>
                </span>
              )}
            </div>

            {pendingPlanChange && (
              <p className="saved">
                A change is scheduled for {pendingPlanChange.effectiveDate}.{" "}
                <button className="remove" onClick={() => void handleCancelPendingChange()}>
                  Cancel it
                </button>
              </p>
            )}
            <p style={{ marginTop: 16 }}>
              <button className="remove" onClick={() => void handleDisableTaper()}>
                Disable taper plan
              </button>
            </p>

            <div className="time-row" style={{ marginTop: 16 }}>
              <strong>Streak: {currentStreak} day{currentStreak === 1 ? "" : "s"}</strong>
              <strong>Reclaimed this week: {reclaimedThisWeek} min</strong>
            </div>
            {milestoneReachedAt(currentStreak) !== null && (
              <p className="saved">🎉 {milestoneReachedAt(currentStreak)}-day milestone reached!</p>
            )}
          </>
        )}
      </section>

      <section>
        <h2>Today's stats</h2>
        {sortedStats.length === 0 ? (
          <p className="empty">No blocked visits today.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Site</th>
                <th>Blocked visits</th>
              </tr>
            </thead>
            <tbody>
              {sortedStats.map(([domain, count]) => (
                <tr key={domain}>
                  <td>{domain}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
