# 외부 강의실 MVP (아임웹 + Vimeo)

아임웹은 **결제/회원/회원그룹(강좌별 1그룹)**을 담당하고, 이 프로젝트(`classroom`)는 **나의 강의실(구매 강좌만 노출) + Vimeo 플레이어 + 진도/이어보기 + 노트 + 자료다운**을 담당합니다.

## 포함된 MVP 기능

- **OTP 로그인(개발 환경: 서버 로그로 코드 출력)**
- **내 강의실(대시보드)**: 구매한 강좌만 노출, 이어보기
- **강좌 상세(커리큘럼)**: 차시별 진행률
- **차시 플레이어(Vimeo)**: 진도 저장(약 8초 간격), 이어보기
- **노트**: 차시별 자동 저장
- **자료 다운로드**: 수강권한 체크 후 다운로드
- **관리자(최소)**:
  - 자료 업로드(강좌 공통 / 차시별)
  - 수강권(기본 1년) 수동 발급

## 실행 방법(로컬)

### 1) 환경변수 설정

`env.example`을 복사해서 `.env.local`(권장) 또는 `.env`를 만들고 값만 채워주세요.

- `DATABASE_URL`: Postgres 연결 문자열(운영 권장)
- (Render 외부 DB에 로컬에서 붙는 경우) `PGSSLMODE=require` 설정 권장
- `ADMIN_EMAILS`: 관리자(선생님) 이메일(쉼표로 여러 개 가능)
- `DEFAULT_USER_EMAIL`: (선택) 데모/공개 모드에서 기본 사용자 이메일

#### Supabase(Postgres) 사용

- Supabase 대시보드 → **Settings → Database → Connection string**에서 **Direct/URI** 형식 사용
- `.env.local`의 `DATABASE_URL`에 Supabase 연결 문자열 설정
  - 예: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require`
  - 또는 `PGSSLMODE=require`로 SSL 강제

### 2) DB 마이그레이션/시드

```bash
npm install
npm run db:migrate
npm run db:seed
```

#### 기존 DB 데이터 이전(선택)

기존 Postgres에서 Supabase로 옮길 때는 `pg_dump`/`pg_restore`를 사용합니다.

```bash
# 예시 (소스 DB -> 덤프)
pg_dump --format=custom --no-owner --no-privileges \
  --dbname "postgresql://USER:PASSWORD@OLD_HOST:5432/DB" \
  --file db.dump

# 예시 (덤프 -> Supabase)
pg_restore --no-owner --no-privileges \
  --dbname "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require" \
  db.dump
```

### 3) 개발 서버 실행

```bash
npm run dev
```

`http://localhost:3000` 접속 → 로그인 → 대시보드에서 샘플 강좌로 진입 가능합니다.

## 운영 포인트(아임웹 연동 전 MVP)

- 수강권 발급은 `/admin` → 강좌 선택 → **수강권 발급(1년)** 폼으로 처리합니다.
- 자료 업로드는 `/admin`에서 강좌/차시별로 업로드합니다.
- 실제 아임웹 결제 자동 연동은 다음 단계에서 **웹훅 + 주문/회원 API**로 붙이면 됩니다.

## 다음 단계(아임웹 결제 → 자동 수강권 발급)

### 1) 강좌 ↔ 아임웹 상품 매핑

아임웹 “회원그룹 이용권” 상품이 결제되면, 주문 API로부터 품목 주문 목록을 조회해 어떤 상품이 결제되었는지 알 수 있습니다.

- 관리자(`/admin`) → 강좌 선택 → **설정/연동 → 아임웹 연동(상품 코드)**
  - 아임웹 상품에 설정한 **상품 코드(prod_custom_code)** 를 입력

### 2) 주문번호로 수동 동기화(테스트)

- 관리자(`/admin`) 화면 상단의 **아임웹 주문 동기화**
  - `order_no` 입력 → 동기화 실행

### 3) 웹훅으로 자동 동기화(운영)

- 웹훅 수신 URL: `POST /api/imweb/webhook`
- 개발자센터에서 주문 이벤트(예: 주문 생성/결제 완료 등) 웹훅을 등록한 뒤,
  payload에 주문번호가 포함되면 서버가 자동으로 `order_no`를 동기화합니다.

> 웹훅 서명 검증은 개발자센터의 실제 헤더 규칙에 맞춰 `IMWEB_WEBHOOK_SECRET`/헤더명을 조정하면 됩니다.

#### 웹훅 설정 체크리스트(개발자센터)

- **수신 URL**: `https://class.yourdomain.com/api/imweb/webhook?token=YOUR_TOKEN`
- **이벤트 선택**: 결제 완료/주문 관련 이벤트만 선택(권장)
- **서명/시크릿**:
  - 개발자센터에서 서명(시크릿) 설정을 켰다면 `.env`에도 동일하게 설정
  - 헤더명/포맷이 다르면 아래 환경변수로 맞춤 설정:
    - `IMWEB_WEBHOOK_SIGNATURE_HEADER`
    - `IMWEB_WEBHOOK_HMAC_ALG`
    - `IMWEB_WEBHOOK_SIGNATURE_ENCODING`
    - `IMWEB_WEBHOOK_SIGNATURE_PREFIX`
- **이벤트 타입 필터(권장)**:
  - `IMWEB_WEBHOOK_EVENTS`에 실제 이벤트 타입 문자열을 콤마로 넣으면, 그 이벤트만 처리합니다.

---

## Render 배포

### 1) GitHub에 올리기

- 이 레포를 GitHub에 push 합니다.

### 2) Render에서 Blueprint 배포

이 프로젝트는 `render.yaml` Blueprint를 포함하고 있어 한 번에 모든 리소스를 생성할 수 있습니다.

1. Render 대시보드 → **New → Blueprint**
2. GitHub 레포 연결 → `render.yaml` 자동 감지
3. **Apply** 클릭 → 다음 리소스가 자동 생성됩니다:
   - `unova-classroom`: Next.js 웹 서비스
   - `unova-classroom-db`: PostgreSQL 데이터베이스
   - `unova-classroom-storage`: 파일 저장용 디스크 (1GB)

### 3) Environment Variables 설정

Render 대시보드 → 서비스 → **Environment**에서 다음 환경변수를 설정합니다:

- `ADMIN_EMAILS`: 관리자(선생님) 이메일(쉼표로 여러 개)
- `DEFAULT_USER_EMAIL`: (선택) 데모/공개 모드 기본 사용자
- `IMWEB_API_KEY`, `IMWEB_API_SECRET`: 아임웹 주문 조회용
- `IMWEB_WEBHOOK_TOKEN`: 웹훅 보호용 토큰(권장)

> `DATABASE_URL`과 `STORAGE_ROOT`는 Blueprint에서 자동 설정됩니다.

### 4) 배포 후 확인

- `/admin/events`에서 웹훅/주문 이벤트 로그 확인
- 아임웹에서 웹훅 URL을 `https://YOUR_DOMAIN/api/imweb/webhook?token=...` 형태로 등록

### 5) 수동 재배포

Render 대시보드 → 서비스 → **Manual Deploy** → **Clear build cache & deploy**를 선택하면 캐시를 삭제하고 재배포합니다.
