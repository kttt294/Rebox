import Link from "next/link";
import { cartGroups, formatPrice } from "../../features/commerce-data";
import { ProductVisual, ReboxBadge } from "../../features/commerce-ui";

const checkoutProduct = cartGroups[0]!.product;

export default function CheckoutPage() {
  return (
    <main className="min-h-[calc(100vh-132px)] bg-[var(--paper)] px-4 pb-10 pt-5 sm:px-6 xl:px-0">
      <div className="rebox-container flex flex-col">
        <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.06)] xl:h-[122px]">
          <div className="h-[3px]" style={{ backgroundImage: "repeating-linear-gradient(90deg, #4c83d4 0 42px, transparent 42px 64px, #eef5fd 64px 106px, transparent 106px 128px)" }} />
          <div className="px-[27px] pb-7 pt-[21px]">
            <h1 className="text-lg font-medium text-[var(--accent)]">Địa Chỉ Nhận Hàng</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-[22px] gap-y-2 text-sm xl:relative xl:block xl:h-6">
              <strong className="min-w-[244px] xl:absolute xl:left-0 xl:top-0">Nguyễn Minh Anh&nbsp; (+84) 9xx xxx xxx</strong>
              <span className="xl:absolute xl:left-[322px] xl:top-0">Cầu Giấy, Hà Nội</span>
              <span className="rounded border border-[var(--line)] bg-[var(--accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--accent)] xl:absolute xl:-top-[3px] xl:left-[437px] xl:h-6 xl:w-[70px] xl:px-0 xl:text-center">Mặc định</span>
              <button className="ml-auto font-medium text-[var(--accent)] xl:absolute xl:-top-[5px] xl:left-[1124px] xl:ml-0 xl:w-[100px] xl:text-left" type="button">Thay đổi</button>
            </div>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.05)] xl:h-[375px]">
          <div className="hidden h-14 grid-cols-[732px_120px_78px_100px_70px_108px] items-center border-b border-[var(--line)] px-7 xl:grid">
            <h2 className="text-base font-medium">Sản phẩm</h2>
            <span className="col-start-2 text-[13px] text-[var(--muted)]">Đơn giá</span>
            <span className="col-start-4 text-center text-[13px] text-[var(--muted)]">Số lượng</span>
            <span className="col-start-6 text-right text-[13px] text-[var(--muted)]">Thành tiền</span>
          </div>
          <div className="flex h-12 items-center gap-2.5 border-b border-[var(--line)] px-7">
            <ReboxBadge className="h-[22px] w-[70px]">Yêu thích</ReboxBadge>
            <Link className="min-w-0 flex-1 text-sm font-medium hover:text-[var(--accent)] xl:w-[220px] xl:flex-none" href="/shops/rebox-official-store">REBOX Official Store</Link>
            <Link className="ml-2 whitespace-nowrap text-[13px] font-medium text-[var(--accent)]" href="/shops/rebox-official-store">Xem shop</Link>
          </div>
          <div className="grid min-h-[132px] items-center gap-4 px-7 py-[22px] xl:grid-cols-[86px_16px_598px_32px_120px_78px_100px_70px_108px] xl:gap-0">
            <ProductVisual className="size-[86px] bg-[var(--accent-header)] text-lg xl:col-start-1" label="TECH" />
            <div className="min-w-0 self-start xl:col-start-3">
              <Link className="text-sm leading-5 hover:text-[var(--accent)]" href={`/listings/${checkoutProduct.id}`}>{checkoutProduct.title}</Link>
              <p className="mt-1 text-xs text-[var(--muted)]">Phân loại: {checkoutProduct.variant}</p>
              <ReboxBadge className="mt-3 h-[22px] w-[82px]">REBOX DEAL</ReboxBadge>
            </div>
            <strong className="text-sm text-[var(--accent)] xl:col-start-5 xl:mt-[28px] xl:self-start">299.000đ</strong>
            <span className="text-sm xl:col-start-7 xl:mt-7 xl:self-start xl:text-center"><span className="mr-2 text-xs text-[var(--muted)] xl:hidden">Số lượng:</span>1</span>
            <strong className="text-sm xl:col-start-9 xl:mt-7 xl:self-start xl:text-right"><span className="mr-2 text-xs font-normal text-[var(--muted)] xl:hidden">Thành tiền:</span>299.000đ</strong>
          </div>
          <div className="grid min-h-[79px] border-t border-[var(--line)] bg-[#f8fafd] xl:grid-cols-[448px_1fr] xl:px-7">
            <label className="flex items-center gap-3 px-4 py-4 text-[13px] xl:px-0">
              <span className="w-[60px] shrink-0">Lời nhắn:</span>
              <input className="h-10 min-w-0 flex-1 rounded border border-[var(--line)] bg-white px-3 text-xs" placeholder="Lưu ý cho Người bán..." />
            </label>
            <div className="grid items-center gap-3 border-t border-[var(--line)] px-4 py-4 text-[13px] xl:grid-cols-[170px_8px_190px_214px_90px_62px] xl:gap-0 xl:border-l xl:border-t-0 xl:pl-[26px] xl:pr-0">
              <strong className="font-medium xl:col-start-1">Phương thức vận chuyển:</strong>
              <div className="xl:col-start-3"><span className="block">29 Thg 8 - 1 Thg 9</span><span className="mt-1 block text-[11px] text-[var(--muted)]">Nhanh</span></div>
              <button className="text-right text-xs font-medium text-[var(--accent)] xl:col-start-5" type="button">Thay đổi</button>
              <span className="text-right xl:col-start-6">16.500đ</span>
            </div>
          </div>
          <div className="flex min-h-[57px] items-center justify-end gap-6 border-t border-[var(--line)] px-7 text-right">
            <span className="text-[13px] text-[var(--muted)]">Tổng số tiền (1 sản phẩm):</span>
            <strong className="text-xl font-medium text-[var(--accent)]">311.999đ</strong>
          </div>
        </section>

        <section className="mt-2 flex h-14 items-center gap-3 bg-white px-7">
          <ReboxBadge className="size-[22px] shrink-0 font-bold">V</ReboxBadge>
          <h2 className="text-sm font-medium">REBOX Voucher</h2>
          <button className="ml-auto text-[13px] font-medium text-[var(--accent)]" type="button">Chọn Voucher</button>
        </section>

        <section className="overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-[0_3px_10px_rgba(16,40,69,0.05)] xl:h-[330px]">
          <div className="grid min-h-[72px] grid-cols-1 items-center gap-2 border-b border-[var(--line)] px-7 py-4 sm:h-[72px] sm:grid-cols-[1fr_auto_auto] sm:gap-4 sm:py-0 xl:grid-cols-[818px_250px_14px_126px] xl:gap-0">
            <h2 className="text-base font-medium">Phương thức thanh toán</h2>
            <span className="text-[13px] xl:col-start-2">Thanh toán khi nhận hàng</span>
            <button className="ml-4 w-[126px] text-right text-xs font-medium text-[var(--accent)] xl:col-start-4 xl:ml-0" type="button">THAY ĐỔI</button>
          </div>
          <div className="flex h-[174px] justify-end px-7 py-6">
            <dl className="grid w-full max-w-[376px] grid-cols-[1fr_156px] gap-y-3 text-[13px]">
              <dt className="text-[var(--muted)]">Tổng tiền hàng</dt><dd className="text-right">{formatPrice(299000)}</dd>
              <dt className="text-[var(--muted)]">Tổng tiền phí vận chuyển</dt><dd className="text-right">{formatPrice(16500)}</dd>
              <dt className="text-[var(--muted)]">Tổng cộng Voucher giảm giá</dt><dd className="text-right text-[#349267]">-{formatPrice(20000)}</dd>
              <dt className="self-center text-sm font-medium text-[var(--muted)]">Tổng thanh toán</dt><dd className="text-right text-[26px] font-medium leading-10 text-[var(--accent)]">{formatPrice(295500)}</dd>
            </dl>
          </div>
          <div className="flex h-[82px] flex-col items-stretch gap-4 border-t border-[var(--line)] px-7 py-4 sm:flex-row sm:items-center">
            <p className="text-xs text-[var(--muted)]">Nhấn “Đặt hàng” đồng nghĩa với việc bạn đồng ý với Điều khoản REBOX.</p>
            <button className="ml-auto h-12 w-full rounded-md bg-[var(--accent-strong)] text-sm font-medium text-white sm:w-52" type="button">Đặt hàng</button>
          </div>
        </section>
      </div>
    </main>
  );
}
