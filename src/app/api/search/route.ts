import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { searchFacesByImage } from "@/lib/rekognition";
import { resolveImageUrl, putObject } from "@/lib/s3";

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

  // 셀카를 S3에 보관 → 이후 사진 추가 시 재매칭(PHOTOS_OF_ME)에 사용
  const selfieKey = `selfies/${session.user.id}/${Date.now()}.jpg`;
  let storedSelfieKey = "temp";
  try {
    await putObject(selfieKey, imageBytes, selfie.type || "image/jpeg");
    storedSelfieKey = selfieKey;
  } catch {
    // 보관 실패해도 검색 자체는 진행
  }

  if (faceMatches.length === 0) {
    // 매칭이 없어도 셀카는 기록(이후 업로드로 매칭될 수 있음)
    await db.search.create({
      data: { userId: session.user.id, eventId, selfieKey: storedSelfieKey },
    });
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
      selfieKey: storedSelfieKey,
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
