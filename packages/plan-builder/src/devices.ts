/** "Which devices" — captured now even for platforms that don't exist yet, so the intent is
 *  ready to act on (a mobile-app nudge, say) the moment they ship. */
export type DeviceId = "laptop" | "phone";

export interface DeviceOption {
  id: DeviceId;
  label: string;
  icon: string;
  /** False for platforms not yet built — still selectable so intent is captured either way. */
  available: boolean;
}

export const DEVICE_OPTIONS: DeviceOption[] = [
  { id: "laptop", label: "Laptop / desktop", icon: "💻", available: true },
  { id: "phone", label: "Phone", icon: "📱", available: false },
];
