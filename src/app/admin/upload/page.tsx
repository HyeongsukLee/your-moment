"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type EventOption = { id: string; name: string; date: string; photoCount: number };

export default function AdminUploadPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 업로드 확인 모달용
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const loadEvents = useCallback(async () => {
    const res = await fetch("/api/admin/events");
    if (res.status === 403) {
      alert("운영진만 접근할 수 있습니다");
      router.push("/");
      return;
    }
    const data = await res.json();
    setEvents(data);
    setEventId((prev) => prev || (data[0]?.id ?? ""));
  }, [router]);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(!!d.isAdmin))
      .catch(() => {});
    loadEvents();
  }, [loadEvents]);

  const selectedEvent = events.find((e) => e.id === eventId);

  async function createEvent() {
    if (!newName.trim() || !newDate) {
      alert("이름과 날짜를 입력하세요");
      return;
    }
    setCreating(true);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, date: newDate }),
    });
    setCreating(false);
    if (!res.ok) {
      alert("생성 실패");
      return;
    }
    const created = await res.json();
    setNewName("");
    setNewDate("");
    await loadEvents();
    setEventId(created.id);
  }

  // 파일 선택 → 확인 모달 띄우기
  function onFilesPicked(files: FileList) {
    if (!eventId) {
      alert("순간을 먼저 선택하세요");
      return;
    }
    const arr = Array.from(files);
    setPendingFiles(arr);
    setPreviews(arr.slice(0, 6).map((f) => URL.createObjectURL(f)));
  }

  function cancelPending() {
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPendingFiles([]);
    setPreviews([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function confirmUpload() {
    const files = pendingFiles;
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    setPendingFiles([]);

    setUploading(true);
    setProgress({ done: 0, total: files.length });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const urlRes = await fetch("/api/admin/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, contentType: file.type }),
      });
      if (urlRes.status === 403) {
        alert("이 행사에 업로드할 권한이 없습니다");
        break;
      }
      const { photoId, s3Key, thumbnailKey, uploadUrl, thumbnailUploadUrl } =
        await urlRes.json();

      const thumbBlob = await makeThumbnail(file, 400);
      await Promise.all([
        fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        }),
        fetch(thumbnailUploadUrl, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: thumbBlob,
        }),
      ]);
      await fetch("/api/admin/index-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, photoId, s3Key, thumbnailKey }),
      });
      setProgress({ done: i + 1, total: files.length });
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await loadEvents();
    alert(`${files.length}장 업로드 완료!`);
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

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/admin")} className="text-gray-400">
          ←
        </button>
        <h1 className="text-xl font-bold">사진 업로드</h1>
      </header>

      <label className="block mb-2 text-sm text-gray-400">순간 선택</label>
      <select
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="w-full bg-gray-900 rounded-xl px-4 py-3 text-white mb-4 outline-none focus:ring-2 ring-indigo-500"
      >
        {events.length === 0 && (
          <option value="">
            {isAdmin ? "순간이 없습니다 — 아래에서 생성" : "배정된 행사가 없습니다"}
          </option>
        )}
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.name} ({new Date(ev.date).toLocaleDateString("ko-KR")}) ·{" "}
            {ev.photoCount}장
          </option>
        ))}
      </select>

      {/* 새 순간 만들기 — 관리자 전용 */}
      {isAdmin && (
        <details className="mb-6 bg-gray-900 rounded-xl p-4">
          <summary className="text-sm text-gray-300 cursor-pointer">
            ＋ 새 순간 만들기
          </summary>
          <div className="mt-3 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="순간 이름 (예: 2026 서울 마라톤)"
              className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
            />
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-gray-800 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 ring-indigo-500"
            />
            <button
              onClick={createEvent}
              disabled={creating}
              className="w-full bg-gray-700 active:bg-gray-600 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60"
            >
              {creating ? "생성 중..." : "순간 생성"}
            </button>
          </div>
        </details>
      )}

      {!isAdmin && (
        <p className="text-xs text-gray-500 mb-4 -mt-1">
          작가는 관리자가 배정한 행사에만 업로드할 수 있어요.
        </p>
      )}

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || !eventId}
        className="w-full bg-indigo-600 active:bg-indigo-700 text-white font-semibold py-4 rounded-2xl text-base disabled:opacity-60"
      >
        {uploading ? "업로드 중..." : "📷 사진 선택 및 업로드"}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFilesPicked(e.target.files)}
      />

      {uploading && (
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>얼굴 분석 + 업로드 중...</span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* 업로드 확인 모달 */}
      {pendingFiles.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/70 flex items-end sm:items-center justify-center">
          <div className="w-full max-w-md bg-gray-900 rounded-t-3xl sm:rounded-3xl p-5">
            <h3 className="font-semibold text-lg mb-1">업로드 확인</h3>
            <p className="text-sm text-gray-400 mb-4">
              선택한{" "}
              <span className="text-white font-semibold">
                {pendingFiles.length}장
              </span>
              을{" "}
              <span className="text-indigo-300 font-semibold">
                {selectedEvent?.name}
              </span>
              에 올릴까요?
            </p>

            {/* 미리보기 */}
            <div className="grid grid-cols-3 gap-1 mb-4">
              {previews.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="aspect-square object-cover rounded-lg bg-gray-800"
                />
              ))}
              {pendingFiles.length > 6 && (
                <div className="aspect-square rounded-lg bg-gray-800 flex items-center justify-center text-sm text-gray-400">
                  +{pendingFiles.length - 6}
                </div>
              )}
            </div>

            <p className="text-xs text-amber-400/80 mb-4">
              ⚠️ 행사가 맞는지 다시 한번 확인해주세요. 잘못 올리면 사진 관리에서
              삭제할 수 있어요.
            </p>

            <div className="flex gap-2">
              <button
                onClick={cancelPending}
                className="flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 text-sm font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmUpload}
                className="flex-1 py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white text-sm font-medium"
              >
                네, 올릴게요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
