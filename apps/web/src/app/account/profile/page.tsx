import type { ReactNode } from "react";
import { AccountShell } from "../../../features/account-shell";

function ProfileRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex min-h-11 items-center gap-[18px] text-[13px] max-sm:flex-col max-sm:items-stretch max-sm:gap-1 max-sm:py-2">
      <span className="w-[120px] shrink-0 text-right text-[var(--muted)] max-sm:w-auto max-sm:text-left">{label}</span>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AccountShell activeHref="/account/profile">
      <section className="min-h-[574px] w-[780px] max-w-full border border-[var(--line)] bg-white px-[30px] py-5 md:-ml-5">
          <h1 className="text-xl font-normal">Hồ sơ của tôi</h1>
          <p className="mt-1.5 text-xs text-[var(--muted)]">Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
          <div className="mt-2.5 h-px bg-[var(--line)]" />
          <div className="flex min-h-[430px] max-sm:flex-col">
            <form className="w-[500px] max-w-full py-2.5">
              <ProfileRow label="Tên đăng nhập"><strong className="font-medium">username</strong></ProfileRow>
              <ProfileRow label="Tên"><input className="h-10 w-[340px] max-w-full border border-[var(--line)] px-3.5 text-sm" defaultValue="User Name" name="fullName" /></ProfileRow>
              <ProfileRow label="Email"><button className="text-[var(--accent)] hover:underline" type="button">Thêm</button></ProfileRow>
              <ProfileRow label="Số điện thoại"><span className="text-[var(--accent)]">*********11&nbsp;&nbsp; <button className="hover:underline" type="button">Thay đổi</button></span></ProfileRow>
              <ProfileRow label="Giới tính">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {(["Nam", "Nữ", "Khác"] as const).map((gender, index) => <label className="flex items-center gap-1.5" key={gender}><input className="size-4 accent-[var(--accent)]" defaultChecked={index === 0} name="gender" type="radio" value={gender} />{gender}</label>)}
                </div>
              </ProfileRow>
              <ProfileRow label="Ngày sinh"><span className="text-[var(--accent)]">**/**/2000&nbsp;&nbsp; <button className="hover:underline" type="button">Thay đổi</button></span></ProfileRow>
              <div className="flex h-[46px] items-center pl-[138px] max-sm:pl-0"><button className="h-10 w-[70px] bg-[var(--accent-header)] text-sm font-bold text-white hover:bg-[var(--accent-strong)]" type="button">LƯU</button></div>
            </form>

            <aside className="flex min-h-[420px] w-[220px] shrink-0 flex-col items-center justify-center gap-3 border-l border-[var(--line)] max-sm:min-h-[260px] max-sm:w-full max-sm:border-l-0 max-sm:border-t">
              <span className="grid size-[100px] place-items-center rounded-full bg-[var(--accent-soft)] text-[26px] font-bold text-[var(--accent)]">US</span>
              <label className="flex h-10 w-[105px] cursor-pointer items-center justify-center border border-[var(--line)] text-sm font-bold hover:bg-[var(--paper)]">Chọn ảnh<input accept="image/jpeg,image/png" className="sr-only" type="file" /></label>
              <p className="text-center text-[11px] leading-4 text-[var(--muted)]">Dung lượng tối đa 1 MB<br />Định dạng: JPEG, PNG</p>
            </aside>
          </div>
      </section>
    </AccountShell>
  );
}
