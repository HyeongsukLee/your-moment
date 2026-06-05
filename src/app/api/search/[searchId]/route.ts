import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveImageUrl } from "@/lib/s3";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ searchId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchId } = await params;

  const search = await db.search.findUnique({
    where: { id: searchId, userId: session.user.id },
    include: {
      results: {
        include: { photo: { select: { id: true, thumbnailKey: true } } },
        orderBy: { similarity: "desc" },
      },
    },
  });

  if (!search) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json({
    results: await Promise.all(
      search.results.map(async (r) => ({
        id: r.photo.id,
        thumbnailUrl: await resolveImageUrl(r.photo.thumbnailKey),
        similarity: r.similarity,
      }))
    ),
  });
}
