# REBOX - Tổng quan thiết kế hệ thống & Rà soát tài liệu gốc

> Nguồn lịch sử: `REBOX.docx` (bản mô tả dự án) + prototype trong `docs/REBOX-UI/`.
>
> Trạng thái: các mâu thuẫn kỹ thuật trong file này đã được hòa giải tại `07-ARCHITECTURE-DECISIONS.md`. File `07` là nguồn canonical nếu nội dung lịch sử dưới đây khác quyết định hiện hành.

Bộ tài liệu chính được đánh số từ `00` đến `08`:

| File                           | Nội dung                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------ |
| `00-TONG-QUAN-VA-MAU-THUAN.md` | Bản đồ tài liệu + mâu thuẫn/lỗ hổng phát hiện trong tài liệu gốc (**đọc trước tiên**)            |
| `01-TECHNICAL-SPEC.md`         | Đặc tả kỹ thuật: kiến trúc, stack, module, data model, sổ cái tiền, state machine, tích hợp, NFR |
| `02-BACKEND-FLOWS.md`          | Luồng backend chi tiết: sequence, ranh giới transaction, idempotency, error path                 |
| `03-FRONTEND-FLOWS.md`         | Luồng frontend chi tiết: màn hình, state, API call, edge case cho Mobile / Web / Admin           |
| `04-IMPLEMENTATION-PLAN.md`    | Kế hoạch triển khai theo sprint, phân rã công việc, tiêu chí nghiệm thu, hạ tầng & chi phí       |
| `05-PHAP-LY-VIET-NAM.md`       | Rà soát pháp lý Việt Nam: giấy phép, thuế, dữ liệu cá nhân, bảo vệ NTD, hàng hóa cấm             |
| `06-DANH-MUC-HANG-CAM.md`      | Chính sách BANNED / MANUAL_REVIEW / DISCLOSURE                                                   |
| `07-ARCHITECTURE-DECISIONS.md` | **Nguồn chuẩn:** stack, Supabase, phạm vi MVP và quyết định đã chốt                               |
| `08-DOCUMENTATION-CHANGELOG.md` | Nhật ký hòa giải và thay đổi bộ tài liệu                                                         |

---

## 1. Tóm tắt mô hình (đã chuẩn hóa từ tài liệu gốc)

REBOX là **nền tảng TMĐT B2B2C bán lại nguyên kiện hàng hoàn chưa mở kiểm tra**.

**Ba tác nhân:**

| Tác nhân                              | Vai trò                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Seller** (chủ shop / tổng kho TMĐT) | Có kiện hoàn từ Shopee/TikTok Shop. Chủ động nhập bản kê bằng kết nối sàn hoặc CSV/XLSX, sau đó quét mã vận đơn để tạo listing bán nguyên kiện mà không mở/đếm/nhập từng món. Nộp ký quỹ, chịu khấu trừ phí sàn 20%. |
| **Buyer** (người tiêu dùng)           | Săn hàng thanh lý giá rẻ. Thanh toán VietQR hoặc COD. Quay video khui hộp làm chứng cứ khiếu nại.                               |
| **Admin REBOX**                       | GĐ1 phân xử tranh chấp thủ công, vận hành rủi ro và kiểm duyệt nội dung; AI Triage chỉ là target GĐ3.                           |

**Ba trụ cột công nghệ tạo khác biệt:**

1. **Import-to-scan-to-list nguyên kiện** - seller chọn import trực tiếp từ sàn hoặc import CSV/XLSX → cả hai cùng preview/commit → quét mã → tìm package đã nhập → tạo một listing số lượng 1 cho nguyên kiện. Bản đầu chỉ bật spreadsheet; API không thay thế spreadsheet khi được mở.
2. **Deposit Wallet + Fund Hold** - ký quỹ, đóng băng theo giá trị đơn, chỉ ghi nhận phí khi đơn hoàn tất, tự động ẩn listing khi số dư không đủ. Đây không phải escrow tiền hàng.
3. **Claims có chain of custody** - GĐ1 tiếp nhận evidence và phân xử thủ công; AI Triage/auto-approve chỉ được cân nhắc ở GĐ3 sau eval và legal gate.

