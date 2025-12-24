import { prisma } from "@/lib/prisma";

type TokenCache = { token: string; fetchedAt: number };
let tokenCache: TokenCache | null = null;

const IMWEB_BASE = "http://api.imweb.me";

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function requiredEnvAny(primary: string, aliases: string[] = []) {
  const v = process.env[primary] || aliases.map((k) => process.env[k]).find(Boolean);
  if (!v) throw new Error(`Missing ${primary}`);
  return v;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now - tokenCache.fetchedAt < 1000 * 60 * 20) return tokenCache.token; // 20분 캐시

  const key = requiredEnv("IMWEB_API_KEY");
  // Canonical: IMWEB_API_SECRET
  // Backward-compat: allow older typo IMWEB_API_SECRET
  const secret = requiredEnvAny("IMWEB_API_SECRET", ["IMWEB_API_SECRET"]);
  const affiliate = process.env.IMWEB_ACCESS_AFFILIATE;

  const url = new URL("/v2/auth", IMWEB_BASE);
  url.searchParams.set("key", key);
  url.searchParams.set("secret", secret);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: affiliate ? { "ACCESS-AFFILIATE": affiliate } : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Imweb auth failed: ${res.status} ${JSON.stringify(data)}`);
  }

  const token = data?.access_token || data?.acce__token || data?.acce_token || data?.acceStoken;
  if (!token || typeof token !== "string") {
    // 문서 상 응답 필드는 access_token
    throw new Error(`Imweb auth response missing access_token: ${JSON.stringify(data)}`);
  }

  tokenCache = { token, fetchedAt: now };
  return token;
}

async function imwebGet(pathname: string) {
  const token = await getAccessToken();
  const affiliate = process.env.IMWEB_ACCESS_AFFILIATE;

  const url = new URL(pathname, IMWEB_BASE);
  // 문서에서 공통 인증 헤더 표기가 명확히 안 잡히는 케이스가 있어,
  // access_token을 query + header로 함께 전달(호환성 우선)
  url.searchParams.set("access_token", token);

  const headers: Record<string, string> = {};
  headers["access-token"] = token;
  headers["ACCESS-TOKEN"] = token;
  headers["Authorization"] = `Bearer ${token}`;
  if (affiliate) headers["ACCESS-AFFILIATE"] = affiliate;

  const res = await fetch(url.toString(), { method: "GET", headers, cache: "no-store" });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Imweb GET ${pathname} failed: ${res.status} ${JSON.stringify(data)}`);
  return data;
}

export async function imwebFetchOrder(orderNo: string) {
  // 문서: GET http://api.imweb.me/v2/shop/order/{주문번호}
  return await imwebGet(`/v2/shop/order/${encodeURIComponent(orderNo)}`);
}

export async function imwebFetchProdOrders(orderNo: string) {
  // 문서: GET http://api.imweb.me/v2/shop/order/{주문번호}/prod-order
  return await imwebGet(`/v2/shop/order/${encodeURIComponent(orderNo)}/prod-order`);
}

export async function imwebFetchMember(memberCode: string) {
  // 문서(구버전 기준): 회원 조회
  // 실제 운영 환경에서 엔드포인트가 다를 수 있어, 실패 시 UI에서 graceful fallback 처리합니다.
  return await imwebGet(`/v2/member/${encodeURIComponent(memberCode)}`);
}

/**
 * 이메일로 아임웹 회원 검색
 * - 이메일이 일치하는 회원을 찾아 회원 정보 반환
 * - 없으면 null 반환
 */
