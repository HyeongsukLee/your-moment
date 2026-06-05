"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import CoverEditor from "@/components/CoverEditor";

type Photo = { id: string; thumbnailUrl: string; uploaderId: string | null };
type EventInfo = { name: string };

export default function AdminManagePage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);

  // 현재 유저(삭제 권한 판별)
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);

  // 삭제 모드 + 확인
  const [deleteMode, setDeleteMode] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadPhotos() {
    fetch(`/api/events/${eventId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data.event ?? null);
        setPhotos(data.photos ?? []);
        setCoverId(data.coverPhotoId ?? null);
        setCoverPosition(data.coverPosition ?? null);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadPhotos();
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMe({ id: d.id ?? "", role: d.role ?? "PARTICIPANT" }))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // 이 사진을 내가 삭제할 수 있나? (관리자=전체, 작가=본인 업로드)
  function canDelete(p: Photo) {
    if (!me) return false;
    return me.role === "ADMIN" || p.uploaderId === me.id;
  }

  async function doDelete(photo: Photo) {
    setDeleting(true);
    const res = await fetch("/api/admin/delete-photo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photoId: photo.id }),
    });
    setDeleting(false);
    setConfirmDel(null);
    if (!res.ok) {
      alert("삭제 권한이 없거나 실패했습니다");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-12">
      <header className="flex items-center gap-3 mb-2">
        <button onClick={() => router.push("/admin/cover")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">
          {event?.name ?? "사진 관리"}
        </h1>
        <button
          onClick={() => setDeleteMode((v) => !v)}
          className={`text-sm font-medium px-3 py-1.5 rounded-xl ${
            deleteMode
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-gray-300"
          }`}
        >
          {deleteMode ? "완료" : "삭제"}
        </button>
      </header>
      <p className="text-sm text-gray-400 mb-4">
        {deleteMode
          ? "삭제할 사진의 🗑 버튼을 누르세요"
          : "대표로 쓸 사진의 ☆ 를 눌러 위치까지 정하세요"}
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          불러오는 중...
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {photos.map((photo) => (
            <div key={photo.id} className="aspect-square relative bg-gray-900">
              <Image
                src={photo.thumbnailUrl}
                alt=""
                fill
                className="object-cover"
                sizes="33vw"
              />
              {deleteMode ? (
                canDelete(photo) ? (
                  <button
                    onClick={() => setConfirmDel(photo)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm bg-red-600 text-white"
                    aria-label="삭제"
                  >
                    🗑
                  </button>
                ) : (
                  <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] text-gray-400">
                    내 사진 아님
                  </span>
                )
              ) : (
                <button
                  onClick={() => setEditPhoto(photo)}
                  className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm backdrop-blur ${
                    coverId === photo.id
                      ? "bg-yellow-400 text-black"
                      : "bg-black/50 text-white"
                  }`}
                  aria-label="대표 사진으로 지정"
                >
                  {coverId === photo.id ? "★" : "☆"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 대표사진 위치 에디터 */}
      {editPhoto && (
        <CoverEditor
          eventId={eventId}
          photo={editPhoto}
          initialPosition={editPhoto.id === coverId ? coverPosition : null}
          onClose={() => setEditPhoto(null)}
          onSaved={(photoId, position) => {
            setCoverId(photoId);
            setCoverPosition(position);
            setEditPhoto(null);
          }}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDel && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center px-6">
          <div className="w-full max-w-xs bg-gray-900 rounded-2xl p-5">
            <h3 className="font-semibold mb-1">사진을 삭제할까요?</h3>
            <p className="text-sm text-gray-400 mb-4">
              삭제하면 참가자 검색 결과에서도 사라지고 복구할 수 없어요.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={confirmDel.thumbnailUrl}
              alt=""
              className="w-full aspect-video object-cover rounded-lg mb-4 bg-gray-800"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDel(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={() => doDelete(confirmDel)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 active:bg-red-700 text-white text-sm font-medium disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
