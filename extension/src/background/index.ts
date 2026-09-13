import browser from "webextension-polyfill";
import type { DeclarativeNetRequest } from "webextension-polyfill/namespaces/declarativeNetRequest";
import { dailyAllowanceMinutes, nextStreakCount } from "@taper/engine";
import { getStorage, setStorage } from "../shared/storage";
import { isWithinSchedule } from "../lib/schedule";
import { buildBlockRule, type BlockRule } from "../lib/rules";
import { originPatternsFor, normalizeDomain } from "../lib/domain";
import { toLocalDateKey } from "../lib/stats";
import { addDaysToDateKey, dateKeyRange } from "../lib/dates";
import {
  buildTaperConfigForEntry,
  computeDayIndex,
  dayOutcomeRespected,
  isWorstOffenderHardBlocked,
  reconciledEntryBaseline,
} from "../lib/taper";
import type { BlocklistEntry, DailyTaperRecord, StorageSchema, TaperPlanState } from "../shared/types";

const SCHEDULE_ALARM = "taper-schedule-tick";
const FLUSH_ALARM = "taper-flush-tick";
const RECONCILE_AFTER_DAYS = 2; // 48h of measured data (Section 2.1) before blending baselines

// ---- Rule computation (unified across the free-tier schedule and the premium taper plan) ----

async function activeDomains(storage: StorageSchema, now: Date): Promise<Set<string>> {
  const dayOfWeek = now.getDay();
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const { blocklist, schedule, taperPlan } = storage;

  if (!taperPlan?.enabled) {
    const scheduled = isWithinSchedule(schedule, dayOfWeek, nowMinute);
    return scheduled ? new Set(blocklist.map((e) => e.domain)) : new Set();
  }

  const todayKey = toLocalDateKey(now);
  const dayIndex = Math.max(computeDayIndex(taperPlan.planStartDate, todayKey), 1);
  const todayRecord = storage.taperHistory[todayKey];
  const usedToday = todayRecord?.minutesUsedByDomain ?? {};
  const bonusToday = todayRecord?.bonusMinutesByDomain ?? {};

  const result = new Set<string>();
  for (const entry of blocklist) {
    const hardBlocked = isWorstOffenderHardBlocked(taperPlan, entry.id, dayOfWeek, nowMinute);
    const config = buildTaperConfigForEntry(taperPlan, entry.baselineMinutes);
    // The escape-valve bonus (Section 2.4) only ever adds to *today's* effective allowance —
    // it never changes the curve itself, so dailyAllowanceMinutes here stays untouched.
    const effectiveAllowance = dailyAllowanceMinutes(config, dayIndex) + (bonusToday[entry.domain] ?? 0);
    const used = usedToday[entry.domain] ?? 0;
    if (hardBlocked || used >= effectiveAllowance) result.add(entry.domain);
  }
  return result;
}

async function recomputeRules(): Promise<void> {
  const storage = await getStorage();
  const now = new Date();
  const active = await activeDomains(storage, now);

  // We own every dynamic rule ever created for this blocklist, so it's simplest and safest to
  // clear all of them and re-add whichever should currently apply, rather than diffing state.
  const removeRuleIds = storage.blocklist.map((entry) => entry.ruleId);
  const addRules: BlockRule[] = [];
  const blockedPageUrl = browser.runtime.getURL("src/blocked/blocked.html");

  for (const entry of storage.blocklist) {
    if (!active.has(entry.domain)) continue;
    const hasPermission = await browser.permissions.contains({ origins: originPatternsFor(entry.domain) });
    if (hasPermission) addRules.push(buildBlockRule(entry.domain, entry.ruleId, blockedPageUrl));
  }

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: addRules as DeclarativeNetRequest.Rule[],
  });
}

// ---- Real per-domain time tracking (Section 2.5) — active AND focused tab time only ----

let trackedDomain: string | null = null;
let trackedSince: number | null = null;

async function currentlyTrackedDomain(storage: StorageSchema): Promise<string | null> {
  if (!storage.taperPlan?.enabled) return null;
  const window = await browser.windows.getLastFocused({ populate: true });
  if (!window.focused) return null;
  const tab = window.tabs?.find((t) => t.active);
  const domain = normalizeDomain(tab?.url ?? "");
  if (!domain) return null;
  return storage.blocklist.some((e) => e.domain === domain) ? domain : null;
}

async function flushTrackedTime(storage: StorageSchema, now: Date): Promise<StorageSchema> {
  if (!trackedDomain || trackedSince === null) return storage;

  const elapsedMinutes = (now.getTime() - trackedSince) / 60000;
  trackedSince = now.getTime();
  if (elapsedMinutes <= 0) return storage;

  const todayKey = toLocalDateKey(now);
  const existing = storage.taperHistory[todayKey] ?? emptyDailyRecord();
  const updated: DailyTaperRecord = {
    ...existing,
    minutesUsedByDomain: {
      ...existing.minutesUsedByDomain,
      [trackedDomain]: (existing.minutesUsedByDomain[trackedDomain] ?? 0) + elapsedMinutes,
    },
  };
  const nextHistory = { ...storage.taperHistory, [todayKey]: updated };
  await setStorage({ taperHistory: nextHistory });
  return { ...storage, taperHistory: nextHistory };
}

