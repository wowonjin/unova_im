# 소셜 로그인 (카카오 / 네이버) 설정

이 프로젝트는 커스텀 세션(`Session` 테이블 + `unova_session` 쿠키) 기반이며,
카카오/네이버 OAuth 콜백에서 **사용자 생성/연결 → 세션 발급** 방식으로 동작합니다.

## 1) 환경 변수

`.env.local`에 아래 값을 추가하세요.

```bash
# 공통 (권장) - 로컬이면 http://localhost:3001
NEXT_PUBLIC_BASE_URL=http://localhost:3001

# Kakao (카카오 디벨로퍼스 > 앱 키 > REST API 키)
KAKAO_REST_API_KEY=YOUR_KAKAO_REST_API_KEY
# 선택: 카카오 로그인 > 보안 > Client Secret 사용 시
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET

# Naver (네이버 개발자센터 > 애플리케이션 > Client ID/Secret)
NAVER_CLIENT_ID=YOUR_NAVER_CLIENT_ID
NAVER_CLIENT_SECRET=YOUR_NAVER_CLIENT_SECRET
```

## 2) Redirect URI 등록

각 플랫폼 개발자 콘솔에 아래 Redirect URI를 등록해야 합니다.

- **Kakao Redirect URI**
  - `http://localhost:3001/api/auth/kakao/callback`
- **Naver Callback URL**
  - `http://localhost:3001/api/auth/naver/callback`

운영 도메인이 있다면, 동일하게 운영 도메인으로도 등록하세요.

## 3) 로그인 사용 방법

`/login` 페이지에서:

- 카카오 버튼 → `/api/auth/kakao/start`
- 네이버 버튼 → `/api/auth/naver/start`

로 이동하며, 로그인 완료 후 `redirect` 쿼리로 받은 경로로 돌아갑니다.


