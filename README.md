# REBOX

Sàn giao dịch TMĐT B2B2C chuyên thanh lý hàng hoàn (itemized liquidation marketplace).

Repo này hiện chứa **tài liệu thiết kế hệ thống**. Mã nguồn sẽ được bổ sung theo lộ trình trong kế hoạch triển khai.

## Tài liệu

Đọc theo thứ tự:

| #   | File                                                       | Nội dung                                                                                                      |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 00  | [Tổng quan & mâu thuẫn](docs/00-TONG-QUAN-VA-MAU-THUAN.md) | Tóm tắt mô hình + 9 mâu thuẫn số liệu và 10 lỗ hổng thiết kế phát hiện trong tài liệu gốc. **Đọc trước tiên** |
| 01  | [Technical Spec](docs/01-TECHNICAL-SPEC.md)                | Kiến trúc, stack, phân rã module, data model, sổ cái tiền, state machine, tích hợp, NFR                       |
| 02  | [Luồng Backend](docs/02-BACKEND-FLOWS.md)                  | Sequence, ranh giới transaction, idempotency, error path                                                      |
| 03  | [Luồng Frontend](docs/03-FRONTEND-FLOWS.md)                | Màn hình Buyer / Seller / Admin, state, API, edge case                                                        |
| 04  | [Kế hoạch triển khai](docs/04-IMPLEMENTATION-PLAN.md)      | Lộ trình theo sprint, tiêu chí nghiệm thu, hạ tầng & chi phí, phân công                                       |
| 05  | [Pháp lý Việt Nam](docs/05-PHAP-LY-VIET-NAM.md)            | Giấy phép, thuế, dữ liệu cá nhân, bảo vệ người tiêu dùng, hàng hóa cấm                                        |

## Ba vấn đề cần xử lý sớm nhất

1. **Ví ký quỹ có khả năng là hoạt động trung gian thanh toán có điều kiện** - cần ý kiến luật sư trước khi code module thanh toán. Xem [05 §2](docs/05-PHAP-LY-VIET-NAM.md).
2. **Điều khoản "video sai quy tắc ⇒ mất quyền khiếu nại" có nguy cơ vô hiệu** theo Điều 25 Luật BVQLNTD 2023. Xem [05 §5.1](docs/05-PHAP-LY-VIET-NAM.md).
3. **Công thức đóng băng 120% không đủ bù rủi ro** với đơn giá trị thấp. Xem [00 §L1](docs/00-TONG-QUAN-VA-MAU-THUAN.md).

Ngoài ra có **8 câu hỏi cần ban dự án chốt** trước khi bắt đầu code - xem [00 §3](docs/00-TONG-QUAN-VA-MAU-THUAN.md).

## Ghi chú

Tài liệu nguồn (`REBOX.docx`) và bộ prototype (`REBOX-UI/`) **không được đưa lên repo** vì chứa kế hoạch kinh doanh và thông tin cá nhân của thành viên. Chúng được giữ ở máy cục bộ và loại trừ qua `.gitignore`.
