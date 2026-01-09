import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import ProfileEditForm from "./profile-edit-form";

export default async function MyPageEditPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/mypage/edit");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      address: true,
      addressDetail: true,
      birthday: true,
    },
  });

  return (
    <div>
      <h1 className="text-[22px] font-bold">정보 수정</h1>
      <p className="text-[14px] text-white/60 mt-2">회원 정보를 수정할 수 있습니다.</p>

      <div className="mt-6">
        <ProfileEditForm
          initial={{
            name: profile?.name || "",
            email: profile?.email || user.email,
            phone: profile?.phone || "",
            address: profile?.address || "",
            addressDetail: profile?.addressDetail || "",
            birthday: profile?.birthday || "",
          }}
        />
      </div>
    </div>
  );
}

