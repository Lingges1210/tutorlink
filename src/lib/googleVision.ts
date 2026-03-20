// src/lib/googleVision.ts
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

  const matricMatch = Boolean(matricNo) && text.includes(normalize(matricNo));

  const nameParts = normalize(fullName)
    .split(" ")
    .filter((p) => p.length >= 3);

  const matchedParts = nameParts.filter((p) => text.includes(p));
  const nameScore =
    nameParts.length === 0 ? 0 : matchedParts.length / nameParts.length;

  const nameMatch = nameScore >= 0.6;

  return {
    matricMatch,
    nameMatch,
    nameScore,
  };
}