import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/getSessionUser";

export default async function SessionRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const dbUser = await getSessionUser(); // ✅ cached
  if (!dbUser) redirect("/auth/login");

  const session = await prisma.session.findUnique({
    where: { id },
    select: { id: true, tutorId: true, studentId: true },
  });

  if (!session || (dbUser.id !== session.tutorId && dbUser.id !== session.studentId)) {
    redirect("/dashboard");
  }

  if (dbUser.id === session.tutorId) {
    redirect(`/dashboard/tutor/sessions?focus=${session.id}`);
  } else {
    redirect(`/dashboard/student/sessions?focus=${session.id}`);
  }
}