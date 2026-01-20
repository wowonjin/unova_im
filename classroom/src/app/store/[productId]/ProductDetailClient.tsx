"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef } from "react";

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
  helpfulCount?: number;
  isHelpful?: boolean;
  isVerifiedBuyer?: boolean;
  teacherReply?: string | null;
  teacherReplyAtISO?: string | null;
  teacherReplyIsSecret?: boolean;
  canViewTeacherReply?: boolean;
};

type ReviewSummary = {
  totalCount: number;
  averageRating: number;
  ratingCounts: number[];
  photoCount: number;
  verifiedCount: number;
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
  teacherImageUrl?: string | null;
  thumbnailUrl?: string | null;
  // 교재의 ISBN(관리자에서 입력한 값). 현재는 Textbook.imwebProdCode를 사용합니다.
  isbn?: string | null;
  // 준비중 여부(준비중이면 상세는 열리되 결제/구매 버튼 비활성)
  isSoldOut: boolean;
  // DB price가 null이면 false (가격 미설정). 0원(무료)은 true + price=0.
  isPriceSet: boolean;
  price: number;
  originalPrice: number | null;
  dailyPrice: number;
  type: "course" | "textbook";
  description: string;
  composition?: string | null;
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
  isPriceSet: boolean;
  price: number;
  originalPrice: number | null;
  thumbnailUrl: string | null;
  teacher: string;
  subject: string;
  rating: number;
  reviewCount: number;
};

type AddonCourse = {
  id: string;
  title: string;
  isPriceSet: boolean;
  price: number;
  originalPrice: number | null;
  thumbnailUrl: string | null;
  teacher: string;
  subject: string;
  rating: number;
  reviewCount: number;
};

const courseTabs = ["상세 페이지", "강의소개", "커리큘럼", "강의후기", "환불정책"] as const;
const textbookTabs = ["상세 페이지", "교재소개", "교재후기", "환불정책"] as const;
type TabKey = (typeof courseTabs)[number] | (typeof textbookTabs)[number];