export async function imwebSearchMemberByEmail(email: string): Promise<{
  memberCode: string;
  email: string;
  name: string | null;
  phone: string | null;
  profileImg: string | null;
} | null> {
  try {
    // 아임웹 회원 목록 조회 (이메일로 검색)
    // 다양한 검색 파라미터 시도: search, email, keyword
    const searchParams = [
      `search=${encodeURIComponent(email)}`,
      `email=${encodeURIComponent(email)}`,
      `keyword=${encodeURIComponent(email)}`,
    ];
    
    for (const param of searchParams) {
      try {
        const response = await imwebGet(`/v2/member?${param}`);
        console.log(`[Imweb] Member search with ${param}:`, JSON.stringify(response).slice(0, 500));
        
        const responseObj = getObj(response);
        const dataObj = getObj(responseObj?.data);
        const list = getArr(dataObj?.list) ?? getArr(responseObj?.list) ?? [];
        
        // 이메일이 정확히 일치하는 회원 찾기
        for (const item of list) {
          const memberObj = getObj(item);
          const memberEmail = getStr(memberObj?.email);
          if (memberEmail && memberEmail.toLowerCase() === email.toLowerCase()) {
            const memberCode = getStr(memberObj?.member_code);
            if (!memberCode) continue;
            
            console.log(`[Imweb] Found member: ${memberCode} for email: ${email}`);
            return {
              memberCode,
              email: memberEmail,
              name: getStr(memberObj?.name),
              phone: getStr(memberObj?.call) ?? getStr(memberObj?.phone),
              profileImg: getStr(memberObj?.profile_img),
            };
          }
        }
      } catch (searchError) {
        console.log(`[Imweb] Search with ${param} failed:`, searchError);
        continue;
      }
    }
    
    // 검색으로 못 찾으면, 전체 회원 목록에서 찾기 시도 (페이지네이션 처리)
    console.log(`[Imweb] Trying full member list for: ${email}`);
    try {
      let page = 1;
      const limit = 100;
      let hasMore = true;
      
      while (hasMore && page <= 10) { // 최대 10페이지 (1000명)까지만
        const response = await imwebGet(`/v2/member?page=${page}&limit=${limit}`);
        const responseObj = getObj(response);
        const dataObj = getObj(responseObj?.data);
        const list = getArr(dataObj?.list) ?? getArr(responseObj?.list) ?? [];
        
        if (list.length === 0) {
          hasMore = false;
          break;
        }
        
        for (const item of list) {
          const memberObj = getObj(item);
          const memberEmail = getStr(memberObj?.email);
          if (memberEmail && memberEmail.toLowerCase() === email.toLowerCase()) {
            const memberCode = getStr(memberObj?.member_code);
            if (!memberCode) continue;
            
            console.log(`[Imweb] Found member in full list: ${memberCode} for email: ${email}`);
            return {
              memberCode,
              email: memberEmail,
              name: getStr(memberObj?.name),
              phone: getStr(memberObj?.call) ?? getStr(memberObj?.phone),
              profileImg: getStr(memberObj?.profile_img),
            };
          }
        }
        
        page++;
        if (list.length < limit) hasMore = false;
      }
    } catch (listError) {
      console.error("[Imweb] Full member list error:", listError);
    }
    
    console.log(`[Imweb] Member not found for email: ${email}`);
    return null;
  } catch (error) {
    console.error("[Imweb] Member search error:", error);
    return null;
  }
}

function getObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function getStr(v: unknown): string | null {
  return typeof v === "string" && v.length ? v : null;
}

function getArr(v: unknown): unknown[] | null {
  return Array.isArray(v) ? v : null;
}

/**
 * 아임웹 회원 정보를 DB User에 동기화
 * - 회원 생성/수정 웹훅 이벤트 발생 시 호출
 * - 이름, 전화번호, 프로필 이미지 등을 저장
 */
export async function syncImwebMemberToUser(memberCode: string) {
  const memberData = await imwebFetchMember(memberCode);
  const memberObj = getObj(memberData);
  const dataObj = getObj(memberObj?.data);
  
  // 다양한 응답 포맷 방어적 처리
  const email = getStr(dataObj?.email) ?? getStr(memberObj?.email);
  const name = getStr(dataObj?.name) ?? getStr(memberObj?.name);
  const phone = getStr(dataObj?.call) ?? getStr(dataObj?.phone) ?? getStr(memberObj?.call);
  const profileImg = getStr(dataObj?.profile_img) ?? getStr(memberObj?.profile_img);
  
  if (!email) {
    throw new Error(`Member missing email: ${JSON.stringify(memberData)}`);
  }
  
  // User upsert: 이메일 기준으로 생성 또는 업데이트
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      imwebMemberCode: memberCode,
      name: name || undefined,
      phone: phone || undefined,
      profileImageUrl: profileImg || undefined,
    },
    create: {
      email: email.toLowerCase(),
      imwebMemberCode: memberCode,
      name: name || null,
      phone: phone || null,
      profileImageUrl: profileImg || null,
    },
  });
  
  return { ok: true, userId: user.id, email: user.email, name: user.name } as const;
}