**Dòng tiền đặc thù (khác biệt lớn nhất so với Shopee):** tiền bán hàng đi **thẳng** từ người mua về tài khoản ngân hàng của shop (VietQR động), hoặc từ ĐVVC về shop (COD 24–48h). Tiền **không** nằm lại tài khoản REBOX. REBOX thu phí bằng cách **trừ vào ví ký quỹ** của seller.

---

## 2. Mâu thuẫn và lỗ hổng trong tài liệu gốc

> Phần này lưu lại vấn đề từ tài liệu gốc và kết luận hiện hành. Chi tiết/rationale đầy đủ nằm ở `07-ARCHITECTURE-DECISIONS.md`.

### 2.1. Mâu thuẫn số liệu giữa các phần

| #   | Chỉ số                          | Nơi A                                                                               | Nơi B                                                                                             | Kết luận canonical                                                                                                                                                                                                                                                            |
| --- | ------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | **Ký quỹ tối thiểu**            | "MÔ TẢ NHANH": **2.000.000đ**                                                       | Mục 3.2b: **100.000đ**                                                                            | **100.000đ để kích hoạt shop; không tier, không công thức AOV động ở MVP.** Giá trị nằm trong config có hiệu lực theo thời gian.                                                                                                                                              |
| M2  | **Phân dòng tiền online**       | Mục 3.3a: "**100%** giá trị đơn chuyển thẳng vào TK shop"                           | UI mock buyer: "**96%** về Shop / **4%** phí tạm thu"                                             | Chốt**100% về shop**, phí thu qua ví ký quỹ. Sửa UI mock. Nếu chọn 96/4 thì REBOX **đang giữ tiền người khác** → kích hoạt nghĩa vụ giấy phép trung gian thanh toán (xem `05-PHAP-LY` §2).                                                                                   |
| M3  | **Ngưỡng hư hỏng để hoàn tiền** | Mục 3.2c: "**>40%**"                                                                | UI mock buyer: "khác trên **30%**"                                                               | Chốt mặc định **30%**, lưu trong `system_configs`; snapshot giá trị áp dụng vào vụ việc.                                                                                                                                                                                      |
| M4  | **Đơn/ngày tại điểm hòa vốn**   | Mục 6.2: "500 đơn/tháng ⇒**19–17 đơn/ngày**"                                        | 500 / 30 =**16,7**                                                                                | Sửa thành ~17 đơn/ngày.                                                                                                                                                                                                                                                      |
| M5  | **Chi phí cố định GĐ2**         | Bảng tóm tắt: FC2 = **90.000.000**/6 tháng                                          | Mục 6.1: 5.000.000/tháng ⇒ **30.000.000**/6 tháng                                                 | Hai con số cũ đều **retired** sau khi chuyển sang Supabase. Lập lại bảng giá từ quotation tại thời điểm mua; không dùng chúng làm ngân sách phê duyệt.                                                                                                                        |
| M6  | **Giá trần xả kho**             | Không nêu trong text                                                                | UI mock seller: "**Giá trần xả kho (90%)**"                                                       | Bổ sung vào spec:`max_price = 0,9 × original_price` khi listing tạo từ luồng scan. Phải nêu trong Quy chế sàn. Thiết kế đầy đủ (kể cả vì sao trần này KHÔNG áp dụng cho listing đăng thủ công) ở `01-SPEC` §4.2.2 và `05-PHAP-LY` §5.3.1.                                                                                                                                                               |
| M7  | **Thời gian hoàn tiền tự động** | "trong vòng**10 giây**"                                                             | GĐ1 phân xử và refund thủ công/async; A10 còn chặn payout thật                                    | GĐ1 bỏ hoàn toàn cam kết tự động/thời gian. GĐ3 chỉ công bố SLO sau khi AI, PSP và dữ liệu vận hành thật đã qua gate/đo lường.                                                                                                                                                 |
| M8  | **Ngưỡng auto-refund của AI**   | UI admin mobile (`luồng admin.png`): **70%**                                        | UI admin web (`image9`): **80%**                                                                  | Cùng một tham số, hai giá trị trên hai màn hình. Đưa vào `system_config` (`ai.auto_approve_score`), một nguồn duy nhất, hai UI cùng đọc từ API. Đề xuất mặc định **85** - xem `01-SPEC` §8.2.                                                                                |
| M9  | **Bảng tính hoàn tiền mẫu**     | UI admin mobile: đơn 150.000đ ⇒ trừ ví 150.000 + ship 15.000 ⇒ hoàn **165.000đ** ✅ | UI admin web: cùng đơn ghi 150.000đ nhưng trừ ví **225.000** + ship 15.000 ⇒ hoàn **240.000đ** ❌ | Bản web lẫn giá váy 225.000đ vào đơn 150.000đ, và **cộng nhầm** phí ship vào tiền hoàn cho buyer thay vì trừ của seller. Công thức đúng ở `02-FLOWS` §5.5: buyer nhận `item_total + buyer_shipping_fee`; phí ship 2 chặng trừ **ví seller**, không cộng vào tiền buyer nhận. |

