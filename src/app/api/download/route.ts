import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPresignedDownloadUrl } from "@/lib/s3";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { photoIds } = await req.json();
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return Response.json({ error: "No photoIds" }, { status: 400 });
  }

  const photos = await db.photo.findMany({
    where: { id: { in: photoIds } },
    select: { id: true, s3Key: true, originalFilename: true },
  });

  const urls = await Promise.all(
    photos.map(async (p) => ({
      id: p.id,
      url: await getPresignedDownloadUrl(p.s3Key, 3600, p.originalFilename ?? undefined),
    }))
  );

  return Response.json({ urls });
}
