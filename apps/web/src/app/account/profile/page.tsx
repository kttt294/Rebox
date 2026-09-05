"use client";

import { ApiClientError } from "@rebox/api-client";
import type { ActorContext } from "@rebox/shared";
import { useEffect, useState } from "react";
import { AccountShell } from "../../../features/account-shell";
import { createBrowserApiClient } from "../../../platform/api/browser";

const api = createBrowserApiClient();

export default function ProfilePage() {
  const [actor, setActor] = useState<ActorContext>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api.getMe().then(setActor).catch((caught) => {
      setError(caught instanceof ApiClientError && caught.status === 401
        ? "Bạn cần đăng nhập để xem hồ sơ."
        : "Không thể tải hồ sơ từ cơ sở dữ liệu.");
    });
  }, []);

  return (
    <AccountShell activeHref="/account/profile">
      <section className="min-h-[574px] w-[780px] max-w-full border border-[var(--line)] bg-white px-[30px] py-5 md:-ml-5">
        <h1 className="text-xl font-normal">Hồ sơ của tôi</h1>
        <div className="mt-4 h-px bg-[var(--line)]" />
        {error ? <p className="mt-6 rounded-md bg-amber-50 p-4 text-amber-800">{error}</p> : actor ? (
          <dl className="mt-6 grid gap-4 text-sm">
            <div><dt className="text-[var(--muted)]">User ID</dt><dd className="mt-1 font-medium">{actor.id}</dd></div>
            <div><dt className="text-[var(--muted)]">Trạng thái profile</dt><dd className="mt-1 font-medium">{actor.profileStatus ?? "Chưa có profile"}</dd></div>
            <div><dt className="text-[var(--muted)]">Số shop có quyền truy cập</dt><dd className="mt-1 font-medium">{actor.shops.length}</dd></div>
          </dl>
        ) : <p className="mt-6 text-sm text-[var(--muted)]">Đang tải hồ sơ...</p>}
      </section>
    </AccountShell>
  );
}
