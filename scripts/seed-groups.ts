/**
 * 테스트 시딩: 바로/컴포트 그룹 생성 + 계정 매핑 + 기존 행사 코드/그룹 백필.
 * 실행: npx dotenv -e .env.local -- npx tsx scripts/seed-groups.ts
 */
import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

const db = new PrismaClient();
const nano = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

const GMAIL = "hsetsh12@gmail.com";
const KAKAO_ID = "4931007281";

async function ensureGroup(name: string) {
  const found = await db.group.findFirst({ where: { name } });
  if (found) return found;
  return db.group.create({ data: { name, code: nano() } });
}

async function main() {
  // 1) 그룹 생성
  const baro = await ensureGroup("바로");
  const comport = await ensureGroup("컴포트");
  console.log("그룹:", { baro: baro.code, comport: comport.code });

  // 2) 계정 매핑
  const gmailUser = await db.user.findUnique({ where: { email: GMAIL } });
  if (gmailUser) {
    await db.group.update({
      where: { id: baro.id },
      data: { members: { connect: { id: gmailUser.id } } },
    });
    console.log(`gmail(${GMAIL}) → 바로 연결`);
  } else {
    console.log(`gmail 유저(${GMAIL}) 없음 — 한 번 구글 로그인 후 다시 실행 필요`);
  }

  const kakaoUser = await db.user.findUnique({ where: { kakaoId: KAKAO_ID } });
  if (kakaoUser) {
    await db.group.update({
      where: { id: comport.id },
      data: { members: { connect: { id: kakaoUser.id } } },
    });
    console.log(`kakao(${KAKAO_ID}) → 컴포트 연결`);
  } else {
    console.log(`kakao 유저(${KAKAO_ID}) 없음`);
  }

  // 3) 기존 행사 백필: code 없는 것 채우기 + '바로'로 시작하는 행사는 바로 그룹에
  const events = await db.event.findMany({
    select: { id: true, name: true, code: true, groupId: true },
  });
  for (const e of events) {
    const data: { code?: string; groupId?: string } = {};
    if (!e.code) data.code = nano();
    if (!e.groupId && e.name.startsWith("바로")) data.groupId = baro.id;
    if (Object.keys(data).length > 0) {
      await db.event.update({ where: { id: e.id }, data });
      console.log(`행사 백필: ${e.name}`, data);
    }
  }

  console.log("✅ 시딩 완료");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
