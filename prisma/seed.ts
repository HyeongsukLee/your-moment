import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// 테스트용 "오늘의 순간" 5개 (서로 다른 날짜)
const MOMENTS = [
  { name: "2026 성남 마라톤", description: "성남시 주최 봄 마라톤 대회", date: "2026-05-20" },
  { name: "한강 러닝크루 나이트런", description: "여의도 한강공원 야간 러닝", date: "2026-05-28" },
  { name: "북한산 트레일 러닝", description: "북한산 둘레길 트레일 대회", date: "2026-06-02" },
  { name: "잠실 미라클 모닝런", description: "잠실 종합운동장 새벽 러닝", date: "2026-06-04" },
  { name: "올림픽공원 컬러런", description: "올림픽공원 색채 축제 러닝", date: "2026-06-10" },
];

async function main() {
  // 기존 데이터 초기화 (반복 실행 안전)
  await db.searchResult.deleteMany();
  await db.search.deleteMany();
  await db.photo.deleteMany();
  await db.event.deleteMany();

  for (let e = 0; e < MOMENTS.length; e++) {
    const m = MOMENTS[e];
    const event = await db.event.create({
      data: {
        name: m.name,
        description: m.description,
        date: new Date(m.date),
        isActive: true,
        photos: {
          create: Array.from({ length: 12 }).map((_, i) => ({
            s3Key: `events/demo-${e}/originals/photo-${i + 1}.jpg`,
            // 실제 S3 연결 전까지는 placeholder 이미지로 갤러리 확인
            thumbnailKey: `https://picsum.photos/seed/ym-${e}-${i + 1}/400/400`,
          })),
        },
      },
    });
    console.log(`✅ "${m.name}" (${m.date}) — id: ${event.id}`);
  }

  console.log(`\n🌱 총 ${MOMENTS.length}개의 "오늘의 순간" + 각 12장 시드 완료`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
