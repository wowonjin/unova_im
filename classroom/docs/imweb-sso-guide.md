# 아임웹 SSO 연동 가이드

이 문서는 아임웹(Imweb)에서 유노바 강의실로 SSO(Single Sign-On) 로그인을 구현하는 방법을 설명합니다.

## 개요

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. 아임웹 "나의 강의실" 버튼 클릭                                         │
│       ↓                                                                 │
│  2. JavaScript가 서명된 URL 생성                                         │
│       ↓                                                                 │
│  3. classroom.unova.co.kr/api/auth/imweb-sso?code=...&sig=... 로 이동   │
│       ↓                                                                 │
│  4. 서버에서 서명 검증 → 자동 로그인 → 대시보드 표시                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1. 환경 변수 설정

Classroom 서버(Render)에 다음 환경 변수를 추가하세요:

```env
# SSO 서명 검증용 비밀 키 (아임웹과 동일하게 설정)
IMWEB_SSO_SECRET=your-secret-key-here-minimum-32-characters
```

**비밀 키 생성 예시:**
```bash
# 터미널에서 실행
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 2. 아임웹 HTML 코드 블록 추가

아임웹 관리자에서 "나의 강의실" 페이지에 다음 코드 블록을 추가하세요.

### 방법 A: 아임웹에서 회원 정보를 제공하는 경우

아임웹이 템플릿 변수(예: `{{member.code}}`)로 회원 정보를 제공한다면:

```html
<!-- 아임웹 코드블록에 추가 -->
<div id="classroom-container" style="text-align: center; padding: 40px 20px;">
  <h2 style="color: #333; margin-bottom: 20px;">나의 강의실</h2>
  <p style="color: #666; margin-bottom: 30px;">
    구매하신 강좌를 수강하실 수 있습니다.
  </p>
  <a id="classroom-link" href="#" 
     style="display: inline-block; background: #000; color: #fff; padding: 16px 32px; 
            border-radius: 12px; text-decoration: none; font-weight: 600;">
    강의실 입장하기
  </a>
</div>

<script>
(function() {
  // ⚠️ 아래 값들을 실제 환경에 맞게 수정하세요
  const CLASSROOM_URL = 'https://classroom.unova.co.kr';
  const SSO_SECRET = 'your-secret-key-here-minimum-32-characters'; // Render 환경변수와 동일하게
  
  // 아임웹 템플릿 변수 (아임웹에서 제공하는 방식에 따라 수정)
  const memberCode = '{{member.code}}';  // 회원 코드
  const memberName = '{{member.name}}';  // 회원 이름
  const memberEmail = '{{member.email}}'; // 회원 이메일
  
  // HMAC-SHA256 서명 생성 (간단한 구현)
  async function generateSignature(message, secret) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  // SSO 링크 생성
  async function createSSOLink() {
    if (!memberCode || memberCode === '{{member.code}}') {
      // 로그인하지 않은 경우
      document.getElementById('classroom-link').href = CLASSROOM_URL + '/login';
      return;
    }
    
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await generateSignature(memberCode + ':' + timestamp, SSO_SECRET);
    
    const params = new URLSearchParams({
      code: memberCode,
      ts: timestamp.toString(),
      sig: signature,
      name: memberName || '',
      email: memberEmail || '',
      redirect: '/dashboard'
    });
    
    document.getElementById('classroom-link').href = 
      CLASSROOM_URL + '/api/auth/imweb-sso?' + params.toString();
  }
  
  createSSOLink();
})();
</script>
```

### 방법 B: 서버 사이드 서명 생성 (더 안전)

보안을 위해 서버에서 서명을 생성하는 것이 좋습니다. 별도의 서버가 있다면:

```javascript
// Node.js 서버 예시
const crypto = require('crypto');

function generateSSOUrl(memberCode, memberName, memberEmail) {
  const timestamp = Math.floor(Date.now() / 1000);
  const secret = process.env.IMWEB_SSO_SECRET;
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${memberCode}:${timestamp}`)
    .digest('hex');
  
  const params = new URLSearchParams({
    code: memberCode,
    ts: timestamp.toString(),
    sig: signature,
    name: memberName || '',
    email: memberEmail || '',
    redirect: '/dashboard'
  });
  
  return `https://classroom.unova.co.kr/api/auth/imweb-sso?${params.toString()}`;
}
```

## 3. URL 파라미터 설명

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `code` | ✅ | 아임웹 회원 코드 (member_code) |
| `ts` | ✅ | Unix 타임스탬프 (초 단위) |
| `sig` | ✅ | HMAC-SHA256 서명 |
| `name` | ❌ | 회원 이름 (DB에 저장) |
| `email` | ❌ | 회원 이메일 (DB에 저장) |
| `img` | ❌ | 프로필 이미지 URL |
| `redirect` | ❌ | 로그인 후 이동할 경로 (기본: /dashboard) |

## 4. 보안 고려사항

### 4.1 서명 검증

- 서명은 `HMAC-SHA256(member_code:timestamp, secret)` 으로 생성
- 서버에서 동일한 방식으로 재계산하여 검증
- 위변조된 요청은 자동 거부

### 4.2 타임스탬프 만료

- 타임스탬프는 **5분** 이내만 유효
- 5분이 지난 URL은 자동 만료되어 재사용 불가
- URL이 유출되어도 짧은 시간 내에만 사용 가능

### 4.3 비밀 키 관리

- 비밀 키는 최소 32자 이상 사용
- 아임웹 코드블록과 Render 환경변수에만 저장
- 절대 공개 저장소에 커밋하지 않기

## 5. 로그아웃 처리

### 5.1 Classroom 로그아웃

사용자가 Classroom에서 로그아웃하면 세션이 삭제됩니다:
- 로그아웃 URL: `/api/auth/logout`
- 아임웹으로 리다이렉트: `/api/auth/logout?redirect=https://unova.co.kr`

### 5.2 아임웹 로그아웃 동기화

현재 아임웹 로그아웃 시 Classroom 자동 로그아웃은 지원되지 않습니다.
대안:
- Classroom 세션 만료 시간을 짧게 설정 (현재 7일)
- 사용자가 직접 Classroom에서 로그아웃

## 6. 문제 해결

### 에러 메시지

| 에러 | 원인 | 해결 방법 |
|------|------|----------|
| `missing_params` | URL에 필수 파라미터 누락 | code, ts, sig 모두 포함 확인 |
| `expired` | 타임스탬프 5분 초과 | 새로운 URL 생성 |
| `invalid_signature` | 서명 불일치 | 비밀 키가 동일한지 확인 |
| `config` | 서버 환경변수 미설정 | IMWEB_SSO_SECRET 설정 확인 |

### 디버깅

1. 브라우저 개발자 도구에서 네트워크 탭 확인
2. SSO URL의 모든 파라미터가 올바르게 인코딩되었는지 확인
3. Render 로그에서 에러 메시지 확인

## 7. 테스트 방법

1. Render에 `IMWEB_SSO_SECRET` 환경변수 설정
2. 아임웹 코드블록에 동일한 비밀 키로 코드 추가
3. 아임웹에서 로그인 후 "강의실 입장하기" 버튼 클릭
4. Classroom 대시보드에 자동 로그인되는지 확인
5. 사이드바 하단에 회원 이름/이메일이 표시되는지 확인

