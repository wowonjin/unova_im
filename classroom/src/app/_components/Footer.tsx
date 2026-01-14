import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#131313] pt-16 pb-12">
      <div className="mx-auto max-w-6xl px-4">
        {/* 모바일 푸터 (PC는 기존 그대로 유지) */}
        <div className="md:hidden">
          {/* 로고 및 설명 */}
          <div>
            <Image src="/unova-logo.png" alt="UNOVA" width={120} height={24} className="h-5 w-auto" />
            <p className="mt-5 text-[12px] text-white/50 leading-relaxed">
              당신이 노바가 될 수 있도록,<br />
              가장 실전적인 지식을 제공합니다
            </p>
          </div>

          {/* 3열 메뉴 */}
          <div className="mt-8 grid grid-cols-3 gap-x-5 gap-y-8">
            <div>
              <p className="font-bold text-white mb-3 text-[13px]">서비스</p>
              <ul className="space-y-2 text-[12px] text-white/50">
                <li>
                  <Link href="/books" className="hover:text-white transition-colors">
                    책 구매
                  </Link>
                </li>
                <li>
                  <Link href="/lectures" className="hover:text-white transition-colors">
                    강의 구매
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-white transition-colors">
                    나의 강의실
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white mb-3 text-[13px]">고객지원</p>
              <ul className="space-y-2 text-[11px] text-white/50">
                <li>
                  <Link href="/notices" className="hover:text-white transition-colors whitespace-nowrap tracking-tight">
                    강의/결제 공지사항
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors whitespace-nowrap tracking-tight">
                    개인정보처리방침
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-white mb-3 text-[13px]">SNS</p>
              <ul className="space-y-2 text-[12px] text-white/50">
                <li>
                  <a
                    href="https://www.instagram.com/unova_study/"
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
                  <Link href="/teachers" className="hover:text-white transition-colors">
                    유노바 선생님
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* 상단 4열 구조 - PC(현재 상태 유지) */}
        <div className="hidden md:grid md:grid-cols-4 gap-10 md:gap-8">
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
                <Link href="/books" className="hover:text-white transition-colors">
                  책 구매
                </Link>
              </li>
              <li>
                <Link href="/lectures" className="hover:text-white transition-colors">
                  강의 구매
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  나의 강의실
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
                <Link href="/terms" className="hover:text-white transition-colors">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>

          {/* SNS */}
          <div>
            <p className="font-bold text-white mb-4">SNS</p>
            <ul className="space-y-2.5 text-[14px] text-white/50">
              <li>
                <a
                  href="https://www.instagram.com/unova_study/"
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
                <Link href="/teachers" className="hover:text-white transition-colors">
                  유노바 선생님
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 구분선 */}
        <div className="mt-12 pt-8 border-t border-white/10">
          {/* 사업자 정보 - PC에서는 한 줄로, 모바일에서는 세로 배열 */}
          <div className="text-white/40 leading-relaxed md:text-[13px] text-[11px]">
            {/* PC 버전 - 한 줄로 표시 */}
            <div className="hidden md:block">
              <p>
                상호 : 유노바 · 대표 : 장진우 · 개인정보책임관리자 : 장진우 · 사업자등록번호 : 259-40-01233 · <a href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2594001233" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">사업자정보확인</a> · 소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호 a411 · TEL : 050-6678-6390
              </p>
              <p className="mt-1">
                이메일 : unova.team.cs@gmail.com · 운영시간 : 평일 13:00~21:00, 토요일 13:00~18:00, 일요일 휴무 · 통신판매업 신고번호 : 2024-서울강남-06080
              </p>
            </div>
            {/* 모바일 버전 - 세로 배열 */}
            <div className="md:hidden space-y-1.5">
              <p>상호 : 유노바</p>
              <p>대표 : 장진우</p>
              <p>개인정보책임관리자 : 장진우</p>
              <p>
                사업자등록번호 : 259-40-01233 ·{" "}
                <a
                  href="https://www.ftc.go.kr/bizCommPop.do?wrkr_no=2594001233"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                >
                  사업자정보확인
                </a>
              </p>
              <p>소재지 : 서울특별시 강남구 학동로 24길 20, 4층 402호 a411</p>
              <p>TEL : 050-6678-6390</p>
              <p>이메일 : unova.team.cs@gmail.com</p>
              <p>운영시간 : 평일 13:00~21:00, 토요일 13:00~18:00, 일요일 휴무</p>
              <p>통신판매업 신고번호 : 2024-서울강남-06080</p>
            </div>
          </div>

          {/* 저작권 */}
          <p className="mt-6 text-white/40 md:text-[13px] text-[11px]">
            COPYRIGHT 2024. UNOVA. ALL RIGHTS RESERVED.
          </p>
        </div>
      </div>
    </footer>
  );
}
