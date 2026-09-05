# REBOX — Nhật ký hòa giải tài liệu

Phiên bản: `1.4`
Ngày cập nhật: `05/09/2026`
Phạm vi: tài liệu kiến trúc, luồng nghiệp vụ, kế hoạch triển khai và legal gate. Không thêm mã nguồn hoặc dependency.

## 1. Mục đích

File này ghi lại lần chuẩn hóa bộ docs theo [`07-ARCHITECTURE-DECISIONS.md`](07-ARCHITECTURE-DECISIONS.md). `07` là nguồn quyết định canonical; `08` chỉ là lịch sử thay đổi và không thay thế ADR.

## 2. File được thêm

| File | Vai trò |
|---|---|
| `CONTEXT.md` | Từ điển domain ngắn cho package nguyên kiện, dòng khai báo, bản kê nguồn và disclosure |
| `07-ARCHITECTURE-DECISIONS.md` | Chốt stack, topology, module, Supabase boundary, auth, async, checkout, hold, deposit, evidence và phạm vi giai đoạn |
| `08-DOCUMENTATION-CHANGELOG.md` | Truy vết những mâu thuẫn đã hòa giải, file đã sửa và blocker còn mở |

## 3. Quyết định trước và sau hòa giải

| Chủ đề | Nội dung cũ/mâu thuẫn | Kết luận canonical |
|---|---|---|
| Grain kho hàng hoàn | Mô hình tách kiện thành unit sau kiểm đếm trái với mục tiêu không mở kiện | A16 `ACCEPTED`: một ReturnPackage chưa mở là một đơn vị tồn và một listing; ReturnLine chỉ là bản kê nguồn |
| Database/cloud | PostgreSQL tự quản/VPS xuất hiện song song với Supabase | Supabase PostgreSQL + Auth; trước A14, Singapore dev/staging chỉ dùng synthetic/anonymized fixture; dữ liệu thật/production có legal gate |
| Auth | Password hash, OTP/JWT/refresh token tự xây | Supabase sở hữu credential/session; NestJS verify JWT/JWKS và sở hữu membership/capability |
| Business authority | Client có thể dựa vào Supabase trực tiếp | Mọi business mutation qua NestJS; RLS/grant là defense-in-depth |
| Async/reservation | Redis/BullMQ/Redis lock ở MVP | PostgreSQL outbox + `SKIP LOCKED`; row lock + state + TTL là authority; chưa dùng Redis |
| Backend module | Nhiều module CRUD ngang hàng | Sáu module sâu: `identity`, `inventory`, `commerce`, `funds`, `fulfillment`, `claims` |
| Runtime | Nhiều app/service chưa rõ phase | GĐ1 chỉ `web`, `api`, `worker`; mobile và AI giữ placeholder GĐ3 |
| Nguồn bản kê | CSV bị mô tả như fallback của API hoặc hai flow tách biệt | Spreadsheet và API là hai kênh nhập ngang hàng; seller chọn một kênh, cả hai trả cùng `ReturnManifestDraft` và dùng chung preview/commit |
| Listing nhập tay | Flow luôn bắt `returnItemId` dù schema cho phép null | Listing thủ công vẫn là flow riêng `SELLER_DECLARED`; scan-to-list nguyên kiện chỉ chạy khi có manifest CSV/API |
| Checkout | Một order có nhiều seller/sub-order và chuỗi nhiều QR | Giỏ có thể nhóm nhiều shop, nhưng một checkout chỉ một shop, đúng một sub-order và một QR/COD flow |
| TTL payment | 15 phút, grace mode hoặc nhiều giá trị | Reservation ban đầu 30 phút; chọn VietQR thì deadline seller xác nhận là 12 giờ tuyệt đối từ lúc đặt; tiền đến muộn đi `payment_unmatched` |
| Payment matching | Có chỗ cho phép thiếu/thừa hoặc đến muộn tự confirm | Chỉ event khớp chính xác và còn hạn mới thành PAYMENT_OBSERVED; thiếu/thừa/muộn xử lý tay; event không thay seller xác nhận |
| VietQR seller-direct | Bank webhook tự chuyển đơn sang CONFIRMED; TTL 30 phút | Bank event chỉ ghi PAYMENT_OBSERVED; seller phải xác nhận nhận tiền mới mở fulfillment. Quá 12 giờ từ lúc đặt: có tiền thì hủy + refund từ ký quỹ seller, chưa có tiền thì chỉ hủy; pickup failure do seller áp dụng cùng guard |
| Chọn payment method | Schema bắt method từ checkout init nhưng flow chỉ chọn ở `/pay` | Method nullable khi reserve; `/pay` khóa state/deadline và chốt VIETQR hoặc COD trong transaction |
| Hold | `120%`, reserve 22.000/45.000 hoặc tier động | `item_total + buyer_ship + commission + 45.000 reserve`, snapshot theo config A08 |
| Ký quỹ | Min top-up, min balance và tier bị trộn | Activation balance 100.000đ; không tier/AOV động; transaction limit là concern riêng của PSP |
| Số dư âm | Có nhánh ví âm/debt ceiling | Materialized balance không âm; nghĩa vụ vượt hold ghi `SHOP_DEBT` và khóa shop |
| PSP | PayOS được mô tả như lựa chọn đã chốt | PayOS chỉ là ứng viên; production payment `BLOCKED` đến khi gate A10 có xác nhận bằng văn bản |
| Ledger | Một bảng entry và `CHECK SUM = 0` cross-row | `ledger_transactions` + `ledger_postings`, ghi qua một interface, property test và reconciliation |
| Withdrawal | Trừ thẳng available khi payout async | `AVAILABLE → WITHDRAWAL_PENDING → SETTLED | FAILED`; projection/reconcile theo đủ ba bucket |
| Refund | Đánh order `REFUNDED` ngay khi admin duyệt | Entity refund `APPROVED → PENDING → PAID | FAILED`; chỉ báo đã hoàn sau provider success + `REFUND_PAID` |
| Settlement account | Mặc định một `BANK_SETTLEMENT` của REBOX | Operational account theo provider/account/currency; mapping pháp định chờ A10 + kế toán, đối soát theo opening/closing/fees |
| Evidence | Video 180 giây; R2/Supabase Storage dùng như WORM | Video tối đa 90 giây; bản gốc ở provider WORM/Object Lock riêng; Supabase Storage chỉ cho media thường |
| Evidence identity | Chỉ lưu object key trong bucket versioned | Lưu provider/bucket/key/version/lock/checksum; mọi read/delete/hold target đúng immutable version |
| Retention | Ghi `closed_at + 90 ngày` ngay khi upload dù chưa có `closed_at` | Appeal dùng chung `dispute_case`; ingest đặt lock tạm, watchdog gia hạn; chỉ từ `final_closed_at` mới chốt target và tôn trọng legal hold |
| Retention chung | Yêu cầu mọi bảng PII có một `retention_until` | Registry versioned theo data class/purpose/action; evidence/KYC mới dùng per-record override, ledger/audit không bị xóa máy móc |
| Realtime | Có thể là nguồn xác nhận trạng thái | Chỉ là tín hiệu invalidate/refetch NestJS API; polling/API vẫn là nguồn đọc authoritative |
| Dispute/AI | AI triage và auto flow lẫn trong MVP | GĐ1 phân xử thủ công; AI GĐ3 sau dữ liệu đối chứng, eval và legal gate |
| Schema AI | Cột AI nullable nằm trong bảng `disputes` MVP | Loại khỏi schema MVP; GĐ3 thêm `ai_triage_runs` append-only bằng migration riêng |
| Loyalty/Public API | Nằm trong sprint MVP | Loyalty/voucher và Public API ERP bị hoãn theo A15 |
| Hạ tầng/chi phí | Bảng giá VPS/Redis/R2 cố định và điểm hòa vốn suy từ giá cũ | Bỏ con số không có báo giá hiện hành; lập ngân sách theo topology Supabase + ba runtime + WORM + provider usage |
| Consent audit | Một mảng `purposes[]` và `withdrawn_at` chung làm mất chronology | `processing_records` bất biến + event append-only theo từng purpose; withdrawal là event mới, không suy im lặng thành đồng ý |
| Pháp lý theo thời điểm | Nghị định 13/2023 và khung TMĐT cũ được viết như đang áp dụng | Baseline 25/08/2026: Luật 91/2025 + NĐ 356/2025 + NĐ 330/2026; Luật TMĐT 122/2025; Legal phải remap nghĩa vụ cụ thể |

