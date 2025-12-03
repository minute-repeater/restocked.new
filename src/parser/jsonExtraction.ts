/**
 * Extract embedded JSON from HTML
 * Detects:
 * - JSON-LD schema blocks (<script type="application/ld+json">)
 * - Inline JSON inside <script> tags
 * - Next.js __NEXT_DATA__
 * - Any valid JSON object literals in script tags
 *
 * @param html - HTML string to scan
 * @returns Array of successfully parsed JSON objects
 */
export function extractEmbeddedJson(html: string): any[] {
  if (!html || typeof html !== "string") {
    return [];
  }

  const jsonObjects: any[] = [];

  // Pattern 1: JSON-LD blocks (<script type="application/ld+json">)
  const jsonLdPattern =
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdPattern.exec(html)) !== null) {
    const jsonContent = match[1].trim();
    if (jsonContent) {
      const parsed = tryParseJson(jsonContent);
      if (parsed !== null) {
        // Handle arrays of JSON-LD objects (common pattern)
        if (Array.isArray(parsed)) {
          jsonObjects.push(...parsed);
        } else {
          jsonObjects.push(parsed);
        }
      }
    }
  }

  // Pattern 1b: Application JSON blocks (<script type="application/json">) - Shopify and others
  const appJsonPattern =
    /<script[^>]*type\s*=\s*["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = appJsonPattern.exec(html)) !== null) {
    const jsonContent = match[1].trim();
    if (jsonContent) {
      const parsed = tryParseJson(jsonContent);
      if (parsed !== null) {
        // Handle arrays of JSON objects
        if (Array.isArray(parsed)) {
          jsonObjects.push(...parsed);
        } else {
          jsonObjects.push(parsed);
        }
      }
    }
  }

  // Pattern 2: Generic script tags that might contain JSON
  // Look for script tags with JSON-like content
  const scriptPattern = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  while ((match = scriptPattern.exec(html)) !== null) {
    const scriptContent = match[1].trim();

    // Skip if it's clearly JavaScript code (has function, var, let, const, etc.)
    if (
      /^\s*(function|var|let|const|class|import|export)\s/.test(scriptContent)
    ) {
      continue;
    }

    // Try to extract JSON objects from the script content
    // Look for object literals that are valid JSON
    const jsonCandidates = extractJsonFromScript(scriptContent);
    for (const candidate of jsonCandidates) {
      const parsed = tryParseJson(candidate);
      if (parsed !== null) {
        jsonObjects.push(parsed);
      }
    }
  }

  // Pattern 3: Next.js __NEXT_DATA__ pattern
  const nextDataPattern = /__NEXT_DATA__\s*=\s*({[\s\S]*?});/i;
  const nextDataMatch = html.match(nextDataPattern);
  if (nextDataMatch && nextDataMatch[1]) {
    const parsed = tryParseJson(nextDataMatch[1]);
    if (parsed !== null) {
      jsonObjects.push(parsed);
    }
  }

  // Pattern 4: Shopify product JSON (common pattern)
  const shopifyPattern = /Product\.json\s*=\s*({[\s\S]*?});/i;
  const shopifyMatch = html.match(shopifyPattern);
  if (shopifyMatch && shopifyMatch[1]) {
    const parsed = tryParseJson(shopifyMatch[1]);
    if (parsed !== null) {
      jsonObjects.push(parsed);
    }
  }

  return jsonObjects;
}

/**
 * Try to parse a JSON string safely
 * Returns null on failure
 *
 * @param jsonString - JSON string to parse
 * @returns Parsed object or null
 */
function tryParseJson(jsonString: string): any | null {
  if (!jsonString || typeof jsonString !== "string") {
    return null;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return null;
  }
}

/**
 * Extract JSON-like objects from script content
 * Looks for object literals that could be valid JSON
 *
 * @param scriptContent - Script tag content
 * @returns Array of potential JSON strings
 */
function extractJsonFromScript(scriptContent: string): string[] {
  const candidates: string[] = [];

  // Look for object literals wrapped in various ways
  // Pattern: { ... } or [ ... ] that might be JSON
  const objectPattern = /({[\s\S]{20,}?})/g; // At least 20 chars to avoid tiny objects
  let match;
  while ((match = objectPattern.exec(scriptContent)) !== null) {
    const candidate = match[1];
    // Basic validation: should start with { or [ and end with } or ]
    if (
      (candidate.trim().startsWith("{") && candidate.trim().endsWith("}")) ||
      (candidate.trim().startsWith("[") && candidate.trim().endsWith("]"))
    ) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

