/**
 * Rekognition 컬렉션에서 삭제된 사진의 얼굴만 골라 지운다.
 *
 * 확인만: npx dotenv -e .env.local -- npx tsx scripts/cleanup-orphan-faces.ts
 * 실제 삭제: npx dotenv -e .env.local -- npx tsx scripts/cleanup-orphan-faces.ts --apply
 *
 * 삭제 기준은 ExternalImageId(=사진 ID)가 가리키는 Photo가 DB에 없는 경우뿐이다.
 * Photo.rekognitionId를 기준으로 삼으면 안 된다 — 사진 한 장에 얼굴이 여럿 등록되지만
 * DB에는 첫 번째만 저장되고, 나머지도 검색(search/route.ts)에서 실제로 쓰이기 때문이다.
 */
import {
  RekognitionClient,
  ListFacesCommand,
  type Face,
} from "@aws-sdk/client-rekognition";
import { db } from "../src/lib/db";
import { deleteFaces } from "../src/lib/rekognition";

const client = new RekognitionClient({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const DELETE_CHUNK = 1000; // DeleteFaces 상한은 4096

async function listAllFaces(): Promise<Face[]> {
  const faces: Face[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListFacesCommand({
        CollectionId: process.env.AWS_REKOGNITION_COLLECTION!,
        MaxResults: 1000,
        NextToken: token,
      })
    );
    faces.push(...(res.Faces ?? []));
    token = res.NextToken;
  } while (token);
  return faces;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const [faces, photos] = await Promise.all([
    listAllFaces(),
    db.photo.findMany({ select: { id: true, rekognitionId: true } }),
  ]);

  const livePhotoIds = new Set(photos.map((p) => p.id));
  const trackedFaceIds = new Set(
    photos.map((p) => p.rekognitionId).filter(Boolean) as string[]
  );

  let tracked = 0;
  let extraOfLivePhoto = 0;
  let noExternalId = 0;
  const toDelete: string[] = [];

  for (const face of faces) {
    if (!face.FaceId) continue;
    if (trackedFaceIds.has(face.FaceId)) {
      tracked++;
    } else if (!face.ExternalImageId) {
      noExternalId++; // 어느 사진 것인지 증명할 수 없어 지우지 않는다
    } else if (livePhotoIds.has(face.ExternalImageId)) {
      extraOfLivePhoto++;
    } else {
      toDelete.push(face.FaceId);
    }
  }

  console.log(`\n컬렉션 전체 얼굴: ${faces.length}`);
  console.log(`  DB가 추적 중            : ${tracked}  (유지)`);
  console.log(`  살아있는 사진의 추가 얼굴 : ${extraOfLivePhoto}  (유지 — 검색에 쓰임)`);
  console.log(`  사진 ID 없음            : ${noExternalId}  (유지 — 판단 불가)`);
  console.log(`  삭제된 사진에서 남은 것   : ${toDelete.length}  ${apply ? "(삭제)" : "(삭제 대상)"}`);

  if (!apply) {
    console.log("\n확인 모드입니다. 아무것도 지우지 않았습니다.");
    console.log("실제로 지우려면 --apply 를 붙여 다시 실행하세요.\n");
    return;
  }

  if (toDelete.length === 0) {
    console.log("\n지울 얼굴이 없습니다.\n");
    return;
  }

  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += DELETE_CHUNK) {
    const chunk = toDelete.slice(i, i + DELETE_CHUNK);
    await deleteFaces(chunk);
    deleted += chunk.length;
    console.log(`  ... ${deleted}/${toDelete.length}`);
  }
  console.log(`\n${deleted}개를 삭제했습니다.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