export default function ProductDetailClient({ 
  product,
  relatedProducts = [],
  addonCourses = [],
}: { 
  product: ProductData;
  relatedProducts?: RelatedProduct[];
  addonCourses?: AddonCourse[];
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("상세 페이지");
  const [expandedChapters, setExpandedChapters] = useState<string[]>([]);
  const [expandedReviews, setExpandedReviews] = useState<string[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [visitorId, setVisitorId] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [selectedRelatedIds, setSelectedRelatedIds] = useState<Set<string>>(new Set());
  const [selectedAddonCourseIds, setSelectedAddonCourseIds] = useState<Set<string>>(new Set());
  // 모바일 추가 상품 바텀시트 상태
  const [mobileAddonSheetMounted, setMobileAddonSheetMounted] = useState(false);
  const [mobileAddonSheetOpen, setMobileAddonSheetOpen] = useState(false);

  const openMobileAddonSheet = () => {
    setMobileAddonSheetMounted(true);
    // mount 직후 바로 open을 켜면 트랜지션이 안 걸리는 경우가 있어 rAF로 한 프레임 미룹니다.
    requestAnimationFrame(() => setMobileAddonSheetOpen(true));
  };

  const closeMobileAddonSheet = () => {
    setMobileAddonSheetOpen(false);
    // 닫힘 애니메이션이 끝난 뒤 언마운트 (iOS 느낌의 짧고 부드러운 close)
    window.setTimeout(() => setMobileAddonSheetMounted(false), 220);
  };

  // 선택한 추가 교재 금액 (강좌/교재 상세 모두에서 사용)
  const additionalAmount = Array.from(selectedRelatedIds).reduce((sum, id) => {
    const p = relatedProducts.find((r) => r.id === id);
    return sum + (p?.price || 0);
  }, 0);

  // 선택한 추가 강의 금액 (강좌 상세에서 사용)
  const additionalCourseAmount = Array.from(selectedAddonCourseIds).reduce((sum, id) => {
    const p = addonCourses.find((c) => c.id === id);
    return sum + (p?.price || 0);
  }, 0);


  // 강좌 상세: "수강 옵션"을 제거하고 기본 강의 가격만 사용합니다.
  const baseAmount = product.type === "course" ? product.price : product.price;

  // NOTE:
  // - DB price가 null이면(미설정) page.tsx에서 price=0으로 내려오지만 isPriceSet=false로 구분합니다.
  // - 0원(무료)은 isPriceSet=true + price=0 이므로 정상적으로 0원 표시/구매가 가능합니다.
  const hasBaseProduct = product.isPriceSet && Number.isFinite(baseAmount) && baseAmount >= 0;
  const hasAdditionalSelection = selectedRelatedIds.size > 0;
  const hasAddonCourseSelection = selectedAddonCourseIds.size > 0;
  const hasAnyAddonSelection = hasAdditionalSelection || hasAddonCourseSelection;
  // UI 규칙
  // - 교재 상세: "추가 교재"를 고른 경우에만(=묶음 구매) 요약(기본 상품/총 결제 금액) 노출
  // - 강의 상세: 기본 금액이 있으면 요약 노출(교재를 함께 고르면 추가 라인/할인도 함께 노출)
  const showPriceBreakdown = hasBaseProduct || hasAdditionalSelection || hasAddonCourseSelection;
  // "총 결제 금액" 위 구분선은 항상 유지하되,
  // 섹션 간 divider(요약 섹션 위)는 교재 선택이 있을 때만 보여서 불필요한 빈공간을 줄입니다.
  const showDividerBeforeSummary = product.type === "course" ? hasAnyAddonSelection : hasAdditionalSelection;
  // '총 결제 금액' 위에 실제로 노출되는 요약 라인(기본 상품/추가 교재/할인)이 있는지
  const showBaseRow = product.type === "course" ? hasBaseProduct : hasBaseProduct && hasAdditionalSelection;
  const hasSummaryLinesAboveTotal =
    showBaseRow ||
    hasAdditionalSelection ||
    hasAddonCourseSelection;
  const totalAmount = Math.max(
    0,
    (hasBaseProduct ? baseAmount : 0) +
      additionalAmount +
      additionalCourseAmount
  );
  
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

  // NOTE: 우측 구매 메뉴는 데스크톱에서 페이지 흐름대로 스크롤되도록(고정/스티키/스크롤 추적 제거) 동작합니다.

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
  const [averageRating, setAverageRating] = useState(product.rating ?? 0);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
    totalCount: product.reviewCount ?? 0,
    averageRating: product.rating ?? 0,
    ratingCounts: [0, 0, 0, 0, 0],
    photoCount: 0,
    verifiedCount: 0,
  });
  const [reviewSort, setReviewSort] = useState<"latest" | "rating" | "helpful">("latest");
  const [reviewPhotoOnly, setReviewPhotoOnly] = useState(false);
  const [reviewVerifiedOnly, setReviewVerifiedOnly] = useState(false);
  const [visibleReviewCount, setVisibleReviewCount] = useState(10);
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(24);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reviewKeyword, setReviewKeyword] = useState<string | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [reportToast, setReportToast] = useState<string | null>(null);
  const [reviewFormRating, setReviewFormRating] = useState(5);
  const [reviewFormContent, setReviewFormContent] = useState("");
  const [reviewFormImages, setReviewFormImages] = useState<File[]>([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState<string[]>([]);
  const reviewImagePreviewsRef = useRef<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [meUser, setMeUser] = useState<{ id: string; email: string; name: string | null } | null>(null);
  const [isReviewWriteModalOpen, setIsReviewWriteModalOpen] = useState(false);
  const reviewCounts = useMemo(() => {
    return Array.isArray(reviewSummary.ratingCounts) && reviewSummary.ratingCounts.length === 5
      ? reviewSummary.ratingCounts
      : [0, 0, 0, 0, 0];
  }, [reviewSummary.ratingCounts]);
  const totalReviews = reviewSummary.totalCount ?? reviewCount;
  const photoReviews = useMemo(() => {
    return reviews.filter((r) => (r.imageUrls ?? []).length > 0);
  }, [reviews]);
  const photoUrls = useMemo(() => {
    const urls: string[] = [];
    for (const r of photoReviews) {
      for (const u of r.imageUrls ?? []) {
        if (typeof u === "string" && u.trim()) urls.push(u);
      }
    }
    return urls;
  }, [photoReviews]);
  const bestReviews = useMemo(() => {
    return [...reviews]
      .sort((a, b) => {
        const helpfulDiff = (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0);
        if (helpfulDiff !== 0) return helpfulDiff;
        const ratingDiff = b.rating - a.rating;
        if (ratingDiff !== 0) return ratingDiff;
        return b.date.localeCompare(a.date);
      })
      .slice(0, 3);
  }, [reviews]);

  const featuredReviews = useMemo(() => {
    // 네이버 느낌: 구매자/도움돼요 우선 + 평점 보조
    const sorted = [...reviews].sort((a, b) => {
      const vb = Number(Boolean(b.isVerifiedBuyer)) - Number(Boolean(a.isVerifiedBuyer));
      if (vb !== 0) return vb;
      const helpfulDiff = (b.helpfulCount ?? 0) - (a.helpfulCount ?? 0);
      if (helpfulDiff !== 0) return helpfulDiff;
      const ratingDiff = b.rating - a.rating;
      if (ratingDiff !== 0) return ratingDiff;
      return b.date.localeCompare(a.date);
    });
    return sorted.slice(0, 2);
  }, [reviews]);
  const featuredIds = useMemo(() => new Set(featuredReviews.map((r) => r.id)), [featuredReviews]);

  const keywordStats = useMemo(() => {
    const STOP = new Set([
      "그",
      "이",
      "저",
      "것",
      "수업",
      "강의",
      "교재",
      "문제",
      "정말",
      "너무",
      "진짜",
      "완전",
      "그리고",
      "근데",
      "그래서",
      "해서",
      "합니다",
      "했어요",
      "좋아요",
      "좋습니다",
      "좋은",
      "나쁜",
      "최고",
      "추천",
      "비추천",
      "그냥",
      "좀",
      "많이",
      "조금",
      "있어요",
      "없어요",
      "있음",
      "없음",
      "배송",
      "구매",
      "가격",
    ]);

    const counts = new Map<string, number>();
    for (const r of reviews) {
      const text = String(r.content || "")
        .replace(/[0-9]/g, " ")
        .replace(/[^\p{L}\s]/gu, " ")
        .toLowerCase();
      const words = text.split(/\s+/g).map((w) => w.trim()).filter(Boolean);
      for (const w of words) {
        if (w.length < 2) continue;
        if (STOP.has(w)) continue;
        counts.set(w, (counts.get(w) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (!reviewKeyword) return reviews;
    return reviews.filter((r) => String(r.content || "").toLowerCase().includes(reviewKeyword.toLowerCase()));
  }, [reviews, reviewKeyword]);

  useEffect(() => {
    reviewImagePreviewsRef.current = reviewImagePreviews;
  }, [reviewImagePreviews]);

  const resetReviewDraft = () => {
    setReviewFormRating(5);
    setReviewFormContent("");
    setReviewFormImages([]);
    try {
      reviewImagePreviewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    } catch {
      // ignore
    }
    setReviewImagePreviews([]);
    setReviewError(null);
  };

  const openReviewWriteModal = () => {
    // 로그인 필수
    if (!meUser && typeof window !== "undefined") {
      alert("후기 작성은 로그인 후 가능합니다.");
      const redirect = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}&error=unauthorized`);
      return;
    }
    setReviewError(null);
    setIsReviewWriteModalOpen(true);
  };

  const closeReviewWriteModal = () => {
    resetReviewDraft();
    setIsReviewWriteModalOpen(false);
  };

  // 후기 작성 모달 열림 시: 바디 스크롤 잠금 + ESC로 닫기(애플 느낌의 기본 UX)
  useEffect(() => {
    if (!isReviewWriteModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeReviewWriteModal();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReviewWriteModalOpen]);
  
  // 공유 모달 상태
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [shareUrlPreview, setShareUrlPreview] = useState("");
  
  // 무료 강의 미리보기 상태
  const [expandedLessonIdx, setExpandedLessonIdx] = useState<number | null>(null);

  const displayTags = Array.isArray(product.tags)
    ? product.tags
        .filter((t) => typeof t === "string" && t.trim().length > 0)
        .filter((t) => t.trim().toUpperCase() !== "ORIGINAL")
    : [];

  const benefitImageUrls = (product.benefits ?? [])
    .map((x) => {
      const t = (typeof x === "string" ? x : "").trim();
      if (t.toLowerCase().startsWith("gs://")) return `https://storage.googleapis.com/${t.slice(5)}`;
      return t;
    })
    .filter((x) => typeof x === "string" && /^https?:\/\//i.test(x.trim()));

  const previewDownloadUrl = (product.extraOptions ?? [])
    .map((opt) => {
      const name = (opt?.name ?? "").trim();
      const value = (opt?.value ?? "").trim();
      return { name, value };
    })
    .map(({ name, value }) => {
      if (!name) return null;
      const key = name.replace(/\s+/g, "").toLowerCase();
      const isPreviewKey =
        key === "맛보기파일url" ||
        key === "맛보기url" ||
        key === "미리보기파일url" ||
        key === "맛보기파일";
      if (!isPreviewKey) return null;
      if (!value) return null;
      if (value.toLowerCase().startsWith("gs://")) return `https://storage.googleapis.com/${value.slice(5)}`;
      return value;
    })
    .find((v) => typeof v === "string" && /^https?:\/\//i.test(v)) || null;

  // 선생님 이미지: (1) 상품 데이터에 있으면 사용, (2) 없으면 /api/teachers/list에서 선생님 slug/이름으로 매칭해 폴백
  const [teacherAvatarUrl, setTeacherAvatarUrl] = useState<string | null>(product.teacherImageUrl ?? null);
  useEffect(() => {
    setTeacherAvatarUrl(product.teacherImageUrl ?? null);
  }, [product.teacherImageUrl]);

  useEffect(() => {
    if (teacherAvatarUrl) return;
    const teacherNameKey = (product.teacher || "").replace(/선생님/g, "").trim();
    const teacherSlugKey = (product.teacherId || "").trim();
    if (!teacherNameKey && !teacherSlugKey) return;

    const normalize = (u: unknown): string | null => {
      const v = (typeof u === "string" ? u : "").trim();
      if (!v) return null;
      if (v.toLowerCase().startsWith("gs://")) return `https://storage.googleapis.com/${v.slice(5)}`;
      return v;
    };

    const run = async () => {
      try {
        const res = await fetch("/api/teachers/list", { cache: "force-cache" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) return;
        const list = Array.isArray(json.teachers) ? json.teachers : [];

        const matched =
          list.find((t: any) => typeof t?.slug === "string" && t.slug.trim() === teacherSlugKey) ||
          list.find((t: any) => typeof t?.name === "string" && t.name.trim() === teacherNameKey) ||
          list.find(
            (t: any) =>
              typeof t?.name === "string" &&
              (t.name.includes(teacherNameKey) || teacherNameKey.includes(t.name.trim()))
          );

        const url = normalize(matched?.imageUrl);
        if (url) setTeacherAvatarUrl(url);
      } catch {
        // ignore
      }
    };

    run();
  }, [teacherAvatarUrl, product.teacher, product.teacherId]);
  
  // 탭 메뉴 고정 관련 상태
  const [isTabSticky, setIsTabSticky] = useState(false);
  const tabPlaceholderRef = useRef<HTMLDivElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const [tabPlaceholderHeight, setTabPlaceholderHeight] = useState<number>(56);
  const [tabStyle, setTabStyle] = useState<{
    position: "static" | "fixed";
    top: number;
    left: number;
    width: number;
  }>({ position: "static", top: 0, left: 0, width: 0 });
  
  // 탭이 헤더 아래에 붙는(sticky/fixed) 순간, 헤더 배경 투명도를 탭과 동일하게 맞춤
  // - LandingHeader는 CSS 변수(--unova-header-scrolled-opacity)를 읽어 scrolledOpacity를 동적으로 반영합니다.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // 탭 fixed 배경: bg-[#161616]/95 와 동일한 알파(0.95)
    if (isTabSticky) root.style.setProperty("--unova-header-scrolled-opacity", "0.95");
    else root.style.removeProperty("--unova-header-scrolled-opacity");

    // 헤더 컴포넌트에 즉시 반영되도록 이벤트 발행
    try {
      window.dispatchEvent(new Event("unova:header-opacity"));
    } catch {
      // ignore
    }

    // 언마운트/전환 시 원복
    return () => {
      root.style.removeProperty("--unova-header-scrolled-opacity");
      try {
        window.dispatchEvent(new Event("unova:header-opacity"));
      } catch {
        // ignore
      }
    };
  }, [isTabSticky]);

  // 사이드바 고정 관련 상태
  const sidebarPlaceholderRef = useRef<HTMLDivElement>(null);
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const [sidebarStyle, setSidebarStyle] = useState<{
    position: "static" | "fixed";
    top: number;
    left: number;
    width: number;
  }>({ position: "static", top: 0, left: 0, width: 340 });
  
  useEffect(() => {
    const getHeaderOffset = () => {
      try {
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue("--unova-fixed-header-offset")
          .trim();
        const n = Number.parseFloat(raw.replace("px", ""));
        return Number.isFinite(n) ? n : 70;
      } catch {
        return 70;
      }
    };

    const handleScroll = () => {
      const headerOffset = getHeaderOffset();
      
      // 탭 메뉴 고정 처리
      if (tabPlaceholderRef.current && tabContentRef.current) {
        const placeholder = tabPlaceholderRef.current;
        const placeholderRect = placeholder.getBoundingClientRect();
        
        // 탭 메뉴가 헤더 아래로 스크롤되면 fixed로 전환
        if (placeholderRect.top <= headerOffset) {
          setIsTabSticky(true);
          setTabStyle({
            position: "fixed",
            top: headerOffset,
            left: placeholderRect.left,
            width: placeholderRect.width,
          });
        } else {
          setIsTabSticky(false);
          setTabStyle({
            position: "static",
            top: 0,
            left: 0,
            width: placeholderRect.width,
          });
        }

        // 탭이 2줄(모바일)로 바뀌어도 sticky 전환 시 레이아웃이 튀지 않도록 placeholder 높이 동기화
        try {
          window.requestAnimationFrame(() => {
            const h = tabContentRef.current?.offsetHeight ?? 56;
            if (Number.isFinite(h) && h > 0) setTabPlaceholderHeight(h);
          });
        } catch {
          const h = tabContentRef.current?.offsetHeight ?? 56;
          if (Number.isFinite(h) && h > 0) setTabPlaceholderHeight(h);
        }
      }
      
      // 사이드바 고정 처리
      if (sidebarPlaceholderRef.current && sidebarContentRef.current) {
        const placeholder = sidebarPlaceholderRef.current;
        const placeholderRect = placeholder.getBoundingClientRect();
        const topOffset = headerOffset + 16; // 헤더 아래 16px 여백
        
        // 사이드바 placeholder가 헤더 아래로 스크롤되면 fixed로 전환
        if (placeholderRect.top <= topOffset) {
          setSidebarStyle({
            position: "fixed",
            top: topOffset,
            left: placeholderRect.left,
            width: placeholderRect.width,
          });
        } else {
          setSidebarStyle({
            position: "static",
            top: 0,
            left: 0,
            width: placeholderRect.width,
          });
        }
      }
    };
    
    // resize 시에도 위치 재계산
    const handleResize = () => {
      handleScroll();
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    handleScroll(); // 초기 상태 확인
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const fetchReviews = async () => {
    try {
      const type = product.type === "course" ? "COURSE" : "TEXTBOOK";
      const qs = new URLSearchParams();
      qs.set("type", type);
      qs.set("sort", reviewSort);
      if (reviewPhotoOnly) qs.set("photoOnly", "1");
      if (reviewVerifiedOnly) qs.set("verifiedOnly", "1");
      if (visitorId) qs.set("visitorId", visitorId);

      const res = await fetch(`/api/reviews/${product.id}?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        const nextReviews: Review[] = Array.isArray(data.reviews) ? data.reviews : [];
        setReviews(nextReviews);
        if (data.summary) {
          setReviewSummary(data.summary);
          setReviewCount(data.summary.totalCount ?? nextReviews.length);
          setAverageRating(data.summary.averageRating ?? 0);
        } else {
          setReviewSummary({
            totalCount: nextReviews.length,
            averageRating: 0,
            ratingCounts: [0, 0, 0, 0, 0],
            photoCount: nextReviews.filter((r) => (r.imageUrls ?? []).length > 0).length,
            verifiedCount: nextReviews.filter((r) => r.isVerifiedBuyer).length,
          });
          setReviewCount(nextReviews.length);
          setAverageRating(0);
        }
        setReviewError(null);
      } else {
        setReviews([]);
        setReviewSummary({ totalCount: 0, averageRating: 0, ratingCounts: [0, 0, 0, 0, 0], photoCount: 0, verifiedCount: 0 });
        setReviewCount(0);
        setAverageRating(0);
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setReviews([]);
      setReviewSummary({ totalCount: 0, averageRating: 0, ratingCounts: [0, 0, 0, 0, 0], photoCount: 0, verifiedCount: 0 });
      setReviewCount(0);
      setAverageRating(0);
    }
  };

  // 후기 목록 불러오기 (정렬/필터 변경 포함)
  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.type, reviewSort, reviewPhotoOnly, reviewVerifiedOnly, visitorId]);

  // 네이버 느낌: 탭/정렬이 바뀌면 목록을 다시 "처음 10개"부터 보여줌
  useEffect(() => {
    setVisibleReviewCount(10);
    setVisiblePhotoCount(24);
  }, [reviewSort, reviewPhotoOnly, reviewVerifiedOnly]);

  const getOrCreateVisitorId = () => {
    let vid = visitorId;
    if (!vid && typeof window !== "undefined") {
      const stored = localStorage.getItem("visitorId");
      if (stored) {
        vid = stored;
      } else {
        vid = crypto.randomUUID();
        localStorage.setItem("visitorId", vid);
      }
      if (vid !== visitorId) setVisitorId(vid);
    }
    return vid;
  };

  const handleToggleHelpful = async (reviewId: string) => {
    const vid = getOrCreateVisitorId();
    if (!vid) return;
    try {
      const res = await fetch("/api/reviews/helpful", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, visitorId: vid }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "HELPFUL_FAILED");
      setReviews((prev) =>
        prev.map((r) =>
          r.id === reviewId
            ? { ...r, helpfulCount: data.helpfulCount ?? r.helpfulCount, isHelpful: data.isHelpful ?? r.isHelpful }
            : r
        )
      );
    } catch {
      // ignore
    }
  };

  const handleSubmitReport = async (reviewId: string, reason: string) => {
    const vid = getOrCreateVisitorId();
    if (!vid) return;
    setIsReporting(true);
    try {
      const res = await fetch("/api/reviews/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reason, visitorId: vid }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "REPORT_FAILED");
      setReportToast("신고가 접수되었습니다.");
      window.setTimeout(() => setReportToast(null), 2000);
      setReportTargetId(null);
    } catch {
      setReportToast("신고에 실패했습니다. 잠시 후 다시 시도해주세요.");
      window.setTimeout(() => setReportToast(null), 2000);
    } finally {
      setIsReporting(false);
    }
  };

  // 관리자 여부 확인 (관리자면 후기 삭제 버튼 노출)
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          setIsAdmin(Boolean(data.user?.isAdmin));
          setMeUser(data.user ? { id: data.user.id, email: data.user.email, name: data.user.name ?? null } : null);
        } else {
          setIsAdmin(false);
          setMeUser(null);
        }
      } catch {
        setIsAdmin(false);
        setMeUser(null);
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
      await fetchReviews();
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
      setReviewFormRating(5);
      setReviewFormContent("");
      setReviewFormImages([]);
      reviewImagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setReviewImagePreviews([]);
      // 후기 목록 새로고침
      await fetchReviews();

      // 작성 완료 후 모달 닫기
      closeReviewWriteModal();
    } catch (err) {
      setReviewError("후기 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // NOTE: 토스 결제는 이 페이지에서 팝업(오버레이)로 렌더합니다.

  // 공유 기능
  const getShareUrl = () => {
    if (typeof window !== "undefined") {
      return window.location.href;
    }
    return "";
  };

  // SSR/CSR hydration mismatch 방지: window 기반 값은 마운트 후에만 채웁니다.
  useEffect(() => {
    setShareUrlPreview(getShareUrl());
  }, []);

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
    if (product.isSoldOut) {
      alert("준비중인 상품입니다.");
      return;
    }
    setIsPaying(true);

    try {
      // 장바구니 아이템 구성 (메인 상품 + 선택한 추가 교재)
      const cartItems = [
        {
          productType: product.type === "course" ? "COURSE" : "TEXTBOOK",
          productId: product.id,
        },
        // 선택한 추가 교재 추가
        ...Array.from(selectedRelatedIds).map((id) => ({
          productType: "TEXTBOOK" as const,
          productId: id,
        })),
        // 선택한 추가 강의 추가
        ...Array.from(selectedAddonCourseIds).map((id) => ({
          productType: "COURSE" as const,
          productId: id,
        })),
      ];

      // 0원(무료) 결제: 토스 결제창을 띄우지 않고 즉시 구매 처리
      // - 모든 선택 상품이 "가격 설정됨(isPriceSet=true)" 이면서 "가격=0"인 경우에만 허용
      const isFreeEligible = cartItems.every((it) => {
        if (it.productId === product.id) {
          return product.isPriceSet && product.price === 0;
        }
        if (it.productType === "TEXTBOOK") {
          const p = relatedProducts.find((r) => r.id === it.productId);
          return Boolean(p?.isPriceSet) && (p?.price ?? -1) === 0;
        }
        // COURSE
        const c = addonCourses.find((a) => a.id === it.productId);
        return Boolean(c?.isPriceSet) && (c?.price ?? -1) === 0;
      });

      if (isFreeEligible) {
        for (const it of cartItems) {
          const res = await fetch("/api/orders/purchase", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              productType: it.productType,
              productId: it.productId,
              paymentMethod: "FREE",
            }),
          });

          if (res.status === 401) {
            const redirect = `${window.location.pathname}${window.location.search}`;
            window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}&error=unauthorized`);
            return;
          }

          const json = await res.json().catch(() => null);
          if (!res.ok || !json?.ok) {
            alert("구매 처리에 실패했습니다. 잠시 후 다시 시도해주세요.");
            return;
          }
        }

        const hasCourse = cartItems.some((it) => it.productType === "COURSE");
        window.location.assign(hasCourse ? "/dashboard" : "/materials");
        return;
      }

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
        const code = json?.error ? String(json.error) : `HTTP_${res.status}`;
        const msg =
          code === "TOSS_CLIENT_KEY_NOT_SET"
            ? "토스 클라이언트 키가 설정되지 않았습니다. (.env.local의 TOSS_CLIENT_KEY 확인)"
            : code === "TOSS_SECRET_KEY_NOT_SET"
              ? "토스 시크릿 키가 설정되지 않았습니다. (.env.local의 TOSS_SECRET_KEY 확인)"
              :
          code === "TOSS_PAYMENT_CLIENT_KEY_NOT_SET"
            ? "토스 결제창용 클라이언트 키가 설정되지 않았습니다. (.env.local의 TOSS_PAYMENT_CLIENT_KEY 또는 TOSS_CLIENT_KEY 확인)"
            : code === "TOSS_PAYMENT_CLIENT_KEY_IS_WIDGET_KEY"
              ? "표준 결제창에는 '결제위젯 연동 키(gck)'가 아닌 'API 개별 연동 키(test_ck_/live_ck_)'를 사용해야 합니다."
              :
          code === "PRICE_NOT_SET"
            ? "상품 가격이 설정되지 않아 결제를 진행할 수 없습니다. 관리자에게 문의해주세요."
            : code === "SOLD_OUT"
              ? "준비중인 상품입니다."
            : code === "INVALID_REQUEST"
              ? "결제 요청 정보가 올바르지 않습니다. 새로고침 후 다시 시도해주세요."
              : code === "INVALID_AMOUNT"
                ? "결제 금액 계산에 실패했습니다. 관리자에게 문의해주세요."
                : "결제 준비에 실패했습니다. 잠시 후 다시 시도해주세요.";
        alert(msg);
        return;
      }

      // 토스 기본 결제창(standard) 바로 호출
      const TossPayments = await loadTossPaymentsV2();
      const tossPayments = TossPayments(String(json.paymentClientKey || json.clientKey));
      const payment = tossPayments.payment({ customerKey: String(json.customerKey) });
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: Number(json.order.amount) },
        orderId: String(json.order.orderId),
        orderName: String(json.order.orderName),
        successUrl: String(json.order.successUrl),
        failUrl: String(json.order.failUrl),
      });
    } catch (e) {
      console.error("[checkout] error", e);
      alert("결제 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsPaying(false);
    }
  };

  const loadTossPaymentsV2 = async (): Promise<any> => {
    const w = window as any;
    if (w.TossPayments) return w.TossPayments;

    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-toss-payments-v2="1"]') as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("TOSS_V2_SCRIPT_LOAD_FAILED")));
        return;
      }

      const s = document.createElement("script");
      s.src = "https://js.tosspayments.com/v2/standard";
      s.async = true;
      s.setAttribute("data-toss-payments-v2", "1");
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("TOSS_V2_SCRIPT_LOAD_FAILED"));
      document.head.appendChild(s);
    });

    return (window as any).TossPayments;
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
      ? selectedRelatedIds.size > 0 || selectedAddonCourseIds.size > 0
        ? "강의+추가상품 구매하기"
        : "수강 신청하기"
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
  const detailPageTabKey: TabKey = "상세 페이지";
  // 무료(0원) 교재는 후기 UI를 단순화: 키워드/추천/베스트/구매자 탭 등 숨김
  // (운영 중 특정 상품 ID 하드코딩으로 인해 무료 교재들의 후기 탭 디자인이 "기본값"으로 보이는 문제를 방지)
  const isSimpleReviewUi = product.type === "textbook" && product.isPriceSet && product.price === 0;
  const reviewTeacherDisplayName = useMemo(() => {
    const raw = String(product.teacher || "").replace(/선생님/g, "").trim();
    return raw ? `${raw} 선생님` : "선생님";
  }, [product.teacher]);

  // 단순 후기 UI에서는 "구매자" 탭이 없으므로, 상태가 켜져 있으면 꺼줍니다.
  useEffect(() => {
    if (!isSimpleReviewUi) return;
    if (reviewVerifiedOnly) setReviewVerifiedOnly(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSimpleReviewUi]);

  return (
    <>
    <div className="flex flex-col md:flex-row gap-10 py-8">
      {/* 왼쪽 메인 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {/* 브레드크럼 네비게이션 */}
        <nav className="flex items-center gap-2 text-[13px] text-white/50 mb-6">
          <Link
            href={`/store?type=${encodeURIComponent(product.type === "textbook" ? "교재" : "강좌")}`}
            className="hover:text-white transition-colors"
          >
            {product.type === "textbook" ? "교재" : "강의"}
          </Link>
          <span className="text-white/30">›</span>
          <span className="text-white/70">{product.subject}</span>
        </nav>

        {/* 상단 미디어: 교재는 이미지, 강좌는 (소개 Vimeo가 있으면 Vimeo) 없으면 썸네일 */}
        {product.type === "textbook" ? (
          <div className="mb-8">
            <div className="relative w-full max-w-[520px] lg:max-w-none aspect-video rounded-xl overflow-hidden bg-[#1a1a1c]">
              {product.isSoldOut && (
                <div className="absolute right-3 top-3 z-10">
                  <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-3 py-1 text-xs font-semibold text-white/90 border border-white/10">
                    준비중
                  </span>
                </div>
              )}
              {product.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  // data URL/CSP 이슈를 피하기 위해 내부 썸네일 API로 통일
                  src={`/api/textbooks/${product.id}/thumbnail`}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                  <span className="text-white/40 text-sm">교재 이미지 준비중</span>
                </div>
              )}
              {/* 준비중(=isSoldOut) 상품은 썸네일을 살짝 어둡게 처리 */}
              {product.isSoldOut ? (
                <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden="true" />
              ) : null}
            </div>
          </div>
        ) : (
          (product.previewVimeoId ?? "").trim().length > 0 ? (
            <div className="relative aspect-video rounded-xl overflow-hidden bg-black mb-8 border border-white/10">
              {product.isSoldOut && (
                <div className="absolute right-3 top-3 z-10">
                  <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-3 py-1 text-xs font-semibold text-white/90 border border-white/10">
                    준비중
                  </span>
                </div>
              )}
              <iframe
                src={`https://player.vimeo.com/video/${encodeURIComponent(String(product.previewVimeoId).trim())}?title=0&byline=0&portrait=0`}
                className="w-full h-full"
                frameBorder="0"
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title="강의 소개 영상"
              />
              {/* 준비중(=isSoldOut) 상품은 미디어를 살짝 어둡게 처리 */}
              {product.isSoldOut ? (
                <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden="true" />
              ) : null}
            </div>
          ) : product.thumbnailUrl ? (
            <div className="mb-8">
              <div className="relative w-full max-w-[520px] lg:max-w-none aspect-video rounded-xl overflow-hidden bg-[#1a1a1c] border border-white/10">
                {product.isSoldOut && (
                  <div className="absolute right-3 top-3 z-10">
                    <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-3 py-1 text-xs font-semibold text-white/90 border border-white/10">
                      준비중
                    </span>
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/courses/${product.id}/thumbnail`}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
                {/* 준비중(=isSoldOut) 상품은 썸네일을 살짝 어둡게 처리 */}
                {product.isSoldOut ? (
                  <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden="true" />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <div className="relative w-full max-w-[520px] lg:max-w-none aspect-video rounded-xl overflow-hidden bg-[#1a1a1c] border border-white/10 flex items-center justify-center bg-gradient-to-br from-white/[0.06] to-white/[0.02]">
                {product.isSoldOut && (
                  <div className="absolute right-3 top-3 z-10">
                    <span className="inline-flex items-center rounded-full bg-zinc-700/80 px-3 py-1 text-xs font-semibold text-white/90 border border-white/10">
                      준비중
                    </span>
                  </div>
                )}
                <span className="text-white/40 text-sm">미디어 준비중</span>
                {/* 준비중(=isSoldOut) 상품은 썸네일을 살짝 어둡게 처리 */}
                {product.isSoldOut ? (
                  <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden="true" />
                ) : null}
              </div>
            </div>
          )
        )}

        {/* 강의 정보 섹션 */}
        <section className="mb-4">
          {/* 태그 */}
          {displayTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {displayTags.slice(0, 6).map((tag, idx) => (
                <span
                  key={`${product.id}-tag-top-${idx}`}
                  className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-[12px] font-bold ${
                    idx === 0
                      ? "bg-white text-black"
                      : idx === 1
                        ? "bg-[#6376EC] text-white"
                        : "bg-white/[0.06] text-white/90"
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 제목 */}
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-start sm:gap-3 sm:gap-y-0">
            <h1 className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold leading-tight">{product.title}</h1>
            {product.type === "textbook" && (product.isbn ?? "").trim().length > 0 && (
              <span className="hidden sm:inline-flex items-center rounded-md bg-white/10 px-2 py-1 text-[12px] font-semibold text-white/80 sm:mt-[6px]">
                ISBN {String(product.isbn).trim()}
              </span>
            )}
          </div>

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
              {reviewCount.toLocaleString("ko-KR")}개 후기
            </button>
          </div>

          {/* 강사 정보 */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0 bg-white/[0.06] flex items-center justify-center">
              {teacherAvatarUrl ? (
                <img
                  src={teacherAvatarUrl}
                  alt={`${product.teacher} 선생님`}
                  className="w-full h-full object-cover"
                  onError={() => setTeacherAvatarUrl(null)}
                />
              ) : (
                <span className="text-white/70 text-sm font-semibold">
                  {(product.teacher || "U").trim().charAt(0) || "U"}
                </span>
              )}
            </div>
            <div>
              <p className="text-[15px] font-medium flex items-center gap-1.5">
                {isAdmin ? (
                  <Link
                    href={`/teachers/${product.teacherId}`}
                    className="inline-flex items-center text-white/90 hover:text-white transition-colors"
                    title={`${product.teacher} 선생님 페이지로 이동`}
                  >
                    {product.teacher} 선생님
                  </Link>
                ) : (
                  <span
                    className="inline-flex items-center text-white/70 cursor-default select-none"
                    title="개발 중인 페이지입니다"
                    aria-disabled="true"
                  >
                    {product.teacher} 선생님
                  </span>
                )}
              </p>
              <p className="text-[13px] text-white/50">{product.teacherTitle}</p>
            </div>
          </div>

          {/* 간단한 설명 */}
          <p className="text-[15px] text-white/70 leading-relaxed line-clamp-2">
            {product.description}
          </p>
        </section>

        {/* 탭 네비게이션 - Placeholder */}
        <div
          ref={tabPlaceholderRef}
          className="overflow-visible mt-3"
          style={{ height: tabStyle.position === "fixed" ? `${tabPlaceholderHeight}px` : "auto" }}
        >
          {/* 탭 콘텐츠 - 스크롤 시 fixed로 전환 */}
          <div
            ref={tabContentRef}
            style={
              tabStyle.position === "fixed"
                ? {
                    position: "fixed",
                    top: tabStyle.top,
                    left: tabStyle.left,
                    width: tabStyle.width,
                    zIndex: 40,
                  }
                : { position: "static" }
            }
            className={`border-b border-white/10 overflow-visible transition-colors duration-150 ${
              isTabSticky
                ? "bg-[#161616]/95 backdrop-blur-md"
                : "bg-transparent"
            }`}
          >
            {(() => {
              const mobileColsClass = tabs.length >= 5 ? "grid-cols-5" : "grid-cols-4";
              return (
                <div className={`grid ${mobileColsClass} gap-x-1 gap-y-1 px-2 py-2 sm:flex sm:justify-between sm:px-0 sm:py-0`}>
                  {tabs.map((tab) => (
                    <div key={tab} className="relative">
                  {/* FREE 말풍선 - 커리큘럼 탭 위에 (탭이 sticky 상태가 아닐 때만 표시) */}
                  {product.type === "course" && tab === "커리큘럼" && !isTabSticky && (
                    <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-10">
                      <div className="relative inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] sm:text-[11px] font-bold shadow-lg shadow-blue-500/30 animate-bounce whitespace-nowrap">
                        맛보기 후기
                        {/* 말풍선 꼬리 */}
                        <div className="absolute -bottom-1 sm:-bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] sm:border-l-[6px] border-l-transparent border-r-[5px] sm:border-r-[6px] border-r-transparent border-t-[5px] sm:border-t-[6px] border-t-cyan-500" />
                      </div>
                    </div>
                  )}
                  {/* 맛보기 파일 말풍선 - 교재소개 탭 위에 (탭이 sticky 상태가 아닐 때만 표시) */}
                  {product.type === "textbook" && tab === "교재소개" && Boolean(previewDownloadUrl) && !isTabSticky && (
                    <div className="absolute -top-7 sm:-top-8 left-1/2 -translate-x-1/2 z-10">
                      <div className="relative inline-flex items-center px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-[10px] sm:text-[11px] font-bold shadow-lg shadow-blue-500/30 animate-bounce whitespace-nowrap">
                        맛보기 파일
                        {/* 말풍선 꼬리 */}
                        <div className="absolute -bottom-1 sm:-bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] sm:border-l-[6px] border-l-transparent border-r-[5px] sm:border-r-[6px] border-r-transparent border-t-[5px] sm:border-t-[6px] border-t-cyan-500" />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setActiveTab(tab)}
                    className={`relative w-full px-1 py-2 text-[11px] font-semibold text-center leading-tight whitespace-normal break-all transition-colors duration-150 sm:w-auto sm:px-5 sm:py-4 sm:text-[14px] sm:font-medium sm:whitespace-nowrap ${
                      activeTab === tab
                        ? "text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {/* 모바일: 전체 라벨 표시 */}
                    <span className="sm:hidden">
                      {tab === "강의후기" || tab === "교재후기"
                        ? `${tab}(${reviewCount.toLocaleString("ko-KR")})`
                        : tab}
                    </span>
                    {/* 데스크톱: 기존 라벨/카운트 유지 */}
                    <span className="hidden sm:inline">
                      {tab === "강의후기" || tab === "교재후기" ? (
                        <>{tab}({reviewCount.toLocaleString("ko-KR")})</>
                      ) : tab === "커리큘럼" ? (
                        <>커리큘럼 ({totalLessons}강)</>
                      ) : (
                        tab
                      )}
                    </span>
                    {activeTab === tab && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
                    )}
                  </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 탭 콘텐츠 영역 */}
        <div className="py-8">
          {/* 상세 페이지 (강의/교재 공통) */}
          {activeTab === detailPageTabKey && (
            <section>
              {benefitImageUrls.length > 0 ? (
                <div className="space-y-3">
                  {benefitImageUrls.map((url, idx) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${product.id}-benefit-img-${idx}`}
                      src={url}
                      alt=""
                      className="w-full rounded-xl bg-white/[0.02]"
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {/* 소개(강좌/교재) */}
          {activeTab === introTabKey && (
            <section>
              {/* 수강기간/구성 컨테이너는 강좌/교재 모두 유지 */}
              <div className="rounded-xl border border-white/10 overflow-hidden mb-8">
                  <table className="w-full text-[12px] sm:text-[14px]">
                    <tbody>
                      <tr className="border-b border-white/10">
                        <td className="px-4 py-3 sm:px-5 sm:py-4 bg-white/[0.02] text-white/50 w-28 sm:w-32 font-medium whitespace-nowrap">
                          {product.type === "textbook" ? "다운로드 기간" : "수강 기간"}
                        </td>
                        <td className="px-4 py-3 sm:px-5 sm:py-4 text-white/90">
                          {product.studyPeriod.regular + product.studyPeriod.review}일
                        </td>
                      </tr>
                      {product.type === "textbook" && previewDownloadUrl && (
                        <tr className="border-b border-white/10">
                          <td className="px-4 py-3 sm:px-5 sm:py-4 bg-white/[0.02] text-white/50 font-medium whitespace-nowrap">
                            맛보기 파일
                          </td>
                          <td className="px-4 py-3 sm:px-5 sm:py-4 text-white/90">
                            <a
                              href={previewDownloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-[12px] sm:text-[13px] font-semibold text-white/80 hover:bg-white/10"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                                download
                              </span>
                              다운로드
                            </a>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="px-4 py-3 sm:px-5 sm:py-4 bg-white/[0.02] text-white/50 font-medium">구성</td>
                        <td className="px-4 py-3 sm:px-5 sm:py-4 text-white/90">
                          {product.type === "textbook" ? (product.composition || "PDF 교재") : `총 ${totalLessons}개 수업`}
                        </td>
                      </tr>
                      {product.type === "textbook" &&
                        (product.extraOptions ?? []).map((opt, i) => (
                          // NOTE: 맛보기 파일 URL은 전용 row로 노출하므로 중복 표시는 막습니다.
                          (opt?.name ?? "").replace(/\s+/g, "").toLowerCase() === "맛보기파일url" ? null :
                          <tr key={`${opt.name}-${i}`} className="border-t border-white/10">
                            <td className="px-4 py-3 sm:px-5 sm:py-4 bg-white/[0.02] text-white/50 font-medium">{opt.name}</td>
                            <td className="px-4 py-3 sm:px-5 sm:py-4 text-white/90 whitespace-pre-line">{opt.value}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
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
              
              {/* 요약 + CTA */}
              <div className="mb-6 rounded-2xl p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl px-4 py-3 text-center min-w-[140px]">
                      <p className="text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em] text-white">
                        {averageRating.toFixed(1)}
                      </p>
                      <div className="mt-1 flex justify-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-[13px] ${star <= Math.round(averageRating) ? "text-yellow-200" : "text-white/20"}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-[12px] text-white/45">
                        총 {totalReviews.toLocaleString("ko-KR")}개
                      </p>
                    </div>

                    <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map((score) => {
                        const count = reviewCounts[score - 1] ?? 0;
                        const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                        // 0%인 구간(예: 2점 0%, 1점 0%)은 아예 숨깁니다.
                        if (totalReviews > 0 && count === 0) return null;
                        return (
                          <div key={score} className="flex items-center gap-2 text-[12px] text-white/60">
                            <span className="w-6 text-right">{score}점</span>
                            <div className="relative h-2 flex-1 rounded-full bg-white/10 overflow-hidden">
                              <div className="absolute inset-y-0 left-0 bg-white/60" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 후기 등록 성공 토스트(요청사항: 표시하지 않음) */}
              </div>

              {/* 필터/정렬 (네이버 스타일: 탭 + 드롭다운) */}
              <div className="mb-4 border-b border-white/10">
                <div className="flex items-end justify-between gap-3">
                  {/* 탭(전체/사진/구매자) */}
                  <div className="flex min-w-0 gap-5">
                    <button
                      type="button"
                      onClick={() => {
                        setReviewPhotoOnly(false);
                        setReviewVerifiedOnly(false);
                      }}
                      className={`relative pb-3 text-[13px] font-semibold transition-colors ${
                        !reviewPhotoOnly && !reviewVerifiedOnly ? "text-white" : "text-white/50 hover:text-white/75"
                      }`}
                    >
                      전체
                      <span className="ml-2 text-[12px] font-medium text-white/45">
                        {totalReviews.toLocaleString("ko-KR")}
                      </span>
                      {!reviewPhotoOnly && !reviewVerifiedOnly ? (
                        <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-white" aria-hidden="true" />
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewPhotoOnly(true);
                        setReviewVerifiedOnly(false);
                      }}
                      className={`relative pb-3 text-[13px] font-semibold transition-colors ${
                        reviewPhotoOnly ? "text-white" : "text-white/50 hover:text-white/75"
                      }`}
                    >
                      사진후기
                      <span className="ml-2 text-[12px] font-medium text-white/45">
                        {reviewSummary.photoCount.toLocaleString("ko-KR")}
                      </span>
                      {reviewPhotoOnly ? (
                        <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-white" aria-hidden="true" />
                      ) : null}
                    </button>
                    {!isSimpleReviewUi ? (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewVerifiedOnly(true);
                          setReviewPhotoOnly(false);
                        }}
                        className={`relative pb-3 text-[13px] font-semibold transition-colors ${
                          reviewVerifiedOnly ? "text-white" : "text-white/50 hover:text-white/75"
                        }`}
                      >
                        구매자
                        <span className="ml-2 text-[12px] font-medium text-white/45">
                          {reviewSummary.verifiedCount.toLocaleString("ko-KR")}
                        </span>
                        {reviewVerifiedOnly ? (
                          <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-white" aria-hidden="true" />
                        ) : null}
                      </button>
                    ) : null}
                  </div>

                  {/* 정렬 드롭다운 */}
                  <label className="flex items-center gap-2 pb-2 text-[12px] text-white/50">
                    <span className="hidden sm:inline">정렬</span>
                    <select
                      value={reviewSort}
                      onChange={(e) => setReviewSort(e.target.value as any)}
                      className="rounded-lg border border-white/10 bg-[#161616] px-3 py-2 text-[13px] text-white/90 outline-none"
                    >
                      <option value="latest">최신순</option>
                      <option value="rating">평점순</option>
                      <option value="helpful">도움순</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* 키워드 요약(네이버 느낌) */}
              {!isSimpleReviewUi && keywordStats.length > 0 ? (
                <div className="mb-6 rounded-2xl border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] font-semibold text-white/90">키워드</p>
                    {reviewKeyword ? (
                      <button
                        type="button"
                        onClick={() => setReviewKeyword(null)}
                        className="text-[12px] text-white/55 hover:text-white/75"
                      >
                        초기화
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {keywordStats.map((k) => {
                      const active = reviewKeyword === k.word;
                      return (
                        <button
                          key={k.word}
                          type="button"
                          onClick={() => setReviewKeyword(active ? null : k.word)}
                          className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                            active
                              ? "border-white/25 bg-white/10 text-white"
                              : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white/80"
                          }`}
                        >
                          {k.word}
                          <span className="ml-1 text-white/40">{k.count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* 포토리뷰 미리보기 */}
              {photoReviews.length > 0 && (
                <div className="mb-6 rounded-2xl border border-white/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[14px] font-semibold text-white">포토리뷰</p>
                    <button
                      type="button"
                      onClick={() => {
                        setReviewPhotoOnly(true);
                        setReviewVerifiedOnly(false);
                      }}
                      className="text-[12px] text-white/60 hover:text-white/80"
                    >
                      사진후기 더보기
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {photoReviews.slice(0, 6).map((r) => (
                      <button
                        key={`photo-preview-${r.id}`}
                        type="button"
                        onClick={() => {
                          setReviewPhotoOnly(true);
                          setReviewVerifiedOnly(false);
                        }}
                        className="aspect-square w-full overflow-hidden rounded-xl border border-white/10 hover:border-white/25 transition-colors"
                      >
                        <img src={(r.imageUrls ?? [])[0]} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 사진후기 탭: 포토리뷰 모아보기(네이버 느낌) */}
              {reviewPhotoOnly && photoUrls.length > 0 && (
                <div className="mb-6 rounded-2xl border border-white/10 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[14px] font-semibold text-white">포토리뷰 모아보기</p>
                    <span className="text-[12px] text-white/50">{photoUrls.length.toLocaleString("ko-KR")}장</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                    {photoUrls.slice(0, visiblePhotoCount).map((url, idx) => (
                      <button
                        key={`photo-only-${idx}`}
                        type="button"
                        onClick={() => setPhotoModalUrl(url)}
                        className="aspect-square w-full overflow-hidden rounded-xl border border-white/10 hover:border-white/25 transition-colors"
                        aria-label="사진 보기"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                  {photoUrls.length > visiblePhotoCount ? (
                    <div className="mt-4 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setVisiblePhotoCount((n) => Math.min(photoUrls.length, n + 24))}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[13px] font-semibold text-white/75 hover:bg-white/[0.08] hover:text-white"
                      >
                        사진 더보기
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* 추천 리뷰(네이버 느낌: 상단 고정) */}
              {!isSimpleReviewUi &&
                !reviewPhotoOnly &&
                !reviewVerifiedOnly &&
                reviewSort !== "rating" &&
                featuredReviews.length > 0 && (
                <div className="mb-6 rounded-2xl border border-white/10 p-4">
                  <p className="mb-3 text-[14px] font-semibold text-white">추천 리뷰</p>
                  <div className="space-y-3">
                    {featuredReviews.map((review) => (
                      <div key={`featured-${review.id}`} className="rounded-xl border border-white/10 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-white/90">{maskAuthorName(review.name)}</span>
                            {review.isVerifiedBuyer && (
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                구매자
                              </span>
                            )}
                            {(review.imageUrls ?? []).length > 0 && (
                              <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/70">
                                사진후기
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleHelpful(review.id)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                              review.isHelpful
                                ? "border-white/25 bg-white/10 text-white"
                                : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white/80"
                            }`}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                              thumb_up
                            </span>
                            {Number(review.helpfulCount || 0).toLocaleString("ko-KR")}
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[12px] text-white/60">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={`${review.id}-feat-star-${star}`}
                              className={star <= Math.round(review.rating) ? "text-yellow-200" : "text-white/20"}
                            >
                              ★
                            </span>
                          ))}
                          <span className="ml-1">{review.rating.toFixed(1)}</span>
                          <span className="mx-1 text-white/30">·</span>
                          <span>{review.date}</span>
                        </div>
                        <p className="mt-2 text-[13px] text-white/70 line-clamp-2">{review.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 베스트 리뷰 */}
              {!isSimpleReviewUi && !reviewPhotoOnly && !reviewVerifiedOnly && bestReviews.length > 0 && (
                <div className="mb-6 rounded-2xl border border-white/10 p-4">
                  <p className="mb-3 text-[14px] font-semibold text-white">베스트 리뷰</p>
                  <div className="space-y-3">
                    {bestReviews.map((review) => (
                      <div
                        key={`best-${review.id}`}
                        className="rounded-xl border border-white/10 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-white/90">
                              {maskAuthorName(review.name)}
                            </span>
                            {review.isVerifiedBuyer && (
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                구매자
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleHelpful(review.id)}
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                              review.isHelpful
                                ? "border-white/25 bg-white/10 text-white"
                                : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white/80"
                            }`}
                            aria-label="도움돼요"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>
                              thumb_up
                            </span>
                            {Number(review.helpfulCount || 0).toLocaleString("ko-KR")}
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-1 text-[12px] text-white/60">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={`${review.id}-best-star-${star}`}
                              className={star <= Math.round(review.rating) ? "text-yellow-200" : "text-white/20"}
                            >
                              ★
                            </span>
                          ))}
                          <span className="ml-1">{review.rating.toFixed(1)}</span>
                          <span className="mx-1 text-white/30">·</span>
                          <span>{review.date}</span>
                        </div>
                        <p className="mt-2 text-[13px] text-white/70 line-clamp-2">{review.content}</p>
                        {(review.imageUrls ?? []).length > 0 && (
                          <div className="mt-2 flex gap-2">
                            {(review.imageUrls ?? []).slice(0, 3).map((url, idx) => (
                              <img
                                key={`${review.id}-best-img-${idx}`}
                                src={url}
                                alt=""
                                className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 후기 목록(리스트가 먼저) */}
              <div className={isSimpleReviewUi ? "divide-y divide-white/10" : "space-y-3 sm:space-y-4"}>
                {filteredReviews.length === 0 ? (
                  <div className="rounded-2xl px-6 py-10 text-center">
                    <p className="text-[14px] text-white/55">아직 등록된 후기가 없습니다.</p>
                    <p className="mt-1 text-[13px] text-white/35">첫 번째 후기를 남겨주세요.</p>
                    <div className="mt-5 flex justify-center">
                      <button
                        type="button"
                        onClick={openReviewWriteModal}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-semibold text-black hover:bg-white/90"
                      >
                        후기 작성
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredReviews
                    // 추천 리뷰 섹션을 따로 보여주는 경우에만 중복 제거 (단순 UI에서는 전체 리스트 그대로 노출)
                    .filter((r) =>
                      isSimpleReviewUi ? true : !(!reviewPhotoOnly && !reviewVerifiedOnly && featuredIds.has(r.id))
                    )
                    .slice(0, visibleReviewCount)
                    .map((review) => {
                    const isExpanded = expandedReviews.includes(review.id);
                    const isLong = review.content.length > 150;

                    return (
                      <div
                        key={review.id}
                        className={
                          isSimpleReviewUi
                            ? "py-6"
                            : "rounded-2xl border border-white/10 p-5 transition-colors hover:border-white/20"
                        }
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                            <span className="text-[14px] font-medium text-white/80">
                              {review.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-semibold text-white/90 truncate">
                                {maskAuthorName(review.name)}
                              </span>
                              {!isSimpleReviewUi && review.isVerifiedBuyer && (
                                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                                  구매자
                                </span>
                              )}
                              {(review.imageUrls ?? []).length > 0 && (
                                <span className="rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/70">
                                  사진후기
                                </span>
                              )}
                              {/* 단순 후기 UI에서는 평점을 "이름 아래"로 내립니다. */}
                              {!isSimpleReviewUi ? (
                                <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <span
                                      key={star}
                                      className={`text-[11px] ${star <= Math.round(review.rating) ? "text-yellow-200" : "text-white/20"}`}
                                    >
                                      ★
                                    </span>
                                  ))}
                                  <span className="text-[11px] text-white/60">{review.rating.toFixed(1)}</span>
                                </div>
                              ) : null}
                            </div>
                            {!isSimpleReviewUi ? (
                              <div className="mt-1 flex items-center gap-2 text-[12px] text-white/40">
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                                  {review.date}
                                </span>
                              </div>
                            ) : (
                              <div className="mt-1 flex items-center gap-1 text-[12px] text-white/60">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <span
                                    key={`${review.id}-simple-star-${star}`}
                                    className={star <= Math.round(review.rating) ? "text-yellow-200" : "text-white/20"}
                                  >
                                    ★
                                  </span>
                                ))}
                                <span className="ml-1">{review.rating.toFixed(1)}</span>
                                <span className="mx-1 text-white/30">·</span>
                                <span className="text-white/40">{review.date}</span>
                              </div>
                            )}
                          </div>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteReview(review.id)}
                              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-3 py-2 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/20"
                              title="후기 삭제"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                delete
                              </span>
                              삭제
                            </button>
                          )}
                        </div>

                        <p
                          className={`text-[14px] text-white/70 leading-relaxed ${
                            !isExpanded && isLong ? "line-clamp-3" : ""
                          }`}
                        >
                          {review.content}
                        </p>

                        {(review.teacherReply ?? "").trim() ? (
                          <div className="mt-3 ml-12 border-l border-white/10 pl-4">
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                              <span className="font-semibold text-white/75">{reviewTeacherDisplayName}</span>
                              <span className="text-white/30">·</span>
                              <span>답글</span>
                              {review.teacherReplyAtISO ? (
                                <>
                                  <span className="text-white/30">·</span>
                                  <span className="text-white/40">
                                    {new Date(review.teacherReplyAtISO).toISOString().slice(0, 10).replace(/-/g, ".")}
                                  </span>
                                </>
                              ) : null}
                            </div>
                            <p className="mt-1 text-[13px] text-white/80 whitespace-pre-line">{review.teacherReply}</p>
                          </div>
                        ) : review.teacherReplyIsSecret ? (
                          <div className="mt-3 ml-12 border-l border-white/10 pl-4">
                            <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/55">
                              <span className="font-semibold text-white/75">{reviewTeacherDisplayName}</span>
                              <span className="text-white/30">·</span>
                              <span>비밀 답글</span>
                            </div>
                            <p className="mt-1 text-[13px] text-white/55">
                              {review.canViewTeacherReply
                                ? "비밀 답글입니다. (표시 권한 있음)"
                                : "비밀 답글입니다. 작성자만 확인할 수 있어요. (로그인 필요)"}
                            </p>
                          </div>
                        ) : null}
                        {isLong && (
                          <button
                            type="button"
                            onClick={() => toggleReview(review.id)}
                            className="mt-2 text-[13px] text-white/60 hover:text-white/80 underline underline-offset-4 transition-colors"
                          >
                            {isExpanded ? "접기" : "더보기"}
                          </button>
                        )}

                        {review.imageUrls && review.imageUrls.length > 0 && (
                          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {review.imageUrls.map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => window.open(url, "_blank")}
                                className="aspect-square w-full rounded-xl overflow-hidden border border-white/10 hover:border-white/25 transition-colors"
                              >
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}

                        {!isSimpleReviewUi ? (
                          <div className="mt-4 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleToggleHelpful(review.id)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] transition-colors ${
                                review.isHelpful
                                  ? "border-white/25 bg-white/10 text-white"
                                  : "border-white/10 bg-white/[0.04] text-white/60 hover:text-white/80"
                              }`}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
                                thumb_up
                              </span>
                              도움돼요 {Number(review.helpfulCount || 0).toLocaleString("ko-KR")}
                            </button>

                            <button
                              type="button"
                              onClick={() => setReportTargetId(review.id)}
                              className="text-[12px] text-white/45 hover:text-white/70"
                            >
                              신고
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 더보기 */}
              {filteredReviews.length > visibleReviewCount ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleReviewCount((n) => Math.min(filteredReviews.length, n + 10))}
                    className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-[13px] font-semibold text-white/75 hover:bg-white/[0.08] hover:text-white"
                  >
                    더보기
                  </button>
                </div>
              ) : null}

            </section>
          )}

          {/* 환불정책 */}
          {activeTab === "환불정책" && (
            <section>
              {product.type === "course" ? (
                <div className="space-y-6 text-[12px] sm:text-[14px] text-white/70 leading-relaxed">
                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불/취소 안내 (VOD 강의)</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>
                            본 상품은 <span className="text-white/80 font-medium">디지털 콘텐츠(온라인 강의)</span>로, 관계 법령 및 당사 정책에 따라 환불이 제한될 수 있습니다.
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>환불 금액은 결제 수단/프로모션/번들 할인 적용 여부에 따라 일부 조정될 수 있습니다.</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">전액 환불(청약철회) 가능</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>
                            <span className="text-white/80 font-medium">수강 시작 전</span>에는 전액 환불이 가능합니다.
                          </span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>
                            <span className="text-white/80 font-medium">결제 후 7일 이내</span>이며{" "}
                            <span className="text-white/80 font-medium">진도율 10% 이하</span>인 경우 전액 환불이 가능합니다.
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">부분 환불(수강 진행 후)</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>수강 기간의 <span className="text-white/80 font-medium">1/3 경과 전</span>: 결제 금액의 <span className="text-white/80 font-medium">2/3</span> 환불</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>수강 기간의 <span className="text-white/80 font-medium">1/2 경과 전</span>: 결제 금액의 <span className="text-white/80 font-medium">1/2</span> 환불</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>수강 기간의 <span className="text-white/80 font-medium">1/2 경과 후</span>: 환불 불가</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span className="text-white/60">
                            (참고) 위 기준은 서비스 제공 특성상 일반적인 기준이며, 실제 환불액 산정은 구매 시점/수강 기록/프로모션 적용 여부에 따라 달라질 수 있습니다.
                          </span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불 불가(예외)</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>환불 기준을 초과하여 수강이 진행된 경우</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>부정 이용(계정 공유/무단 배포/다운로드 링크 공유 등)이 확인된 경우</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">교재/추가 강의와 함께 구매한 경우</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>번들 할인(교재 할인/강의 할인)이 적용된 주문은, 일부 항목 환불 시 할인 조건이 충족되지 않으면 환불 금액이 재산정될 수 있습니다.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>부분 환불 시 이미 제공된 혜택(할인/사은품/추가 구성 등)은 회수되거나 환불액에서 차감될 수 있습니다.</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불 신청 및 처리</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>환불은 고객센터/문의 채널을 통해 접수 후 처리됩니다.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>접수 후 영업일 기준 3~7일 내 처리될 수 있으며, 카드사/결제수단 정책에 따라 실제 환불 반영 시점은 달라질 수 있습니다.</span>
                        </li>
                      </ul>
                    </div>
                </div>
              ) : (
                <div className="space-y-6 text-[12px] sm:text-[14px] text-white/70 leading-relaxed">
                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불/취소 안내 (PDF 교재)</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>본 상품은 <span className="text-white/80 font-medium">디지털 파일(PDF)</span>로, 다운로드/열람이 시작된 경우 환불이 제한될 수 있습니다.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>다운로드 이력, 이용 기록 등을 기준으로 환불 가능 여부가 판단됩니다.</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불 가능</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>다운로드/열람 전: 전액 환불 가능</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불 불가</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>다운로드 또는 열람이 확인된 경우</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>부정 이용(무단 배포/공유 등)이 확인된 경우</span>
                        </li>
                      </ul>
                    </div>

                    <div>
                      <p className="text-[13px] sm:text-[15px] font-semibold text-white/90 mb-2">환불 신청 및 처리</p>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>환불은 고객센터/문의 채널을 통해 접수 후 처리됩니다.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-white/30">•</span>
                          <span>접수 후 영업일 기준 3~7일 내 처리될 수 있으며, 결제수단 정책에 따라 반영 시점은 달라질 수 있습니다.</span>
                        </li>
                      </ul>
                    </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* 오른쪽 사이드바 (md 이상에서만 표시) */}
      <aside 
        ref={sidebarPlaceholderRef}
        className="hidden md:block w-[340px] shrink-0"
      >
        {/* 사이드바 콘텐츠 - 스크롤 시 fixed로 전환 */}
        <div
          ref={sidebarContentRef}
          style={
            sidebarStyle.position === "fixed"
              ? {
                  position: "fixed",
                  top: sidebarStyle.top,
                  left: sidebarStyle.left,
                  width: sidebarStyle.width,
                  zIndex: 40,
                }
              : { position: "static" }
          }
          className="rounded-xl overflow-hidden overflow-y-auto max-h-[calc(100vh-var(--unova-fixed-header-offset)-32px)] scrollbar-hide bg-[#161616]"
        >
          {/* 태그 및 제목 */}
          <div className="px-5 pt-5 pb-2">
            {/* 태그 */}
            <div className="flex items-center gap-2 mb-3">
              {displayTags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={`${product.id}-tag-side-${idx}`}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        idx === 0
                          ? "bg-white text-black"
                          : idx === 1
                            ? "bg-[#6376EC] text-white"
                            : "bg-white/[0.06] text-white/90"
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
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
            <div className="mb-3">
              <h3 className="text-[18px] font-bold leading-snug">{product.title}</h3>
            </div>

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
                {reviewCount.toLocaleString("ko-KR")}개 후기
              </button>
            </div>

            {/* 할인 및 가격 */}
            <div>
              {hasBaseProduct ? (
                <div className="flex items-center gap-2">
                  <span className="text-[28px] font-bold">
                    {product.formattedPrice}
                  </span>
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

          {/* "수강 옵션" 제거: 강좌 상세에서는 아래 "추가 강의"가 첫 옵션 섹션이 됩니다. */}

          {/* 추가 강의 (강좌 전용: 관리자에서 선택한 "추가 강의") */}
          {product.type === "course" && addonCourses.length > 0 && (
            <>
              <div className="mx-5 border-t border-white/10" />
              <div className={`px-5 ${selectedAddonCourseIds.size > 0 ? "pb-3 pt-4" : "pb-2 pt-3"}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[14px] font-bold">추가 강의</p>
                </div>

                {addonCourses.map((c) => {
                  const isSelected = selectedAddonCourseIds.has(c.id);
                  const discount = c.originalPrice ? Math.round((1 - c.price / c.originalPrice) * 100) : null;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        const next = new Set(selectedAddonCourseIds);
                        if (isSelected) next.delete(c.id);
                        else next.add(c.id);
                        setSelectedAddonCourseIds(next);
                      }}
                      className={`rounded-lg p-3 mb-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border border-white/20 bg-white/5 ring-2 ring-white/60"
                          : "border border-white/20 hover:border-white/40"
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-[14px] font-medium truncate ${isSelected ? "text-white" : "text-white/70"}`}>
                              {c.title}
                            </p>
                            <div className="shrink-0 text-right">
                              <div className={`text-[12px] font-semibold ${isSelected ? "text-white/90" : "text-white/70"}`}>
                                <span className="text-yellow-200">★</span> {Number(c.rating || 0).toFixed(1)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className={`text-[15px] font-bold ${isSelected ? "text-white" : "text-white/70"}`}>
                              {c.price.toLocaleString("ko-KR")}원
                            </span>
                            {c.originalPrice && (
                              <span className={`text-[12px] line-through ${isSelected ? "text-white/40" : "text-white/30"}`}>
                                {c.originalPrice.toLocaleString("ko-KR")}원
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
                            <span className="ml-auto text-[11px] text-white/50 underline underline-offset-2">
                              {Number(c.reviewCount || 0).toLocaleString("ko-KR")}개 후기
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

          {/* 추가 교재 구매 (강좌/교재 공통) */}
          {relatedProducts.length > 0 && (
            <>
              <div className="mx-5 border-t border-white/10" />
              <div className={`px-5 ${selectedRelatedIds.size > 0 ? "pb-3 pt-4" : "pb-2 pt-3"}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-[14px] font-bold">{product.type === "course" ? "교재 함께 구매" : "추가 교재 구매"}</p>
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
                        if (isSelected) newSet.delete(related.id);
                        else newSet.add(related.id);
                        setSelectedRelatedIds(newSet);
                      }}
                      className={`rounded-lg p-3 mb-2 cursor-pointer transition-all ${
                        isSelected
                          ? "border border-white/20 bg-white/5 ring-2 ring-white/60"
                          : "border border-white/20 hover:border-white/40"
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <p className={`text-[14px] font-medium truncate ${isSelected ? "text-white" : "text-white/70"}`}>
                              {related.title}
                            </p>
                            <div className="shrink-0 text-right">
                              <div className={`text-[12px] font-semibold ${isSelected ? "text-white/90" : "text-white/70"}`}>
                                <span className="text-yellow-200">★</span> {Number(related.rating || 0).toFixed(1)}
                              </div>
                            </div>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className={`text-[15px] font-bold ${isSelected ? "text-white" : "text-white/70"}`}>
                              {related.price.toLocaleString("ko-KR")}원
                            </span>
                            {related.originalPrice && (
                              <span className={`text-[12px] line-through ${isSelected ? "text-white/40" : "text-white/30"}`}>
                                {related.originalPrice.toLocaleString("ko-KR")}원
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
                            <span className="ml-auto text-[11px] text-white/50 underline underline-offset-2">
                              {Number(related.reviewCount || 0).toLocaleString("ko-KR")}개 후기
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
              {/* 강좌: 옵션 바로 아래(=수강 옵션 ↔ 총 결제 금액) 구분선은 제거하되,
                  교재 섹션이 존재할 때는 교재 섹션 ↔ 총 결제 금액 사이를 동일한 divider로 분리 */}
              {showDividerBeforeSummary && <div className="mx-5 border-t border-white/10" />}

              <div className={hasSummaryLinesAboveTotal ? "p-5 pb-0" : "px-5 pt-3 pb-0"}>
                {/* 기본 상품 금액 */}
                {showBaseRow && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-white/90">기본 상품</span>
                    <span className="text-[13px] font-medium">
                      {product.formattedPrice}
                    </span>
                  </div>
                )}
                
                {/* 추가 교재 금액 (선택한 경우에만) */}
                {selectedRelatedIds.size > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-white/90">추가 교재 {selectedRelatedIds.size}개</span>
                    <span className="text-[13px] font-medium text-white">
                      +{additionalAmount.toLocaleString("ko-KR")}원
                    </span>
                  </div>
                )}

                {/* 추가 강의 금액 (선택한 경우에만) */}
                {selectedAddonCourseIds.size > 0 && (
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-white/90">추가 강의 {selectedAddonCourseIds.size}개</span>
                    <span className="text-[13px] font-medium text-white">
                      +{additionalCourseAmount.toLocaleString("ko-KR")}원
                    </span>
                  </div>
                )}

                {/* 총 결제 금액 */}
                <div
                  className={`flex items-center justify-between pt-2 border-t border-white/10 ${
                    hasSummaryLinesAboveTotal ? "" : "mt-0"
                  }`}
                >
                  <span className="text-[12px] font-bold">총 결제 금액</span>
                  <span className="text-[18px] font-bold">{totalAmount.toLocaleString("ko-KR")}원</span>
                </div>
              </div>
            </>
          )}

          {/* 버튼 영역 */}
          <div className={`px-5 ${showPriceBreakdown ? "pt-3 pb-5" : "pt-2 pb-4"}`}>
            <div className="flex gap-3">
              <button 
                onClick={handleToggleLike}
                className="flex flex-col items-center justify-center px-4 py-2 rounded-lg bg-transparent border-0"
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
                <span className="text-[11px] text-white/50 mt-1">{likeCount >= 10000 ? `${(likeCount / 10000).toFixed(1)}만` : likeCount.toLocaleString("ko-KR")}</span>
              </button>
              <a
                onClick={(e) => {
                  e.preventDefault();
                  handleCheckout();
                }}
                href="#"
                className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-[15px] font-bold transition-all ${
                  product.isSoldOut
                    ? "bg-zinc-600 text-white/90 opacity-70 pointer-events-none cursor-not-allowed"
                    : "bg-white text-black hover:bg-white/90"
                } ${isPaying ? "opacity-60 pointer-events-none" : ""}`}
              >
                {product.isSoldOut ? "준비중인 상품입니다" : isPaying ? "결제 준비중..." : checkoutCtaText}
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* 모바일 하단 결제 영역용 여백 (고정 푸터에 가려지지 않도록) */}
      <div className="h-[calc(env(safe-area-inset-bottom)+104px)] md:hidden" />
    </div>

    {/* 모바일 하단 결제 영역 (화면 하단 고정) - 바(bar) 형태로 하단에 완전 밀착 */}
    <div className="fixed inset-x-0 bottom-0 z-50 md:hidden">
      {/* safe-area + 여백 */}
      <div className="mx-auto max-w-6xl bg-[#1c1c1e]/92 backdrop-blur-xl border-t border-white/[0.10] pb-[env(safe-area-inset-bottom)]">
          {/* 선택된 추가 상품 요약 (선택한 게 있을 때만) */}
          {hasAnyAddonSelection && (
            <div className="px-4 py-1.5 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/65">
                  추가 상품 {selectedRelatedIds.size + selectedAddonCourseIds.size}개
                </span>
              </div>
            </div>
          )}

          <div className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              {/* 좋아요 버튼 (터치 타겟만 확보, 배경/테두리는 없음) */}
              <button
                onClick={handleToggleLike}
                className="group flex flex-col items-center justify-center w-11 h-11 rounded-full bg-transparent border-0 shrink-0 transition-transform active:scale-[0.98] active:bg-white/[0.08]"
                aria-label="좋아요"
              >
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill={isLiked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="2"
                  className={isLiked ? "text-red-500" : "text-white/65"}
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span className="text-[8px] text-white/55 mt-0.5">
                  {likeCount >= 10000 ? `${(likeCount / 10000).toFixed(1)}만` : likeCount.toLocaleString("ko-KR")}
                </span>
              </button>

              {/* 추가 상품 버튼 (추가 상품이 있을 때만) */}
              {(relatedProducts.length > 0 || addonCourses.length > 0) && (
                <button
                  onClick={openMobileAddonSheet}
                  className="relative flex flex-col items-center justify-center w-11 h-11 rounded-full bg-transparent border-0 shrink-0 transition-transform active:scale-[0.98] active:bg-white/[0.08]"
                  aria-label="추가 상품 선택"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/65"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[8px] text-white/55 mt-0.5">추가</span>
                  {hasAnyAddonSelection && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {selectedRelatedIds.size + selectedAddonCourseIds.size}
                    </span>
                  )}
                </button>
              )}

              {/* 구매 CTA */}
              <button
                onClick={handleCheckout}
                disabled={isPaying || product.isSoldOut}
                className={`h-11 flex-1 px-6 rounded-xl text-[13px] font-extrabold shadow-[0_8px_24px_rgba(0,0,0,0.30)] transition-[transform,filter] active:scale-[0.99] ${
                  product.isSoldOut
                    ? "bg-zinc-600 text-white/90 opacity-70 cursor-not-allowed"
                    : "bg-white text-black"
                } ${isPaying ? "opacity-60" : product.isSoldOut ? "" : "hover:brightness-[0.96]"}`}
              >
                {product.isSoldOut
                  ? "준비중인 상품입니다"
                  : isPaying
                    ? "준비중..."
                    : hasAnyAddonSelection
                      ? "함께 구매"
                      : product.type === "course"
                        ? "수강신청"
                        : "구매하기"}
              </button>
            </div>
          </div>
      </div>
    </div>

    {/* 모바일 추가 상품 바텀시트 */}
    {mobileAddonSheetMounted && (
      <div className="fixed inset-0 z-[60] md:hidden">
        {/* 배경 오버레이 */}
        <div 
          className={`absolute inset-0 bg-black/55 backdrop-blur-md transition-opacity duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none ${
            mobileAddonSheetOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeMobileAddonSheet}
        />
        
        {/* 바텀시트 컨테이너 */}
        <div
          className={`absolute bottom-0 left-0 right-0 max-h-[85vh] flex flex-col safe-area-bottom transform-gpu will-change-transform transition-[transform,opacity] duration-300 ease-[cubic-bezier(.2,.9,.2,1)] motion-reduce:transition-none ${
            mobileAddonSheetOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          {/* iOS 다크 시트 느낌: 블러 + 헤어라인 + 라운드 */}
          <div className="mx-0 bg-[#1c1c1e]/85 backdrop-blur-2xl rounded-t-[28px] border-t border-white/[0.08] shadow-[0_-14px_50px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* 핸들 바 */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1.5 rounded-full bg-white/20" />
          </div>
          
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-white/[0.08]">
            <h3 className="text-[17px] font-semibold tracking-[-0.01em]">추가 상품 선택</h3>
            <button 
              onClick={closeMobileAddonSheet}
              className="w-9 h-9 rounded-full bg-white/[0.08] text-white/80 flex items-center justify-center transition-colors active:bg-white/[0.14]"
              aria-label="닫기"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* 컨텐츠 영역 (스크롤) */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 추가 교재 섹션 */}
            {relatedProducts.length > 0 && (
              <div className="mb-6">
                <p className="text-[13px] font-semibold text-white/60 mb-3 tracking-[-0.01em]">
                  {product.type === "course" ? "교재 함께 구매" : "추가 교재"}
                </p>
                <div className="space-y-2">
                  {relatedProducts.map((related) => {
                    const isSelected = selectedRelatedIds.has(related.id);
                    return (
                      <button
                        key={related.id}
                        onClick={() => {
                          const newSet = new Set(selectedRelatedIds);
                          if (isSelected) newSet.delete(related.id);
                          else newSet.add(related.id);
                          setSelectedRelatedIds(newSet);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                          isSelected
                            ? "border-white/[0.14] bg-white/[0.08]"
                            : "border-white/[0.08] bg-white/[0.03] active:bg-white/[0.08]"
                        }`}
                      >
                        {/* 체크박스 */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-[#0A84FF] bg-[#0A84FF]" : "border-white/25"
                        }`}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        
                        {/* 썸네일 */}
                        <div className="w-12 h-12 rounded-xl bg-white/[0.06] overflow-hidden shrink-0">
                          {related.thumbnailUrl ? (
                            <img
                              src={`/api/textbooks/${related.id}/thumbnail`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* 상품 정보 */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-medium text-white truncate tracking-[-0.01em]">{related.title}</p>
                          <p className="text-[12px] text-white/55">{related.teacher}</p>
                        </div>
                        
                        {/* 가격 */}
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold text-white">
                            {related.price.toLocaleString("ko-KR")}원
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* 추가 강의 섹션 */}
            {addonCourses.length > 0 && (
              <div className="mb-6">
                <p className="text-[13px] font-semibold text-white/60 mb-3 tracking-[-0.01em]">추가 강의</p>
                <div className="space-y-2">
                  {addonCourses.map((course) => {
                    const isSelected = selectedAddonCourseIds.has(course.id);
                    return (
                      <button
                        key={course.id}
                        onClick={() => {
                          const newSet = new Set(selectedAddonCourseIds);
                          if (isSelected) newSet.delete(course.id);
                          else newSet.add(course.id);
                          setSelectedAddonCourseIds(newSet);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                          isSelected
                            ? "border-white/[0.14] bg-white/[0.08]"
                            : "border-white/[0.08] bg-white/[0.03] active:bg-white/[0.08]"
                        }`}
                      >
                        {/* 체크박스 */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-[#0A84FF] bg-[#0A84FF]" : "border-white/25"
                        }`}>
                          {isSelected && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        
                        {/* 썸네일 */}
                        <div className="w-12 h-12 rounded-xl bg-white/[0.06] overflow-hidden shrink-0">
                          {course.thumbnailUrl ? (
                            <img
                              src={`/api/courses/${course.id}/thumbnail`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {/* 상품 정보 */}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[13px] font-medium text-white truncate tracking-[-0.01em]">{course.title}</p>
                          <p className="text-[12px] text-white/55">{course.teacher}</p>
                        </div>
                        
                        {/* 가격 */}
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-semibold text-white">
                            {course.price.toLocaleString("ko-KR")}원
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* 하단 고정 영역 */}
          <div className="border-t border-white/[0.08] px-5 py-4 bg-[#1c1c1e]/70 backdrop-blur-2xl">
            {/* 선택 요약 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[12px] text-white/50">기본 상품</span>
                <span className="text-[13px] text-white ml-2">{hasBaseProduct ? product.formattedPrice : "0원"}</span>
              </div>
              {hasAnyAddonSelection && (
                <div>
                  <span className="text-[12px] text-white/50">추가 상품</span>
                  <span className="text-[13px] text-white/85 ml-2">
                    +{(additionalAmount + additionalCourseAmount).toLocaleString("ko-KR")}원
                  </span>
                </div>
              )}
            </div>
            
            {/* 총 금액 및 버튼 */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-[11px] text-white/50">총 결제 금액</p>
                <p className="text-[20px] font-extrabold text-white tracking-[-0.01em]">{totalAmount.toLocaleString("ko-KR")}원</p>
              </div>
              <button
                onClick={() => {
                  closeMobileAddonSheet();
                }}
                className="h-12 px-7 rounded-full bg-white text-black text-[15px] font-extrabold shadow-[0_8px_24px_rgba(0,0,0,0.30)] transition-[transform,filter] active:scale-[0.99] hover:brightness-[0.96]"
              >
                선택 완료
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    )}

    {/* 토스 기본 결제창(standard) 호출로 변경되어, 내부 위젯 모달은 사용하지 않습니다. */}

    {/* 후기 작성 모달 */}
    {isReviewWriteModalOpen && (
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) closeReviewWriteModal();
        }}
      >
        <div className="relative w-full max-w-[560px] animate-in fade-in zoom-in-95 duration-200">
          <div className="rounded-2xl border border-white/10 bg-[#161616] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-[16px] font-semibold tracking-[-0.02em] text-white">후기 작성</p>
              </div>
              <button
                type="button"
                onClick={closeReviewWriteModal}
                className="inline-flex items-center justify-center rounded-lg p-2 text-white/70 hover:bg-white/[0.08] hover:text-white"
                aria-label="닫기"
              >
                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                  close
                </span>
              </button>
            </div>

            <div className="p-5">
              {reviewError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-200">
                  {reviewError}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
                {/* 작성자 표시: 데스크톱에서 평점 왼쪽 영역 */}
                <div className="hidden sm:block">
                  <p className="text-[12px] font-medium text-white/60">작성자</p>
                  <p className="mt-2 text-[13px] font-semibold text-white/80">
                    {meUser?.email || "—"}
                  </p>
                  {meUser?.name ? (
                    <p className="mt-1 text-[11px] text-white/40">{meUser.name}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-white/60">평점</label>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewFormRating(star)}
                          className={`text-[22px] leading-none ${
                            star <= reviewFormRating ? "text-yellow-200" : "text-white/15"
                          }`}
                          aria-label={`${star}점`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <span className="text-[13px] font-semibold text-white/70">{reviewFormRating}.0</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[12px] font-medium text-white/60">사진 첨부</label>
                <p className="mt-1 text-[11px] text-white/40">선택 · 최대 5장</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {reviewImagePreviews.map((preview, idx) => (
                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10">
                      <img src={preview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 rounded-lg border border-white/15 bg-black/60 px-2 py-1 text-[12px] text-white/80 hover:bg-black/80"
                        aria-label="이미지 제거"
                      >
                        삭제
                      </button>
                    </div>
                  ))}

                  {reviewFormImages.length < 5 && (
                    <label className="w-20 h-20 rounded-xl border border-white/10 flex items-center justify-center cursor-pointer hover:border-white/25 transition-colors">
                      <span className="text-[12px] text-white/60">추가</span>
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

              <div className="mt-4">
                <label className="block text-[12px] font-medium text-white/60">상세 후기</label>
                <div className="relative mt-2">
                  <textarea
                    value={reviewFormContent}
                    onChange={(e) => setReviewFormContent(e.target.value)}
                    placeholder={`${product.type === "textbook" ? "교재" : "강의"}에 대한 솔직한 후기를 작성해주세요. (최소 10자)`}
                    rows={5}
                    className="w-full resize-none rounded-xl border border-white/10 bg-transparent px-4 py-3 pb-16 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview || reviewFormContent.length < 10}
                    className="absolute bottom-4 right-3 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold text-black hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReview ? "등록 중..." : "등록하기"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-white/40">{reviewFormContent.length}자 / 최소 10자</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

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
                <p className="text-[13px] text-white/60 truncate">{shareUrlPreview}</p>
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

    {/* 포토 모달 */}
    {photoModalUrl && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setPhotoModalUrl(null);
        }}
      >
        <div className="relative w-full max-w-3xl">
          <button
            type="button"
            onClick={() => setPhotoModalUrl(null)}
            className="absolute -top-10 right-0 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[12px] text-white/80 hover:bg-white/15"
          >
            닫기
          </button>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <img src={photoModalUrl} alt="" className="max-h-[80vh] w-full object-contain" />
          </div>
        </div>
      </div>
    )}

    {/* 신고 모달(간단) */}
    {reportTargetId && (
      <div
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) setReportTargetId(null);
        }}
      >
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1c] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-white">리뷰 신고</p>
            <button
              type="button"
              onClick={() => setReportTargetId(null)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/70 hover:bg-white/[0.08]"
            >
              닫기
            </button>
          </div>
          <p className="mt-2 text-[13px] text-white/50">
            해당 리뷰를 신고하시겠습니까? 사유를 선택하면 접수됩니다.
          </p>
          <div className="mt-4 space-y-2">
            {["광고/스팸", "욕설/비방", "개인정보 노출", "기타"].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => {
                  if (!reportTargetId) return;
                  handleSubmitReport(reportTargetId, reason);
                }}
                disabled={isReporting}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left text-[13px] text-white/80 hover:bg-white/[0.06] disabled:opacity-60"
              >
                {reason}
              </button>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* 신고 토스트 */}
    {reportToast ? (
      <div className="fixed inset-x-0 bottom-6 z-[95] flex justify-center px-4">
        <div className="rounded-full border border-white/10 bg-black/70 px-4 py-2 text-[13px] text-white/90">
          {reportToast}
        </div>
      </div>
    ) : null}

    </>
  );
}