function emptyDailyRecord(): DailyTaperRecord {
  return {
    minutesUsedByDomain: {},
    allowanceByDomain: {},
    bonusMinutesByDomain: {},
    respected: true,
    streakAfter: 0,
  };
}

/** Called on every tab/window focus change: banks time for whatever was being tracked, then
 *  figures out what (if anything) should be tracked next. */
async function refreshTrackingAnchor(): Promise<void> {
  const now = new Date();
  let storage = await getStorage();
  storage = await flushTrackedTime(storage, now);

  trackedDomain = await currentlyTrackedDomain(storage);
  trackedSince = trackedDomain ? now.getTime() : null;

  await recomputeRules();
}

// ---- Day rollover: finalize history, roll the streak, apply reconciliation & pending changes ----

async function processDayRolloverIfNeeded(): Promise<void> {
  const storage = await getStorage();
  const todayKey = toLocalDateKey(new Date());
  if (storage.lastProcessedDateKey === todayKey) return;

  let taperPlan = storage.taperPlan;
  let blocklist = storage.blocklist;
  let taperHistory = storage.taperHistory;

  if (storage.lastProcessedDateKey && taperPlan?.enabled) {
    const finishedKey = storage.lastProcessedDateKey;
    const dayIndex = Math.max(computeDayIndex(taperPlan.planStartDate, finishedKey), 1);
    const finished = taperHistory[finishedKey] ?? emptyDailyRecord();

    const allowanceByDomain: Record<string, number> = {};
    for (const entry of blocklist) {
      const config = buildTaperConfigForEntry(taperPlan, entry.baselineMinutes);
      allowanceByDomain[entry.domain] = dailyAllowanceMinutes(config, dayIndex);
    }
    const respected = dayOutcomeRespected(finished.minutesUsedByDomain, allowanceByDomain);
    const previousStreak = taperHistory[addDaysToDateKey(finishedKey, -1)]?.streakAfter ?? 0;
    const streakAfter = nextStreakCount(previousStreak, respected);

    taperHistory = {
      ...taperHistory,
      [finishedKey]: { ...finished, allowanceByDomain, respected, streakAfter },
    };

    // 48h reconciliation (Section 2.1): once we have two full finished days, blend each entry's
    // self-reported baseline with what was actually measured, then never touch it again.
    if (!taperPlan.reconciledAt && dayIndex >= RECONCILE_AFTER_DAYS) {
      const measuredDays = dateKeyRange(taperPlan.planStartDate, RECONCILE_AFTER_DAYS);
      blocklist = blocklist.map((entry) => {
        const measured = measuredDays.map((d) => taperHistory[d]?.minutesUsedByDomain[entry.domain] ?? 0);
        return { ...entry, baselineMinutes: reconciledEntryBaseline(entry.baselineMinutes, measured) };
      });
      taperPlan = { ...taperPlan, reconciledAt: todayKey };
    }
  }

  if (storage.pendingPlanChange && storage.pendingPlanChange.effectiveDate <= todayKey && taperPlan) {
    taperPlan = { ...taperPlan, ...storage.pendingPlanChange.changes };
  }

  await setStorage({
    taperPlan,
    blocklist,
    taperHistory,
    pendingPlanChange:
      storage.pendingPlanChange && storage.pendingPlanChange.effectiveDate <= todayKey
        ? null
        : storage.pendingPlanChange,
    lastProcessedDateKey: todayKey,
  });
}

// ---- Wiring ----

async function tick(): Promise<void> {
  await processDayRolloverIfNeeded();
  await flushTrackedTime(await getStorage(), new Date());
  await recomputeRules();
}

browser.runtime.onInstalled.addListener(() => {
  void browser.alarms.create(SCHEDULE_ALARM, { periodInMinutes: 1 });
  void browser.alarms.create(FLUSH_ALARM, { periodInMinutes: 0.5 });
  void tick();
});

// Covers the case where the device was asleep/off when the last scheduled alarm should
// have fired — every service-worker wake re-checks the schedule and the day rollover.
browser.runtime.onStartup.addListener(() => {
  void tick();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCHEDULE_ALARM) void tick();
  if (alarm.name === FLUSH_ALARM) void refreshTrackingAnchor();
});

browser.tabs.onActivated.addListener(() => void refreshTrackingAnchor());
browser.tabs.onUpdated.addListener((_id, info) => {
  if (info.url) void refreshTrackingAnchor();
});
browser.windows.onFocusChanged.addListener(() => void refreshTrackingAnchor());

browser.storage.onChanged.addListener((changes, areaName) => {
  // taperHistory is included so an escape-valve grant (written directly from the blocked page)
  // unblocks immediately instead of waiting for the next alarm tick.
  if (areaName === "local" && (changes.blocklist || changes.schedule || changes.taperPlan || changes.taperHistory)) {
    void recomputeRules();
  }
});
