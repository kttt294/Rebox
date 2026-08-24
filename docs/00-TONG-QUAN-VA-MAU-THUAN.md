# REBOX — Tổng quan thiết kế hệ thống & Rà soát tài liệu gốc

> Nguồn: `REBOX.docx` (bản mô tả dự án) + 7 sơ đồ prototype trong `REBOX-UI/`.

Bộ tài liệu gồm 6 file, đọc theo thứ tự:

| File                             | Nội dung                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `00-TONG-QUAN-VA-MAU-THUAN.md` | Bản đồ tài liệu + mâu thuẫn/lỗ hổng phát hiện trong tài liệu gốc (**đọc trước tiên**) |
| `01-TECHNICAL-SPEC.md`         | Đặc tả kỹ thuật: kiến trúc, stack, module, data model, sổ cái tiền, state machine, tích hợp, NFR   |
| `02-BACKEND-FLOWS.md`          | Luồng backend chi tiết: sequence, ranh giới transaction, idempotency, error path                            |
| `03-FRONTEND-FLOWS.md`         | Luồng frontend chi tiết: màn hình, state, API call, edge case cho Mobile / Web / Admin                     |
| `04-IMPLEMENTATION-PLAN.md`    | Kế hoạch triển khai theo sprint, phân rã công việc, tiêu chí nghiệm thu, hạ tầng & chi phí        |
| `05-PHAP-LY-VIET-NAM.md`       | Rà soát pháp lý Việt Nam: giấy phép, thuế, dữ liệu cá nhân, bảo vệ NTD, hàng hóa cấm          |

---

## 1. Tóm tắt mô hình (đã chuẩn hóa từ tài liệu gốc)

REBOX là **sàn giao dịch TMĐT B2B2C chuyên thanh lý hàng hoàn** (itemized liquidation marketplace).

**Ba tác nhân:**

| Tác nhân                                     | Vai trò                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Seller** (chủ shop / tổng kho TMĐT) | Có hàng hoàn từ Shopee/TikTok Shop. Quét mã vận đơn → tự động tạo listing (tồn kho = 1). Nộp ký quỹ, chịu khấu trừ phí sàn 20%. |
| **Buyer** (người tiêu dùng)          | Săn hàng thanh lý giá rẻ. Thanh toán VietQR hoặc COD. Quay video khui hộp làm chứng cứ khiếu nại.                                         |
| **Admin REBOX**                          | Vận hành AI Triage, phân xử tranh chấp tầng 2, cấu hình ngưỡng rủi ro, kiểm duyệt nội dung.                                              |

**Ba trụ cột công nghệ tạo khác biệt:**

1. **Scan-to-list** — quét mã vận đơn → gọi API Shopee/TikTok → autofill listing trong ~2 giây, tồn kho luôn = 1.
2. **Escrow Wallet + Fund Lock** — ký quỹ, đóng băng theo giá trị đơn, khấu trừ phí real-time, tự động ẩn listing khi số dư không đủ.
3. **AI Triage tranh chấp** — quét video khui hộp, chấm điểm rủi ro, tự động hoàn tiền nếu điểm ≥ ngưỡng, còn lại đẩy cho Admin.

**Dòng tiền đặc thù (khác biệt lớn nhất so với Shopee):** tiền bán hàng đi **thẳng** từ người mua về tài khoản ngân hàng của shop (VietQR động), hoặc từ ĐVVC về shop (COD 24–48h). Tiền **không** nằm lại tài khoản REBOX. REBOX thu phí bằng cách **trừ vào ví ký quỹ** của seller.

---

## 2. Mâu thuẫn và lỗ hổng trong tài liệu gốc

> Phần quan trọng nhất của file này. Mỗi mục cần một **quyết định chính thức** trước khi code.

### 2.1. Mâu thuẫn số liệu giữa các phần

