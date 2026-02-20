import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

function isTutorUser(u: {
  isTutorApproved: boolean;
  role: any;
  roleAssignments: { role: any }[];
}) {
  return (
    u.isTutorApproved ||
    u.role === "TUTOR" ||
    u.roleAssignments.some((r) => r.role === "TUTOR")
  );
}

export async function GET() {
  const supabase = await supabaseServerComponent();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const tutor = await prisma.user.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      name: true,
      email: true,
      programme: true,
      avatarUrl: true,
      createdAt: true,
      isDeactivated: true,
      verificationStatus: true,
      isTutorApproved: true,
      role: true,
      roleAssignments: { select: { role: true } },
      avgRating: true,
      ratingCount: true,
      tutorSubjects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: { select: { id: true, code: true, title: true } },
        },
      },
    },
  });

  if (!tutor || tutor.isDeactivated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isTutorUser(tutor) || tutor.verificationStatus !== "AUTO_VERIFIED") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  //  Stats
  const [completedCount, upcomingCount] = await Promise.all([
    prisma.session.count({
      where: { tutorId: tutor.id, status: "COMPLETED" },
    }),
    prisma.session.count({
      where: { tutorId: tutor.id, status: "ACCEPTED" },
    }),
  ]);

  //  Last 3 reviews (ratings)
  const recentReviews = await prisma.sessionRating.findMany({
    where: { tutorId: tutor.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      student: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    tutor: {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      programme: tutor.programme,
      avatarUrl: tutor.avatarUrl,
      createdAt: tutor.createdAt,
      avgRating: tutor.avgRating ?? 0,
      ratingCount: tutor.ratingCount ?? 0,
      subjects: tutor.tutorSubjects.map((x) => x.subject),
    },
    stats: {
      completedCount,
      upcomingCount,
      joinedSince: tutor.createdAt,
    },
    reviews: recentReviews,
  });
}