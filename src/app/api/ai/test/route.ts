import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "Missing GEMINI_API_KEY" }, { status: 500 });

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // ✅ change here

    const result = await model.generateContent("Say hello in 1 sentence.");
    return NextResponse.json({ ok: true, result: result.response.text() });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}