| #  | Chỉ số                                      | Nơi A                                                                  | Nơi B                                                                | Đề xuất chốt                                                                                                                                                                                                                  |
| -- | --------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1 | **Ký quỹ tối thiểu**                | "MÔ TẢ NHANH":**2.000.000đ**                                   | Mục 3.2b:**100.000đ**                                         | Dùng**ký quỹ động phân hạng** (xem L3). Không hardcode một con số.                                                                                                                                                |
| M2 | **Phân dòng tiền online**            | Mục 3.3a: "**100%** giá trị đơn chuyển thẳng vào TK shop" | UI mock buyer: "**96%** về Shop / **4%** phí tạm thu"  | Chốt**100% về shop**, phí thu qua ví ký quỹ. Sửa UI mock. Nếu chọn 96/4 thì REBOX **đang giữ tiền người khác** → kích hoạt nghĩa vụ giấy phép trung gian thanh toán (xem `05-PHAP-LY` §2). |
| M3 | **Ngưỡng hư hỏng để hoàn tiền** | Mục 3.2c: "**>40%**"                                             | UI mock buyer: "khác trên**30%**"                             | Chốt 1 con số duy nhất, đưa vào bảng`system_config` chỉnh được runtime. Đề xuất **30%** (thân thiện NTD, giảm rủi ro pháp lý).                                                                        |
| M4 | **Đơn/ngày tại điểm hòa vốn**   | Mục 6.2: "500 đơn/tháng ⇒**19–17 đơn/ngày**"             | 500 / 30 =**16,7**                                              | Sửa thành ~17 đơn/ngày.                                                                                                                                                                                                      |
| M5 | **Chi phí cố định GĐ2**            | Bảng tóm tắt: FC2 =**90.000.000**/6 tháng                     | Mục 6.1: 5.000.000/tháng ⇒**30.000.000**/6 tháng            | Chênh 60 triệu. Bảng 6.5 dùng FC = 5tr/tháng, nên 30tr là con số nhất quán với phần tính hòa vốn. Cần rà lại.                                                                                                   |
| M6 | **Giá trần xả kho**                  | Không nêu trong text                                                  | UI mock seller: "**Giá trần xả kho (90%)**"                  | Bổ sung vào spec:`max_price = 0,9 × original_price` khi listing tạo từ luồng scan. Phải nêu trong Quy chế sàn.                                                                                                        |
| M7 | **Thời gian hoàn tiền tự động**   | "trong vòng**10 giây**"                                         | Thực tế upload + transcode + inference mất**30s – 5 phút** | Đổi cam kết thành "xử lý tự động, thường dưới 5 phút". Cam kết 10 giây là**rủi ro quảng cáo gây nhầm lẫn**.                                                                                          |
| M8 | **Ngưỡng auto-refund của AI** | UI admin mobile (`luồng admin.png`): **70%** | UI admin web (`image9`): **80%** | Cùng một tham số, hai giá trị trên hai màn hình. Đưa vào `system_config` (`ai.auto_approve_score`), một nguồn duy nhất, hai UI cùng đọc từ API. Đề xuất mặc định **85** — xem `01-SPEC` §8.2. |
| M9 | **Bảng tính hoàn tiền mẫu** | UI admin mobile: đơn 150.000đ ⇒ trừ ví 150.000 + ship 15.000 ⇒ hoàn **165.000đ** ✅ | UI admin web: cùng đơn ghi 150.000đ nhưng trừ ví **225.000** + ship 15.000 ⇒ hoàn **240.000đ** ❌ | Bản web lẫn giá váy 225.000đ vào đơn 150.000đ, và **cộng nhầm** phí ship vào tiền hoàn cho buyer thay vì trừ của seller. Công thức đúng ở `02-FLOWS` §5.5: buyer nhận `item_total + buyer_shipping_fee`; phí ship 2 chặng trừ **ví seller**, không cộng vào tiền buyer nhận. |
### 2.2. Lỗ hổng thiết kế nghiêm trọng

#### L1 — Công thức đóng băng 120% **không đủ** bù rủi ro

Khi khiếu nại lỗi shop được duyệt, shop phải chịu: hoàn 100% giá trị hàng + hoàn phí ship 15.000đ buyer đã trả + phí ship lượt đi thực tế + phí ship hoàn về. Tổng có thể vượt xa `120% × item_total`.

Ví dụ đơn 50.000đ ⇒ hold 60.000đ, nhưng chi phí thực = 50.000 (hàng) + 15.000 (ship buyer) + 22.000 (ship đi) + 22.000 (ship về) = **109.000đ**. Thiếu 49.000đ, REBOX gánh.

**Công thức thay thế đề xuất:**

```
hold_amount = item_total
            + buyer_shipping_paid        -- 15.000 hoặc 0
            + commission_estimate        -- max(20% × item_total, 10.000)
            + shipping_reserve           -- cấu hình, mặc định 45.000 (2 chặng)
```

| Đơn     | 120% cũ     | Công thức mới | Chi phí xấu nhất |
| --------- | ------------ | ---------------- | ------------------- |
| 50.000đ  | 60.000đ ❌  | 120.000đ ✅     | 109.000đ           |
| 150.000đ | 180.000đ ❌ | 225.000đ ✅     | 194.000đ           |
| 500.000đ | 600.000đ ✅ | 645.000đ ✅     | 544.000đ           |

