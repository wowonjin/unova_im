"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

type Lesson = {
  title: string;
  duration: string;
  isFree?: boolean;
  vimeoId?: string;
};

type Chapter = {
  chapter: string;
  duration: string;
  lessons: Lesson[];
};

type Review = {
  id: string;
  name: string;
  rating: number;
  date: string;
  content: string;
  imageUrls?: string[];
};

type ProductData = {
  id: string;
  title: string;
  subject: string;
  subjectColor: string;
  subjectBg: string;
  teacher: string;
  teacherId: string;
  teacherTitle: string;
  teacherDescription: string;
  thumbnailUrl?: string | null;
  price: number;
  originalPrice: number | null;
  dailyPrice: number;
  type: "course" | "textbook";
  description: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  studyPeriod: { regular: number; review: number };
  benefits: string[];
  features: string[];
  extraOptions?: { name: string; value: string }[];
  curriculum: Chapter[];
  reviews: Review[];
  discount: number | null;
  formattedPrice: string;
  formattedOriginalPrice: string | null;
  formattedDailyPrice: string;
  previewVimeoId?: string | null;
};

type RelatedProduct = {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  thumbnailUrl: string | null;
  teacher: string;
  subject: string;
  rating: number;
  reviewCount: number;
};

const courseTabs = ["강의소개", "커리큘럼", "강의후기", "환불정책"] as const;
const textbookTabs = ["교재소개", "교재후기", "환불정책"] as const;
type TabKey = (typeof courseTabs)[number] | (typeof textbookTabs)[number];

