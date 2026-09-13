import { useEffect, useRef, useState } from "react";
import browser from "webextension-polyfill";
import { getStorage, setStorage } from "../shared/storage";
import { incrementStat, pruneToToday, toLocalDateKey } from "../lib/stats";
import { minutesToTimeString } from "../lib/time";

export function Blocked() {
  const [endTime, setEndTime] = useState<string | null>(null);
  const recorded = useRef(false);

  const domain = new URLSearchParams(window.location.search).get("domain") ?? "this site";

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;

    void (async () => {
      const storage = await getStorage();
      const todayKey = toLocalDateKey(new Date());
      const pruned = pruneToToday(storage.statsByDate, todayKey);
      pruned[todayKey] = incrementStat(pruned[todayKey] ?? {}, domain);
      await setStorage({ statsByDate: pruned });
      setEndTime(minutesToTimeString(storage.schedule.endMinute));
    })();
  }, [domain]);

  return (
    <div className="card">
      <h1>{domain} is blocked right now</h1>
      <p>This falls inside the schedule you set for yourself.</p>
      {endTime && <p>Today's block window ends at {endTime}.</p>}
      <p>
        <a href="#" onClick={() => browser.runtime.openOptionsPage()}>
          Adjust your schedule
        </a>
      </p>
    </div>
  );
}
