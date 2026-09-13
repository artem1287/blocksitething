import { useEffect, useState } from "react";
import browser from "webextension-polyfill";
import { getStorage, setStorage, allocateRuleId } from "../shared/storage";
import { normalizeDomain, originPatternsFor } from "../lib/domain";
import { minutesToTimeString, timeStringToMinutes } from "../lib/time";
import { toLocalDateKey } from "../lib/stats";
import { CATEGORIES, DEFAULT_SCHEDULE, type BlocklistEntry, type Schedule } from "../shared/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Options() {
  const [blocklist, setBlocklist] = useState<BlocklistEntry[]>([]);
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [todayStats, setTodayStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [domainInput, setDomainInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<string>(CATEGORIES[0]);
  const [addError, setAddError] = useState<string | null>(null);

  const [scheduleSaved, setScheduleSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const storage = await getStorage();
      setBlocklist(storage.blocklist);
      setSchedule(storage.schedule);
      const todayKey = toLocalDateKey(new Date());
      setTodayStats(storage.statsByDate[todayKey] ?? {});
      setLoading(false);
    })();
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

  if (loading) return null;

  const sortedStats = Object.entries(todayStats).sort(([, a], [, b]) => b - a);

  return (
    <div className="page">
      <h1>Taper settings</h1>
      <p className="subtitle">Free plan: a manual blocklist and schedule, with today's stats only.</p>

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
          <button onClick={() => void handleAddDomain()}>Add</button>
        </div>
        {addError && <p className="error">{addError}</p>}

        {blocklist.length === 0 ? (
          <p className="empty">Nothing blocked yet.</p>
        ) : (
          <ul className="entry-list">
            {blocklist.map((entry) => (
              <li key={entry.id}>
                <span>
                  {entry.domain}
                  <span className="category-tag">{entry.category}</span>
                </span>
                <button className="remove" onClick={() => void handleRemoveDomain(entry)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Schedule</h2>
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
