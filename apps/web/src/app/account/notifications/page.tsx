import { AccountShell } from "../../../features/account-shell";

const importantNotice = "Thông báo và nhắc nhở quan trọng về tài khoản sẽ không thể bị tắt";

const notificationGroups = [
  {
    title: "Email thông báo",
    items: [
      { title: "Cập nhật đơn hàng", description: "Cập nhật về tình trạng vận chuyển của tất cả các đơn hàng", enabled: true },
      { title: "Khuyến mãi", description: "Cập nhật về các ưu đãi và khuyến mãi sắp tới", enabled: false },
      { title: "Khảo sát", description: "Đồng ý nhận khảo sát để cho chúng tôi được lắng nghe bạn", enabled: true }
    ]
  },
  {
    title: "Thông báo SMS",
    items: [
      { title: "Khuyến mãi", description: "Cập nhật về các ưu đãi và khuyến mãi sắp tới", enabled: false }
    ]
  },
  {
    title: "Thông báo Zalo",
    items: [
      { title: "Khuyến mãi (REBOX Việt Nam)", description: "Cập nhật về các ưu đãi và khuyến mãi sắp tới", enabled: true }
    ]
  }
];

function NotificationSwitch({ defaultChecked, disabled = false, label }: { defaultChecked: boolean; disabled?: boolean; label: string }) {
  return (
    <label className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
      <input aria-label={label} className="peer sr-only" defaultChecked={defaultChecked} disabled={disabled} type="checkbox" />
      <span className="relative block h-7 w-12 rounded-full bg-[#e3e6eb] transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-6 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-[var(--accent-header)] peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[rgb(71_124_195_/_24%)]" />
    </label>
  );
}

function NotificationItem({ description, enabled, title }: { description: string; enabled: boolean; title: string }) {
  return (
    <div className="flex min-h-[58px] items-start gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-normal">{title}</h2>
        <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">{description}</p>
      </div>
      <div className="ml-auto shrink-0 pt-1"><NotificationSwitch defaultChecked={enabled} label={title} /></div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <AccountShell activeHref="/account/notifications">
      <section className="w-[780px] max-w-full overflow-hidden border border-[var(--line)] bg-white md:-ml-5">
        {notificationGroups.map((group) => (
          <section className="border-b border-[var(--line)] px-[30px] py-6 last:border-b-0" key={group.title}>
            <div className="flex items-start gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-normal">{group.title}</h1>
                <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">{importantNotice}</p>
              </div>
              <div className="ml-auto shrink-0 pt-1"><NotificationSwitch defaultChecked disabled label={`${group.title} quan trọng`} /></div>
            </div>
            <div className="mt-4 space-y-3 pl-6 max-sm:pl-0">
              {group.items.map((item) => <NotificationItem {...item} key={item.title} />)}
            </div>
          </section>
        ))}
      </section>
    </AccountShell>
  );
}
