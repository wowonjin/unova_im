"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: {
          address: string;
          addressType: string;
          bname: string;
          buildingName: string;
          zonecode: string;
        }) => void;
      }) => { open: () => void };
    };
  }
}

export default function SignupFormClient() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "form">("select");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    passwordConfirm: "",
    zonecode: "",
    address: "",
    addressDetail: "",
  });
  const [agreements, setAgreements] = useState({
    all: false,
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // 다음 우편번호 API 스크립트 로드
  useEffect(() => {
    if (step === "form") {
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.async = true;
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [step]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 전화번호 자동 하이픈 처리
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ""); // 숫자만 추출
    let formatted = "";
    
    if (value.length <= 3) {
      formatted = value;
    } else if (value.length <= 7) {
      formatted = `${value.slice(0, 3)}-${value.slice(3)}`;
    } else if (value.length <= 11) {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
    } else {
      formatted = `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7, 11)}`;
    }
    
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleAddressSearch = () => {
    new window.daum.Postcode({
      oncomplete: (data) => {
        setFormData((prev) => ({
          ...prev,
          zonecode: data.zonecode,
          address: data.address,
        }));
      },
    }).open();
  };

  const handleAllAgreement = () => {
    const newValue = !agreements.all;
    setAgreements({
      all: newValue,
      terms: newValue,
      privacy: newValue,
      marketing: newValue,
    });
  };

  const handleSingleAgreement = (key: "terms" | "privacy" | "marketing") => {
    const newAgreements = { ...agreements, [key]: !agreements[key] };
    newAgreements.all = newAgreements.terms && newAgreements.privacy && newAgreements.marketing;
    setAgreements(newAgreements);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 유효성 검사
    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!formData.email.trim()) {
      setError("이메일을 입력해주세요.");
      return;
    }
    if (!formData.password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (formData.password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    // 주소는 선택 사항 (필수 아님)
    if (!agreements.terms || !agreements.privacy) {
      setError("필수 약관에 동의해주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          password: formData.password,
          zonecode: formData.zonecode,
          address: formData.address,
          addressDetail: formData.addressDetail,
          marketing: agreements.marketing,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          EMAIL_EXISTS: "이미 가입된 이메일입니다.",
          INVALID_EMAIL: "올바른 이메일 주소를 입력해주세요.",
          SERVER_ERROR: "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
        };
        setError(errorMessages[data.error] || "회원가입 중 오류가 발생했습니다.");
        return;
      }

      // 회원가입 성공 - 메인 페이지로 이동
      router.push("/");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    formData.name.trim() &&
    formData.email.trim() &&
    formData.password &&
    formData.passwordConfirm &&
    agreements.terms &&
    agreements.privacy;

  // 초기 선택 화면
  if (step === "select") {
    return (
      <div className="space-y-3">
        {/* 카카오로 시작하기 */}
        <a
          href="https://unova.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center justify-center w-full rounded-xl bg-[#FEE500] px-4 py-3.5 text-[15px] font-semibold text-black transition-all hover:brightness-95"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 256 256" 
            className="absolute left-4"
          >
            <path 
              fill="#000000" 
              d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.344-10.581 37.689 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.943-24.811 43.944-29.03 5.995.849 12.168 1.28 18.472 1.28 57.438 0 104-36.712 104-82 0-45.287-46.562-82-104-82z"
            />
          </svg>
          카카오로 시작하기
        </a>

        {/* 네이버로 시작하기 */}
        <a
          href="https://unova.co.kr"
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex items-center justify-center w-full rounded-xl bg-[#03C75A] px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:brightness-95"
        >
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 20 20" 
            className="absolute left-4"
          >
            <path 
              fill="#FFFFFF" 
              d="M13.5 10.5L6.2 0H0v20h6.5V9.5L13.8 20H20V0h-6.5v10.5z"
            />
          </svg>
          네이버로 시작하기
        </a>

        {/* 구분선 */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-white/20"></div>
          <span className="text-[13px] text-white/50">또는</span>
          <div className="flex-1 h-px bg-white/20"></div>
        </div>

        {/* 이메일로 회원가입 */}
        <button
          type="button"
          onClick={() => setStep("form")}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-white/10"
        >
          이메일로 회원가입
        </button>
      </div>
    );
  }

  // 회원가입 폼
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 입력 필드들 */}
      <div className="space-y-3">
        {/* 이름 */}
        <div>
          <label className="block text-[13px] text-white/60 mb-1.5">이름 <span className="text-red-400">*</span></label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="이름을 입력해주세요"
            className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-[13px] text-white/60 mb-1.5">이메일 <span className="text-red-400">*</span></label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="이메일을 입력해주세요"
            className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* 전화번호 */}
        <div>
          <label className="block text-[13px] text-white/60 mb-1.5">전화번호 <span className="text-red-400">*</span></label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handlePhoneChange}
            placeholder="010-0000-0000"
            maxLength={13}
            className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-white/40"
          />
        </div>

        {/* 비밀번호 */}
        <div>
          <label className="block text-[13px] text-white/60 mb-1.5">비밀번호 <span className="text-red-400">*</span></label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="8자 이상 입력해주세요"
              className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 pr-12 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-white/40"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* 비밀번호 확인 */}
        <div>
          <label className="block text-[13px] text-white/60 mb-1.5">비밀번호 확인 <span className="text-red-400">*</span></label>
          <div className="relative">
            <input
              type={showPasswordConfirm ? "text" : "password"}
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleInputChange}
              placeholder="비밀번호를 다시 입력해주세요"
              className="w-full rounded-xl border border-white/20 bg-white px-4 py-3 pr-12 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-white/40"
            />
            <button
              type="button"
              onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>
                {showPasswordConfirm ? "visibility_off" : "visibility"}
              </span>
            </button>
          </div>
        </div>

        {/* 주소 */}
        <div>
          <label className="block text-[13px] text-white/60 mb-1.5">주소 <span className="text-red-400">*</span></label>
          <input
            type="text"
            name="address"
            value={formData.address}
            readOnly
            onClick={handleAddressSearch}
            placeholder="주소를 검색해주세요"
            className="w-full rounded-xl border border-white/20 bg-white/90 px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none cursor-pointer hover:bg-white transition-colors"
          />
          <input
            type="text"
            name="addressDetail"
            value={formData.addressDetail}
            onChange={handleInputChange}
            placeholder="상세주소 (선택)"
            className="w-full mt-2 rounded-xl border border-white/20 bg-white px-4 py-3 text-[14px] text-black placeholder:text-gray-400 focus:outline-none focus:border-white/40"
          />
        </div>
      </div>

      {/* 약관 동의 */}
      <div className="space-y-2 pt-2">
        {/* 전체 동의 */}
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <button
            type="button"
            onClick={handleAllAgreement}
            className={`flex items-center justify-center w-5 h-5 rounded border transition-colors ${
              agreements.all
                ? "bg-white border-white text-black"
                : "border-white/40 text-transparent"
            }`}
          >
            {agreements.all && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[14px] text-white font-semibold">전체 동의</span>
        </label>

        <div className="h-px bg-white/10 my-2"></div>

        {/* 이용약관 동의 (필수) */}
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <button
            type="button"
            onClick={() => handleSingleAgreement("terms")}
            className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
              agreements.terms
                ? "bg-white border-white text-black"
                : "border-white/40 text-transparent"
            }`}
          >
            {agreements.terms && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[13px] text-white/80">
            <span className="text-blue-400">[필수]</span> 이용약관 동의
          </span>
        </label>

        {/* 개인정보 수집 동의 (필수) */}
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <button
            type="button"
            onClick={() => handleSingleAgreement("privacy")}
            className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
              agreements.privacy
                ? "bg-white border-white text-black"
                : "border-white/40 text-transparent"
            }`}
          >
            {agreements.privacy && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[13px] text-white/80">
            <span className="text-blue-400">[필수]</span> 개인정보 수집 및 이용 동의
          </span>
        </label>

        {/* 마케팅 수신 동의 (선택) */}
        <label className="flex items-center gap-2 cursor-pointer py-1">
          <button
            type="button"
            onClick={() => handleSingleAgreement("marketing")}
            className={`flex items-center justify-center w-4 h-4 rounded border transition-colors ${
              agreements.marketing
                ? "bg-white border-white text-black"
                : "border-white/40 text-transparent"
            }`}
          >
            {agreements.marketing && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[13px] text-white/80">
            <span className="text-white/50">[선택]</span> 마케팅 정보 수신 동의
          </span>
        </label>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* 회원가입 버튼 */}
      <button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full rounded-xl bg-white px-4 py-3.5 text-[15px] font-semibold text-black transition-all hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-[16px]">
              progress_activity
            </span>
            처리 중...
          </span>
        ) : (
          "회원가입 완료"
        )}
      </button>
    </form>
  );
}
