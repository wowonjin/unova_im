# 토스페이먼츠 연동

이 프로젝트는 **토스 결제창 호출 → 성공 리다이렉트 → 서버 승인(confirm) → 권한 발급** 흐름으로 동작합니다.

## 1) 환경 변수

`.env.local`에 아래 값을 추가하세요.

```bash
# 권장: 로컬 기준(이미 사용 중인 포트에 맞추세요)
NEXT_PUBLIC_BASE_URL=http://localhost:3001

# Toss Payments Keys (개발자센터에서 발급)
TOSS_CLIENT_KEY=YOUR_TOSS_CLIENT_KEY
TOSS_SECRET_KEY=YOUR_TOSS_SECRET_KEY
```

## 1-1) 테스트/운영 키 주의

- **클라이언트 키**(`TOSS_CLIENT_KEY`): 브라우저에서 결제창 호출에 사용
- **시크릿 키**(`TOSS_SECRET_KEY`): 서버에서 승인(confirm)/취소(cancel)에 사용 (**절대 프론트에 노출 금지**)

## 2) 성공/실패 URL

토스 결제 요청에 아래 URL이 사용됩니다.

- 성공: `/payments/toss/success`
- 실패: `/payments/toss/fail`

`NEXT_PUBLIC_BASE_URL`이 정확해야 리다이렉트가 정상 동작합니다.

## 3) 동작 방식

- 결제 버튼 클릭 → `/api/payments/toss/create-order` (주문 PENDING 생성)
- Toss 결제창 호출 (프론트)
- 성공 리다이렉트 → `/payments/toss/success?paymentKey&orderId&amount`
- 성공 페이지가 `/api/payments/toss/confirm` 호출 → 토스 승인 API(`/v1/payments/confirm`) 호출
- 승인 성공 시:
  - `Order.status = COMPLETED`
  - 강좌: `Enrollment` upsert
  - 교재: `TextbookEntitlement` upsert

## 4) 환불(취소)

관리자 주문 목록(`/admin/orders`)에서 **결제완료 + toss** 주문에 대해 `환불` 버튼이 표시됩니다.

- 호출 API: `/api/admin/orders/toss-cancel` (server action form)
- 토스 취소 API: `POST /v1/payments/{paymentKey}/cancel`
- 환불 완료 시:
  - `Order.status = REFUNDED`
  - 강좌: `Enrollment.status = REVOKED`
  - 교재: `TextbookEntitlement.status = REVOKED`

## 5) 부분 환불

- `Order.refundedAmount`에 누적 기록됩니다.
- 상태:
  - 전액 환불: `REFUNDED` (권한 REVOKED)
  - 부분 환불: `PARTIALLY_REFUNDED` (권한은 유지)

부분 환불은 주문 상세(`/admin/order/[orderNo]`)에서 **취소금액**을 입력해 처리할 수 있습니다.


