/**
 * The maintained list of categories and their popular sites (Section 3). Kept as one isolated
 * data file, not scattered through UI components, so refreshing "trending distractions" is a
 * one-file edit — not yet fetched remotely (that needs a backend, which doesn't exist yet), but
 * isolating it here is what makes that swap a config change later instead of a UI rewrite.
 */
export interface CatalogSite {
  domain: string;
  label: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  sites: CatalogSite[];
}

export const SITE_CATALOG: Category[] = [
  {
    id: "social",
    label: "Social Media",
    icon: "📱",
    sites: [
      { domain: "instagram.com", label: "Instagram" },
      { domain: "tiktok.com", label: "TikTok" },
      { domain: "x.com", label: "X / Twitter" },
      { domain: "facebook.com", label: "Facebook" },
      { domain: "reddit.com", label: "Reddit" },
      { domain: "snapchat.com", label: "Snapchat" },
    ],
  },
  {
    id: "video",
    label: "Video & Streaming",
    icon: "📺",
    sites: [
      { domain: "youtube.com", label: "YouTube" },
      { domain: "netflix.com", label: "Netflix" },
      { domain: "twitch.tv", label: "Twitch" },
    ],
  },
  {
    id: "shopping",
    label: "Shopping",
    icon: "🛒",
    sites: [
      { domain: "amazon.com", label: "Amazon" },
      { domain: "ebay.com", label: "eBay" },
      { domain: "temu.com", label: "Temu" },
    ],
  },
  {
    id: "news",
    label: "News",
    icon: "📰",
    sites: [
      { domain: "cnn.com", label: "CNN" },
      { domain: "nytimes.com", label: "New York Times" },
      { domain: "bbc.com", label: "BBC" },
      { domain: "foxnews.com", label: "Fox News" },
    ],
  },
  {
    id: "gaming",
    label: "Gaming",
    icon: "🎮",
    sites: [
      { domain: "roblox.com", label: "Roblox" },
      { domain: "store.steampowered.com", label: "Steam" },
      { domain: "ign.com", label: "IGN" },
      { domain: "poki.com", label: "Poki" },
    ],
  },
  {
    id: "dating",
    label: "Dating",
    icon: "💬",
    sites: [
      { domain: "tinder.com", label: "Tinder" },
      { domain: "bumble.com", label: "Bumble" },
      { domain: "hinge.co", label: "Hinge" },
      { domain: "match.com", label: "Match" },
    ],
  },
  {
    id: "other",
    label: "Other",
    icon: "➕",
    sites: [],
  },
];

export function findCategory(id: string): Category | undefined {
  return SITE_CATALOG.find((category) => category.id === id);
}
