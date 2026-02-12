import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function splitSubjects(raw: string) {
  // split by comma / newline / bullet
  return raw
    .split(/,|\n|•|;/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET() {
  try {
    // pull recent apps (or all if small)
    const rows = await prisma.tutorApplication.findMany({
      select: { subjects: true },
      take: 500, // keep it light
      orderBy: { createdAt: "desc" },
    });

    const set = new Set<string>();
    for (const r of rows) {
      if (!r.subjects) continue;
      for (const s of splitSubjects(r.subjects)) {
        // normalize: collapse spaces
        const norm = s.replace(/\s+/g, " ").trim();
        if (norm.length >= 2) set.add(norm);
      }
    }

    const suggestions = Array.from(set).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ success: true, suggestions });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, message: e?.message ?? "Failed" },
      { status: 500 }
    );
  }
}
