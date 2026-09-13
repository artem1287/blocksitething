import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import { getStorage, setStorage, allocateRuleId } from "../shared/storage";
import { isWithinSchedule } from "../lib/schedule";
import { normalizeDomain, originPatternsFor } from "../lib/domain";
import { toLocalDateKey } from "../lib/stats";
import { DEFAULT_BASELINE_MINUTES, type BlocklistEntry } from "../shared/types";

type AddStatus =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "already-blocked" }
  | { kind: "denied" }
  | { kind: "added"; domain: string };

export function Popup() {
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [status, setStatus] = useState<AddStatus>({ kind: "idle" });

  async function refresh() {
    const storage = await getStorage();
    const now = new Date();
    setActive(isWithinSchedule(storage.schedule, now.getDay(), now.getHours() * 60 + now.getMinutes()));
    const todayKey = toLocalDateKey(now);
    const today = storage.statsByDate[todayKey] ?? {};
    setTodayCount(Object.values(today).reduce((sum, n) => sum + n, 0));
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function addCurrentSite() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    const domain = normalizeDomain(tab?.url ?? "");
    if (!domain) {
      setStatus({ kind: "invalid" });
      return;
    }

    const storage = await getStorage();
    if (storage.blocklist.some((entry: BlocklistEntry) => entry.domain === domain)) {
      setStatus({ kind: "already-blocked" });
      return;
    }

    const granted = await browser.permissions.request({ origins: originPatternsFor(domain) });
    if (!granted) {
      setStatus({ kind: "denied" });
      return;
    }

    const ruleId = await allocateRuleId();
    const entry: BlocklistEntry = {
      id: crypto.randomUUID(),
      domain,
      category: "Other",
      ruleId,
      addedAt: Date.now(),
      baselineMinutes: DEFAULT_BASELINE_MINUTES,
    };
    await setStorage({ blocklist: [...storage.blocklist, entry] });
    setStatus({ kind: "added", domain });
    void refresh();
  }

  if (loading) return null;

  return (
    <div className="popup">
      <div className={`status ${active ? "active" : "inactive"}`}>
        {active ? "Blocking is ON right now" : "Blocking is OFF right now"}
      </div>
      <div className="today-count">
        {todayCount === 0 ? "No blocked visits today" : `Blocked ${todayCount} time${todayCount === 1 ? "" : "s"} today`}
      </div>
      <div className="add-row">
        <button className="primary" onClick={() => void addCurrentSite()}>
          Block this site
        </button>
        {status.kind === "invalid" && <p className="message error">That doesn't look like a blockable site.</p>}
        {status.kind === "already-blocked" && <p className="message error">Already on your blocklist.</p>}
        {status.kind === "denied" && <p className="message error">Permission wasn't granted, so nothing was added.</p>}
        {status.kind === "added" && <p className="message success">Added {status.domain} to your blocklist.</p>}
      </div>
      <button className="secondary" onClick={() => browser.runtime.openOptionsPage()}>
        Open full settings
      </button>
    </div>
  );
}
