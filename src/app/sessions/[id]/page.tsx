// src/app/sessions/[id]/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supabaseServerComponent } from "@/lib/supabaseServerComponent";

export default async function SessionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; //  FIX for Next.js dynamic params

  const supabase = await supabaseServerComponent();
  const { data } = await supabase.auth.getUser();

  const email = data?.user?.email?.toLowerCase();
  if (!email) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!me) redirect("/login");

  const session = await prisma.session.findUnique({
    where: { id }, //  use awaited id
    select: { id: true, tutorId: true, studentId: true },
  });

  // if session not found or user not part of it
  if (!session || (me.id !== session.tutorId && me.id !== session.studentId)) {
    redirect("/dashboard");
  }

  const isTutor = me.id === session.tutorId;

  if (isTutor) {
    redirect(`/dashboard/tutor/sessions?focus=${session.id}`);
  } else {
    redirect(`/dashboard/student/sessions?focus=${session.id}`);
  }
}
