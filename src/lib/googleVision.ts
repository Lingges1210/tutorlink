// src/lib/googleVision.ts
import vision from "@google-cloud/vision";

// Uses GOOGLE_APPLICATION_CREDENTIALS env var automatically.
// (For Option B, set GOOGLE_APPLICATION_CREDENTIALS=.secrets/google-vision.json)
const client = new vision.ImageAnnotatorClient();

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

export function matchMatricAndName({
  ocrText,
  matricNo,
  fullName,
}: {
  ocrText: string;
  matricNo: string;
  fullName: string;
}) {
  const text = normalize(ocrText);

  // Matric number match (still strict – numbers are reliable)
  const matricMatch = Boolean(matricNo) && text.includes(normalize(matricNo));

  // Name matching (looser)
  const nameParts = normalize(fullName)
    .split(" ")
    .filter((p) => p.length >= 3); // ignore short words like "bin", "a/l"

  const matchedParts = nameParts.filter((p) => text.includes(p));
  const nameScore =
    nameParts.length === 0 ? 0 : matchedParts.length / nameParts.length;

  const nameMatch = nameScore >= 0.6; // 60% match threshold

  return {
    matricMatch,
    nameMatch,
    nameScore, // useful for admin/debug
  };
}

