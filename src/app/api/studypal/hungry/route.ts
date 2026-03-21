import { NextResponse } from "next/server";
import { notify } from "@/lib/notify";
import { getSessionUser } from "@/lib/getSessionUser";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { petName } = await req.json();

  await notify.studypalHungry(user.id, petName ?? "your companion");

  return NextResponse.json({ ok: true });
}