### 2.2. Lỗ hổng thiết kế nghiêm trọng

#### L1 - Công thức đóng băng 120% **không đủ** bù rủi ro

Khi khiếu nại lỗi shop được duyệt, shop phải chịu: hoàn 100% giá trị hàng + hoàn phí ship 15.000đ buyer đã trả + phí ship lượt đi thực tế + phí ship hoàn về. Tổng có thể vượt xa `120% × item_total`.

Ví dụ đơn 50.000đ ⇒ hold 60.000đ, nhưng chi phí thực = 50.000 (hàng) + 15.000 (ship buyer) + 22.000 (ship đi) + 22.000 (ship về) = **109.000đ**. Thiếu 49.000đ, REBOX gánh.

**Công thức đã chốt cho MVP:**

```
hold_amount = item_total
            + buyer_shipping_paid        -- 15.000 hoặc 0
            + commission_estimate        -- max(20% × item_total, 10.000)
            + shipping_reserve           -- cấu hình, mặc định 45.000 (2 chặng)
```

| Đơn      | 120% cũ     | Công thức mới | Chi phí xấu nhất |
| -------- | ----------- | ------------- | ---------------- |
| 50.000đ  | 60.000đ ❌  | 120.000đ ✅   | 109.000đ         |
| 150.000đ | 180.000đ ❌ | 225.000đ ✅   | 194.000đ         |
| 500.000đ | 600.000đ ✅ | 645.000đ ✅   | 544.000đ         |

#### L2 - Quy tắc auto-lock chỉ tính **đơn lớn nhất** là sai về mặt rủi ro

Tài liệu: _"Nếu Số dư Khả dụng < 120% Giá trị của đơn hàng lớn nhất đang mở bán → khóa kho"_.

Shop có 100 listing × 200.000đ chỉ cần giữ 240.000đ. Nếu 10 đơn phát sinh cùng lúc thì cần 2.400.000đ. Không hold được ⇒ đơn bị từ chối **sau khi buyer đã thanh toán** - trải nghiệm tệ nhất có thể.

**Kiến trúc 2 tầng đề xuất:**

- **Hard gate (bắt buộc)** - hold thực hiện tại bước **khởi tạo checkout, TRƯỚC khi buyer thanh toán**, trong transaction có `SELECT ... FOR UPDATE` trên listing và ví. Không đủ số dư ⇒ ẩn listing ngay, buyer thấy "sản phẩm vừa ngừng bán".
- **Soft signal (UX)** - quy tắc 120% × đơn lớn nhất chỉ dùng **cảnh báo sớm**. Bổ sung chỉ số `coverage_ratio = available_balance / Σ(hold ước tính của toàn bộ listing active)`, cảnh báo khi < 0,15.
- **Greedy hide thay vì khóa toàn kho** - khi số dư tụt, ẩn dần listing từ **giá cao xuống thấp** cho tới khi số dư phủ được ngưỡng. Giữ doanh thu cho shop thay vì tắt sạch.