#### L2 — Quy tắc auto-lock chỉ tính **đơn lớn nhất** là sai về mặt rủi ro

Tài liệu: *"Nếu Số dư Khả dụng < 120% Giá trị của đơn hàng lớn nhất đang mở bán → khóa kho"*.

Shop có 100 listing × 200.000đ chỉ cần giữ 240.000đ. Nếu 10 đơn phát sinh cùng lúc thì cần 2.400.000đ. Không hold được ⇒ đơn bị từ chối **sau khi buyer đã thanh toán** — trải nghiệm tệ nhất có thể.

**Kiến trúc 2 tầng đề xuất:**

- **Hard gate (bắt buộc)** — hold thực hiện tại bước **khởi tạo checkout, TRƯỚC khi buyer thanh toán**, trong transaction có `SELECT ... FOR UPDATE` trên ví. Không đủ số dư ⇒ ẩn listing ngay, buyer thấy "sản phẩm vừa ngừng bán".
- **Soft signal (UX)** — quy tắc 120% × đơn lớn nhất chỉ dùng **cảnh báo sớm**. Bổ sung chỉ số `coverage_ratio = available_balance / Σ(hold ước tính của toàn bộ listing active)`, cảnh báo khi < 0,15.
- **Greedy hide thay vì khóa toàn kho** — khi số dư tụt, ẩn dần listing từ **giá cao xuống thấp** cho tới khi số dư phủ được ngưỡng. Giữ doanh thu cho shop thay vì tắt sạch.

#### L3 — Ví ký quỹ chỉ có chi, không có thu ⇒ seller phải nạp tiền liên tục

Vì tiền bán hàng đi thẳng về ngân hàng shop, **phí sàn 20% chỉ có thể trừ từ ví**. Bán càng nhiều, ví cạn càng nhanh. Sau ~5 đơn AOV 150k, shop ký quỹ 100.000đ đã âm.

Bắt buộc phải có:

- **Auto top-up** — seller liên kết tài khoản/thẻ, hệ thống tự nạp khi số dư < ngưỡng.
- **Ký quỹ động phân hạng** thay cho con số cố định:
  ```
  min_deposit = clamp(3 × AOV_shop_30d × expected_daily_orders, 200.000, 5.000.000)
  ```

  Shop mới mặc định 500.000đ. Shop có lịch sử tốt (≥50 đơn, tỷ lệ khiếu nại <3%) được giảm dần.
- **Công nợ có kiểm soát** — cho phép ví âm tối đa `debt_ceiling` (mặc định 0 với shop mới); quá hạn 7 ngày ⇒ khóa kho + chuyển thu hồi.

#### L4 — "ID sản phẩm = mã vận đơn" là lỗ hổng bảo mật

Tài liệu: *"ID sản phẩm trên REBOX được định danh trùng với mã vận đơn của đơn hoàn"*.

Mã vận đơn Shopee/GHTK tra cứu được công khai trên web ĐVVC ⇒ lộ **tên, số điện thoại, địa chỉ** của người mua gốc trên sàn khác. Đây là **rò rỉ dữ liệu cá nhân bên thứ ba**, vi phạm trực tiếp Nghị định 13/2023 và Luật BVDLCN 2025.

**Bắt buộc:** ID công khai là ULID nội bộ (`RBX-01J...`). Mã vận đơn lưu ở cột `source_tracking_no`, **mã hóa ở tầng ứng dụng**, chỉ seller sở hữu và admin có quyền mới đọc được, **không bao giờ** xuất ra API công khai.

#### L5 — Điều khoản "video sai quy tắc ⇒ hủy quyền khiếu nại" có nguy cơ **vô hiệu**

Điều 25 Luật Bảo vệ quyền lợi người tiêu dùng 2023 liệt kê các điều khoản không có hiệu lực, trong đó có điều khoản **loại trừ / hạn chế quyền khiếu nại, khởi kiện** của người tiêu dùng.

**Thiết kế lại:** video là **chứng cứ ưu tiên**, không phải **điều kiện tiên quyết**. Không có video ⇒ hồ sơ vẫn được tiếp nhận nhưng đi thẳng vào luồng **Admin review thủ công**, không đủ điều kiện auto-refund, gánh nặng chứng minh cao hơn. Chi tiết ở `05-PHAP-LY` §5.

#### L6 — Quyết định tự động bằng AI cần đường thoát cho con người

Auto-refund và đặc biệt **auto-reject** ("AI TỪ CHỐI" trong UI admin) là quyết định tự động ảnh hưởng trực tiếp quyền lợi cá nhân. Luật BVDLCN 2025 và Nghị định 13/2023 yêu cầu minh bạch về xử lý tự động và quyền phản đối.

