import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchFacesByImage } from "@/lib/rekognition";
import { resolveImageUrl } from "@/lib/s3";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const selfie = formData.get("selfie") as File | null;
  const eventId = formData.get("eventId") as string | null;

  if (!selfie || !eventId) {
    return Response.json({ error: "Missing selfie or eventId" }, { status: 400 });
  }

  const imageBytes = new Uint8Array(await selfie.arrayBuffer());
  const faceMatches = await searchFacesByImage(imageBytes);

  if (faceMatches.length === 0) {
    return Response.json({ results: [] });
  }

  // ExternalImageId는 photoId로 저장됨
  const matchedPhotoIds = faceMatches
    .map((m) => m.Face?.ExternalImageId)
    .filter(Boolean) as string[];

  const photos = await db.photo.findMany({
    where: { id: { in: matchedPhotoIds }, eventId },
    select: { id: true, thumbnailKey: true, s3Key: true },
  });

  // 검색 기록 저장
  const search = await db.search.create({
    data: {
      userId: session.user.id,
      eventId,
      selfieKey: "temp",
      results: {
        create: photos.map((p) => ({
          photoId: p.id,
          similarity:
            faceMatches.find((m) => m.Face?.ExternalImageId === p.id)?.Similarity ?? 0,
        })),
      },
    },
  });

  return Response.json({
    searchId: search.id,
    results: await Promise.all(
      photos.map(async (p) => ({
        id: p.id,
        thumbnailUrl: await resolveImageUrl(p.thumbnailKey),
      }))
    ),
  });
}
