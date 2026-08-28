"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cartGroups, formatPrice, type CartGroup } from "../../features/commerce-data";
import { ProductVisual } from "../../features/commerce-ui";

function SelectionBox({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <input
      aria-label={label}
      checked={checked}
      className="size-[18px] shrink-0 accent-[var(--accent)]"
      onChange={onChange}
      type="checkbox"
    />
  );
}

function CartProduct({
  group,
  quantity,
  selected,
  onQuantityChange,
  onSelect
}: {
  group: CartGroup;
  quantity: number;
  selected: boolean;
  onQuantityChange: (quantity: number) => void;
  onSelect: () => void;
}) {
  const { product } = group;

  return (
    <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.08)] xl:h-[185px]">
      <div className="grid h-[52px] grid-cols-[18px_1fr_auto] items-center gap-3 px-5">
        <SelectionBox checked={selected} label={`Chọn sản phẩm của ${group.shopName}`} onChange={onSelect} />
        <Link className="text-sm font-medium hover:text-[var(--accent)]" href="/shops/rebox-official-store">{group.shopName}</Link>
        <Link className="text-xs font-medium text-[var(--accent)]" href="/shops/rebox-official-store">Xem shop</Link>
      </div>
      <div className="h-px bg-[#e7edf5]" />
      <div className="grid min-h-[132px] gap-4 px-5 py-4 xl:grid-cols-[18px_88px_minmax(0,572px)_110px_120px_120px_100px] xl:items-center">
        <SelectionBox checked={selected} label={`Chọn ${product.title}`} onChange={onSelect} />
        <ProductVisual className={`size-[88px] text-[17px] ${group.id === "official-tech" ? "bg-[#5c91c9]" : "bg-[#4f7dc2]"}`} label={product.visualLabel} />
        <div className="min-w-0 self-stretch">
          <Link className="text-sm leading-5 hover:text-[var(--accent)]" href={`/listings/${product.id}`}>{product.title}</Link>
          <p className="mt-1 text-xs leading-[18px] text-[var(--muted)]">Phân loại: {product.variant}</p>
        </div>
        <div className="text-sm font-medium xl:w-[110px]">
          <span className="mr-2 text-xs text-[var(--muted)] xl:hidden">Đơn giá:</span>{formatPrice(product.price)}
        </div>
        <div className="flex h-[34px] w-[120px] overflow-hidden rounded-[5px] border border-[var(--line)] bg-white">
          <button aria-label={`Giảm số lượng ${product.title}`} className="grid w-[34px] place-items-center text-base text-[var(--muted)]" onClick={() => onQuantityChange(Math.max(1, quantity - 1))} type="button">−</button>
          <span className="grid w-[50px] place-items-center border-x border-[var(--line)] text-sm font-medium">{quantity}</span>
          <button aria-label={`Tăng số lượng ${product.title}`} className="grid w-[34px] place-items-center text-base text-[var(--muted)]" onClick={() => onQuantityChange(quantity + 1)} type="button">+</button>
        </div>
        <strong className="text-sm font-medium text-[var(--accent)]">
          <span className="mr-2 text-xs font-normal text-[var(--muted)] xl:hidden">Số tiền:</span>{formatPrice(product.price * quantity)}
        </strong>
        <div className="flex items-center gap-4 text-xs xl:flex-col xl:gap-1 xl:text-center">
          <button type="button">Xóa</button>
          <button className="text-[11px] font-medium text-[var(--accent)]" type="button">Tìm tương tự</button>
        </div>
      </div>
    </section>
  );
}

export default function CartPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(cartGroups.map(({ id }) => [id, 1])));
  const allSelected = selectedIds.length === cartGroups.length;
  const total = cartGroups.reduce((sum, group) => selectedIds.includes(group.id) ? sum + group.product.price * (quantities[group.id] ?? 1) : sum, 0);

  function toggleItem(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]);
  }

  function toggleAll() {
    setSelectedIds(allSelected ? [] : cartGroups.map(({ id }) => id));
  }

  return (
    <main className="flex min-h-[calc(100vh-132px)] flex-col gap-3 bg-[var(--paper)] px-4 pb-[240px] pt-5 sm:px-6 xl:px-0 xl:pb-[140px]">
      <div className="rebox-container flex flex-1 flex-col gap-3">
        <div className="hidden h-[54px] grid-cols-[18px_minmax(0,676px)_110px_120px_120px_100px] items-center gap-4 rounded-lg border border-[var(--line)] bg-white px-5 text-[13px] shadow-[0_3px_10px_rgba(16,40,69,0.08)] xl:grid">
          <SelectionBox checked={allSelected} label="Chọn tất cả sản phẩm" onChange={toggleAll} />
          <strong className="font-medium">Sản phẩm</strong>
          <span className="text-[var(--muted)]">Đơn giá</span>
          <span className="text-[var(--muted)]">Số lượng</span>
          <span className="text-[var(--muted)]">Số tiền</span>
          <span className="text-[var(--muted)]">Thao tác</span>
        </div>

        {cartGroups.map((group) => (
          <CartProduct
            group={group}
            key={group.id}
            onQuantityChange={(quantity) => setQuantities((current) => ({ ...current, [group.id]: quantity }))}
            onSelect={() => toggleItem(group.id)}
            quantity={quantities[group.id] ?? 1}
            selected={selectedIds.includes(group.id)}
          />
        ))}

        <aside className="fixed bottom-0 left-1/2 z-30 w-[calc(100%-2rem)] max-w-[1264px] -translate-x-1/2 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_-2px_10px_rgba(16,40,69,0.08)] xl:grid xl:h-[116px] xl:grid-rows-[46px_1px_1fr] min-[1440px]:left-[calc((100vw-1264px)/2)] min-[1440px]:translate-x-0">
          <div className="flex min-h-[46px] items-center justify-end gap-2 px-5 text-sm">
            <Image alt="" aria-hidden height={14} src="/rebox/voucher.svg" width={18} />
            <span className="mr-auto xl:mr-0 xl:w-[150px]">REBOX Voucher</span>
            <button className="text-[13px] text-[var(--accent)] xl:ml-[196px] xl:w-[150px] xl:text-right" type="button">Chọn hoặc nhập mã</button>
          </div>
          <div className="h-px bg-[#e7edf5]" />
          <div className="flex min-h-16 flex-wrap items-center gap-x-7 gap-y-3 px-5 py-2 text-sm">
            <SelectionBox checked={allSelected} label="Chọn tất cả" onChange={toggleAll} />
            <button type="button">Chọn Tất Cả</button>
            <button type="button">Xóa</button>
            <button className="hidden sm:block" type="button">Bỏ sản phẩm không hoạt động</button>
            <button className="text-[var(--accent)]" type="button">Lưu vào mục Đã thích</button>
            <div className="ml-auto flex items-center gap-2 text-right">
              <span>Tổng cộng ({selectedIds.length} sản phẩm):</span>
              <strong className="text-xl font-medium text-[var(--accent)]">{formatPrice(total)}</strong>
            </div>
            <Link className="flex h-[42px] w-full items-center justify-center rounded bg-[var(--accent-strong)] font-medium text-white sm:w-[220px]" href="/checkout">Mua Hàng</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
