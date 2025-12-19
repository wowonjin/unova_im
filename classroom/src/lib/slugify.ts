export function slugify(input: string) {
  const s = (input || "").trim().toLowerCase();
  if (!s) return "";
  // 한글/특수문자는 제거하고, 공백/구분자는 하이픈으로
  const ascii = s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // diacritics
    .replace(/[^a-z0-9\s-_]+/g, " ")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii;
}


