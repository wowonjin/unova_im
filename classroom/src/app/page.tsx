import Image from "next/image";
import Link from "next/link";
import LandingHeader from "./_components/LandingHeader";
import HeroCarousel from "./_components/HeroCarousel";
import ShortcutNav from "./_components/ShortcutNav";
import ScrollProgress from "./_components/ScrollProgress";
import FloatingKakaoButton from "./_components/FloatingKakaoButton";

export const dynamic = "force-dynamic";

// 상품 타입 정의
interface Product {
  href: string;
  image: string;
  title: string;
  price: number;
  originalPrice?: number;
  sale?: boolean;
  soldout?: boolean;
}

// 상품 데이터
const mathProducts: Product[] = [
  { href: "https://unova.co.kr/223", image: "https://cdn.imweb.me/thumbnail/20250515/fd2b64b2fd71b.png", title: "CONNECT 수학I+수학II+확률과통계 (책+PDF)", price: 105000 },
  { href: "https://unova.co.kr/224", image: "https://cdn.imweb.me/thumbnail/20250515/fd2b64b2fd71b.png", title: "CONNECT 수학I+수학II+미적분 (책+PDF)", price: 95000, originalPrice: 105000 },
  { href: "https://unova.co.kr/225", image: "https://cdn.imweb.me/thumbnail/20250515/fd2b64b2fd71b.png", title: "CONNECT 확률과 통계 (책+PDF)", price: 35000 },
  { href: "https://unova.co.kr/226", image: "https://cdn.imweb.me/thumbnail/20250515/fd2b64b2fd71b.png", title: "CONNECT 미적분 (책+PDF)", price: 35000 },
  { href: "https://unova.co.kr/227", image: "https://cdn.imweb.me/thumbnail/20250515/fd2b64b2fd71b.png", title: "CONNECT 수학II (책+PDF)", price: 35000 },
];

const physics1Products: Product[] = [
  { href: "https://unova.co.kr/physics1pdf", image: "https://cdn.imweb.me/thumbnail/20250515/c5e7e1f7d8a12.png", title: "CONNECT 물리학I 역학+비역학 (책+PDF)", price: 65000, originalPrice: 76000 },
  { href: "https://unova.co.kr/physics1-1", image: "https://cdn.imweb.me/thumbnail/20250515/c5e7e1f7d8a12.png", title: "CONNECT 물리학I 역학 (책+PDF)", price: 35000, originalPrice: 38000 },
  { href: "https://unova.co.kr/physics1-2", image: "https://cdn.imweb.me/thumbnail/20250515/c5e7e1f7d8a12.png", title: "CONNECT 물리학I 비역학 (책+PDF)", price: 35000, originalPrice: 38000 },
];

const physics2Products: Product[] = [
  { href: "https://unova.co.kr/physics2pdf", image: "https://cdn.imweb.me/thumbnail/20250515/a1b2c3d4e5f6.png", title: "CONNECT 물리학II 역학+비역학 (책+PDF)", price: 70000, originalPrice: 80000 },
  { href: "https://unova.co.kr/physics2-1", image: "https://cdn.imweb.me/thumbnail/20250515/a1b2c3d4e5f6.png", title: "CONNECT 물리학II 역학 (책+PDF)", price: 38000, originalPrice: 40000 },
  { href: "https://unova.co.kr/physics2-2", image: "https://cdn.imweb.me/thumbnail/20250515/a1b2c3d4e5f6.png", title: "CONNECT 물리학II 비역학 (책+PDF)", price: 38000, originalPrice: 40000 },
];

const baekLectures: Product[] = [
  { href: "https://unova.co.kr/baek-all", image: "https://cdn.imweb.me/thumbnail/20250515/baek1.png", title: "CONNECT 수학1+수학2+미적분 강의", price: 220000 },
  { href: "https://unova.co.kr/baek-calc", image: "https://cdn.imweb.me/thumbnail/20250515/baek2.png", title: "CONNECT 미적분 강의 [백하욱T]", price: 90000 },
  { href: "https://unova.co.kr/baek-math2", image: "https://cdn.imweb.me/thumbnail/20250515/baek3.png", title: "CONNECT 수학2 강의 [백하욱T]", price: 80000 },
  { href: "https://unova.co.kr/baek-math1", image: "https://cdn.imweb.me/thumbnail/20250515/baek4.png", title: "CONNECT 수학1 강의 [백하욱T]", price: 80000 },
];

