"use client";

import { ApiClientError } from "@rebox/api-client";
import Image from "next/image";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AccountShell } from "../../../features/account-shell";
import { createBrowserApiClient } from "../../../platform/api/browser";
import { getSupabaseBrowserClient } from "../../../platform/auth/browser";

const api = createBrowserApiClient();

type ProfileData = {
  username: string;
  email: string;
  phone: string;
  fullName: string;
  gender: string;
  birthday: string;
  avatarUrl: string;
};

const emptyProfile: ProfileData = {
  username: "Tài khoản",
  email: "",
  phone: "",
  fullName: "",
  gender: "",
  birthday: "",
  avatarUrl: ""
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [avatarFile, setAvatarFile] = useState<File>();
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data, error: authError }, actor] = await Promise.all([supabase.auth.getUser(), api.getMe()]);
        if (authError || !data.user) throw authError ?? new Error("Unauthenticated");
        const ownerShop = actor.shops.find((shop) => shop.role === "OWNER" && shop.membershipStatus === "ACTIVE");
        const kyc = ownerShop?.kycId ? await api.getKycStatus(ownerShop.kycId) : undefined;
        const metadata = data.user.user_metadata as Record<string, unknown>;
        const email = data.user.email ?? "";
        const username = email.split("@")[0] || "Tài khoản";
        setProfile({
          username,
          email,
          phone: data.user.phone ?? "",
          fullName: metadataString(metadata, "full_name") || kyc?.identity.fullName || username,
          gender: metadataString(metadata, "gender") || kyc?.identity.gender || "",
          birthday: metadataString(metadata, "date_of_birth") || kyc?.identity.dateOfBirth || "",
          avatarUrl: metadataString(metadata, "avatar_url")
        });
      } catch (caught) {
        setError(caught instanceof ApiClientError && caught.status === 401
          ? "Bạn cần đăng nhập để xem hồ sơ."
          : "Không thể tải hồ sơ từ cơ sở dữ liệu.");
      } finally {
        setLoading(false);
      }
    }
    void loadProfile();
  }, []);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(undefined);
    setNotice(undefined);
    try {
      const supabase = getSupabaseBrowserClient();
      let avatarUrl = profile.avatarUrl;
      if (avatarFile) {
        const key = await api.uploadSellerDocument("AVATAR", avatarFile);
        avatarUrl = supabase.storage.from("catalog-media").getPublicUrl(key).data.publicUrl;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: profile.fullName.trim(),
          gender: profile.gender,
          date_of_birth: profile.birthday,
          avatar_url: avatarUrl
        }
      });
      if (updateError) throw updateError;
      setProfile((current) => ({ ...current, avatarUrl }));
      setAvatarFile(undefined);
      setNotice("Đã lưu hồ sơ.");
    } catch {
      setError("Không thể lưu hồ sơ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  }

  function selectAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 1024 * 1024) {
      setError("Ảnh phải là JPEG hoặc PNG và không quá 1 MB.");
      return;
    }
    setError(undefined);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  const initials = profileInitials(profile.fullName || profile.username);

  return (
    <AccountShell activeHref="/account/profile" initials={initials} username={profile.username}>
      <section className="h-[574px] w-[780px] max-w-full overflow-hidden border border-[var(--line)] bg-white px-[30px] py-5 md:-ml-5">
        <h1 className="text-xl font-normal">Hồ sơ của tôi</h1>
        <div className="mt-[10px] h-px bg-[var(--line)]" />
        {loading ? <p className="mt-6 text-sm text-[var(--muted)]">Đang tải hồ sơ...</p> : (
          <form className="flex h-[430px] w-full items-start" onSubmit={saveProfile}>
            <div className="flex h-[420px] min-w-0 flex-1 flex-col gap-1.5 pt-2 text-[13px]">
              {error ? <p className="rounded bg-red-50 px-3 py-2 text-red-700" role="alert">{error}</p> : null}
              {notice ? <p className="rounded bg-emerald-50 px-3 py-2 text-emerald-700" role="status">{notice}</p> : null}
              <ProfileRow label="Tên đăng nhập"><strong className="font-medium">{profile.username}</strong></ProfileRow>
              <ProfileRow label="Tên">
                <input aria-label="Tên" className="h-10 w-[340px] max-w-full border border-[var(--line)] bg-white px-3.5 text-sm" maxLength={120} required value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} />
              </ProfileRow>
              <ProfileRow label="Email"><span className="text-[var(--accent)]">{profile.email || "Thêm"}</span></ProfileRow>
              <ProfileRow label="Số điện thoại"><span className="text-[var(--accent)]">{maskPhone(profile.phone) || "Chưa thêm"}</span></ProfileRow>
              <ProfileRow label="Giới tính">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {["Nam", "Nữ", "Khác"].map((gender) => (
                    <label className="flex items-center gap-1.5" key={gender}>
                      <input checked={profile.gender.toLocaleLowerCase("vi") === gender.toLocaleLowerCase("vi")} name="gender" onChange={() => setProfile((current) => ({ ...current, gender }))} type="radio" />
                      {gender}
                    </label>
                  ))}
                </div>
              </ProfileRow>
              <ProfileRow label="Ngày sinh"><span className="text-[var(--accent)]">{profile.birthday || "Chưa thêm"}</span></ProfileRow>
              <div className="flex h-[46px] items-center pl-[138px]">
                <button className="h-10 w-[70px] bg-[var(--accent-header)] text-sm font-bold text-white disabled:opacity-60" disabled={saving} type="submit">{saving ? "LƯU…" : "LƯU"}</button>
              </div>
            </div>
            <div className="flex h-[420px] w-[220px] shrink-0 flex-col items-center justify-center gap-3 border-l border-[var(--line)] pt-2 max-md:hidden">
              <div className="relative grid size-[100px] place-items-center overflow-hidden rounded-full bg-[var(--accent-soft)] text-[26px] font-bold text-[var(--accent)]">
                {avatarPreview || profile.avatarUrl ? <Image alt="Ảnh đại diện" className="object-cover" fill sizes="100px" src={avatarPreview || profile.avatarUrl} unoptimized /> : initials}
              </div>
              <label className="grid h-10 w-[105px] cursor-pointer place-items-center border border-[var(--line)] bg-white text-sm font-bold">
                Chọn ảnh
                <input accept="image/jpeg,image/png" className="sr-only" type="file" onChange={(event) => selectAvatar(event.target.files?.[0])} />
              </label>
              <p className="w-[180px] text-center text-[11px] leading-4 text-[var(--muted)]">Dung lượng tối đa 1 MB<br />Định dạng: JPEG, PNG</p>
            </div>
          </form>
        )}
      </section>
    </AccountShell>
  );
}

function ProfileRow({ children, label }: { children: ReactNode; label: string }) {
  return <div className="flex min-h-11 items-center gap-[18px]"><span className="w-[120px] shrink-0 text-right text-[var(--muted)]">{label}</span><div className="min-w-0">{children}</div></div>;
}

function metadataString(metadata: Record<string, unknown>, key: string): string {
  return typeof metadata[key] === "string" ? metadata[key].trim() : "";
}

function maskPhone(phone: string): string {
  return phone ? `${"*".repeat(Math.max(0, phone.length - 2))}${phone.slice(-2)}` : "";
}

function profileInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : parts[0]?.slice(0, 2) || "US").toUpperCase();
}
