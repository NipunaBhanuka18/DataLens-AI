/**
 * Cleanly strips unparsed raw markdown syntax (**bold**, *italic*, ### headers, - bullets)
 * and extracts structured bullet point items for sleek UI card rendering.
 */
export function cleanMarkdownText(text: string): string {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // Strip bold **text**
    .replace(/\*(.*?)\*/g, "$1")     // Strip italic *text*
    .replace(/^#{1,6}\s+/gm, "")     // Strip markdown headers ###
    .replace(/^\s*[-•*]\s+/gm, "")   // Strip leading bullet hyphens or asterisks
    .trim();
}

export function parseInsightBullets(rawText: string): string[] {
  if (!rawText) return [];

  // Split by line breaks or double line breaks
  const rawLines = rawText.split(/\n+/);
  const bullets: string[] = [];

  for (const line of rawLines) {
    const cleaned = cleanMarkdownText(line);
    if (cleaned.length > 5) {
      bullets.push(cleaned);
    }
  }

  return bullets.length > 0 ? bullets : [cleanMarkdownText(rawText)];
}
