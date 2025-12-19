import { imwebFetchMember } from "@/lib/imweb";

type ImwebProfile = {
  displayName: string;
  avatarUrl: string | null;
};

function getObj(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function pickString(...vals: unknown[]) {
  for (const v of vals) if (typeof v === "string" && v.trim().length) return v.trim();
  return null;
}

export async function getImwebProfile(memberCode: string): Promise<ImwebProfile | null> {
  try {
    const raw = await imwebFetchMember(memberCode);
    const o = getObj(raw);
    const data = getObj(o?.data) ?? o;

    const displayName =
      pickString(data?.name, data?.member_name, data?.nickname, data?.nick, data?.user_name) ?? "회원";
    const avatarUrl = pickString(
      data?.profile_image,
      data?.profile_img,
      data?.profileImage,
      data?.profileUrl,
      data?.avatar,
      data?.avatar_url
    );

    return { displayName, avatarUrl };
  } catch {
    return null;
  }
}


