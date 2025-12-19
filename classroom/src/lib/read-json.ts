export async function readJsonBody(req: Request): Promise<unknown | null> {
  // Next/Turbopack 환경에서 req.json()이 비정상 동작하는 케이스가 있어
  // 텍스트로 읽어서 직접 파싱(안정성 우선)
  const raw = await req.text().catch(() => "");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}