export default function ProductDetailClient({ 
  product,
  relatedProducts = [],
}: { 
  product: ProductData;
  relatedProducts?: RelatedProduct[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>(product.type === "textbook" ? "교재소개" : "강의소개");
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [expandedReviews, setExpandedReviews] = useState<string[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [visitorId, setVisitorId] = useState("");
  const [selectedOption, setSelectedOption] = useState<"full" | "regular">("full");
  const [isPaying, setIsPaying] = useState(false);
  const [selectedRelatedIds, setSelectedRelatedIds] = useState<Set<string>>(new Set());
  const [isSidebarRaised, setIsSidebarRaised] = useState(false);

  const ADDITIONAL_TEXTBOOK_DISCOUNT_PER = 5000;
  const ADDITIONAL_TEXTBOOK_DISCOUNT_MAX = 10000;

  const additionalAmount =
    product.type === "textbook"
      ? Array.from(selectedRelatedIds).reduce((sum, id) => {
          const p = relatedProducts.find((r) => r.id === id);
          return sum + (p?.price || 0);
        }, 0)
      : 0;

  const additionalDiscount =
    product.type === "textbook"
      ? Math.min(selectedRelatedIds.size * ADDITIONAL_TEXTBOOK_DISCOUNT_PER, ADDITIONAL_TEXTBOOK_DISCOUNT_MAX)
      : 0;

  const baseAmount =
    product.type === "course"
      ? selectedOption === "full"
        ? product.price
        : product.price * 0.8
      : product.price;

  // NOTE: 가격이 미설정(null/undefined)인 경우 page.tsx에서 0으로 내려오는 케이스가 있어
  // UI에서는 "기본 상품"을 숨기고(=미설정처럼 취급) 표시를 깔끔하게 합니다.
  const hasBaseProduct = Number.isFinite(baseAmount) && baseAmount > 0;
  const hasAdditionalSelection = product.type === "textbook" && selectedRelatedIds.size > 0;
  const showPriceBreakdown = product.type === "course" || hasAdditionalSelection;
  const totalAmount = Math.max(0, (hasBaseProduct ? baseAmount : 0) + additionalAmount - additionalDiscount);
  
  // 좋아요 상태 불러오기
  useEffect(() => {
    // 브라우저 고유 ID 생성 또는 가져오기
    let vid = localStorage.getItem("visitorId");
    if (!vid) {
      vid = crypto.randomUUID();
      localStorage.setItem("visitorId", vid);
    }
    setVisitorId(vid);

    const fetchLikeStatus = async () => {
      try {
        const type = product.type === "course" ? "COURSE" : "TEXTBOOK";
        const res = await fetch(`/api/likes/${product.id}?type=${type}&visitorId=${vid}`);
        const data = await res.json();
        if (data.ok) {
          setIsLiked(data.isLiked);
          setLikeCount(data.likeCount);
        }
      } catch (err) {
        console.error("Failed to fetch like status:", err);
      }
    };
    fetchLikeStatus();
  }, [product.id, product.type]);

  // 오른쪽 사이드바: 처음 위치는 유지하되, 스크롤 시 더 위로 붙도록(top 값 감소)
  useEffect(() => {
    const onScroll = () => {
      setIsSidebarRaised(window.scrollY > 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 좋아요 토글
  const handleToggleLike = async () => {
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: product.type === "course" ? "COURSE" : "TEXTBOOK",
          productId: product.id,
          visitorId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setIsLiked(data.isLiked);
        setLikeCount(data.likeCount);
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  // 후기 관련 상태
  const [reviews, setReviews] = useState<Review[]>(product.reviews);
  const [reviewCount, setReviewCount] = useState(product.reviewCount);
  const [averageRating, setAverageRating] = useState(product.rating);
  const [reviewFormName, setReviewFormName] = useState("");
  const [reviewFormRating, setReviewFormRating] = useState(5);
  const [reviewFormContent, setReviewFormContent] = useState("");
  const [reviewFormImages, setReviewFormImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 공유 모달 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // 무료 강의 미리보기 상태
  const [expandedLessonIdx, setExpandedLessonIdx] = useState<number | null>(null);
  
  // 스크롤 감지 - 탭이 sticky 상태일 때 말풍선 숨김
  const [isTabSticky, setIsTabSticky] = useState(false);
  const tabRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleScroll = () => {
      if (!tabRef.current) return;
      
      // 탭 메뉴의 원래 위치 확인
      const tabRect = tabRef.current.getBoundingClientRect();
      // 탭 메뉴가 top-[70px]에 도달했는지 확인 (헤더 높이 70px)
      setIsTabSticky(tabRect.top <= 70);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // 초기 상태 확인
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 평균 평점 계산 함수
  const calculateAverageRating = (reviewList: Review[]) => {
    if (reviewList.length === 0) return 0;
    const sum = reviewList.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviewList.length) * 10) / 10; // 소수점 1자리
  };

  // 후기 목록 불러오기
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const type = product.type === "course" ? "COURSE" : "TEXTBOOK";
        const res = await fetch(`/api/reviews/${product.id}?type=${type}`);
        const data = await res.json();
        if (data.ok && data.reviews) {
          setReviews(data.reviews);
          setReviewCount(data.reviews.length);
          // 후기가 없으면 0, 있으면 실제 평균 계산
          const calculatedRating = calculateAverageRating(data.reviews);
          setAverageRating(calculatedRating);
        } else {
          // API가 실패해도 초기화
          setReviews([]);
          setReviewCount(0);
          setAverageRating(0);
        }
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        // 에러 발생 시 0으로 초기화
        setReviews([]);
        setReviewCount(0);
        setAverageRating(0);
      }
    };
    fetchReviews();
  }, [product.id, product.type]);

  // 관리자 여부 확인 (관리자면 후기 삭제 버튼 노출)
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) setIsAdmin(Boolean(data.user?.isAdmin));
      } catch {
        // ignore
      }
    };
    fetchMe();
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    if (!isAdmin) return;
    if (!confirm("이 후기를 삭제할까요? 삭제하면 복구할 수 없습니다.")) return;
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "DELETE_FAILED");

      // UI 즉시 반영 후, 다시 불러와 평점/개수도 최신화
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      const type = product.type === "course" ? "COURSE" : "TEXTBOOK";
      const refreshRes = await fetch(`/api/reviews/${product.id}?type=${type}`, { cache: "no-store" });
      const refreshData = await refreshRes.json().catch(() => null);
      if (refreshRes.ok && refreshData?.ok && Array.isArray(refreshData.reviews)) {
        setReviews(refreshData.reviews);
        setReviewCount(refreshData.reviews.length);
        setAverageRating(calculateAverageRating(refreshData.reviews));
      }
    } catch (e) {
      alert("후기 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newFiles = Array.from(files).slice(0, 5 - reviewFormImages.length); // 최대 5개
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    
    setReviewFormImages((prev) => [...prev, ...newFiles]);
    setReviewImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  // 이미지 제거 핸들러
  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(reviewImagePreviews[index]);
    setReviewFormImages((prev) => prev.filter((_, i) => i !== index));
    setReviewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // 후기 제출
  const handleSubmitReview = async () => {
    if (!reviewFormName.trim()) {
      setReviewError("이름을 입력해주세요.");
      return;
    }
    if (!reviewFormContent.trim()) {
      setReviewError("후기 내용을 입력해주세요.");
      return;
    }
    
    setIsSubmittingReview(true);
    setReviewError(null);
    
    try {
      // 이미지 업로드 (있을 경우)
      const imageUrls: string[] = [];
      for (const file of reviewFormImages) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/reviews/upload-image", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.ok && uploadData.url) {
          imageUrls.push(uploadData.url);
        }
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: product.type === "course" ? "COURSE" : "TEXTBOOK",
          productId: product.id,
          authorName: reviewFormName.trim(),
          rating: reviewFormRating,
          content: reviewFormContent.trim(),
          imageUrls,
        }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "SUBMIT_FAILED");
      }
      
      // 성공 시 폼 초기화 및 후기 목록 새로고침
      setReviewFormName("");
      setReviewFormRating(5);
      setReviewFormContent("");
      setReviewFormImages([]);
      reviewImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setReviewImagePreviews([]);
      setReviewSuccess(true);
      
      // 후기 목록 새로고침
      const type = product.type === "course" ? "COURSE" : "TEXTBOOK";
      const refreshRes = await fetch(`/api/reviews/${product.id}?type=${type}`);
      const refreshData = await refreshRes.json();
      if (refreshData.ok && refreshData.reviews) {
        setReviews(refreshData.reviews);
        setReviewCount(refreshData.reviews.length);
        setAverageRating(calculateAverageRating(refreshData.reviews));
      }
      
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      setReviewError("후기 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const loadTossPayments = async (): Promise<any> => {
    const w = window as any;
    if (w.TossPayments) return w.TossPayments;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-toss-payments="1"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("TOSS_SCRIPT_LOAD_FAILED")));
        return;
      }

      const s = document.createElement("script");
      s.src = "https://js.tosspayments.com/v1/payment";
      s.async = true;
      s.setAttribute("data-toss-payments", "1");
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("TOSS_SCRIPT_LOAD_FAILED"));
      document.head.appendChild(s);
    });

    return (window as any).TossPayments;
  };

  // 공유 기능
  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShareKakao = () => {
    const url = getShareUrl();
    const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?app_key=YOUR_KAKAO_KEY&link_url=${encodeURIComponent(url)}`;
    // 카카오 SDK가 없으면 카카오톡 공유 링크로 이동
    window.open(`https://story.kakao.com/share?url=${encodeURIComponent(url)}`, "_blank", "width=600,height=400");
  };

  const handleShareTwitter = () => {
    const url = getShareUrl();
    const text = `${product.title} - 유노바`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "width=600,height=400");
  };

  const handleShareFacebook = () => {
    const url = getShareUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=400");
  };

  const handleCheckout = async () => {
    if (isPaying) return;
    setIsPaying(true);

    try {
      // 장바구니 아이템 구성 (메인 상품 + 선택한 추가 교재)
      const cartItems = [
        {
          productType: product.type === "course" ? "COURSE" : "TEXTBOOK",
          productId: product.id,
          option: product.type === "course" ? selectedOption : undefined,
        },
        // 선택한 추가 교재 추가
        ...Array.from(selectedRelatedIds).map((id) => ({
          productType: "TEXTBOOK" as const,
          productId: id,
        })),
      ];

      const res = await fetch("/api/payments/toss/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cartItems }),
      });

      if (res.status === 401) {
        const redirect = `${window.location.pathname}${window.location.search}`;
        window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}&error=unauthorized`);
        return;
      }

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        alert("결제 준비에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const TossPayments = await loadTossPayments();
      const tossPayments = TossPayments(json.clientKey);

      await tossPayments.requestPayment("카드", {
        amount: json.order.amount,
        orderId: json.order.orderId,
        orderName: json.order.orderName,
        successUrl: json.order.successUrl,
        failUrl: json.order.failUrl,
      });
    } catch (e) {
      console.error("[checkout] error", e);
      alert("결제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPaying(false);
    }
  };

  const toggleChapter = (chapter: string) => {
    setExpandedChapters((prev) =>
      prev.includes(chapter) ? prev.filter((c) => c !== chapter) : [...prev, chapter]
    );
  };

  const maskAuthorName = (name: string) => {
    const chars = Array.from((name ?? "").trim());
    if (chars.length <= 1) return chars.join("");
    return `${chars[0]}${"*".repeat(chars.length - 1)}`;
  };

  const checkoutCtaText =
    product.type === "course"
      ? "수강 신청하기"
      : selectedRelatedIds.size > 0
        ? "교재 묶음 구매하기"
        : "교재 구매하기";

  const toggleReview = (id: string) => {
    setExpandedReviews((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const totalLessons = product.curriculum.reduce((acc, ch) => acc + ch.lessons.length, 0);
  const tabs = product.type === "textbook" ? textbookTabs : courseTabs;
  const reviewTabKey: TabKey = product.type === "textbook" ? "교재후기" : "강의후기";
  const introTabKey: TabKey = product.type === "textbook" ? "교재소개" : "강의소개";

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-10 py-8">
      {/* 왼쪽 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 브레드크럼 네비게이션 */}
        <nav className="flex items-center gap-2 text-[13px] text-white/50 mb-6">
          <Link href="/" className="hover:text-white transition-colors">홈</Link>
          <span className="text-white/30">›</span>
          <Link href="/store" className="hover:text-white transition-colors">강의</Link>
          <span className="text-white/30">›</span>
          <span className="text-white/70">{product.subject}</span>
        </nav>

        {/* 상단 미디어: 강좌는 비메오, 교재는 이미지 */}
        {product.type === "textbook" ? (
          <div className="flex justify-center items-center rounded-xl overflow-hidden bg-[#1a1a1c] mb-8 py-8">
            {product.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={product.thumbnailUrl} 
                alt={product.title} 
                className="max-h-[400px] w-auto object-contain rounded-lg shadow-2xl"
              />
            ) : (
              <div className="h-[400px] w-[280px] flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-lg">
                <span className="text-white/40 text-sm">교재 이미지 준비중</span>
              </div>
            )}
          </div>
        ) : (
          <div className="aspect-video rounded-xl overflow-hidden bg-black mb-8 border border-white/10">
            <iframe
              src={`https://player.vimeo.com/video/${product.previewVimeoId || "1121398945"}?badge=0&autopause=0&player_id=0&app_id=58479`}
              className="w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              title="맛보기 영상"
            />
          </div>
        )}

        {/* 강의 정보 섹션 */}
        <section className="mb-8">
          {/* 태그 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2.5 py-1 rounded text-[12px] font-bold bg-[#333] text-white/90">
              ORIGINAL
            </span>
            <span className="px-2.5 py-1 rounded text-[12px] font-bold bg-[#333] text-white/90">
              Lv1
            </span>
            <span className="px-2.5 py-1 rounded text-[12px] font-bold bg-[#333] text-white/90">
              BEST
            </span>
          </div>

          {/* 제목 */}
          <h1 className="text-[28px] font-bold leading-tight mb-4">{product.title}</h1>

          {/* 평점 및 후기 */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-[18px] ${
                    star <= Math.round(averageRating) ? "text-yellow-200" : "text-white/20"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-[16px] font-bold">{averageRating.toFixed(1)}</span>
            <button 
              onClick={() => setActiveTab(reviewTabKey)}
              className="text-[14px] text-white/50 underline hover:text-white/70"
            >
              {reviewCount.toLocaleString()}개 후기
            </button>
          </div>

          {/* 강사 정보 */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${product.subjectBg}`}>
              <span className={`text-sm font-bold ${product.subjectColor}`}>
                {product.teacher.charAt(0)}
              </span>
            </div>
            <div>
              <p className="text-[15px] font-medium flex items-center gap-1.5">
                {product.teacher} 선생님
                <Link 
                  href={`/teachers/${product.teacherId}`}
                  className="inline-flex items-center justify-center text-white/50 hover:text-white transition-colors"
                  title={`${product.teacher} 선생님 페이지로 이동`}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>home</span>
                </Link>
              </p>
              <p className="text-[13px] text-white/50">{product.teacherTitle}</p>
            </div>
          </div>

          {/* 간단한 설명 */}
          <p className="text-[15px] text-white/70 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </section>

        {/* 탭 네비게이션 */}
        <div ref={tabRef} className={`sticky top-[70px] z-30 -mx-4 px-4 border-b border-white/10 overflow-visible transition-all ${isTabSticky ? "pt-4" : "pt-10"}`} style={{ background: "linear-gradient(to bottom, transparent 0%, transparent 40%, #161616 40%)" }}>
          <div className="flex justify-between">
            {tabs.map((tab) => (
              <div key={tab} className="relative">
                {/* FREE 말풍선 - 커리큘럼 탭 위에 (탭이 sticky 상태가 아닐 때만 표시) */}
                {product.type === "course" && tab === "커리큘럼" && !isTabSticky && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
                    <div className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[11px] font-bold shadow-lg shadow-blue-500/30 animate-bounce whitespace-nowrap">
                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                        play_circle
                      </span>
                      FREE
                      {/* 말풍선 꼬리 */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-cyan-500" />
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-5 py-4 text-[14px] font-medium whitespace-nowrap transition-all ${
                    activeTab === tab
                      ? "text-white"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {tab === "강의후기" || tab === "교재후기" ? (
                    <>{tab} ({reviewCount})</>
                  ) : tab === "커리큘럼" ? (
                    <>커리큘럼 ({totalLessons}강)</>
                  ) : (
                    tab
                  )}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="py-8">
          {/* 소개(강좌/교재) */}
          {activeTab === introTabKey && (
            <section>
              {/* 수강 정보 */}
              <div className="rounded-xl border border-white/10 overflow-hidden mb-8">
                <table className="w-full text-[14px]">
                  <tbody>
                    <tr className="border-b border-white/10">
                      <td className="px-5 py-4 bg-white/[0.02] text-white/50 w-32 font-medium whitespace-nowrap">
                        {product.type === "textbook" ? "다운로드 기간" : "수강 기간"}
                      </td>
                      <td className="px-5 py-4 text-white/90">
                        {product.studyPeriod.regular + product.studyPeriod.review}일
                      </td>
                    </tr>
                    <tr>
                      <td className="px-5 py-4 bg-white/[0.02] text-white/50 font-medium">구성</td>
                      <td className="px-5 py-4 text-white/90">
                        {product.type === "textbook" ? "PDF 교재" : `총 ${totalLessons}개 수업`}
                      </td>
                    </tr>
                    {product.type === "textbook" &&
                      (product.extraOptions ?? []).map((opt, i) => (
                        <tr key={`${opt.name}-${i}`} className="border-t border-white/10">
                          <td className="px-5 py-4 bg-white/[0.02] text-white/50 font-medium">{opt.name}</td>
                          <td className="px-5 py-4 text-white/90 whitespace-pre-line">{opt.value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 강의 설명 */}
              <div className="rounded-xl border border-white/10 p-6">
                <p className="text-[15px] text-white/80 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
                
                {/* 선생님 소개 (있을 때만) */}
                {product.teacherDescription && product.teacherDescription.trim().length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <p className="text-[14px] font-semibold text-white/90 mb-3">선생님 소개</p>
                    <p className="text-[14px] text-white/70 leading-relaxed whitespace-pre-line">
                      {product.teacherDescription}
                    </p>
                  </div>
                )}

                {/* 강의 특징 */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-[14px] font-semibold text-white/90 mb-3">이런 분들께 추천합니다</p>
                  <ul className="space-y-2">
                    {product.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-[14px] text-white/70">
                        <span className="text-blue-400 mt-0.5">✓</span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          {/* 커리큘럼 */}
          {product.type === "course" && activeTab === "커리큘럼" && (
            <section>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {/* 테이블 헤더 */}
                <div className="flex items-center justify-between px-5 py-3 bg-white/[0.04] border-b border-white/10">
                  <span className="text-[13px] font-medium text-white/60">강의명</span>
                  <span className="text-[13px] font-medium text-white/60">시간</span>
                </div>
                {/* 강의 목록 */}
                {product.curriculum.flatMap((chapter) => chapter.lessons).map((lesson, lessonIdx) => {
                  const isFirstLesson = lessonIdx === 0;
                  // FREE 미리보기는 "실제 1강"만 재생 (트레일러/기본값 폴백 제거)
                  const previewVideoId = isFirstLesson ? lesson.vimeoId : undefined;
                  const canPreview = Boolean(previewVideoId);
                  const isExpanded = expandedLessonIdx === lessonIdx;
                  
                  return (
                    <div key={lessonIdx}>
                      <div
                        className={`flex items-center justify-between px-5 py-3.5 transition-colors ${lessonIdx > 0 ? "border-t border-white/[0.05]" : ""} ${canPreview ? "hover:bg-white/[0.04] cursor-pointer" : "hover:bg-white/[0.02]"}`}
                        onClick={() => {
                          if (canPreview) {
                            setExpandedLessonIdx(isExpanded ? null : lessonIdx);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className={`material-symbols-outlined transition-transform ${isExpanded ? "text-blue-400" : "text-white/30"}`} style={{ fontSize: "18px" }}>
                            {isExpanded ? "pause_circle" : "play_circle"}
                          </span>
                          <span className={`text-[14px] truncate ${isExpanded ? "text-white" : "text-white/80"}`}>{lesson.title}</span>
                          {isFirstLesson && (
                            <span className="shrink-0 px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[11px] font-bold">
                              FREE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-white/40 shrink-0">{lesson.duration}</span>
                          {canPreview && (
                            <span className={`material-symbols-outlined text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ fontSize: "18px" }}>
                              expand_more
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* 무료 강의 비디오 플레이어 */}
                      {canPreview && isExpanded && previewVideoId && (
                        <div className="px-5 pb-5 pt-2 bg-white/[0.02] border-t border-white/[0.05]">
                          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              src={`https://player.vimeo.com/video/${previewVideoId}?autoplay=1&title=0&byline=0&portrait=0`}
                              className="absolute inset-0 w-full h-full"
                              allow="autoplay; fullscreen; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <p className="mt-3 text-[12px] text-white/50 text-center">
                            무료 미리보기 강의입니다. 전체 강의는 수강 신청 후 시청할 수 있습니다.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 후기(강좌/교재) */}
          {activeTab === reviewTabKey && (
            <section>
              
              {/* 평점 요약 */}
              <div className="flex items-center gap-4 mb-6 p-5 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="text-center">
                  <p className={`text-[36px] font-bold ${product.type === "textbook" ? "text-white" : "text-yellow-200"}`}>
                    {averageRating.toFixed(1)}
                  </p>
                  <div className="flex justify-center mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-[16px] ${
                          star <= Math.round(averageRating)
                            ? "text-yellow-200"
                            : "text-white/20"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 후기 작성 폼 - 네이버/쿠팡 스타일 */}
              <div className="mb-8 rounded-xl border border-white/10 overflow-hidden">
                {/* 헤더 */}
                <div className="px-5 py-4 bg-white/[0.03] border-b border-white/10">
                  <h3 className="text-[15px] font-bold">후기 작성</h3>
                </div>
                
                <div className="p-5">
                  {reviewSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-green-500/20 text-green-300 text-[14px] flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                      후기가 등록되었습니다. 감사합니다!
                    </div>
                  )}
                  
                  {reviewError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/20 text-red-300 text-[14px] flex items-center gap-2">
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                      {reviewError}
                    </div>
                  )}
                  
                  {/* 이름 + 평점 (한 줄) */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <label className="block text-[12px] text-white/50 mb-1.5">작성자</label>
                      <input
                        type="text"
                        value={reviewFormName}
                        onChange={(e) => setReviewFormName(e.target.value)}
                        placeholder="닉네임을 입력하세요"
                        className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="sm:w-[200px]">
                      <label className="block text-[12px] text-white/50 mb-1.5">평점</label>
                      <div className="flex items-center gap-0.5 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setReviewFormRating(star)}
                            className={`text-[22px] transition-all transform hover:scale-110 ${
                              star <= reviewFormRating
                                ? "text-yellow-300"
                                : "text-white/20"
                            }`}
                          >
                            ★
                          </button>
                        ))}
                        <span className="ml-2 text-[13px] text-white/60">{reviewFormRating}.0</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 후기 내용 */}
                  <div className="mb-4">
                    <label className="block text-[12px] text-white/50 mb-1.5">상세 후기</label>
                    <textarea
                      value={reviewFormContent}
                      onChange={(e) => setReviewFormContent(e.target.value)}
                      placeholder={`${product.type === "textbook" ? "교재" : "강의"}에 대한 솔직한 후기를 작성해주세요. (최소 10자)`}
                      rows={4}
                      className="w-full px-3 py-3 rounded-lg bg-white/5 border border-white/10 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 resize-none"
                    />
                    <p className="mt-1 text-[11px] text-white/40">{reviewFormContent.length}자 / 최소 10자</p>
                  </div>
                  
                  {/* 이미지 업로드 */}
                  <div className="mb-5">
                    <label className="block text-[12px] text-white/50 mb-1.5">사진 첨부 (선택, 최대 5장)</label>
                    <div className="flex flex-wrap gap-2">
                      {/* 이미지 미리보기 */}
                      {reviewImagePreviews.map((preview, idx) => (
                        <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>close</span>
                          </button>
                        </div>
                      ))}
                      
                      {/* 업로드 버튼 */}
                      {reviewFormImages.length < 5 && (
                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 hover:bg-white/5 transition-all">
                          <span className="material-symbols-outlined text-white/40" style={{ fontSize: "24px" }}>add_photo_alternate</span>
                          <span className="text-[10px] text-white/40 mt-1">추가</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  
                  {/* 등록 버튼 */}
                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview || reviewFormContent.length < 10}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium text-[14px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-500 disabled:to-gray-600 flex items-center justify-center gap-2"
                  >
                    {isSubmittingReview ? (
                      <>
                        <span className="animate-spin material-symbols-outlined" style={{ fontSize: "18px" }}>progress_activity</span>
                        등록 중...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>rate_review</span>
                        후기 등록하기
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 후기 목록 */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-center text-white/40 py-8">아직 등록된 후기가 없습니다. 첫 번째 후기를 작성해보세요!</p>
                ) : (
                  reviews.map((review) => {
                  const isExpanded = expandedReviews.includes(review.id);
                  const isLong = review.content.length > 150;
                  
                  return (
                    <div
                      key={review.id}
                      className="p-5 rounded-xl border border-white/10"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center shrink-0">
                            <span className="text-[14px] font-medium text-white/80">{review.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] font-medium">{maskAuthorName(review.name)}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                    className={`text-[12px] ${
                                      star <= Math.round(review.rating)
                                        ? "text-yellow-200"
                                        : "text-white/20"
                                  }`}
                                >
                                    ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <p className="text-[12px] text-white/40 mt-0.5">{review.date}</p>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-2.5 py-1.5 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/20"
                            title="후기 삭제"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                              delete
                            </span>
                            삭제
                          </button>
                        )}
                      </div>
                      <p className={`text-[14px] text-white/70 leading-relaxed ${!isExpanded && isLong ? "line-clamp-3" : ""}`}>
                        {review.content}
                      </p>
                      {isLong && (
                        <button
                          onClick={() => toggleReview(review.id)}
                          className="text-[13px] text-blue-400 hover:text-blue-300 mt-2 transition-colors"
                        >
                          {isExpanded ? "접기" : "더보기"}
                        </button>
                      )}
                      {/* 첨부 이미지 */}
                      {review.imageUrls && review.imageUrls.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {review.imageUrls.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => window.open(url, "_blank")}
                              className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-white/30 transition-colors"
                            >
                              <img src={url} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </section>
          )}

          {/* 환불정책 */}
          {activeTab === "환불정책" && (
            <section>
              <div className="rounded-xl border border-white/10 p-6">
                <ul className="space-y-3 text-[14px] text-white/70">
                  <li className="flex items-start gap-3">
                    <span className="text-white/30">•</span>
                    <span>수강 시작 전: 전액 환불 가능</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white/30">•</span>
                    <span>수강 시작 후 7일 이내, 수강 진도율 10% 이하: 전액 환불</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white/30">•</span>
                    <span>수강 기간의 1/3 경과 전: 결제 금액의 2/3 환불</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white/30">•</span>
                    <span>수강 기간의 1/2 경과 전: 결제 금액의 1/2 환불</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-white/30">•</span>
                    <span>수강 기간의 1/2 경과 후: 환불 불가</span>
                  </li>
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 오른쪽 사이드바 (lg 이상에서만 표시) - 스크롤 시 상단 고정 */}
      <aside className="hidden lg:block w-[340px] shrink-0 mt-[20px]">
        <div
          className={`sticky rounded-xl overflow-hidden transition-[top] duration-200 ${
            isSidebarRaised ? "top-[70px]" : "top-[101px]"
          }`}
        >
          {/* 태그 및 제목 */}
          <div className="px-5 pt-5 pb-2">
            {/* 태그 */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#333] text-white/90">
                ORIGINAL
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#333] text-white/90">
                Lv1
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#333] text-white/90">
                BEST
              </span>
              <button 
                onClick={() => setShowShareModal(true)}
                className="ml-auto p-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98"/>
                </svg>
              </button>
            </div>

            {/* 제목 */}
            <h3 className="text-[18px] font-bold leading-snug mb-3">{product.title}</h3>

            {/* 평점 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-[16px] ${
                      star <= Math.round(averageRating) ? "text-yellow-200" : "text-white/20"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-[14px] font-bold">{averageRating.toFixed(1)}</span>
              <button 
                onClick={() => setActiveTab(reviewTabKey)}
                className="text-[13px] text-white/50 underline hover:text-white/70"
              >
                {reviewCount.toLocaleString()}개 후기
              </button>
            </div>

            {/* 할인 및 가격 */}
            <div>
              {hasBaseProduct ? (
                <div className="flex items-center gap-2">
                  <span className="text-[28px] font-bold">{product.formattedPrice}</span>
                  {product.formattedOriginalPrice && (
                    <span className="text-[14px] text-white/40 line-through">
                      {product.formattedOriginalPrice}
                    </span>
                  )}
                  {product.discount && (
                    <span className="inline-flex items-center justify-center rounded-full bg-rose-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {product.discount}%
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[16px] font-medium text-white/50">가격 정보 준비중</p>
              )}
            </div>
          </div>

          {/* 수강 옵션 (강좌 전용) */}
          {product.type === "course" && (
            <div className="px-5 pb-5">
              <p className="text-[14px] font-bold mb-3">수강 옵션</p>
              
              {/* 옵션 1 - 정규 강의 + 복습 기간 */}
              <div 
                onClick={() => setSelectedOption("full")}
                className={`rounded-lg p-4 mb-3 cursor-pointer transition-all ${
                  selectedOption === "full" 
                    ? "border-2 border-white/60 bg-white/5" 
                    : "border border-white/20 hover:border-white/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-[14px] font-medium ${selectedOption === "full" ? "text-white" : "text-white/70"}`}>
                      정규 강의 + 복습 기간
                    </p>
                    <p className={`text-[12px] mt-1 ${selectedOption === "full" ? "text-white/50" : "text-white/40"}`}>
                      온라인 VOD + {product.studyPeriod.regular + product.studyPeriod.review}일 수강
                    </p>
                  </div>
                  <p className={`text-[15px] font-bold ${selectedOption === "full" ? "text-white" : "text-white/70"}`}>
                    {product.formattedPrice}
                  </p>
                </div>
              </div>

              {/* 옵션 2 - 정규 강의만 */}
              <div 
                onClick={() => setSelectedOption("regular")}
                className={`rounded-lg p-4 cursor-pointer transition-all ${
                  selectedOption === "regular" 
                    ? "border-2 border-white/60 bg-white/5" 
                    : "border border-white/20 hover:border-white/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`text-[14px] font-medium ${selectedOption === "regular" ? "text-white" : "text-white/70"}`}>
                      정규 강의만
                    </p>
                    <p className={`text-[12px] mt-1 ${selectedOption === "regular" ? "text-white/50" : "text-white/40"}`}>
                      온라인 VOD + {product.studyPeriod.regular}일 수강
                    </p>
                  </div>
                  <p className={`text-[15px] font-bold ${selectedOption === "regular" ? "text-white" : "text-white/70"}`}>
                    {(product.price * 0.8).toLocaleString()}원
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 추가 교재 구매 (교재 전용) */}
          {product.type === "textbook" && relatedProducts.length > 0 && (
            <>
            <div className="mx-5 border-t border-white/10" />
            <div className={`px-5 ${selectedRelatedIds.size > 0 ? "pb-3 pt-4" : "pb-2 pt-3"}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-[14px] font-bold">추가 교재 구매</p>
                <span className="text-[12px] font-medium text-white/60">추가 5,000원 할인</span>
              </div>

              {relatedProducts.map((related) => {
                const isSelected = selectedRelatedIds.has(related.id);
                const discount = related.originalPrice
                  ? Math.round((1 - related.price / related.originalPrice) * 100)
                  : null;

                return (
                  <div
                    key={related.id}
                    onClick={() => {
                      const newSet = new Set(selectedRelatedIds);
                      if (isSelected) {
                        newSet.delete(related.id);
                      } else {
                        newSet.add(related.id);
                      }
                      setSelectedRelatedIds(newSet);
                    }}
                    className={`rounded-lg p-3 mb-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border border-white/20 bg-white/5 ring-2 ring-white/60"
                        : "border border-white/20 hover:border-white/40"
                    }`}
                  >
                    <div className="flex items-start">
                      {/* 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-[14px] font-medium truncate ${isSelected ? "text-white" : "text-white/70"}`}>
                            {related.title}
                          </p>
                          <div className="shrink-0 text-right">
                            <div className={`text-[12px] font-semibold ${isSelected ? "text-white/90" : "text-white/70"}`}>
                              <span className="text-white/50">★</span> {Number(related.rating || 0).toFixed(1)}
                            </div>
                          </div>
                        </div>
                        {/* 가격 */}
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`text-[15px] font-bold ${isSelected ? "text-white" : "text-white/70"}`}>
                            {related.price.toLocaleString()}원
                          </span>
                          {related.originalPrice && (
                            <span className={`text-[12px] line-through ${isSelected ? "text-white/40" : "text-white/30"}`}>
                              {related.originalPrice.toLocaleString()}원
                            </span>
                          )}
                          {discount && (
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-1 py-[1px] text-[9px] font-bold text-white ${
                                isSelected ? "bg-rose-400" : "bg-rose-400/70"
                              }`}
                            >
                              {discount}%
                            </span>
                          )}
                          <span className="ml-auto text-[11px] text-white/50">
                            후기 {Number(related.reviewCount || 0).toLocaleString()}개
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            </>
          )}

          {/* 구분선 및 상품 금액 (강좌이거나, 교재인데 추가 선택한 경우에만 표시) */}
          {showPriceBreakdown && (
            <>
              <div className="mx-5 border-t border-white/10" />

              <div className="p-5 pb-0">
                {/* 기본 상품 금액 */}
                {hasBaseProduct && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-white">기본 상품</span>
                    <span className="text-[16px] font-medium">
                      {product.type === "course"
                        ? selectedOption === "full"
                          ? product.formattedPrice
                          : `${(product.price * 0.8).toLocaleString()}원`
                        : product.formattedPrice}
                    </span>
                  </div>
                )}
                
                {/* 추가 교재 금액 (선택한 경우에만) */}
                {product.type === "textbook" && selectedRelatedIds.size > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[14px] font-medium text-white">추가 교재 {selectedRelatedIds.size}개</span>
                    <span className="text-[16px] font-medium text-white">
                      +{additionalAmount.toLocaleString()}원
                    </span>
                  </div>
                )}

                {/* 추가 할인 (교재 전용, 선택한 경우에만) */}
                {product.type === "textbook" && selectedRelatedIds.size > 0 && additionalDiscount > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="flex items-center gap-2 text-[14px] font-medium text-white">
                      추가 교재 할인
                      <span className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
                        SALE
                      </span>
                    </span>
                    <span className="text-[16px] font-medium text-white">
                      -{additionalDiscount.toLocaleString()}원
                    </span>
                  </div>
                )}
                
                {/* 총 결제 금액 */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[14px] font-bold">총 결제 금액</span>
                  <span className="text-[20px] font-bold">{totalAmount.toLocaleString()}원</span>
                </div>
              </div>
            </>
          )}

          {/* 버튼 영역 */}
          <div className={`px-5 ${showPriceBreakdown ? "pt-3 pb-5" : "pt-2 pb-4"}`}>
            <div className="flex gap-3">
              <button 
                onClick={handleToggleLike}
                className="flex flex-col items-center justify-center px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                <svg 
                  width="20" 
                  height="20" 
                  viewBox="0 0 24 24" 
                  fill={isLiked ? "currentColor" : "none"} 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  className={isLiked ? "text-red-500" : "text-white/60"}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span className="text-[11px] text-white/50 mt-1">{likeCount >= 10000 ? `${(likeCount / 10000).toFixed(1)}만` : likeCount.toLocaleString()}</span>
              </button>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleCheckout();
                }}
                href="#"
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg bg-white text-black text-[15px] font-bold transition-all hover:bg-white/90 ${isPaying ? "opacity-60 pointer-events-none" : ""}`}
              >
                {isPaying ? "결제 준비중..." : checkoutCtaText}
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* 모바일 하단 결제 영역용 여백 */}
      <div className="h-24 lg:hidden" />
    </div>

    {/* 모바일 하단 결제 영역 (화면 하단 고정) */}
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-[#1a1a1c] border-t border-white/10 px-4 py-3 safe-area-bottom">
      <div className="flex items-center gap-3 max-w-6xl mx-auto">
        <button 
          onClick={handleToggleLike}
          className="flex flex-col items-center justify-center px-3 py-2 rounded-lg border border-white/10"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill={isLiked ? "currentColor" : "none"} 
            stroke="currentColor" 
            strokeWidth="2" 
            className={isLiked ? "text-red-500" : "text-white/60"}
          >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span className="text-[10px] text-white/50 mt-0.5">{likeCount >= 10000 ? `${(likeCount / 10000).toFixed(1)}만` : likeCount.toLocaleString()}</span>
          </button>
          <div className="flex-1">
            {hasBaseProduct ? (
              <div className="flex items-center gap-2">
                <span className="text-[18px] font-bold">{product.formattedPrice}</span>
                {product.discount && (
                  <span className="inline-flex items-center justify-center rounded-full bg-rose-400 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {product.discount}%
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[13px] text-white/50">가격 정보 준비중</div>
            )}
          </div>
          <a
          onClick={(e) => {
            e.preventDefault();
            handleCheckout();
          }}
          href="#"
          className={`px-6 py-2.5 rounded-lg bg-white text-black text-[15px] font-bold transition-all hover:bg-white/90 ${isPaying ? "opacity-60 pointer-events-none" : ""}`}
          >
          {isPaying ? "결제 준비중..." : checkoutCtaText}
          </a>
      </div>
    </div>

    {/* 공유하기 모달 */}
    {showShareModal && (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={() => setShowShareModal(false)}
      >
        {/* 오버레이 */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        
        {/* 모달 컨텐츠 */}
        <div 
          className="relative bg-[#1c1c1e] rounded-2xl w-full max-w-[340px] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <h3 className="text-[16px] font-bold">공유하기</h3>
            <button 
              onClick={() => setShowShareModal(false)}
              className="p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 공유 옵션 - 아이콘 그리드 */}
          <div className="p-5">
            <div className="grid grid-cols-4 gap-4">
              {/* URL 복사 */}
              <button 
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${copySuccess ? "bg-green-500" : "bg-white/10 group-hover:bg-white/20"}`}>
                  {copySuccess ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  )}
                </div>
                <span className="text-[12px] text-white/70">{copySuccess ? "복사됨!" : "링크 복사"}</span>
              </button>
              
              {/* 카카오톡 */}
              <button 
                onClick={handleShareKakao}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-[#FEE500] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#3C1E1E">
                    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.86 5.33 4.64 6.74l-.96 3.54c-.08.31.27.56.54.38l4.24-2.78c.52.07 1.04.12 1.54.12 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                  </svg>
                </div>
                <span className="text-[12px] text-white/70">카카오톡</span>
              </button>
              
              {/* 트위터/X */}
              <button 
                onClick={handleShareTwitter}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-black border border-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </div>
                <span className="text-[12px] text-white/70">X</span>
              </button>
              
              {/* 페이스북 */}
              <button 
                onClick={handleShareFacebook}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="w-14 h-14 rounded-full bg-[#1877F2] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-[12px] text-white/70">페이스북</span>
              </button>
            </div>
          </div>
          
          {/* URL 미리보기 */}
          <div className="px-5 pb-5">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-white/60 truncate">{typeof window !== "undefined" ? window.location.href : ""}</p>
              </div>
              <button 
                onClick={handleCopyLink}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[12px] font-medium transition-colors"
              >
                {copySuccess ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
