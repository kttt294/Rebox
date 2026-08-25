# Đọc cái này trước — dành cho đội phát triển

Bộ tài liệu có 6 file, khoảng 3.500 dòng. **Đừng đọc hết.** File này chỉ ra cần đọc gì, lúc nào.

Thời gian đọc ngày đầu: **khoảng 40 phút.** Phần còn lại đọc theo sprint.

---

## 1. Ngày đầu tiên — bắt buộc, 40 phút

Đọc đúng ba thứ này, theo thứ tự:

| # | Đọc gì | Vì sao |
|---|---|---|
| 1 | `README.md` | Biết dự án là gì trong 3 phút |
| 2 | **`00-TONG-QUAN` §1 và §2** | Tóm tắt mô hình + 9 mâu thuẫn và 10 lỗ hổng trong tài liệu gốc. **Đây là phần quan trọng nhất của cả bộ tài liệu** |
| 3 | **`04-IMPLEMENTATION-PLAN` §1, §2, §3** | Đội hình, phạm vi đã cắt, lộ trình. Biết mình không phải làm gì cũng quan trọng như biết phải làm gì |

Chưa cần đụng tới 01, 02, 03, 05, 06.

---

## 2. Các quyết định đã chốt

Không cần tra lại trong tài liệu, dùng bảng này:

| Mã | Nội dung | Chốt |
|---|---|---|
| Q1 | Công thức hold | `hàng + ship buyer + hoa hồng + dự phòng ship`. Dự phòng: **22k** nếu món < 50k, **45k** nếu ≥ 50k |
| Q2 | Ký quỹ | Nạp tự do, **tối thiểu 100.000đ**, không ràng buộc bội số. Năng lực bán suy ra từ số dư |
| Q3 | Escrow | **Không phân tầng.** Mọi seller nhận tiền ngay. Vẫn giữ cột `deposit_tier` trong schema để mở đường sau này |
| Q4 | API sàn | Code thật ở MVP, không mock. Nguồn CSV chạy song song và là đường chính khi chưa có credentials |
| Q5 | Hàng cấm | Xem `06-DANH-MUC-HANG-CAM.md` |
| Q6 | Thanh toán | **PayOS** — còn 5 câu chưa có đáp án, xem §5 dưới |
| Q7 | Ngưỡng hư hỏng | **30%** |
| Q8 | Lưu video | Gốc **90 ngày**, ảnh đã che mặt + biên bản **3 năm** |

---

## 3. Đọc theo sprint

Đọc đúng phần cần dùng, ngay trước khi code phần đó:

| Sprint | Đọc | Bỏ qua phần còn lại |
|---|---|---|
| **1** — Nền tảng | `01` **§2.3 (tái sử dụng cho mobile), §2.5 (3 quy tắc monorepo), §2.6 (cảnh báo)**, §4 (data model), §9 (NFR) | |
| **2** — Catalog & kho hoàn | `01` §7.1 · `02` §2 · `03` §2, §3 · `06` §7 | `06` §2–6 là việc của Pháp lý |
| **3** — Ví & sổ cái ⭐ | `01` §5 (**đọc kỹ**) · `02` §1, §4 · `00` §L1, §L2, §L3 | |
| **4** — Thanh toán | `01` §7.3 · `02` §3 | |
| **5** — Vận chuyển | `01` §7.2 · `02` §3.4, §3.5 | |
| **6** — Tranh chấp | `01` §8 · `02` §5 · `03` §1.6, §2.6 · `05` §3.4 | |
| **7** — Admin | `03` §4 | |
| **8** — Public API | `01` §7.4 · `02` §6 | |

**Sprint 3 là sprint quan trọng nhất.** Sổ cái sai thì không sửa được bằng bản vá. Đọc `01` §5 đến khi hiểu rõ bút toán kép trước khi viết dòng đầu tiên.

---

## 4. Yêu cầu pháp lý ảnh hưởng trực tiếp đến code

**Không bắt dev đọc hết `05-PHAP-LY`** — 600 dòng, phần lớn là thủ tục giấy tờ. Nhưng bảy điều dưới đây **là yêu cầu kỹ thuật**, vi phạm là lỗi nghiêm trọng:

| # | Yêu cầu | Ảnh hưởng | Chi tiết |
|---|---|---|---|
| 1 | **AI không được tự động từ chối khiếu nại** | State machine tranh chấp chỉ có 2 nhánh: `AUTO_APPROVE` hoặc `ESCALATE`. Không có `AUTO_REJECT` | `00` §L6 |
| 2 | **Video không phải điều kiện tiên quyết** để khiếu nại | Thiếu video vẫn nhận hồ sơ, chuyển `ADMIN_REVIEW`, chỉ không được auto-approve | `00` §L5 |
| 3 | **Mã vận đơn không bao giờ ra API công khai** | ID công khai là ULID. `source_tracking_enc` mã hoá tầng ứng dụng | `00` §L4 |
| 4 | **Seller không bao giờ xem video gốc** | Chỉ xem `evidence_derivatives` đã che mặt + che nhãn vận đơn. Khử nhận dạng lỗi thì **không hiển thị gì**, không fallback về bản gốc | `05` §3.4.3 |
| 5 | **Ghi bằng chứng đồng ý trước khi mở camera** | `consent_records` là khoá ngoại bắt buộc của `dispute_evidences` | `05` §3.4.5 |
| 6 | **Xoá dữ liệu theo `retention_until`** | Job xoá tự động phải chạy và phải kiểm chứng được | `05` §3.4.6 |
| 7 | **Phí tính theo cấu hình tại thời điểm đặt hàng** | Snapshot config vào `sub_orders.fee_snapshot` lúc checkout, không đọc config hiện hành lúc settle | `02` §4.1 |

Bảy điều này nên đưa thẳng vào checklist review code, không phải đọc một lần rồi quên.

---

## 5. Những thứ chưa có đáp án — đừng chờ

| Việc | Ai lo | Trong lúc chờ thì làm gì |
|---|---|---|
| Đăng ký partner Shopee / TikTok | Trưởng dự án | Code adapter theo tài liệu API chính thức, dùng fixture. Ưu tiên luồng CSV |
| PayOS có chi hộ được không? Có đọc được tài khoản seller không? Giấy phép thế nào? Phí bao nhiêu? | Trưởng dự án + Pháp lý | Code sau interface `PaymentProvider`. **Không để lời gọi PayOS lọt vào domain code** |
| Khảo sát nhãn kiện hàng thật (việc 1.0) | Dev 2 + Pháp lý | Chặn thiết kế luồng quét. Làm sớm, một buổi chiều là xong |
| Đăng ký sàn TMĐT | Pháp lý | Không chặn code, nhưng chặn ngày mở bán |

---

## 6. Ai đọc file nào

| File | Dev | Pháp lý |
|---|---|---|
| `00-TONG-QUAN` | ✅ toàn bộ | ✅ §2 |
| `01-TECHNICAL-SPEC` | ✅ theo sprint | — |
| `02-BACKEND-FLOWS` | ✅ theo sprint | — |
| `03-FRONTEND-FLOWS` | ✅ theo sprint | §1.6 (màn hình đồng ý) |
| `04-IMPLEMENTATION-PLAN` | ✅ §1–3 | ✅ §4 (Giai đoạn 0 — đường găng dài nhất nằm ở đây) |
| `05-PHAP-LY` | ❌ chỉ đọc §4 của file này | ✅ **sở hữu toàn bộ** |
| `06-DANH-MUC-HANG-CAM` | §7 (cơ chế thực thi) | ✅ **sở hữu**, phải trả lời 5 câu ở §8 |

---

## 7. Ba điều dễ làm sai nhất

**Đừng tự sửa con số chính sách trong code.** Mọi ngưỡng nằm ở `system_configs` với `effective_from`. Hardcode một con số phí là tạo ra một chỗ không giải trình được khi bị hỏi.

**Đừng gọi HTTP bên ngoài trong database transaction.** Ghi ledger + ghi `outbox` trong cùng transaction, worker đọc outbox gọi ra ngoài sau.

**Đừng tin client về tiền.** Mọi số tiền tính lại ở backend. Frontend được hiển thị ước tính nhưng phải gắn nhãn "dự kiến".

---

## 8. Ba quy tắc monorepo — quyết định mobile sau này mất 3 tuần hay 3 tháng

Web làm trước, mobile làm ở GĐ3. **Tầng giao diện luôn phải viết lại** (React Native không chạy HTML/CSS), nhưng 50–60% còn lại thì dùng lại được — nếu giữ đúng ba quy tắc:

| # | Quy tắc | Vi phạm thì sao |
|---|---|---|
| 1 | Không gọi `fetch` trong component — đi qua `packages/api-client` | Mobile phải viết lại toàn bộ tầng gọi API |
| 2 | **Không tính toán nghiệp vụ trong component** — nằm ở `packages/core`, hàm thuần, có test | **Tốn kém nhất.** Logic tính phí rải trong JSX ⇒ mobile viết lại ⇒ hai bản tính tiền lệch nhau |
| 3 | `packages/` không được import từ `apps/web` | Package biết mình chạy trên web ⇒ không mang sang native được |

Ba quy tắc này là **lint rule trong CI**, không phải thỏa thuận miệng. Chi tiết: `01-SPEC` §2.5.

Dùng **Tailwind**, không dùng CSS Modules hay styled-components — NativeWind cho phép dùng lại đúng class name đó trên React Native. Đây là mắt xích duy nhất trong tầng UI mang sang được.