export async function syncImwebOrderToEnrollments(orderNo: string) {
  const order = await imwebFetchOrder(orderNo);
  const orderObj = getObj(order);
  const orderDataObj = getObj(orderObj?.data);
  const ordererObj = getObj(orderObj?.orderer) ?? getObj(orderDataObj?.orderer);

  // 다양한 응답 포맷을 방어적으로 처리
  const memberCode =
    getStr(orderObj?.member_code) ??
    getStr(orderDataObj?.member_code) ??
    getStr(ordererObj?.member_code);
  const email = getStr(ordererObj?.email) ?? getStr(orderObj?.email);
  const status = getStr(orderObj?.status) ?? getStr(orderObj?.tatu) ?? getStr(orderDataObj?.status);

  if (!email) throw new Error(`Order missing email: ${JSON.stringify(order)}`);

  // 결제 완료만 반영(필요 시 확장 가능)
  if (status) {
    const allow = ["PAY_COMPLETE", "COMPLETE", "PURCHASE_CONFIRMATION"];
    if (!allow.includes(status)) {
      return { ok: true, skipped: true, reason: `STATUS_${status}` } as const;
    }
  }

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { imwebMemberCode: typeof memberCode === "string" ? memberCode : undefined },
    create: { email: email.toLowerCase(), imwebMemberCode: typeof memberCode === "string" ? memberCode : null },
  });

  const prodOrders = await imwebFetchProdOrders(orderNo);
  const prodOrdersObj = getObj(prodOrders);
  const prodOrdersDataObj = getObj(prodOrdersObj?.data);
  const items =
    getArr(prodOrdersObj?.list) ??
    getArr(prodOrdersDataObj?.list) ??
    getArr(prodOrdersObj?.prod_orders) ??
    getArr(prodOrdersDataObj?.prod_orders) ??
    [];

  const matchedCourses: { courseId: string; by: string }[] = [];
  const matchedTextbooks: { textbookId: string; by: string }[] = [];

  for (const rawIt of items) {
    const it = getObj(rawIt);
    const productObj = getObj(it?.product);

    const prodCode =
      getStr(it?.prod_custom_code) ??
      getStr(it?.prod_cu_tom_code) ??
      getStr(productObj?.prod_custom_code);

    // 아임웹 '상품 코드(prod_custom_code)'만 지원
    if (!prodCode) continue;
    const by = `code:${prodCode}`;

    // 1) 강좌 매칭 → Enrollment 부여 (같은 상품 코드가 여러 강좌에 있을 수 있음)
    const courseCodes = await prisma.courseImwebProdCode.findMany({
      where: { code: prodCode },
      select: { courseId: true, course: { select: { enrollmentDays: true } } },
    });
    for (const courseCode of courseCodes) {
      const startAt = new Date();
      const days = courseCode.course?.enrollmentDays ?? 365;
      const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);
      await prisma.enrollment.upsert({
        where: { userId_courseId: { userId: user.id, courseId: courseCode.courseId } },
        update: { status: "ACTIVE", startAt, endAt },
        create: { userId: user.id, courseId: courseCode.courseId, status: "ACTIVE", startAt, endAt },
      });
      matchedCourses.push({ courseId: courseCode.courseId, by });
    }

    // 2) 교재 매칭 → TextbookEntitlement 부여 (같은 상품 코드가 여러 교재에 있을 수 있음)
    const textbooks = await prisma.textbook.findMany({
      where: { imwebProdCode: prodCode },
      select: { id: true, entitlementDays: true },
    });
    for (const textbook of textbooks) {
      const startAt = new Date();
      const days = textbook.entitlementDays ?? 365;
      const endAt = new Date(startAt.getTime() + days * 24 * 60 * 60 * 1000);
      await prisma.textbookEntitlement.upsert({
        where: { userId_textbookId: { userId: user.id, textbookId: textbook.id } },
        update: { status: "ACTIVE", startAt, endAt, orderNo },
        create: { userId: user.id, textbookId: textbook.id, status: "ACTIVE", startAt, endAt, orderNo },
      });
      matchedTextbooks.push({ textbookId: textbook.id, by });
    }
  }

  return { ok: true, userId: user.id, matchedCourses, matchedTextbooks } as const;
}


