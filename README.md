# REBOX

Sàn giao dịch TMĐT B2B2C chuyên thanh lý hàng hoàn (itemized liquidation marketplace).

Repo này hiện chứa **tài liệu thiết kế hệ thống** và [skeleton monorepo](CODEBASE.md). Skeleton chưa có mã nguồn hoặc dependency; implementation sẽ được bổ sung theo lộ trình trong kế hoạch triển khai.

## Bắt đầu từ đâu

👉 **[docs/DEV-START-HERE.md](docs/DEV-START-HERE.md)** — lộ trình đọc và phạm vi hiện hành. Sau đó đọc [quyết định kiến trúc](docs/07-ARCHITECTURE-DECISIONS.md) trước các đặc tả chi tiết.

## Tài liệu

| #   | File                                                       | Nội dung                                                                                                      |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 00  | [Tổng quan & mâu thuẫn](docs/00-TONG-QUAN-VA-MAU-THUAN.md) | Lịch sử audit tài liệu gốc, các mâu thuẫn và trạng thái hòa giải                                                      |
| 01  | [Technical Spec](docs/01-TECHNICAL-SPEC.md)                | Kiến trúc, stack, phân rã module, data model, sổ cái tiền, state machine, tích hợp, NFR                       |
| 02  | [Luồng Backend](docs/02-BACKEND-FLOWS.md)                  | Sequence, ranh giới transaction, idempotency, error path                                                      |
| 03  | [Luồng Frontend](docs/03-FRONTEND-FLOWS.md)                | Màn hình Buyer / Seller / Admin, state, API, edge case                                                        |
| 04  | [Kế hoạch triển khai](docs/04-IMPLEMENTATION-PLAN.md)      | Lộ trình theo sprint, tiêu chí nghiệm thu, hạ tầng & chi phí, phân công                                       |
| 05  | [Pháp lý Việt Nam](docs/05-PHAP-LY-VIET-NAM.md)            | Giấy phép, thuế, dữ liệu cá nhân, bảo vệ người tiêu dùng, hàng hóa cấm                                        |
| 06  | [Danh mục hàng cấm](docs/06-DANH-MUC-HANG-CAM.md)          | Ba mức kiểm soát BANNED / MANUAL_REVIEW / DISCLOSURE, quy trình xử lý xâm phạm SHTT                           |
| 07  | [Quyết định kiến trúc](docs/07-ARCHITECTURE-DECISIONS.md)  | Nguồn canonical cho stack, module, Supabase, auth, outbox, tiền, evidence và phạm vi giai đoạn               |
| 08  | [Nhật ký hòa giải docs](docs/08-DOCUMENTATION-CHANGELOG.md) | Các file đã đổi, quyết định trước/sau và blocker còn mở                                                        |

## Ba vấn đề cần xử lý sớm nhất

1. **PSP/mô hình ký quỹ, refund và payout chưa được Legal + Business chốt**; payment production đang `BLOCKED` theo A10.
2. **Nhà cung cấp evidence WORM/Object Lock chưa được chọn**; Supabase Storage không thay thế gate này.
3. **Supabase Singapore trước A14 chỉ dùng dev/staging với dữ liệu synthetic/đã ẩn danh**; dữ liệu thật và production cần DPA/data-transfer/legal go/no-go.

Công thức hold, activation deposit, checkout một seller, TTL và phạm vi MVP đã được chốt trong tài liệu 07; không còn là câu hỏi mở.

## Ghi chú

`REBOX.docx` là tài liệu nguồn cục bộ và được loại trừ qua `.gitignore`. Bản prototype làm việc hiện nằm tại `docs/REBOX-UI/`, chỉ là tham chiếu UX và không phải nguồn quyết định canonical. Trước khi publish repo, chủ dự án phải rà soát quyền chia sẻ và dữ liệu nhạy cảm của các asset này.
