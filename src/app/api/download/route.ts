import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";
import { logDownloads } from "@/lib/activity";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoIds } = await req.json();
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return Response.json({ error: "No photoIds" }, { status: 400 });
  }

  const isAdmin = session.user.role === "ADMIN";
  const photos = await db.photo.findMany({
    where: {
      id: { in: photoIds },
      ...(isAdmin
        ? {}
        : { event: { group: { members: { some: { id: session.user.id } } } } }),
    },
    select: { id: true, eventId: true, s3Key: true, originalFilename: true },
  });

  const urls = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      url: await getPresignedDownloadUrl(p.s3Key, 3600, p.originalFilename ?? undefined),
    }))
  );

  // URL 발급에 성공한 사진만 집계 (사진 1장 = 1행)
  await logDownloads(
    session.user.id,
    photos.map((p) => ({ id: p.id, eventId: p.eventId }))
  );

  return Response.json({ urls });
}
