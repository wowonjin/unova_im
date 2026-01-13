"use client";

interface ShortcutItem {
  href: string;
  image: string;
  label: string;
  iconClass?: string;
  bgColor?: string | null;
}

const defaultShortcuts: ShortcutItem[] = [
  {
    href: "https://unova.co.kr/home",
    image: "https://cdn.imweb.me/upload/S2024081197744ee41db01/4b4d2779d5a5e.png",
    label: "커넥트 소개",
    iconClass: "shortcut-icon--basic",
  },
  {
    href: "https://unova.co.kr/baek",
    image: "https://cdn.imweb.me/upload/S2024081197744ee41db01/875c90db75cb9.png",
    label: "백하욱선생님",
    iconClass: "shortcut-icon--original",
  },
  {
    href: "https://unova.co.kr/yr",
    image: "https://cdn.imweb.me/upload/S2024081197744ee41db01/de26f57d2548b.png",
    label: "유예린선생님",
    iconClass: "shortcut-icon--original",
  },
  {
    href: "https://unova.co.kr/jjw",
    image: "https://cdn.imweb.me/upload/S2024081197744ee41db01/5926c9baef531.png",
    label: "장진우선생님",
    iconClass: "shortcut-icon--original",
  },
  {
    href: "https://unova.co.kr/trans",
    image: "https://cdn.imweb.me/upload/S2024081197744ee41db01/c0148a87fb470.png",
    label: "연고대편입",
    iconClass: "shortcut-icon--special",
  },
  {
    href: "https://unova.co.kr/consulting",
    image: "https://cdn.imweb.me/upload/S2024081197744ee41db01/6d42b6ec8f7b9.png",
    label: "정시 컨설팅",
    iconClass: "shortcut-icon--special",
  },
  {
    href: "https://unova.co.kr/bhw",
    image: "https://storage.googleapis.com/physics2/%EC%9C%A0%EB%85%B8%EB%B0%94%20%EC%9D%B4%EB%AF%B8%EC%A7%80/qna.png",
    label: "선생님게시판",
    iconClass: "shortcut-icon--office",
  },
  {
    href: "https://open.kakao.com/o/gy1BO0Dh",
    image: "https://storage.googleapis.com/physics2/%EC%9C%A0%EB%85%B8%EB%B0%94%20%EC%9D%B4%EB%AF%B8%EC%A7%80/kakao.png",
    label: "질문커뮤니티",
    iconClass: "shortcut-icon--office",
  },
];

export type ShortcutNavItem = ShortcutItem;

export default function ShortcutNav({ items }: { items?: ShortcutItem[] }) {
  const shortcuts = items && items.length > 0 ? items : defaultShortcuts;
  return (
    <>
      <section
        id="shortcuts"
        aria-label="바로가기 메뉴"
        className="mx-auto max-w-[1080px] px-6 pb-4 sm:pb-7 pt-1 sm:pt-3"
      >
        {/* Mobile: 한 줄에 4개 고정 (overflow 방지) */}
        <div className="grid grid-cols-4 justify-items-center gap-x-2 gap-y-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-y-0">
          {shortcuts.map((item, idx) => {
            const bgClass =
              item.bgColor && String(item.bgColor).trim().length > 0
                ? "" // inline style로 적용
                : item.iconClass === "shortcut-icon--basic"
                  ? "bg-[#7c4ff5]"
                  : item.iconClass === "shortcut-icon--special"
                    ? "bg-[#e5f0ff]"
                    : item.iconClass === "shortcut-icon--office"
                      ? "bg-[#e5f9f1]"
                      : "bg-white";

            const isOriginal = item.iconClass === "shortcut-icon--original";
            // DB에서 관리자가 추가한 항목은 iconClass가 없으므로(=undefined) 기본을 "사각형 가득(cover)"로 보이게 한다.
            // 하드코딩된 아이콘류(basic/special/office)는 기존처럼 contain(70%) 유지.
            const isAdminDefined = !item.iconClass || String(item.iconClass).trim().length === 0;
            const shouldCover = isOriginal || isAdminDefined;

            return (
              <a
                key={idx}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-center w-full px-0 sm:w-auto sm:px-3"
              >
                <div
                  className={[
                    "mx-auto mb-2 sm:mb-3 flex items-center justify-center overflow-hidden",
                    "h-[56px] w-[56px] rounded-[16px] sm:h-[92px] sm:w-[92px] sm:rounded-[22px]",
                    "shadow-[0_12px_26px_rgba(15,23,42,0.10)] border border-white/10",
                    "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(15,23,42,0.16)]",
                    bgClass,
                  ].join(" ")}
                  style={
                    item.bgColor && String(item.bgColor).trim().length > 0
                      ? { backgroundColor: String(item.bgColor).trim() }
                      : undefined
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image}
                    alt={item.label}
                    className={
                      shouldCover
                        ? "block h-full w-full object-cover"
                        : "block h-[70%] w-[70%] object-contain"
                    }
                  />
                </div>
                <div className="text-[11px] font-normal tracking-[-0.02em] text-white sm:text-[14px]">
                  {item.label}
                </div>
              </a>
            );
          })}
        </div>
      </section>
    </>
  );
}

