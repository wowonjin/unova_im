import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 유노바",
  description: "유노바 개인정보처리방침입니다.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 pt-[70px]">
        {/* 히어로 섹션 */}
        <section className="py-10 md:py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-[28px] md:text-[40px] font-bold tracking-[-0.02em]">개인정보처리방침</h1>
            <p className="mt-3 text-[14px] md:text-[16px] text-white/50">유노바 개인정보 보호정책</p>
          </div>
        </section>

        {/* 본문 */}
        <section className="pb-24">
          <div className="mx-auto max-w-4xl px-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-10">
              <article className="space-y-10 text-[14px] md:text-[15px] leading-[1.9] text-white/85">

                {/* 서문 */}
                <section>
                  <p>
                    유노바(이하 "회사")는 「개인정보 보호법」에 따라 이용자의 개인정보 보호 및 권익을 보호하고 
                    개인정보와 관련한 이용자의 고충을 원활하게 처리할 수 있도록 다음과 같은 처리방침을 두고 있습니다.
                  </p>
                </section>

                {/* 제1조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제1조 (개인정보의 수집 및 이용목적)</h2>
                  <p className="mb-4">회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
                  <ol className="list-decimal pl-5 space-y-4">
                    <li>
                      <strong className="text-white">회원가입 및 관리</strong>
                      <p className="text-white/70 mt-1">회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적으로 개인정보를 처리합니다.</p>
                    </li>
                    <li>
                      <strong className="text-white">서비스 제공</strong>
                      <p className="text-white/70 mt-1">콘텐츠 제공, 맞춤서비스 제공, 본인인증, 구매 및 요금결제, 물품배송 또는 청구지 등 발송 목적으로 개인정보를 처리합니다.</p>
                    </li>
                    <li>
                      <strong className="text-white">마케팅 및 광고에의 활용</strong>
                      <p className="text-white/70 mt-1">신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 서비스의 유효성 확인, 접속빈도 파악 또는 회원의 서비스 이용에 대한 통계 등을 목적으로 개인정보를 처리합니다.</p>
                    </li>
                  </ol>
                </section>

                {/* 제2조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제2조 (수집하는 개인정보 항목)</h2>
                  <p className="mb-4">회사는 서비스 제공을 위해 필요한 최소한의 개인정보만을 수집합니다.</p>
                  
                  <div className="space-y-4">
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <h3 className="font-semibold text-white mb-2">필수항목</h3>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        <li>이메일 주소</li>
                        <li>비밀번호</li>
                        <li>이름</li>
                        <li>연락처(휴대전화번호)</li>
                      </ul>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <h3 className="font-semibold text-white mb-2">선택항목</h3>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        <li>프로필 사진</li>
                        <li>주소(교재 배송 시)</li>
                      </ul>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <h3 className="font-semibold text-white mb-2">서비스 이용 과정에서 자동 수집되는 정보</h3>
                      <ul className="list-disc pl-5 space-y-1 text-white/70">
                        <li>IP 주소</li>
                        <li>쿠키</li>
                        <li>방문 일시</li>
                        <li>서비스 이용 기록</li>
                        <li>기기 정보(브라우저 종류, OS 등)</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* 제3조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제3조 (개인정보의 보유 및 이용기간)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
                    <li>각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li><strong className="text-white/90">회원가입 정보:</strong> 회원 탈퇴 시까지 (단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간까지)</li>
                        <li><strong className="text-white/90">계약 또는 청약철회 등에 관한 기록:</strong> 5년</li>
                        <li><strong className="text-white/90">대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년</li>
                        <li><strong className="text-white/90">소비자의 불만 또는 분쟁처리에 관한 기록:</strong> 3년</li>
                        <li><strong className="text-white/90">접속에 관한 기록:</strong> 3개월</li>
                      </ul>
                    </li>
                  </ol>
                </section>

                {/* 제4조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제4조 (개인정보의 제3자 제공)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 이용자의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</li>
                    <li>회사는 다음과 같이 개인정보를 제3자에게 제공하고 있습니다.
                      <div className="mt-3 rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                        <p><strong className="text-white">결제 서비스</strong></p>
                        <ul className="list-disc pl-5 mt-2 space-y-1 text-white/70">
                          <li>제공받는 자: 토스페이먼츠</li>
                          <li>제공 목적: 결제 처리</li>
                          <li>제공 항목: 결제 정보(카드정보, 계좌정보 등)</li>
                          <li>보유 기간: 결제 완료 후 5년</li>
                        </ul>
                      </div>
                    </li>
                  </ol>
                </section>

                {/* 제5조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제5조 (개인정보처리의 위탁)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
                      <div className="mt-3 space-y-3">
                        <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                          <p><strong className="text-white">택배/배송 서비스</strong></p>
                          <ul className="list-disc pl-5 mt-2 space-y-1 text-white/70">
                            <li>수탁업체: CJ대한통운, 로젠택배 등</li>
                            <li>위탁 업무: 교재 배송</li>
                          </ul>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                          <p><strong className="text-white">결제 처리</strong></p>
                          <ul className="list-disc pl-5 mt-2 space-y-1 text-white/70">
                            <li>수탁업체: 토스페이먼츠</li>
                            <li>위탁 업무: 결제 및 환불 처리</li>
                          </ul>
                        </div>
                      </div>
                    </li>
                    <li>회사는 위탁계약 체결 시 「개인정보 보호법」에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</li>
                  </ol>
                </section>

                {/* 제6조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제6조 (정보주체의 권리·의무 및 행사방법)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li>개인정보 열람 요구</li>
                        <li>오류 등이 있을 경우 정정 요구</li>
                        <li>삭제 요구</li>
                        <li>처리정지 요구</li>
                      </ul>
                    </li>
                    <li>제1항에 따른 권리 행사는 회사에 대해 서면, 전화, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</li>
                    <li>정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</li>
                  </ol>
                </section>

                {/* 제7조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제7조 (개인정보의 파기)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</li>
                    <li>정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리목적이 달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.</li>
                    <li>개인정보 파기의 절차 및 방법은 다음과 같습니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li><strong className="text-white/90">파기절차:</strong> 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
                        <li><strong className="text-white/90">파기방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.</li>
                      </ul>
                    </li>
                  </ol>
                </section>

                {/* 제8조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제8조 (개인정보의 안전성 확보조치)</h2>
                  <p className="mb-4">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li><strong className="text-white">관리적 조치:</strong> 내부관리계획 수립·시행, 정기적 직원 교육 등</li>
                    <li><strong className="text-white">기술적 조치:</strong> 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치</li>
                    <li><strong className="text-white">물리적 조치:</strong> 전산실, 자료보관실 등의 접근통제</li>
                  </ol>
                </section>

                {/* 제9조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제9조 (쿠키의 운용 및 거부)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.</li>
                    <li>쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자의 PC 컴퓨터 내의 하드디스크에 저장되기도 합니다.</li>
                    <li>이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저 옵션 설정을 통해 쿠키 허용, 쿠키 차단 등의 설정을 할 수 있습니다.</li>
                    <li>쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 발생할 수 있습니다.</li>
                  </ol>
                </section>

                {/* 제10조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제10조 (개인정보 보호책임자)</h2>
                  <p className="mb-4">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
                  <div className="rounded-xl bg-white/[0.03] p-5 border border-white/[0.06]">
                    <p className="font-semibold text-white mb-3">개인정보 보호책임자</p>
                    <ul className="space-y-2 text-white/70">
                      <li><strong className="text-white/90">성명:</strong> 장진우</li>
                      <li><strong className="text-white/90">직책:</strong> 대표</li>
                      <li><strong className="text-white/90">연락처:</strong> 050-6678-6390</li>
                      <li><strong className="text-white/90">이메일:</strong> unova.team.cs@gmail.com</li>
                    </ul>
                  </div>
                </section>

                {/* 제11조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제11조 (권익침해 구제방법)</h2>
                  <p className="mb-4">정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
                  <div className="space-y-3">
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <p className="text-white/70">
                        <strong className="text-white">개인정보분쟁조정위원회:</strong> (국번없이) 1833-6972 / <a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white">www.kopico.go.kr</a>
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <p className="text-white/70">
                        <strong className="text-white">개인정보침해신고센터:</strong> (국번없이) 118 / <a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white">privacy.kisa.or.kr</a>
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <p className="text-white/70">
                        <strong className="text-white">대검찰청 사이버수사과:</strong> (국번없이) 1301 / <a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white">www.spo.go.kr</a>
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] p-4 border border-white/[0.06]">
                      <p className="text-white/70">
                        <strong className="text-white">경찰청 사이버수사국:</strong> (국번없이) 182 / <a href="https://ecrm.police.go.kr" target="_blank" rel="noopener noreferrer" className="text-white/70 underline underline-offset-2 hover:text-white">ecrm.police.go.kr</a>
                      </p>
                    </div>
                  </div>
                </section>

                {/* 제12조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제12조 (개인정보처리방침 변경)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.</li>
                  </ol>
                </section>

                {/* 부칙 */}
                <section className="pt-6 border-t border-white/10">
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">부칙</h2>
                  <p>본 개인정보처리방침은 2024년 1월 1일부터 시행합니다.</p>
                </section>

              </article>
            </div>

            {/* 문의 안내 */}
            <div className="mt-8 text-center">
              <p className="text-[14px] text-white/50">
                개인정보처리방침에 대한 문의사항이 있으시면{" "}
                <a href="mailto:unova.team.cs@gmail.com" className="text-white/70 underline underline-offset-2 hover:text-white">
                  unova.team.cs@gmail.com
                </a>
                으로 연락해 주세요.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