## 4. Thay đổi theo từng file

| File | Thay đổi chính |
|---|---|
| `README.md` | Đưa `07` lên làm nguồn quyết định, thêm link `08`, thay “8 câu hỏi mở” bằng blocker thực, sửa trạng thái prototype |
| `CODEBASE.md` | Mô tả sáu module sâu, runtime ownership, dependency rule, Supabase/RLS/Auth/Storage boundary, migration policy, invariant và vertical slice đầu tiên |
| `DEV-START-HERE.md` | Sửa thứ tự đọc; ngày đầu đọc ADR/codebase; cập nhật scope Sprint 1 và Supabase guardrail |
| `00-TONG-QUAN-VA-MAU-THUAN.md` | Chuyển thành lịch sử audit; đánh dấu trạng thái từng mâu thuẫn và trỏ tới quyết định canonical |
| `01-TECHNICAL-SPEC.md` | Thay topology cũ bằng web/API/worker + Supabase; sáu module; schema payment/refund/ledger; bổ sung deadline seller xác nhận 12 giờ và refund timeout/pickup failure |
| `02-BACKEND-FLOWS.md` | Seller xác nhận tiền thủ công; bank event chỉ ghi nhận payment; timeout 12 giờ và pickup failure dùng payment guard trước khi refund |
| `03-FRONTEND-FLOWS.md` | Buyer thấy trạng thái báo chuyển/đã đối chiếu/đã xác nhận; seller có màn xác nhận nhận tiền; hiển thị đúng nhánh hủy có/không refund |
| `04-IMPLEMENTATION-PLAN.md` | Thêm nghiệm thu seller confirmation, timeout worker, hold 12 giờ và pickup failure; giữ payment production sau A10 |
| `05-PHAP-LY-VIET-NAM.md` | Ghi rõ refund từ ký quỹ cho timeout/pickup failure là yêu cầu mục tiêu nhưng vẫn cần PSP/Legal đóng A10 trước tiền thật |
| `06-DANH-MUC-HANG-CAM.md` | Đánh dấu cần remap theo Luật TMĐT 2025, thêm canonical link và sửa cross-reference sai |
| `10-NEXT-SESSION-PLAN.md` + fixture CSV/XLSX | Rút flow Unit/inspection; tách nền nhập manifest (hai nút, một DTO, preview/commit) khỏi scan/listing làm sau |