**Bắt buộc:** AI **không được tự động từ chối**. AI chỉ có 2 đầu ra: `AUTO_APPROVE` (điểm rất cao + giá trị đơn dưới trần) hoặc `ESCALATE_TO_HUMAN`. Mọi từ chối do người quyết định, nêu lý do, và có **quyền khiếu nại lần 2**.

#### L7 — Rủi ro Điều khoản dịch vụ của Shopee / TikTok Shop

Dùng Open API của Shopee/TikTok để rút dữ liệu đơn hàng sang một **sàn cạnh tranh** có khả năng cao vi phạm ToS của Shopee Open Platform / TikTok Shop Partner Center; đơn đăng ký partner app có thể bị từ chối hoặc thu hồi bất cứ lúc nào.

**Bắt buộc có Plan B ngay từ MVP:**

1. **OCR mã vận đơn on-device** (ML Kit / VisionCamera) — chỉ lấy mã, không lấy thông tin sản phẩm.
2. **Import CSV** — seller tự export "Đơn hoàn" từ Shopee Seller Center → upload lên REBOX → map theo mã vận đơn. Hợp pháp, không phụ thuộc API. **Đặt làm luồng chính của MVP.**
3. **Đăng thủ công có AI hỗ trợ** — chụp ảnh → VLM gợi ý tên, danh mục, mô tả, giá.

Luồng API sàn xếp vào **Phase 2**, coi là tính năng tăng tốc, không phải nền móng.

#### L8 — Bán đơn chiếc (qty = 1) tạo bài toán oversell + phí ship gộp

- Hai buyer cùng thêm 1 sản phẩm vào giỏ ⇒ cần **reservation lock có TTL** (Redis + trạng thái DB), không thể chỉ dựa vào cột tồn kho.
- "Đơn ≥100k freeship, hệ thống tự gộp sản phẩm cùng kho vào một mã vận đơn" ⇒ giỏ hàng phải **tách theo seller** (`sub_order` per seller); tính phí ship và ngưỡng 100k **theo từng sub-order**, không theo tổng giỏ. Nếu tính theo tổng giỏ, buyer gom 3 shop × 40k sẽ được freeship 3 kiện — lỗ nặng.

#### L9 — Thiếu định nghĩa "giao hàng thành công" làm mốc đếm 3 ngày

Mốc đếm cửa sổ khiếu nại phải là **thời điểm ĐVVC callback trạng thái `DELIVERED`**, không phải lúc buyer bấm "đã nhận". Lưu `delivered_at` từ webhook ĐVVC (có chữ ký) làm nguồn sự thật duy nhất — nó quyết định thời điểm giải phóng tiền của seller.

#### L10 — Mô hình chi phí biến đổi chưa tách theo nhóm đơn

Phụ lục 9.2 tính VC = 20.000đ/đơn, gồm 18.000đ phí ship do REBOX chi trả. Nhưng với đơn <100k, buyer đã trả 15.000đ ⇒ REBOX chỉ chịu 3.000–7.000đ; còn đơn ≥100k REBOX chịu 100% phí ship. Mô hình đang **thận trọng quá mức cho đơn nhỏ, thiếu hụt cho đơn lớn**.

Hệ thống phải ghi nhận `actual_shipping_cost` per đơn (lấy từ API đối soát ĐVVC) để đối chiếu thực tế và tách dự phóng theo 2 nhóm đơn.

---

## 3. Bảng quyết định cần chốt trước khi code

| ID | Câu hỏi                                               | Người quyết     | Chặn sprint                     |
| -- | ------------------------------------------------------- | ------------------ | -------------------------------- |
| Q1 | Mức ký quỹ tối thiểu & công thức ký quỹ động | Business + Finance | S3                               |
| Q2 | Công thức hold: giữ 120% hay theo L1                 | Business + Tech    | S3                               |
| Q3 | Ngưỡng hư hỏng 30% hay 40%                          | Business + Legal   | S6                               |
| Q4 | Dòng tiền online 100% hay 96/4                        | Business + Legal   | S4                               |
| Q5 | Đối tác thanh toán — PSP nào có giấy phép?     | Business + Legal   | S4 (**blocker pháp lý**) |
| Q6 | Nguồn dữ liệu MVP: CSV hay API sàn                  | Tech               | S2                               |
| Q7 | Danh mục hàng cấm/hạn chế trên REBOX              | Legal              | S2                               |
| Q8 | Chính sách lưu trữ & xóa video khiếu nại         | Legal              | S6                               |
