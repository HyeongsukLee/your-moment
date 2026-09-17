import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/s3";
import { logActivity } from "@/lib/activity";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { eventId } = await params;

  const [event, photos] = await Promise.all([
    db.event.findUnique({
      where: { id: eventId },
      select: { id: true, name: true, date: true, coverPhotoId: true, coverPosition: true },
    }),
    db.photo.findMany({
      where: { eventId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        thumbnailKey: true,
        uploaderId: true,
        originalFilename: true,
        uploader: { select: { name: true, instagram: true } },
      },
    }),
  ]);

  if (!event) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // 행사별 방문 집계용. 새로고침마다 쌓이므로 통계 쪽에서 고유 사용자로 집계한다.
  if (session.user?.id) {
    await logActivity(session.user.id, "EVENT_VIEW", { eventId });
  }

  return Response.json({
    event: {
      id: event.id,
      name: event.name,
      date: event.date.toISOString(),
      photoCount: photos.length,
    },
    coverPhotoId: event.coverPhotoId ?? null,
    coverPosition: event.coverPosition ?? null,
    photos: await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        thumbnailUrl: await resolveImageUrl(p.thumbnailKey),
        uploaderId: p.uploaderId,
        originalFilename: p.originalFilename ?? null,
        uploaderName: p.uploader?.name ?? null,
        uploaderInstagram: p.uploader?.instagram ?? null,
      }))
    ),
  });
}