const jangLectures: Product[] = [
  { href: "https://unova.co.kr/jjw-all", image: "https://cdn.imweb.me/thumbnail/20250515/jjw1.png", title: "CONNECT 물리학II 전체강의", price: 250000, originalPrice: 300000 },
  { href: "https://unova.co.kr/jjw-mech", image: "https://cdn.imweb.me/thumbnail/20250515/jjw2.png", title: "CONNECT 물리학II 역학 강의", price: 150000 },
  { href: "https://unova.co.kr/jjw-nonmech", image: "https://cdn.imweb.me/thumbnail/20250515/jjw3.png", title: "CONNECT 물리학II 비역학 강의", price: 150000 },
];

const calculusProducts: Product[] = [
  { href: "https://unova.co.kr/calc-full", image: "https://cdn.imweb.me/thumbnail/20250515/calc1.png", title: "미적분학 풀 교재 (7권)", price: 125000, originalPrice: 140000 },
  { href: "https://unova.co.kr/calc-adv", image: "https://cdn.imweb.me/thumbnail/20250515/calc2.png", title: "고급미적분편 (5권. 급수, 6권. 편도함수, 7권. 중적분)", price: 60000 },
  { href: "https://unova.co.kr/calc-int", image: "https://cdn.imweb.me/thumbnail/20250515/calc3.png", title: "적분편 (3권. 적분학I, 4권. 적분학II)", price: 40000 },
  { href: "https://unova.co.kr/calc-intro", image: "https://cdn.imweb.me/thumbnail/20250515/calc4.png", title: "입문편 (1권. 극한과 연속, 2권. 미분)", price: 38000 },
];

const collegePhysicsProducts: Product[] = [
  { href: "https://unova.co.kr/cphys-full", image: "https://cdn.imweb.me/thumbnail/20250515/cphys1.png", title: "대학 물리학 풀 교재 (5권)", price: 99000, originalPrice: 110000 },
  { href: "https://unova.co.kr/cphys-wave", image: "https://cdn.imweb.me/thumbnail/20250515/cphys2.png", title: "파동 (4권. 파동과 광학, 5권. 현대물리)", price: 40000 },
  { href: "https://unova.co.kr/cphys-em", image: "https://cdn.imweb.me/thumbnail/20250515/cphys3.png", title: "전자기학 (3권. 전자기학)", price: 30000 },
  { href: "https://unova.co.kr/cphys-mech", image: "https://cdn.imweb.me/thumbnail/20250515/cphys4.png", title: "고전역학 (1권. 역학, 2권. 열역학+유체역학)", price: 40000 },
];

const yonseiProducts: Product[] = [
  { href: "https://unova.co.kr/yonsei-full", image: "https://cdn.imweb.me/thumbnail/20250515/yonsei1.png", title: "연세대학교 수학+물리 풀세트", price: 179000, originalPrice: 186000, sale: true, soldout: true },
  { href: "https://unova.co.kr/yonsei-math", image: "https://cdn.imweb.me/thumbnail/20250515/yonsei2.png", title: "연세대학교 편입 수학 해설 (2004~2025년)", price: 110000, soldout: true },
  { href: "https://unova.co.kr/yonsei-phys", image: "https://cdn.imweb.me/thumbnail/20250515/yonsei3.png", title: "연세대학교 편입 물리 해설 (2011~2025년)", price: 75000 },
];

