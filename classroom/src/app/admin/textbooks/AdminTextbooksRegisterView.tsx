"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; title: string; originalName: string };

function parseMoney(s: string): number | null | undefined {
  const trimmed = s.trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return undefined;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export default function AdminTextbooksRegisterView({
  textbooks,
  onComplete,
}: {
  textbooks: Option[];
  onComplete?: () => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [entitlementDays, setEntitlementDays] = useState("30");
  const [isPublished, setIsPublished] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredTextbooks = useMemo(() => {
    if (!searchQuery.trim()) return textbooks;
    const q = searchQuery.toLowerCase();
    return textbooks.filter((t) =>
      `${t.title} ${t.originalName}`.toLowerCase().includes(q)
    );
  }, [textbooks, searchQuery]);

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleImageSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImageSelect(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ids = Array.from(selectedIds);
    if (!ids.length) {
      setError("등록할 교재를 1개 이상 선택해주세요.");
      return;
    }

    const p = parseMoney(price);
    if (p === undefined) {
      setError("판매가를 입력해주세요.");
      return;
    }

    const op = parseMoney(originalPrice);
    const days = parseInt(entitlementDays.trim(), 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      setError("이용 기간은 1~3650일 사이여야 합니다.");
      return;
    }

    setBusy(true);
    try {
      // Upload image first if exists
      let thumbnailUrl: string | undefined;
      if (imageFile && ids.length === 1) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("textbookId", ids[0]);
        
        const uploadRes = await fetch("/api/admin/textbooks/upload-thumbnail", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          thumbnailUrl = uploadData.thumbnailUrl;
        }
      }

      const update: Record<string, unknown> = {
        price: p,
        originalPrice: op === undefined ? undefined : op,
        entitlementDays: days,
        isPublished,
      };
      if (productName.trim()) update.title = productName.trim();
      if (teacherName.trim()) update.teacherName = teacherName.trim();
      if (subjectName.trim()) update.subjectName = subjectName.trim();
      if (thumbnailUrl) update.thumbnailUrl = thumbnailUrl;

      const res = await fetch("/api/admin/textbooks/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "update", textbookIds: ids, update }),
      });
      if (!res.ok) throw new Error("SAVE_FAILED");

      // Reset form
      setSelectedIds(new Set());
      setProductName("");
      setPrice("");
      setOriginalPrice("");
      setTeacherName("");
      setSubjectName("");
      setEntitlementDays("30");
      setIsPublished(true);
      setSearchQuery("");
      setImageFile(null);
      setImagePreview(null);
      
      router.refresh();
      onComplete?.();
    } catch {
      setError("등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  if (!textbooks.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-20">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/5">
          <svg className="h-7 w-7 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-white/50">등록된 교재가 없습니다</p>
        <p className="mt-1 text-xs text-white/30">먼저 교재를 업로드해주세요</p>
        <a
          href="/admin/textbooks/register"
          className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          교재 업로드하기
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-5">
      {/* Left: Textbook Selection */}
      <div className="lg:col-span-2">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-medium text-white">교재 선택</h3>
            <p className="mt-1 text-xs text-white/40">
              판매할 교재를 선택하세요 (다중 선택 가능)
            </p>
          </div>
          
          <div className="p-4 border-b border-white/[0.06]">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="교재 검색..."
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-10 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-white/40">
                {selectedIds.size}개 선택됨
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(filteredTextbooks.map((t) => t.id)))}
                  className="text-xs text-white/50 hover:text-white/70"
                >
                  전체선택
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-white/50 hover:text-white/70"
                >
                  선택해제
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-2">
            {filteredTextbooks.map((t) => {
              const isSelected = selectedIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSelection(t.id)}
                  className={`w-full rounded-lg p-3 text-left transition-all ${
                    isSelected
                      ? "bg-white/10 ring-1 ring-white/20"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-all ${
                        isSelected
                          ? "border-white bg-white"
                          : "border-white/20 bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-black" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {t.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/40">
                        {t.originalName}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Form Fields */}
      <div className="lg:col-span-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-medium text-white">판매 정보</h3>
            <p className="mt-1 text-xs text-white/40">
              {selectedIds.size > 1 
                ? `선택한 ${selectedIds.size}개 교재에 동일하게 적용됩니다`
                : "상품 정보를 입력하세요"
              }
            </p>
          </div>

          <div className="p-5 space-y-5">
            {/* Product Image Upload */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                판매 이미지 <span className="text-white/30 font-normal">(선택)</span>
              </label>
              
              {imagePreview ? (
                <div className="relative group">
                  <div className="relative aspect-[4/3] w-full max-w-[280px] overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0b]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={imagePreview} 
                      alt="판매 이미지 미리보기" 
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-lg bg-white/20 backdrop-blur-sm px-3 py-2 text-xs font-medium text-white hover:bg-white/30 transition-colors"
                      >
                        변경
                      </button>
                      <button
                        type="button"
                        onClick={removeImage}
                        className="rounded-lg bg-red-500/20 backdrop-blur-sm px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/30">
                    {imageFile?.name} ({(imageFile?.size || 0 / 1024).toFixed(1)} KB)
                  </p>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
                    isDragging 
                      ? "border-white/40 bg-white/[0.08]" 
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                      isDragging ? "bg-white/20" : "bg-white/5"
                    }`}>
                      <svg className="h-6 w-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-white/60">
                      {isDragging ? "여기에 놓으세요" : "클릭하거나 이미지를 드래그하세요"}
                    </p>
                    <p className="mt-1 text-xs text-white/30">
                      PNG, JPG, WEBP (최대 5MB)
                    </p>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageSelect(file);
                }}
                className="hidden"
              />
              
              {selectedIds.size > 1 && (
                <p className="mt-2 text-xs text-amber-400/70">
                  ⚠️ 여러 교재 선택 시 이미지는 적용되지 않습니다
                </p>
              )}
            </div>

            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                상품명 <span className="text-white/30 font-normal">(선택)</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="비워두면 기존 교재 제목 유지"
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
              />
            </div>

            {/* Price Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  판매가 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="49,000"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 pr-10 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">원</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  정가 <span className="text-white/30 font-normal">(선택)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="99,000"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 pr-10 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">원</span>
                </div>
                <p className="mt-1 text-xs text-white/30">할인율 표시용</p>
              </div>
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  선생님
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  과목
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="수학"
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  이용 기간
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={entitlementDays}
                    onChange={(e) => setEntitlementDays(e.target.value)}
                    min={1}
                    max={3650}
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 pr-10 text-sm text-white placeholder-white/30 outline-none focus:border-white/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">일</span>
                </div>
              </div>
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <div>
                <p className="text-sm font-medium text-white">즉시 공개</p>
                <p className="text-xs text-white/40">활성화하면 바로 스토어에 노출됩니다</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPublished(!isPublished)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  isPublished ? "bg-emerald-500" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    isPublished ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={busy || selectedIds.size === 0}
              className="w-full rounded-lg bg-white py-3 text-sm font-medium text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  저장 중...
                </span>
              ) : (
                `${selectedIds.size}개 상품 등록하기`
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
