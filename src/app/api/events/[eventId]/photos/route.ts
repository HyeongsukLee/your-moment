import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/s3";

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
        uploader: { select: { name: true, instagram: true } },
      },
    }),
  ]);

  if (!event) {
    return Response.json({ error: "Not found" }, { status: 404 });
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
        uploaderName: p.uploader?.name ?? null,
        uploaderInstagram: p.uploader?.instagram ?? null,
      }))
    ),
  });
}
