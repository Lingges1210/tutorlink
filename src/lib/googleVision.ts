import vision from "@google-cloud/vision";
const { ImageAnnotatorClient } = vision;

const client = new ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || "{}"),
});

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const [result] = await client.textDetection({
    image: { content: buffer },
  });
  const detections = result.textAnnotations;
  if (!detections || detections.length === 0) return "";
  return detections[0].description || "";
}

export function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Noise tokens common on Malaysian matric cards that should NOT
 * be used as name-matching parts.
 */
const NOISE_TOKENS = new Set([
  "a/l", "a/p", "bin", "binti", "bte", "bt", "s/o", "d/o",
  "mr", "mrs", "ms", "dr", "prof",
]);

/**
 * Collapse all spaces/separators so OCR-spaced text like
 * "1 6 4 3 3 4" matches "164334".
 */
function collapseSpaces(s: string) {
  return s.replace(/[\s\-_.]/g, "").toLowerCase();
}

/**
 * Simple character-level similarity (0–1).
 * Tolerates a single OCR misread in a name segment.
 */
function charSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer  = a.length >= b.length ? a : b;
  const shorter = a.length < b.length  ? a : b;
  if (longer.length === 0) return 1;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }
  return matches / longer.length;
}

export function matchMatricAndName({
  ocrText,
  matricNo,
  fullName,
}: {
  ocrText: string;
  matricNo: string;
  fullName: string;
}) {
  const rawNorm = normalize(ocrText);

  // ── Matric matching ──────────────────────────────────────────────
  // Strategy 1: direct substring (normalised)
  const matricNorm      = normalize(matricNo);
  // Strategy 2: collapse ALL spaces (handles "1 6 4 3 3 4" → "164334")
  const matricCollapsed = collapseSpaces(matricNo);
  const ocrCollapsed    = collapseSpaces(ocrText);

  const matricMatch =
    Boolean(matricNo) &&
    (rawNorm.includes(matricNorm) || ocrCollapsed.includes(matricCollapsed));

  // ── Name matching ────────────────────────────────────────────────
  // Drop noise tokens and very short parts (≤2 chars)
  const nameParts = normalize(fullName)
    .split(/[\s/]+/)
    .map((p) => p.replace(/[^a-z]/g, ""))
    .filter((p) => p.length >= 3 && !NOISE_TOKENS.has(p));

  let matchedParts = 0;

  for (const part of nameParts) {
    // Exact substring match
    if (rawNorm.includes(part)) {
      matchedParts++;
      continue;
    }

    // Fuzzy: slide a window over OCR text, tolerate 1 misread character
    if (part.length >= 4) {
      let found = false;
      for (let i = 0; i <= rawNorm.length - part.length; i++) {
        const window = rawNorm.slice(i, i + part.length);
        if (charSimilarity(window, part) >= 0.8) {
          found = true;
          break;
        }
      }
      if (found) {
        matchedParts++;
        continue;
      }
    }
  }

  const nameScore = nameParts.length === 0 ? 0 : matchedParts / nameParts.length;
  const nameMatch = nameScore >= 0.5;

  const hasUSM =
    rawNorm.includes("usm") ||
    rawNorm.includes("universiti sains malaysia");

  return {
    matricMatch,
    nameMatch,
    nameScore,
    hasUSM,
    debug: {
      nameParts,
      matchedParts,
      matricNorm,
      matricCollapsed,
    },
  };
}