#### L3 - Ví ký quỹ chỉ có chi, không có thu ⇒ seller phải nạp tiền liên tục

Vì tiền bán hàng đi thẳng về ngân hàng shop, **phí sàn 20% chỉ có thể trừ từ ví**. Bán càng nhiều, ví cạn càng nhanh. Sau ~5 đơn AOV 150k, shop ký quỹ 100.000đ đã âm.

**Quyết định MVP:** shop kích hoạt ở 100.000đ, không phân hạng và không auto top-up. Năng lực bán suy ra trực tiếp từ số dư khả dụng và hold của từng listing. `debt_ceiling = 0`; nếu chi phí thực vượt hold thì ghi khoản phải thu `SHOP_DEBT`, giữ số dư khả dụng không âm và khóa shop để xử lý. Auto top-up chỉ xem xét sau khi PSP hỗ trợ và seller chủ động bật.

#### L4 - "ID sản phẩm = mã vận đơn" là lỗ hổng bảo mật

Tài liệu: _"ID sản phẩm trên REBOX được định danh trùng với mã vận đơn của đơn hoàn"_.

Mã vận đơn Shopee/GHTK có thể bị dùng để tra cứu và làm lộ **tên, số điện thoại, địa chỉ** của người mua gốc trên sàn khác. Đây là rủi ro xử lý/lộ dữ liệu cá nhân bên thứ ba theo baseline hiện hành: Luật 91/2025/QH15 và Nghị định 356/2025/NĐ-CP; mapping điều khoản cụ thể do Legal chịu trách nhiệm.

**Bắt buộc:** ID công khai là ULID nội bộ (`RBX-01J...`). Mã vận đơn thuộc `ReturnPackage`, lưu mã hóa ở tầng ứng dụng kèm HMAC hash để dedupe theo `(shop_id, source_platform, source_tracking_hash)`; chỉ seller sở hữu và admin có quyền mới đọc được, **không bao giờ** xuất ra storefront hoặc API công khai. Tracking không phải public ID của `ReturnLine` hoặc `Listing`.

#### L5 - Điều khoản "video sai quy tắc ⇒ hủy quyền khiếu nại" có nguy cơ **vô hiệu**

Điều 25 Luật Bảo vệ quyền lợi người tiêu dùng 2023 liệt kê các điều khoản không có hiệu lực, trong đó có điều khoản **loại trừ / hạn chế quyền khiếu nại, khởi kiện** của người tiêu dùng.

**Thiết kế lại:** video là **chứng cứ ưu tiên**, không phải **điều kiện tiên quyết**. Không có video ⇒ hồ sơ vẫn được tiếp nhận nhưng đi thẳng vào luồng **Admin review thủ công**, không đủ điều kiện auto-refund, gánh nặng chứng minh cao hơn. Chi tiết ở `05-PHAP-LY` §5.

#### L6 - Quyết định tự động bằng AI cần đường thoát cho con người

Auto-refund và đặc biệt **auto-reject** ("AI TỪ CHỐI" trong UI admin) là quyết định tự động ảnh hưởng trực tiếp quyền lợi cá nhân. Đây là target GĐ3 và phải qua đánh giá theo Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP cùng legal gate hiện hành.

**Bắt buộc:** AI **không được tự động từ chối**. AI chỉ có 2 đầu ra: `AUTO_APPROVE` (điểm rất cao + giá trị đơn dưới trần) hoặc `ESCALATE_TO_HUMAN`. Mọi từ chối do người quyết định, nêu lý do, và có **quyền khiếu nại lần 2**.

#### L7 - Rủi ro Điều khoản dịch vụ của Shopee / TikTok Shop

Dùng Open API của Shopee/TikTok để rút dữ liệu đơn hàng sang một **sàn cạnh tranh** có khả năng cao vi phạm ToS của Shopee Open Platform / TikTok Shop Partner Center; đơn đăng ký partner app có thể bị từ chối hoặc thu hồi bất cứ lúc nào.

**Bắt buộc có Plan B ngay từ MVP:**

