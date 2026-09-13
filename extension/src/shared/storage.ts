import browser from "webextension-polyfill";
import { DEFAULT_STORAGE, type StorageSchema } from "./types";

export async function getStorage(): Promise<StorageSchema> {
  const stored = await browser.storage.local.get(null);
  return { ...DEFAULT_STORAGE, ...(stored as Partial<StorageSchema>) };
}

export async function setStorage(patch: Partial<StorageSchema>): Promise<void> {
  await browser.storage.local.set(patch);
}

/** Allocates the next dynamic-rule id and persists the counter so ids never collide. */
export async function allocateRuleId(): Promise<number> {
  const { nextRuleId } = await getStorage();
  await setStorage({ nextRuleId: nextRuleId + 1 });
  return nextRuleId;
}