## 5. Blocker còn mở

| ID | Blocker | Điều kiện đóng |
|---|---|---|
| GATE-A10-PAYMENT | PSP/mô hình custody, top-up, refund, payout và reconciliation | Business + Legal xác nhận bằng văn bản; contract/sandbox test đạt |
| GATE-A12-PROVIDER | Nhà cung cấp evidence WORM | Xác nhận version ID, Object Lock, legal hold apply/reconcile, region, encryption, access audit, deletion/watchdog và báo giá |
| GATE-A14-PRODUCTION | Supabase Singapore cho dữ liệu thật/production | Data inventory, DPA/subprocessor/backup review, đánh giá chuyển dữ liệu và Legal go/no-go |
| LEGAL-TMĐT | Nghĩa vụ nền tảng theo Luật 122/2025 và văn bản thi hành | Legal cập nhật checklist/hồ sơ hiện hành cho web; app có gate riêng khi làm GĐ3 |
| LEGAL-CATALOG | Danh mục hàng cấm/hạn chế | Legal ký duyệt phiên bản có hiệu lực trước production |
| PHYSICAL-LABEL | Khả năng scan mã từ kiện hàng hoàn thật | Khảo sát 20–30 kiện, lập test matrix cho CSV/local scan và vị trí dán nhãn mới che PII cũ |

Không blocker nào ở trên cho phép tự chọn vendor hoặc mở production money/data flow bằng giả định.

## 6. Ghi chú repository

- Lần hòa giải này chỉ sửa Markdown; không thêm source code hoặc dependency.
- Skeleton monorepo hiện vẫn chưa có implementation.
- Các thay đổi asset `REBOX-UI/` → `docs/REBOX-UI/` đã tồn tại trong working tree và không do lần hòa giải này thực hiện; docs chỉ chuẩn hóa đường dẫn tham chiếu hiện tại.
- Mọi thay đổi tương lai làm đảo quyết định `ACCEPTED` phải có ADR mới, cập nhật file này và sửa các spec chịu ảnh hưởng trong cùng PR.

## 7. Nguồn động đã kiểm tra

- Supabase: region, backup/PITR, RLS/service role và Storage S3 compatibility — xem link chính thức tại `07` §17.
- Pháp luật Việt Nam: Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP, Nghị định 330/2026/NĐ-CP, Luật 122/2025/QH15 và Luật 116/2025/QH15 — xem link chính thức tại `05` §12.
