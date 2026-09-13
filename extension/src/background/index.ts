import browser from "webextension-polyfill";
import type { DeclarativeNetRequest } from "webextension-polyfill/namespaces/declarativeNetRequest";
import { getStorage } from "../shared/storage";
import { isWithinSchedule } from "../lib/schedule";
import { buildBlockRule, type BlockRule } from "../lib/rules";
import { originPatternsFor } from "../lib/domain";

const SCHEDULE_ALARM = "taper-schedule-tick";

async function recomputeRules(): Promise<void> {
  const { blocklist, schedule } = await getStorage();
  const now = new Date();
  const active = isWithinSchedule(schedule, now.getDay(), now.getHours() * 60 + now.getMinutes());

  // We own every dynamic rule ever created for this blocklist, so it's simplest and safest to
  // clear all of them and re-add whichever should currently apply, rather than diffing state.
  const removeRuleIds = blocklist.map((entry) => entry.ruleId);
  const addRules: BlockRule[] = [];

  if (active) {
    const blockedPageUrl = browser.runtime.getURL("src/blocked/blocked.html");
    for (const entry of blocklist) {
      const hasPermission = await browser.permissions.contains({
        origins: originPatternsFor(entry.domain),
      });
      if (hasPermission) {
        addRules.push(buildBlockRule(entry.domain, entry.ruleId, blockedPageUrl));
      }
    }
  }

  await browser.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: addRules as DeclarativeNetRequest.Rule[],
  });
}

browser.runtime.onInstalled.addListener(() => {
  void browser.alarms.create(SCHEDULE_ALARM, { periodInMinutes: 1 });
  void recomputeRules();
});

// Covers the case where the device was asleep/off when the last scheduled alarm should
// have fired — every service-worker wake re-checks the schedule.
browser.runtime.onStartup.addListener(() => {
  void recomputeRules();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCHEDULE_ALARM) void recomputeRules();
});

browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && (changes.blocklist || changes.schedule)) {
    void recomputeRules();
  }
});
