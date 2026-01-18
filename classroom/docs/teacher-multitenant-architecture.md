# 선생님 계정/상품/매출/리뷰(멀티 테넌트) 아키텍처 초안

이 문서는 현재 `classroom` 프로젝트에 **선생님별 계정(로그인) + 상품 소유권 + 대시보드(리뷰/매출)**를 도입하기 위한 구조를 정리합니다.

## 핵심 개념

- **User(계정)**: 로그인 주체. 이메일 로그인(`EmailCredential`)과 세션(`Session`)을 사용합니다.
- **Teacher(프로필)**: `/teachers/[slug]`에 노출되는 공개 프로필. 디자인/콘텐츠 중심.
- **Product(상품)**: 현재는 `Course`, `Textbook` 2종이며 둘 다 `ownerId`로 **소유 계정(User)**를 가질 수 있습니다.
- **Order(주문/매출)**: `Order`는 상품 타입/스냅샷/결제 금액을 저장합니다.
- **Review(후기)**: 상품에 매핑된 후기이며, 조회 시 상품 소유권(owner)을 통해 “내 리뷰”를 제한합니다.

## 권한(RBAC) 전략(현재 코드 기준)

- **Admin**: `ADMIN_EMAIL` 또는 `ADMIN_EMAILS`에 포함된 이메일로 로그인한 계정.
- **Teacher**: `Teacher.accountUserId == user.id`로 연결된 계정.

> 운영에서는 관리자/선생님 모두 **세션 기반**으로 접근해야 하며, 개발 환경에서만 편의용 bypass를 허용합니다(`ALLOW_DEV_ADMIN_BYPASS`).

## 데이터 연결(테이블/필드)

- `Course.ownerId -> User.id`
- `Textbook.ownerId -> User.id`
- `Teacher.accountUserId -> User.id` *(추가 컬럼, raw로 보강)*

## 주요 화면/기능

### 관리자(Admin)

- `admin/teachers`
  - 선생님 프로필 관리(기존 기능)
  - **계정 탭**: 이메일 기반 계정 생성/연결 + 임시 비밀번호 발급
  - **상품 할당**: 선택한 강좌/교재의 `ownerId`를 해당 계정으로 업데이트(= 선생님 “내 상품”에 추가)

### 선생님(Teacher)

- `/teacher` (대시보드)
  - 이번주/이번달 판매액(주문 기반, KST 기준)
  - 내 상품 수 / 내 리뷰 수
- `/teacher/products`
  - 내 강좌/내 교재 목록, 스토어 링크 제공
- `/teacher/reviews`
  - 내 상품에 달린 최신 리뷰 목록
- `/teacher/sales`
  - 주/월 판매액 + 이번주 주문 리스트

## 계산 규칙(매출)

- `Order.status`가 `COMPLETED`, `PARTIALLY_REFUNDED` 인 주문만 포함
- 주문의 순매출은 \(amount - refundedAmount\)
- “이번주/이번달” 기준은 **KST(UTC+9)**로 경계(월요일 00:00, 매월 1일 00:00)를 계산

## 레퍼런스(구조 관점)

- 멀티 테넌트/셀러 대시보드 구조: Bagisto(슈퍼어드민/셀러 대시보드 분리) 같은 “입점업체(tenants) 관리” 아키텍처를 참고하면 좋습니다. (예: [Bagisto Multi-Tenant eCommerce](https://docs.bagisto.com/multi-tenant-ecommerce/))
- 어드민 UI 컴포넌트 구성: Next.js 대시보드 템플릿(카드/테이블/차트)을 참고하면 빠르게 확장할 수 있습니다. (예: [NextAdmin](https://nextadmin.co/))

