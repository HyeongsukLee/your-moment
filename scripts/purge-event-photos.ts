/**
 * 행사들의 사진을 전부 지운다. 행사(카드) 자체는 남긴다.
 * DELETE /api/admin/events/[eventId]와 같은 순서로 지우되 db.event.delete만 하지 않는다.
 *
 * 이름 접두어로 여러 행사 지정:
 *   npx dotenv -e .env.local -- npx tsx scripts/purge-event-photos.ts "강심장 시즌2" [--apply]
 * 행사 ID를 콤마로 직접 지정 (이름이 겹치거나 제각각일 때):
 *   npx dotenv -e .env.local -- npx tsx scripts/purge-event-photos.ts --ids id1,id2,id3 [--apply]
 */
import { db } from "../src/lib/db";
import { deleteObjects } from "../src/lib/s3";
import { deleteFaces } from "../src/lib/rekognition";

const S3_CHUNK = 1000; // DeleteObjects 상한
const FACE_CHUNK = 1000;

async function main() {
  const apply = process.argv.includes("--apply");
  const idsFlagIndex = process.argv.indexOf("--ids");
  const prefix = idsFlagIndex === -1 ? process.argv[2] : undefined;
  const idsArg = idsFlagIndex !== -1 ? process.argv[idsFlagIndex + 1] : undefined;

  if (!prefix && !idsArg) {
    console.error('사용법: tsx scripts/purge-event-photos.ts "<행사 이름 접두어>" [--apply]');
    console.error("      또는: tsx scripts/purge-event-photos.ts --ids id1,id2,... [--apply]");
    process.exitCode = 1;
    return;
  }

  const events = idsArg
    ? await db.event.findMany({
        where: { id: { in: idsArg.split(",").map((s) => s.trim()).filter(Boolean) } },
        select: { id: true, name: true, date: true, _count: { select: { photos: true } } },
        orderBy: { date: "asc" },
      })
    : await db.event.findMany({
        where: { name: { startsWith: prefix } },
        select: { id: true, name: true, date: true, _count: { select: { photos: true } } },
        orderBy: { name: "asc" },
      });

  if (events.length === 0) {
    console.log(idsArg ? "지정한 ID에 해당하는 행사가 없습니다." : `"${prefix}"로 시작하는 행사가 없습니다.`);
    return;
  }

  if (idsArg) {
    const requested = idsArg.split(",").map((s) => s.trim()).filter(Boolean);
    const found = new Set(events.map((e) => e.id));
    const missing = requested.filter((id) => !found.has(id));
    if (missing.length > 0) {
      console.error("!! 존재하지 않는 ID가 섞여 있습니다:", missing.join(", "));
      process.exitCode = 1;
      return;
    }
  }

  console.log(`대상 행사 ${events.length}개:`);
  for (const e of events)
    console.log(`  - ${e.id}  ${e.name}  ${e.date.toISOString().slice(0, 10)}  (${e._count.photos}장)`);
  const totalPhotos = events.reduce((s, e) => s + e._count.photos, 0);
  console.log(`총 ${totalPhotos}장\n`);

  if (!apply) {
    console.log("확인 모드입니다. 아무것도 지우지 않았습니다.");
    console.log("실제로 지우려면 --apply 를 붙여 다시 실행하세요.");
    return;
  }

  for (const e of events) {
    const photos = await db.photo.findMany({
      where: { eventId: e.id },
      select: { id: true, rekognitionId: true, s3Key: true, thumbnailKey: true },
    });
    if (photos.length === 0) {
      console.log(`- ${e.name}: 사진 없음, 건너뜀`);
      continue;
    }

    const faceIds = photos.map((p) => p.rekognitionId).filter(Boolean) as string[];
    for (let i = 0; i < faceIds.length; i += FACE_CHUNK) {
      await deleteFaces(faceIds.slice(i, i + FACE_CHUNK));
    }

    const keys = photos.flatMap((p) => [p.s3Key, p.thumbnailKey]);
    for (let i = 0; i < keys.length; i += S3_CHUNK) {
      await deleteObjects(keys.slice(i, i + S3_CHUNK));
    }

    // 대표사진이 지금 지우는 사진 중 하나였으면 해제 (행사는 남기므로 직접 정리해야 함)
    await db.event.update({
      where: { id: e.id },
      data: { coverPhotoId: null, coverPosition: null },
    });

    // Photo 삭제 → SearchResult는 cascade
    await db.photo.deleteMany({ where: { eventId: e.id } });

    console.log(`- ${e.name}: ${photos.length}장 삭제 완료 (얼굴 ${faceIds.length}개 포함)`);
  }

  console.log("\n행사 사진 삭제 완료. Rekognition에 남을 수 있는 추가 얼굴 찌꺼기는");
  console.log("cleanup-orphan-faces.ts를 이어서 실행해 정리하세요.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
