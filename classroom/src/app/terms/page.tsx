import LandingHeader from "@/app/_components/LandingHeader";
import Footer from "@/app/_components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 | 유노바",
  description: "유노바 서비스 이용약관입니다.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#161616] text-white flex flex-col">
      <LandingHeader />

      <main className="flex-1 pt-[70px]">
        {/* 히어로 섹션 */}
        <section className="py-10 md:py-12">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-[28px] md:text-[40px] font-bold tracking-[-0.02em]">이용약관</h1>
            <p className="mt-3 text-[14px] md:text-[16px] text-white/50">유노바 서비스 이용약관</p>
          </div>
        </section>

        {/* 본문 */}
        <section className="pb-24">
          <div className="mx-auto max-w-4xl px-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-10">
              <article className="space-y-10 text-[14px] md:text-[15px] leading-[1.9] text-white/85">
                
                {/* 제1조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제1조 (목적)</h2>
                  <p>
                    본 약관은 유노바(이하 "회사")가 제공하는 온라인 교육 서비스(이하 "서비스")의 이용과 관련하여 
                    회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                  </p>
                </section>

                {/* 제2조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제2조 (정의)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>"서비스"란 회사가 제공하는 온라인 강의, 교재, 학습 자료 및 관련 서비스를 말합니다.</li>
                    <li>"이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
                    <li>"회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 정보를 지속적으로 제공받으며 서비스를 계속적으로 이용할 수 있는 자를 말합니다.</li>
                    <li>"콘텐츠"란 회사가 제공하는 온라인 강의, 교재, 문제집, 학습 자료 등 디지털 형태의 정보를 말합니다.</li>
                  </ol>
                </section>

                {/* 제3조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제3조 (약관의 효력 및 변경)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
                    <li>회사는 합리적인 사유가 발생할 경우 관련 법령에 위배되지 않는 범위 내에서 본 약관을 변경할 수 있으며, 변경된 약관은 제1항과 같은 방법으로 공지합니다.</li>
                    <li>회원은 변경된 약관에 동의하지 않을 경우 회원탈퇴를 요청할 수 있으며, 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용할 경우 약관 변경에 동의한 것으로 간주합니다.</li>
                  </ol>
                </section>

                {/* 제4조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제4조 (회원가입)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
                    <li>회사는 전항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각호에 해당하지 않는 한 회원으로 등록합니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                        <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                        <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
                      </ul>
                    </li>
                    <li>회원가입계약의 성립시기는 회사의 승낙이 회원에게 도달한 시점으로 합니다.</li>
                  </ol>
                </section>

                {/* 제5조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제5조 (서비스의 제공 및 변경)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 회원에게 다음과 같은 서비스를 제공합니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li>온라인 강의 서비스</li>
                        <li>교재 및 학습 자료 제공 서비스</li>
                        <li>학습 관리 서비스</li>
                        <li>기타 회사가 정하는 서비스</li>
                      </ul>
                    </li>
                    <li>회사는 서비스의 내용을 변경하거나 추가할 수 있으며, 이 경우 변경된 서비스의 내용 및 제공일자를 명시하여 공지합니다.</li>
                  </ol>
                </section>

                {/* 제6조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제6조 (서비스 이용료)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사가 제공하는 서비스는 기본적으로 유료입니다.</li>
                    <li>유료 서비스의 이용요금 및 결제방식은 해당 서비스에 명시되어 있는 규정에 따릅니다.</li>
                    <li>회사는 유료 서비스 이용요금을 회사와 계약한 전자결제대행업체에서 정한 방법에 의하거나 회사가 정한 청구서에 합산하여 청구할 수 있습니다.</li>
                  </ol>
                </section>

                {/* 제7조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제7조 (환불 정책)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회원이 구매한 콘텐츠의 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 관련 법령에서 정한 바에 따릅니다.</li>
                    <li>디지털 콘텐츠의 특성상 다음 각 호의 경우에는 환불이 제한될 수 있습니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li>구매 후 콘텐츠 재생 또는 다운로드를 시작한 경우</li>
                        <li>회원의 책임 있는 사유로 콘텐츠가 훼손된 경우</li>
                        <li>콘텐츠의 가치가 현저히 감소한 경우</li>
                      </ul>
                    </li>
                    <li>실물 교재의 경우, 미개봉 상태에서 7일 이내 환불 요청 시 전액 환불이 가능합니다.</li>
                    <li>환불 신청은 고객센터를 통해 접수하며, 환불 처리 기간은 영업일 기준 7일 이내입니다.</li>
                  </ol>
                </section>

                {/* 제8조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제8조 (이용자의 의무)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>이용자는 다음 행위를 하여서는 안 됩니다.
                      <ul className="list-disc pl-5 mt-2 space-y-2 text-white/70">
                        <li>신청 또는 변경 시 허위내용의 등록</li>
                        <li>타인의 정보 도용</li>
                        <li>회사가 제공하는 콘텐츠의 무단 복제, 배포, 전송</li>
                        <li>회사 및 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
                        <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
                        <li>외설 또는 폭력적인 메시지, 영상, 음성 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위</li>
                      </ul>
                    </li>
                  </ol>
                </section>

                {/* 제9조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제9조 (저작권의 귀속)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.</li>
                    <li>이용자는 서비스를 이용함으로써 얻은 정보 중 회사에게 지적재산권이 귀속된 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</li>
                    <li>회사가 제공하는 콘텐츠를 무단으로 복제, 배포, 전송하는 경우 저작권법에 의해 처벌받을 수 있습니다.</li>
                  </ol>
                </section>

                {/* 제10조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제10조 (계약해제 및 이용제한)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회원은 언제든지 서비스 내 마이페이지 또는 고객센터를 통하여 이용계약 해지 신청을 할 수 있으며, 회사는 관련법 등이 정하는 바에 따라 이를 즉시 처리하여야 합니다.</li>
                    <li>회사는 회원이 본 약관에서 금지하는 행위를 하거나 서비스의 정상적인 운영을 방해하는 경우 사전 통보 후 이용계약을 해지하거나 서비스 이용을 제한할 수 있습니다.</li>
                  </ol>
                </section>

                {/* 제11조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제11조 (면책조항)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 및 기타 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
                    <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
                    <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</li>
                  </ol>
                </section>

                {/* 제12조 */}
                <section>
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">제12조 (분쟁해결)</h2>
                  <ol className="list-decimal pl-5 space-y-3">
                    <li>회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 고객센터를 운영합니다.</li>
                    <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 하며, 회사의 본사 소재지를 관할하는 법원을 관할법원으로 합니다.</li>
                  </ol>
                </section>

                {/* 부칙 */}
                <section className="pt-6 border-t border-white/10">
                  <h2 className="text-[18px] md:text-[20px] font-bold text-white mb-4">부칙</h2>
                  <p>본 약관은 2024년 1월 1일부터 시행합니다.</p>
                </section>

              </article>
            </div>

            {/* 문의 안내 */}
            <div className="mt-8 text-center">
              <p className="text-[14px] text-white/50">
                약관에 대한 문의사항이 있으시면{" "}
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
