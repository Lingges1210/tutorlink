import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/auth/requireDbUser";
import { generateCertificatePdf } from "@/lib/generateCertificate";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  try {
    const user = await requireDbUser();
    const tutorId = user.id;

    const [sessionsResult, ratingsResult] = await Promise.all([
      prisma.session.aggregate({
        where: { tutorId, status: "COMPLETED" },
        _count: { id: true },
        _sum: { durationMin: true },
      }),
      prisma.sessionRating.aggregate({
        where: { tutorId },
        _avg: { rating: true },
        _count: { id: true },
      }),
    ]);

    const sessionsCompleted = sessionsResult._count.id;
    const hoursCompleted = Math.round((sessionsResult._sum.durationMin ?? 0) / 60);
    const rating = ratingsResult._avg.rating ?? 0;
    const ratingCount = ratingsResult._count.id;

    const certId =
      "TL-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 9000) + 1000);

    const date = new Date().toLocaleDateString("en-MY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const pdfBytes = await generateCertificatePdf({
      tutorName: user.name ?? "Tutor",
      sessionsCompleted,
      hoursCompleted,
      rating,
      ratingCount,
      date,
      certId,
    });

    const BUCKET = "certificates";
    const filename = `${tutorId}/${Date.now()}.pdf`;

    const supabase = supabaseAdmin();

    // Ensure the storage bucket exists (no-op if it already does)
    await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => {});

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, pdfBytes, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    const pdfUrl = publicUrlData?.publicUrl ?? null;

    // Find existing TUTOR_MILESTONE cert for this user or create a new one
    const existingCert = await prisma.certificate.findFirst({
      where: { userId: tutorId, type: "TUTOR_MILESTONE" },
      orderBy: { issuedAt: "desc" },
    });

    const cert = existingCert
      ? await prisma.certificate.update({
          where: { id: existingCert.id },
          data: {
            pdfUrl,
            issuedAt: new Date(),
            title: `TutorLink Certificate — ${certId}`,
            metadata: { sessionsCompleted, hoursCompleted, rating, ratingCount, certId },
          },
        })
      : await prisma.certificate.create({
          data: {
            userId: tutorId,
            type: "TUTOR_MILESTONE",
            title: `TutorLink Certificate — ${certId}`,
            pdfUrl,
            issuedAt: new Date(),
            metadata: { sessionsCompleted, hoursCompleted, rating, ratingCount, certId },
          },
        });

    return NextResponse.json(cert);
  } catch (e: any) {
    if (String(e?.message) === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}