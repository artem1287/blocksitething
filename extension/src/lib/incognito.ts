/** Deep-links to this extension's own details page, where Chrome puts the "Allow in Incognito"
 *  toggle — an extension cannot flip this on for itself (Section 4). */
export function buildExtensionDetailsUrl(extensionId: string): string {
  return `chrome://extensions/?id=${extensionId}`;
}
