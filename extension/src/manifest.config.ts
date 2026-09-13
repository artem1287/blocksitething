import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json" with { type: "json" };

export default defineManifest({
  manifest_version: 3,
  name: "Taper — gradual site blocker",
  version: pkg.version,
  description: "Cut your screen time starting today, on a pace you set.",
  icons: {
    16: "icons/16.png",
    32: "icons/32.png",
    48: "icons/48.png",
    128: "icons/128.png",
  },
  action: {
    default_popup: "src/popup/popup.html",
    default_icon: {
      16: "icons/16.png",
      32: "icons/32.png",
    },
  },
  options_ui: {
    page: "src/options/options.html",
    open_in_tab: true,
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  // "activeTab" backs the popup's "block this site" quick action (no prompt, scoped to a
  // user click). Per-site blocking access is requested at add-time via optional_host_permissions
  // below instead of declaring broad host_permissions here — see ARCHITECTURE.md.
  permissions: ["storage", "alarms", "activeTab", "declarativeNetRequestWithHostAccess"],
  optional_host_permissions: ["*://*/*"],
  web_accessible_resources: [
    {
      resources: ["src/blocked/blocked.html"],
      matches: ["<all_urls>"],
    },
  ],
});
