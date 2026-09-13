import { useEffect, useMemo, useRef, useState } from "react";
import browser from "webextension-polyfill";
import {
  canUseEscapeValve,
  computeEscapeValveBonus,
  dailyAllowanceMinutes,
  isEscapeValveDelayElapsed,
  DEFAULT_ESCAPE_VALVE_CONFIG,
} from "@taper/engine";
import { getStorage, setStorage } from "../shared/storage";
import { incrementStat, pruneToToday, toLocalDateKey } from "../lib/stats";
import { minutesToTimeString } from "../lib/time";
import { buildTaperConfigForEntry, computeDayIndex, isWorstOffenderHardBlocked } from "../lib/taper";
import { DEFAULT_SUGGESTIONS, pickSuggestion } from "../lib/suggestions";
import type { DailyTaperRecord } from "../shared/types";

type Reason =
  | { kind: "free-schedule"; endTime: string }
  | { kind: "worst-offender-hard-block"; endTime: string }
  | { kind: "taper-allowance"; usedMinutes: number; allowanceMinutes: number };

export function Blocked() {
  const [reason, setReason] = useState<Reason | null>(null);
  const [escapeValveAvailable, setEscapeValveAvailable] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [requestedAt, setRequestedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const recorded = useRef(false);

  const domain = new URLSearchParams(window.location.search).get("domain") ?? "this site";
  const suggestion = useMemo(() => pickSuggestion(DEFAULT_SUGGESTIONS, Math.random()), []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;

    void (async () => {
      const storage = await getStorage();
      const today = new Date();
      const todayKey = toLocalDateKey(today);

      const pruned = pruneToToday(storage.statsByDate, todayKey);
      pruned[todayKey] = incrementStat(pruned[todayKey] ?? {}, domain);
      await setStorage({ statsByDate: pruned });

      const entry = storage.blocklist.find((e) => e.domain === domain);
      const plan = storage.taperPlan;

      if (plan?.enabled && entry) {
        const dayOfWeek = today.getDay();
        const nowMinute = today.getHours() * 60 + today.getMinutes();
        if (isWorstOffenderHardBlocked(plan, entry.id, dayOfWeek, nowMinute)) {
          setReason({ kind: "worst-offender-hard-block", endTime: minutesToTimeString(plan.worstOffenderSchedule!.endMinute) });
          setEscapeValveAvailable(false);
        } else {
          const dayIndex = Math.max(computeDayIndex(plan.planStartDate, todayKey), 1);
          const config = buildTaperConfigForEntry(plan, entry.baselineMinutes);
          const allowanceMinutes = Math.round(dailyAllowanceMinutes(config, dayIndex));
          const usedMinutes = Math.round(storage.taperHistory[todayKey]?.minutesUsedByDomain[domain] ?? 0);
          setReason({ kind: "taper-allowance", usedMinutes, allowanceMinutes });
          setEscapeValveAvailable(canUseEscapeValve(storage.escapeValveHistory, today));
        }
      } else {
        setReason({ kind: "free-schedule", endTime: minutesToTimeString(storage.schedule.endMinute) });
        setEscapeValveAvailable(false);
      }

      if (storage.pendingEscapeValveRequest?.domain === domain) {
        setRequestedAt(storage.pendingEscapeValveRequest.requestedAt);
      }
    })();
  }, [domain]);

  async function handleRequestEscapeValve() {
    if (!reasonInput.trim()) return;
    const requestTime = Date.now();
    await setStorage({ pendingEscapeValveRequest: { domain, requestedAt: requestTime, reason: reasonInput.trim() } });
    setRequestedAt(requestTime);
  }

  useEffect(() => {
    if (requestedAt === null) return;
    if (!isEscapeValveDelayElapsed(new Date(requestedAt), new Date(now), DEFAULT_ESCAPE_VALVE_CONFIG.delayMinutes)) {
      return;
    }

    void (async () => {
      const storage = await getStorage();
      const request = storage.pendingEscapeValveRequest;
      if (!request || request.domain !== domain) return;

      const todayKey = toLocalDateKey(new Date());
      const existing: DailyTaperRecord = storage.taperHistory[todayKey] ?? {
        minutesUsedByDomain: {},
        allowanceByDomain: {},
        bonusMinutesByDomain: {},
        respected: true,
        streakAfter: 0,
      };
      const remainingMinutes = reason?.kind === "taper-allowance" ? Math.max(reason.allowanceMinutes - reason.usedMinutes, 0) : 0;
      const bonus = computeEscapeValveBonus(remainingMinutes);

      await setStorage({
        escapeValveHistory: [...storage.escapeValveHistory, { usedAt: request.requestedAt, reason: request.reason }],
        taperHistory: {
          ...storage.taperHistory,
          [todayKey]: {
            ...existing,
            bonusMinutesByDomain: {
              ...existing.bonusMinutesByDomain,
              [domain]: (existing.bonusMinutesByDomain[domain] ?? 0) + bonus,
            },
          },
        },
        pendingEscapeValveRequest: null,
      });

      window.location.href = `https://${domain}/`;
    })();
  }, [requestedAt, now, domain, reason]);

  if (!reason) return null;

  const unlockAt = requestedAt !== null ? requestedAt + DEFAULT_ESCAPE_VALVE_CONFIG.delayMinutes * 60000 : null;
  const secondsRemaining = unlockAt !== null ? Math.max(0, Math.ceil((unlockAt - now) / 1000)) : null;

  return (
    <div className="card">
      <h1>{domain} is blocked right now</h1>

      {reason.kind === "free-schedule" && (
        <>
          <p>This falls inside the schedule you set for yourself.</p>
          <p>Today's block window ends at {reason.endTime}.</p>
        </>
      )}

      {reason.kind === "worst-offender-hard-block" && (
        <>
          <p>You named this your worst offender — it's hard-blocked during your focus hours, no exceptions.</p>
          <p>Focus hours end at {reason.endTime}.</p>
        </>
      )}

      {reason.kind === "taper-allowance" && (
        <>
          <p>
            You've used {reason.usedMinutes} of your {reason.allowanceMinutes} minutes here today.
          </p>
          <p>Try instead: {suggestion}</p>
        </>
      )}

      {escapeValveAvailable && requestedAt === null && (
        <div style={{ marginTop: 16 }}>
          <textarea
            placeholder="What's going on? (kept private, just for you)"
            value={reasonInput}
            onChange={(e) => setReasonInput(e.target.value)}
            rows={2}
            style={{ width: "100%", boxSizing: "border-box" }}
          />
          <p>
            <button onClick={() => void handleRequestEscapeValve()} disabled={!reasonInput.trim()}>
              I need a few more minutes
            </button>
          </p>
          <p style={{ fontSize: 12, color: "#999" }}>One pass per 7 days. A 10-minute wait applies before it kicks in.</p>
        </div>
      )}

      {reason.kind === "taper-allowance" && !escapeValveAvailable && requestedAt === null && (
        <p style={{ fontSize: 12, color: "#999" }}>You've already used this week's pass.</p>
      )}

      {secondsRemaining !== null && secondsRemaining > 0 && (
        <p>Unlocking in {Math.floor(secondsRemaining / 60)}:{String(secondsRemaining % 60).padStart(2, "0")}…</p>
      )}

      <p>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            void browser.runtime.openOptionsPage();
          }}
        >
          Adjust your settings
        </a>
      </p>
    </div>
  );
}