const koreaProducts: Product[] = [
  { href: "https://unova.co.kr/korea-full", image: "https://cdn.imweb.me/thumbnail/20250515/korea1.png", title: "고려대학교 수학+물리 풀세트", price: 93000, originalPrice: 96000, sale: true },
  { href: "https://unova.co.kr/korea-phys", image: "https://cdn.imweb.me/thumbnail/20250515/korea2.png", title: "고려대학교 편입 물리 해설 (2018~2025년)", price: 48000 },
  { href: "https://unova.co.kr/korea-math", image: "https://cdn.imweb.me/thumbnail/20250515/korea3.png", title: "고려대학교 편입 수학 해설 [+수학과] (2018~2025년)", price: 48000 },
];

const cauProducts: Product[] = [
  { href: "https://unova.co.kr/cau-phys", image: "https://cdn.imweb.me/thumbnail/20250515/cau1.png", title: "중앙대학교 편입 물리 해설 (2015~2025년)", price: 100000 },
];

export default async function HomePage() {
  return (
    <div className="min-h-screen bg-[#161616] text-white overflow-x-hidden">
      {/* Scroll Progress Bar */}
      <ScrollProgress />

      {/* Floating Kakao Button */}
      <FloatingKakaoButton />

      {/* Navigation */}
      <LandingHeader />

      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Shortcut Navigation */}
      <ShortcutNav />

      {/* 📖 2027 수능 대비 CONNECT */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <h2 className="text-[26px] font-bold text-white">
          📖 2027 수능 대비 CONNECT
        </h2>
        
        {/* CONNECT 수학 */}
        <ProductSection title="| CONNECT 수학" products={mathProducts} />
        
        {/* CONNECT 물리학I */}
        <ProductSection title="| CONNECT 물리학I" products={physics1Products} />
        
        {/* CONNECT 물리학II (전자책) */}
        <ProductSection title="| CONNECT 물리학II (전자책)" products={physics2Products} />
      </section>

      {/* 🤟 지금 가장 주목받는 강의 */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-[26px] font-bold text-white">
          🤟 지금 가장 주목받는 강의
        </h2>
        
        {/* 백하욱 선생님 */}
        <ProductSection title="| 백하욱 선생님" products={baekLectures} />
        
        {/* 장진우 선생님 */}
        <ProductSection title="| 장진우 선생님" products={jangLectures} />
        </section>

      {/* ✈️ 연세대·고려대 편입 교재 */}
      <section className="mx-auto max-w-6xl px-4 pt-16">
        <h2 className="text-[26px] font-bold text-white">
          ✈️ 연세대·고려대 편입 교재
        </h2>
        
        {/* 미적분학 (전자책) */}
        <ProductSection title="| 미적분학 (전자책)" products={calculusProducts} />
        
        {/* 대학 물리학 (전자책) */}
        <ProductSection title="| 대학 물리학 (전자책)" products={collegePhysicsProducts} />
        
        {/* 연세대학교 편입 기출 (전자책) */}
        <ProductSection title="| 연세대학교 편입 기출 (전자책)" products={yonseiProducts} />
        
        {/* 고려대학교 편입 기출 (전자책) */}
        <ProductSection title="| 고려대학교 편입 기출 (전자책)" products={koreaProducts} />
        </section>

      {/* 💼 인서울 편입 교재 */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20">
        <h2 className="text-[26px] font-bold text-white">
          💼 인서울 편입 교재
          </h2>
        
        {/* 중앙대학교 편입 기출 (전자책) */}
        <ProductSection title="| 중앙대학교 편입 기출 (전자책)" products={cauProducts} />
      </section>

      {/* Footer */}
      <footer className="bg-[#131313] pt-16 pb-12">
        <div className="mx-auto max-w-6xl px-4">
          {/* 상단 4열 구조 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
            {/* 로고 및 설명 */}
            <div className="md:col-span-1">
              <Image
                src="/unova-logo.png"
                alt="UNOVA"
                width={120}
                height={24}
                className="h-5 w-auto"
              />
              <p className="mt-6 text-[14px] text-white/50 leading-relaxed">
                당신이 노바가 될 수 있도록,<br />
                가장 실전적인 지식을 제공합니다
              </p>
            </div>

            {/* 서비스 */}
              <div>
              <p className="font-bold text-white mb-4">서비스</p>
              <ul className="space-y-2.5 text-[14px] text-white/50">
                  <li>
                  <Link href="https://unova.co.kr" target="_blank" className="hover:text-white transition-colors">
                    구매하기
                  </Link>
                </li>
                <li>
                  <Link href="https://unova.co.kr" target="_blank" className="hover:text-white transition-colors">
                    이벤트
                    </Link>
                  </li>
                  <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    나의 컨텐츠
                    </Link>
                  </li>
                </ul>
              </div>

            {/* 고객지원 */}
              <div>
              <p className="font-bold text-white mb-4">고객지원</p>
              <ul className="space-y-2.5 text-[14px] text-white/50">
                  <li>
                  <Link href="/notices" className="hover:text-white transition-colors">
                    강의 / 결제 공지사항
                    </Link>
                  </li>
                  <li>
                  <a href="https://unova.co.kr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="https://unova.co.kr" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    개인정보처리방침
                    </a>
                  </li>
                </ul>
              </div>

            {/* SNS */}
              <div>
              <p className="font-bold text-white mb-4">SNS</p>
              <ul className="space-y-2.5 text-[14px] text-white/50">
                  <li>
                    <a
                      href="https://www.instagram.com/unova_edu"
                      target="_blank"
                      rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                    >
                      인스타그램
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.youtube.com/@unova_edu"
                      target="_blank"
                      rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                    >
                      유튜브
                    </a>
                  </li>
                <li>
                  <a
                    href="https://unova.co.kr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    채용 공고
                    </a>
                  </li>
                </ul>
            </div>
          </div>

          {/* 구분선 */}
          <div className="mt-12 pt-8 border-t border-white/10">
            {/* 사업자 정보 */}
            <div className="text-[13px] text-white/40 leading-relaxed">
              <p>
                상호 : 유노바 · 대표 : 장진우 · 개인정보책임관리자 : 장진우 · 사업자등록번호 : 259-40-01233 · <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2594001233" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">사업자정보확인</a> · 소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호 a411 · TEL : 050-6678-6390
              </p>
              <p className="mt-1">
                이메일 : unova.team.cs@gmail.com · 운영시간 : 평일 13:00~21:00, 토요일 13:00~18:00, 일요일 휴무 · 통신판매업 신고번호 : 2024-서울강남-06080
              </p>
            </div>

            {/* 저작권 */}
            <p className="mt-6 text-[13px] text-white/40">
              COPYRIGHT 2024. UNOVA. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// 상품 섹션 컴포넌트
function ProductSection({ title, products }: { title: string; products: Product[] }) {
  return (
    <div className="mt-6">
      <h3 className="text-[18px] font-bold text-white mb-4">{title}</h3>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {products.map((product, idx) => (
          <ProductCard key={idx} product={product} />
        ))}
      </div>
    </div>
  );
}

// 상품 카드 컴포넌트
function ProductCard({ product }: { product: Product }) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("ko-KR").format(price) + "원";
  };

  return (
    <a
      href={product.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex-shrink-0 w-[200px] sm:w-[220px]"
    >
      {/* 이미지 */}
      <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-[#222] mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        {/* 배지 */}
        {(product.sale || product.soldout) && (
          <div className="absolute bottom-2 left-2 flex gap-1">
            {product.sale && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded">
                SALE
              </span>
            )}
            {product.soldout && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-gray-500 text-white rounded border border-gray-400">
                SOLDOUT
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* 제목 */}
      <div className="flex items-start gap-1.5 mb-2">
        <span className="inline-block w-4 h-4 mt-0.5 rounded-sm bg-blue-500 flex-shrink-0" />
        <h4 className="text-[13px] sm:text-[14px] font-medium text-white leading-tight line-clamp-2">
          {product.title}
        </h4>
      </div>
      
      {/* 가격 */}
      <div className="flex items-center gap-2">
        <span className="text-[15px] font-bold text-white">
          {formatPrice(product.price)}
        </span>
        {product.originalPrice && (
          <span className="text-[13px] text-white/40 line-through">
            {formatPrice(product.originalPrice)}
          </span>
        )}
      </div>
    </a>
  );
}