1. **Web barcode/OCR có đường lùi** - dùng capability trình duyệt khi có, rồi nhập tay; ML Kit/VisionCamera chỉ thuộc mobile GĐ3.
2. **Import CSV/XLSX** - seller tự export "Đơn hoàn" từ Seller Center → upload lên REBOX → map theo mã vận đơn. Đây là một trong hai kênh nhập ngang hàng và là kênh được bật đầu tiên khi API chưa đủ gate.
3. **Đăng thủ công** - chụp ảnh và tự nhập tên/danh mục/mô tả/giá ở GĐ1; VLM gợi ý chỉ thuộc GĐ3.

API sàn là kênh tiện hơn nhưng chỉ bật sau partner/ToS gate; CSV/XLSX vẫn tồn tại như lựa chọn độc lập. Hai kênh cùng sinh `ReturnManifestDraft[]`, nên phần preview/commit và flow bán nguyên kiện không đổi theo nguồn.

#### L8 - Một package chỉ được bán một lần

- Hai buyer cùng mua một listing ⇒ reservation dùng row lock + trạng thái package + TTL để đúng một buyer giữ được kiện; MVP chưa cần Redis.
- `availableQuantity` được suy ra từ trạng thái package và chỉ có `1` hoặc `0`; seller không nhập hoặc chỉnh counter này.
- Giỏ có thể nhóm nhiều shop để lưu, nhưng **mỗi lần checkout chỉ một seller**. Một order có đúng một sub-order ở MVP; phí ship và ngưỡng 100k tính trên order đó.

#### L9 - Thiếu định nghĩa "giao hàng thành công" làm mốc đếm 3 ngày

Mốc đếm cửa sổ khiếu nại phải là **thời điểm ĐVVC callback trạng thái `DELIVERED`**, không phải lúc buyer bấm "đã nhận". Lưu `delivered_at` từ webhook ĐVVC (có chữ ký) làm nguồn sự thật duy nhất - nó quyết định thời điểm giải phóng tiền của seller.

#### L10 - Mô hình chi phí biến đổi chưa tách theo nhóm đơn

Phụ lục 9.2 tính VC = 20.000đ/đơn, gồm 18.000đ phí ship do REBOX chi trả. Nhưng với đơn <100k, buyer đã trả 15.000đ ⇒ REBOX chỉ chịu 3.000–7.000đ; còn đơn ≥100k REBOX chịu 100% phí ship. Mô hình đang **thận trọng quá mức cho đơn nhỏ, thiếu hụt cho đơn lớn**.

Hệ thống phải ghi nhận `actual_shipping_cost` per đơn (lấy từ API đối soát ĐVVC) để đối chiếu thực tế và tách dự phóng theo 2 nhóm đơn.

---

## 3. Trạng thái các quyết định trước khi code

| ID | Kết luận | Trạng thái | Tham chiếu |
|---|---|---|---|
| Q1 | Ký quỹ kích hoạt 100.000đ, không tier | Chốt | `07` A09 |
| Q2 | Hold theo breakdown + reserve 45.000đ | Chốt | `07` A08 |
| Q3 | Ngưỡng hư hỏng mặc định 30% | Chốt | `01` §4.3 |
| Q4 | 100% tiền hàng đi thẳng seller; REBOX không giữ tiền hàng | Chốt có legal gate cho ví ký quỹ | `07` A10; `05` §2 |
| Q5 | Vendor PSP và cấu trúc custody/refund | **BLOCKED** | Business + Legal, chặn tiền thật |
| Q6 | CSV/XLSX và API sàn là hai kênh nhập ngang hàng, cùng trả `ReturnManifestDraft`; bản đầu chỉ bật spreadsheet | Chốt | `07` A06 |
| Q7 | Danh mục hàng cấm/hạn chế | Còn 5 câu Legal | `06` §8 |
| Q8 | Retention target từ case đóng: original 90 ngày; derivative/biên bản 3 năm; lock/hold có thể kéo dài | Chốt kỹ thuật, Legal duyệt văn bản | `07` A12; `05` §3.4.6 |
