import Image from "next/image";
import { FinanceWorkspace, SellerShell } from "../../../features/seller-shell";

const metrics = [
  { label: "SỐ DƯ KÝ QUỸ KHẢ DỤNG", value: "300.000 VNĐ" },
  { label: "TẠM KHÓA ĐỐI SOÁT (AI HOLD)", value: "850.000 VNĐ" },
  { label: "TỔNG DOANH THU THỰC NHẬN", value: "432.000 VNĐ" }
];

const trend = [
  { month: "T1", value: "320.000đ", left: 71, pointTop: 190 },
  { month: "T2", value: "365.000đ", left: 273.4, pointTop: 156.1 },
  { month: "T3", value: "410.000đ", left: 475.8, pointTop: 122.2 },
  { month: "T4", value: "398.000đ", left: 678.2, pointTop: 131.2 },
  { month: "T5", value: "455.000đ", left: 880.6, pointTop: 88.3 },
  { month: "T6", value: "432.000đ", left: 1083, pointTop: 105.6 }
];

const products = [
  { label: "Sony XM4", value: "950.000đ", height: 106.4 },
  { label: "Jordan 4", value: "850.000đ", height: 95.2 },
  { label: "Váy Satin", value: "225.000đ", height: 25.2 },
  { label: "Phụ kiện", value: "180.000đ", height: 20.2 }
];

function MetricCards() {
  return (
    <div className="grid shrink-0 gap-3 lg:grid-cols-3 xl:grid-cols-[repeat(3,350px)]">
      {metrics.map((metric) => (
        <article className="flex h-[104px] flex-col gap-2 rounded-xl bg-white px-[18px] py-4 ring-1 ring-inset ring-[var(--line)]" key={metric.label}>
          <p className="text-[11px] font-medium text-[var(--muted)]">{metric.label}</p>
          <p className="text-2xl font-bold leading-normal text-[var(--ink)]">{metric.value}</p>
        </article>
      ))}
    </div>
  );
}

function RevenueTrend() {
  return (
    <article className="h-[270px] shrink-0 overflow-x-auto rounded-xl ring-1 ring-inset ring-[var(--line)]">
      <div className="relative h-[268px] min-w-[1122px]">
        <h2 className="absolute left-[19px] top-[17px] text-lg font-bold">Xu hướng doanh thu 6 tháng gần nhất</h2>
        <p className="absolute left-[19px] top-[43px] text-xs text-[var(--muted)]">Doanh thu thực nhận theo tháng</p>
        <div className="absolute inset-y-0 left-1/2 w-[1122px] -translate-x-1/2">
          {[81, 123.67, 166.33, 209].map((top) => <span className="absolute left-[71px] h-px w-[1012px] bg-[var(--line)]" key={top} style={{ top }} />)}
          <Image alt="Đường xu hướng doanh thu" className="absolute left-[71px] top-[92px] h-[102px] w-[1012px]" height={102} src="/rebox/finance-asset-5.svg" width={1012} />
          {trend.map((item) => (
            <div key={item.month}>
              <span className="absolute w-20 -translate-x-1/2 text-center text-[11px] font-medium" style={{ left: item.left, top: item.pointTop - 20 }}>{item.value}</span>
              <span className="absolute size-2 -translate-x-1/2 rounded-full bg-[var(--accent)]" style={{ left: item.left, top: item.pointTop }} />
              <span className="absolute top-[221px] w-11 -translate-x-1/2 text-center text-xs text-[var(--muted)]" style={{ left: item.left }}>{item.month}</span>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function RevenueByProduct() {
  return (
    <article className="relative h-full min-w-[556px] flex-1 rounded-xl ring-1 ring-inset ring-[var(--line)]">
      <h2 className="absolute left-[19px] top-[17px] text-lg font-bold">Doanh thu theo sản phẩm</h2>
      <p className="absolute left-[19px] top-[43px] text-xs text-[var(--muted)]">So sánh nhóm sản phẩm nổi bật</p>
      {[83, 124.33, 165.67, 207].map((top) => <span className="absolute left-[53px] right-[51px] h-px bg-[var(--line)]" key={top} style={{ top }} />)}
      <div className="absolute left-[39px] right-[69px] top-[83px] grid h-[156px] grid-cols-4">
        {products.map((product) => (
          <div className="relative" key={product.label}>
            <span className="absolute left-1/2 w-20 -translate-x-1/2 text-center text-[11px] font-medium" style={{ bottom: product.height + 36 }}>{product.value}</span>
            <span className="absolute bottom-8 left-1/2 w-12 -translate-x-1/2 rounded-[3px] bg-[var(--accent)]" style={{ height: product.height }} />
            <span className="absolute left-1/2 top-[138px] w-[92px] -translate-x-1/2 text-center text-[11px] text-[var(--muted)]">{product.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function FinancialComposition() {
  return (
    <article className="relative h-full w-[556px] shrink-0 rounded-xl ring-1 ring-inset ring-[var(--line)]">
      <h2 className="absolute left-[19px] top-[17px] text-lg font-bold">Cơ cấu tài chính</h2>
      <p className="absolute left-[19px] top-[43px] text-xs text-[var(--muted)]">Số dư khả dụng và khoản tạm khóa</p>
      <div className="absolute left-[61px] top-[81px] size-[150px]">
        <Image alt="" aria-hidden className="absolute inset-0" height={150} src="/rebox/finance-asset-3.svg" width={150} />
        <Image alt="" aria-hidden className="absolute left-[75px] top-0" height={80} src="/rebox/finance-asset-2.svg" width={75} />
      </div>
      <strong className="absolute left-[146px] top-[113px] w-12 text-center text-lg">26%</strong>
      <strong className="absolute left-[78px] top-[177px] w-12 text-center text-lg">74%</strong>
      <span className="absolute left-[257px] top-[95px] size-3 rounded-sm bg-[var(--accent)]" />
      <p className="absolute left-[279px] top-[90px] text-[13px] font-medium">Số dư khả dụng</p>
      <p className="absolute left-[279px] top-[111px] text-[13px] text-[var(--muted)]">300.000 VNĐ (26%)</p>
      <span className="absolute left-[257px] top-[153px] size-3 rounded-sm border border-[var(--line)] bg-[var(--accent-soft)]" />
      <p className="absolute left-[279px] top-[148px] text-[13px] font-medium">Tạm khóa đối soát</p>
      <p className="absolute left-[279px] top-[169px] text-[13px] text-[var(--muted)]">850.000 VNĐ (74%)</p>
      <p className="absolute left-[257px] top-[209px] text-[13px] font-bold">Tổng tài chính: 1.150.000 VNĐ</p>
    </article>
  );
}

export default function SellerFinancePage() {
  return (
    <SellerShell>
      <FinanceWorkspace active="overview">
        <MetricCards />
        <div className="flex h-[562px] max-h-[562px] min-h-0 flex-1 flex-col gap-3">
          <RevenueTrend />
          <div className="flex h-[280px] min-h-0 flex-1 gap-3 overflow-x-auto overflow-y-hidden">
            <RevenueByProduct />
            <FinancialComposition />
          </div>
        </div>
      </FinanceWorkspace>
    </SellerShell>
  );
}
