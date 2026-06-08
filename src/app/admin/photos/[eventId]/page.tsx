"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import CoverEditor from "@/components/CoverEditor";
import Toast, { type ToastData } from "@/components/Toast";

type Photo = { id: string; thumbnailUrl: string; uploaderId: string | null; originalFilename: string | null };
type EventInfo = { name: string };

export default function AdminPhotosPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();

  // 사진 데이터
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [coverId, setCoverId] = useState<string | null>(null);
  const [coverPosition, setCoverPosition] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 내 정보
  const [me, setMe] = useState<{ id: string; role: string } | null>(null);

  // UI 모드
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editPhoto, setEditPhoto] = useState<Photo | null>(null);

  // 삭제
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 업로드
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [toast, setToast] = useState<ToastData | null>(null);

  const loadPhotos = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/photos`);
    if (!res.ok) return;
    try {
      const data = await res.json();
      setEvent(data.event ?? null);
      setPhotos(data.photos ?? []);
      setCoverId(data.coverPhotoId ?? null);
      setCoverPosition(data.coverPosition ?? null);
    } catch { /* 무시 */ }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    loadPhotos();
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setMe({ id: d.id ?? "", role: d.role ?? "PARTICIPANT" }))
      .catch(() => {});
  }, [loadPhotos]);

  function canDelete(p: Photo) {
    if (!me) return false;
    return me.role === "ADMIN" || p.uploaderId === me.id;
  }

  // 선택 모드 토글
  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelected(new Set());
  }

  function toggleSelect(id: string, deletable: boolean) {
    if (!deletable) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // 다중 삭제
  async function doDeleteSelected() {
    setDeleting(true);
    const ids = Array.from(selected);
    await Promise.all(
      ids.map((photoId) =>
        fetch("/api/admin/delete-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoId }),
        })
      )
    );
    setDeleting(false);
    setConfirmDelete(false);
    setSelectMode(false);
    setSelected(new Set());
    await loadPhotos();
    setToast({ message: `${ids.length}장을 삭제했어요` });
  }

  // 업로드
  function onFilesPicked(files: FileList) {
    const existingNames = new Set(photos.map((p) => p.originalFilename).filter(Boolean));
    const arr = Array.from(files).filter((f) => !existingNames.has(f.name));
    const skipped = files.length - arr.length;
    if (skipped > 0) {
      setToast({ message: `이미 업로드된 ${skipped}장 제외, ${arr.length}장 업로드합니다` });
    }
    if (arr.length === 0) return;
    setPendingFiles(arr);
    setPreviews(arr.slice(0, 6).map((f) => URL.createObjectURL(f)));
  }

  function cancelPending() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPendingFiles([]);
    setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function makeThumbnail(file: File, maxSize: number): Promise<Blob> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    return new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8)
    );
  }

  async function confirmUpload() {
    const files = pendingFiles;
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    setPendingFiles([]);
    cancelledRef.current = false;
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    let firstPhotoId: string | null = null;
    const hadCover = !!coverId;
    let doneCount = 0;

    async function uploadOne(file: File): Promise<string | null> {
      const urlRes = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, contentType: file.type }),
      });
      if (!urlRes.ok) return null;
      const { photoId, s3Key, thumbnailKey, uploadUrl, thumbnailUploadUrl } = await urlRes.json();

      const thumbBlob = await makeThumbnail(file, 400);
      await Promise.all([
        fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }),
        fetch(thumbnailUploadUrl, { method: "PUT", headers: { "Content-Type": "image/jpeg" }, body: thumbBlob }),
      ]);
      await fetch("/api/admin/index-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, photoId, s3Key, thumbnailKey, originalFilename: file.name }),
      });
      doneCount++;
      setProgress({ done: doneCount, total: files.length });
      return photoId;
    }

    const CONCURRENCY = 5;
    for (let i = 0; i < files.length; i += CONCURRENCY) {
      if (cancelledRef.current) break;
      const batch = files.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map((f) => uploadOne(f)));
      if (i === 0) firstPhotoId = results[0] ?? null;
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    // 대표사진 없으면 첫 번째 사진 자동 설정
    if (!hadCover && firstPhotoId && !cancelledRef.current) {
      await fetch("/api/admin/set-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, photoId: firstPhotoId, position: "50% 50%" }),
      });
    }

    // 알림 발송
    if (!cancelledRef.current) {
      fetch(`/api/admin/events/${eventId}/notify-upload`, { method: "POST" }).catch(() => {});
    }

    cancelledRef.current = false;
    await loadPhotos();
    setToast({ message: `${files.length}장 업로드 완료!` });
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 pb-28">
      {/* 헤더 */}
      <header className="flex items-center gap-2 mb-4">
        <button onClick={() => router.push("/admin/photos")} className="text-gray-400 shrink-0">
          ←
        </button>
        <h1 className="text-lg font-bold flex-1 truncate">
          {event?.name ?? "사진 관리"}
        </h1>
        {/* 업로드 버튼 */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white disabled:opacity-50 shrink-0"
        >
          📷 업로드
        </button>
        {/* 선택 모드 토글 */}
        <button
          onClick={toggleSelectMode}
          className={`text-sm font-medium px-3 py-1.5 rounded-xl shrink-0 ${
            selectMode ? "bg-red-600 text-white" : "bg-gray-800 text-gray-300"
          }`}
        >
          {selectMode ? "취소" : "선택"}
        </button>
      </header>

      {/* 안내 문구 */}
      <p className="text-xs text-gray-500 mb-3">
        {selectMode
          ? "삭제할 사진을 선택하세요"
          : "★ 를 눌러 대표사진을 지정하세요"}
      </p>

      {/* 업로드 진행 */}
      {uploading && (
        <div className="mb-4 bg-gray-900 rounded-2xl p-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>얼굴 분석 + 업로드 중...</span>
            <span>{progress.done} / {progress.total}</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <button
            onClick={() => { cancelledRef.current = true; }}
            className="w-full mt-3 py-2 rounded-xl bg-gray-800 text-red-400 text-sm font-medium"
          >
            업로드 취소
          </button>
        </div>
      )}

      {/* 사진 그리드 */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-500">불러오는 중...</div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-gray-500 text-sm">아직 사진이 없어요.<br />업로드 버튼을 눌러 추가하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5">
          {photos.map((photo) => {
            const deletable = canDelete(photo);
            const isSelected = selected.has(photo.id);
            const isCover = coverId === photo.id;
            return (
              <div key={photo.id} className="aspect-square relative bg-gray-900">
                <Image src={photo.thumbnailUrl} alt="" fill className="object-cover" sizes="33vw" />

                {selectMode ? (
                  // 선택 모드
                  <button
                    onClick={() => toggleSelect(photo.id, deletable)}
                    className="absolute inset-0 flex items-end justify-end p-1.5"
                    disabled={!deletable}
                  >
                    {deletable ? (
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                        isSelected ? "bg-red-500 border-red-500 text-white" : "border-white bg-black/40"
                      }`}>
                        {isSelected ? "✓" : ""}
                      </span>
                    ) : (
                      <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] text-gray-400">
                        내 사진 아님
                      </span>
                    )}
                  </button>
                ) : (
                  // 기본 모드 — 대표사진 버튼
                  <button
                    onClick={() => setEditPhoto(photo)}
                    className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm backdrop-blur ${
                      isCover ? "bg-yellow-400 text-black" : "bg-black/50 text-white"
                    }`}
                  >
                    {isCover ? "★" : "☆"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 하단 고정 — 선택 모드에서 항목 선택 시 */}
      {selectMode && selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-between px-6 py-4 bg-gray-950/95 border-t border-gray-800 backdrop-blur">
          <span className="text-sm text-gray-300">
            <span className="text-white font-semibold">{selected.size}장</span> 선택됨
          </span>
          <button
            onClick={() => setConfirmDelete(true)}
            className="px-5 py-2.5 rounded-xl bg-red-600 active:bg-red-700 text-white text-sm font-semibold"
          >
            삭제
          </button>
        </div>
      )}

      {/* 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFilesPicked(e.target.files)}
      />

      {/* 업로드 확인 모달 */}
      {pendingFiles.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5">
            <h3 className="font-semibold text-lg mb-1">업로드 확인</h3>
            <p className="text-sm text-gray-400 mb-4">
              <span className="text-white font-semibold">{pendingFiles.length}장</span>을{" "}
              <span className="text-indigo-300 font-semibold">{event?.name}</span>에 올릴까요?
            </p>
            <div className="grid grid-cols-3 gap-1 mb-4">
              {previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="aspect-square object-cover rounded-lg bg-gray-800" />
              ))}
              {pendingFiles.length > 6 && (
                <div className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center text-sm text-gray-400">
                  +{pendingFiles.length - 6}
                </div>
              )}
            </div>
            <p className="text-xs text-amber-400/80 mb-4">
              ⚠️ 행사가 맞는지 다시 한번 확인해주세요.
            </p>
            <div className="flex gap-2">
              <button onClick={cancelPending} className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium">
                취소
              </button>
              <button onClick={confirmUpload} className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium">
                네, 올릴게요
              </button>
            </div>
          </div>
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

      {/* 삭제 확인 팝업 */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-6">
          <div className="w-full max-w-xs bg-gray-900 rounded-2xl p-5">
            <h3 className="font-semibold mb-1">사진을 삭제할까요?</h3>
            <p className="text-sm text-gray-400 mb-5">
              <span className="text-white font-semibold">{selected.size}장</span>을 삭제합니다.
              삭제하면 참가자 검색 결과에서도 사라지고 <span className="text-red-400">복구할 수 없어요.</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={doDeleteSelected}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 active:bg-red-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {deleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
