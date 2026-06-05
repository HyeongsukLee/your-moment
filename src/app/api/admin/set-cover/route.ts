import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId, photoId, position } = await req.json();
  if (!eventId || !photoId) {
    return Response.json({ error: "Missing eventId or photoId" }, { status: 400 });
  }

  // 해당 사진이 그 행사 소속인지 검증
  const photo = await db.photo.findFirst({
    where: { id: photoId, eventId },
    select: { id: true },
  });
  if (!photo) {
    return Response.json({ error: "Photo not in event" }, { status: 400 });
  }

  // position은 "x% y%" 형식만 허용 (기본 "50% 50%")
  const safePosition =
    typeof position === "string" && /^\d{1,3}% \d{1,3}%$/.test(position)
      ? position
      : "50% 50%";

  await db.event.update({
    where: { id: eventId },
    data: { coverPhotoId: photoId, coverPosition: safePosition },
  });

  return Response.json({ ok: true, coverPhotoId: photoId, coverPosition: safePosition });
}
