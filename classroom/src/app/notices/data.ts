export type Notice = {
  slug: string;
  title: string;
  body: string;
  createdAt: string; // YYYY-MM-DD
};

export const notices: Notice[] = [
  {
    slug: "welcome",
    title: "UNOVA 강의실 오픈 안내",
    createdAt: "2025-12-18",
    body: `안녕하세요. UNOVA 강의실이 오픈했습니다.

- 모바일 최적화
- 진도/이어보기
- 노트/자료 다운로드
 
감사합니다.`,
  },
];