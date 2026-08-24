# REBOX — Luồng Frontend chi tiết

Bám sát 7 sơ đồ prototype trong `REBOX-UI/`. Mỗi luồng ghi rõ: màn hình, state cục bộ, API gọi, trạng thái loading/empty/error, và edge case.

---

## 0'. Truy vết prototype → đặc tả

Bảng đối chiếu từng file trong `REBOX-UI/` (và ảnh tương ứng trong `REBOX.docx`) với phần đặc tả đã viết. Dùng khi review để kiểm tra không bỏ sót màn hình nào.

| File prototype | Ảnh trong docx | Màn hình | Đặc tả tại | Ghi chú khi hiện thực |
|---|---|---|---|---|
| `luồng đăng bán - seller.png` | Hình 2 | Seller mobile: quét mã → đồng bộ → xem trước → đăng bán (4 bước) | §2.2, §2.3 | Bổ sung state machine quét, chế độ offline, tự quay lại quét sau 1,5s, khối "Nếu bán được" |
| `website-seller-đăng bán.png` (ảnh 1) + Hình 3 | Hình 3 | Seller web: tab **Đăng Bán** — khung quét + panel đồng bộ Shopee/TikTok + giá trần 90% | §3.1 | Prototype đăng **từng món**; tổng kho cần **đăng hàng loạt** + máy quét cầm tay — đây là khoảng trống #4 ở §6 |
| `luồng xem kho hàng và đối soát- seller.png` | Hình 4 | Seller mobile: Kho hàng xả kho + Đối soát tài chính | §2.4, §2.5 | Bổ sung trạng thái **BỊ ẨN** (thiếu quỹ) + tách 3 khối tiền |
| `website-seller-đăng bán.png` (ảnh 2, 3) | Hình 5 | Seller web: Quản lý kho hàng + Đối soát tài chính & Ví ký quỹ | §3.2 | Bổ sung tab **Phân tích hàng hoàn theo SKU** (Gain Creator f, chưa có trong prototype) |
| `luồng mua hàng - buyer.png` | Hình 6 | Buyer mobile: chi tiết SP → giỏ → QR → hồ sơ & khiếu nại | §1.2, §1.3, §1.4, §1.5 | Giỏ phải **tách theo shop**; QR phải **tách theo seller**; sửa nhãn "ĐIỀU KIỆN BẮT BUỘC" |
| — | Hình 7 | Buyer web: chi tiết SP + giỏ bên phải + hồ sơ & lịch sử đơn | §1.2, §1.3 | Khối "Sàn REBOX Bảo Vệ Dòng Tiền 100%" ghi "hoàn tiền trong 10s" — xem M7 |
| `luồng admin.png` | Hình 8 | Admin mobile: danh sách tranh chấp → chi tiết AI Tầng 1 → thống kê → tham số AI | §4.1, §4.2, §4.3 | Bỏ nhánh **AI TỪ CHỐI** (L6); ngưỡng 70% ở đây vs 80% ở bản web (M8) |
| — | Hình 9 | Admin web: AI Risk Triage & Arbitration Console | §4.2, §4.3 | Bảng tính hoàn tiền trong mock **sai công thức** (M9); bỏ nhãn "Độ chính xác AI 99.8%" |
| `BMC rebox.png` | Hình 10 | Business Model Canvas | — | Nguồn của gói quảng bá 20.000đ/SP/tuần → §1.1 (bắt buộc nhãn "Tài trợ") |
| `cơ cấu tổ chức.png` | — | Sơ đồ tổ chức 10 thành viên | `04-PLAN` §10 | Nguồn phân công trách nhiệm |

**Ba chi tiết trong prototype đã được giữ nguyên vì đúng và tốt:**

1. **Toggle SELLER/BUYER/ADMIN ở góc phải header** — giải quyết gọn bài toán một người vừa bán vừa mua, tránh phải tách 2 app.
2. **Thanh "SỐ DƯ KHẢ DỤNG" cố định trên đầu mọi màn hình seller** — ký quỹ là ràng buộc thường trực của mô hình, đặt nó thường trực trong tầm mắt là đúng.
3. **Ba tab đáy cho seller (Đăng bán / Kho hàng / Đối soát)** — khớp chính xác ba việc mà một nhân viên kho làm trong ngày. Không thêm tab thứ tư.

---

## 0. Nền tảng chung

### 0.1. Phân chia ứng dụng

| App | Đối tượng | Nền tảng | Ghi chú |
|---|---|---|---|
| **REBOX Buyer** | Người mua | Mobile (RN) + Web (Next.js) | Web cần SSR để SEO trang sản phẩm |
| **REBOX Seller** | Chủ shop, nhân viên kho | Mobile (RN) + Web | Mobile ưu tiên quét mã; Web ưu tiên bảng biểu, kết nối máy quét cầm tay |
| **REBOX Admin** | Nội bộ | Web (chính) + Mobile (chỉ đọc + duyệt nhanh) | |

**Quyết định:** một binary mobile duy nhất, chuyển vai trò bằng toggle SELLER/BUYER ở góc phải header (đúng như prototype). Người dùng có thể vừa bán vừa mua. Vai trò lưu trong `user_roles`, không phải 2 app riêng.

### 0.2. Kiến trúc state

```
TanStack Query   → toàn bộ server state (cache, retry, optimistic, invalidation)
Zustand          → UI state cục bộ (giỏ hàng chưa gửi, form nháp, vai trò hiện tại)
React Hook Form + Zod  → form, dùng chung schema với backend qua @rebox/shared
MMKV / localStorage    → persist giỏ hàng, nháp đăng bán, token
```

**Nguyên tắc:** mọi con số tiền tính lại ở backend, frontend chỉ hiển thị. Frontend **được phép** hiển thị ước tính (ví dụ "phí sàn dự kiến ~30.000đ") nhưng phải gắn nhãn "dự kiến" và số chốt luôn lấy từ API.

### 0.3. Xử lý lỗi chuẩn

| Mã | Ý nghĩa | UI |
|---|---|---|
| `ITEM_BEING_PURCHASED` | Người khác đang thanh toán | Toast "Sản phẩm đang được người khác đặt mua" + tự bỏ khỏi giỏ sau 3s |
| `ITEM_SOLD` | Đã bán mất | Modal "Rất tiếc, sản phẩm vừa được mua" + gợi ý sản phẩm tương tự |
| `SHOP_UNAVAILABLE` | Shop thiếu ký quỹ | "Shop tạm ngừng bán" + nút bỏ item khỏi giỏ |
| `HOLD_EXPIRED` | Quá 15 phút chưa trả tiền | Quay về giỏ, thử checkout lại |
| `INSUFFICIENT_DEPOSIT` | (Seller) không đủ ký quỹ | Banner đỏ + nút "Nạp ngay" + số tiền cần nạp |
| `NETWORK` | Mất mạng | Retry tự động 3 lần, sau đó nút "Thử lại"; form giữ nguyên dữ liệu |

**Quy tắc offline cho app kho:** nhân viên kho quét hàng trong kho thường sóng yếu. Màn hình quét phải hoạt động offline: lưu hàng đợi cục bộ (MMKV), đồng bộ khi có mạng, hiển thị badge "N mục chờ đồng bộ".

---

## 1. Luồng Buyer — Mobile

> Tham chiếu `luồng mua hàng - buyer.png` (4 màn hình)

### 1.1. Màn hình "Săn hàng" (Home)

```
┌─────────────────────────────┐
│ REBOX              [BUYER]  │
├─────────────────────────────┤
│ [🔍 Tìm sản phẩm...]        │
│ [Tất cả][Thời trang][Đồ GD] │
├─────────────────────────────┤
│ ┌───────────────────────┐   │
│ │ 🏷 MỚI 99% - ĐƠN HOÀN │   │  ← badge tình trạng
│ │      [ảnh sản phẩm]   │   │
│ │ Váy lụa dáng dài Satin│   │
│ │ 225.000đ  2̶5̶0̶.̶0̶0̶0̶đ̶ -10%│   │
│ │ 📍 Hà Nội · Shop ABC  │   │
│ │ 🚚 Freeship            │   │  ← hiện khi giá ≥ 100k
│ └───────────────────────┘   │
├─────────────────────────────┤
│  🏠 Săn hàng  🛒 Giỏ  👤 CN │
└─────────────────────────────┘
```

**Dữ liệu:** `GET /listings?cursor=&category=&sort=` — phân trang con trỏ, không dùng offset (danh sách thay đổi liên tục vì mỗi món chỉ có 1).

**Đặc thù bắt buộc của sàn hàng đơn chiếc:**
- Mỗi món chỉ có 1 ⇒ danh sách "hết hàng" rất nhanh. Dùng **polling nhẹ 30s** hoặc SSE để gỡ item đã bán khỏi lưới, thay vì để user bấm vào rồi mới báo hết.
- Badge **`condition_grade`** phải hiển thị nổi bật ở mọi nơi có ảnh sản phẩm. Đây vừa là yếu tố tin cậy, vừa là **nghĩa vụ pháp lý** về mô tả trung thực hàng đã qua sử dụng.
- Không hiển thị "còn X sản phẩm" — luôn là 1, hiển thị chỉ gây rối.

**Khu vực quảng bá:** listing đã mua gói 20.000đ/tuần hiển thị ở khu vực gợi ý trang chủ, **bắt buộc gắn nhãn "Tài trợ"** (yêu cầu của Luật BVQLNTD 2023 và Luật Quảng cáo — xem `05-PHAP-LY` §8). Thứ tự trong khu vực này random như tài liệu mô tả.

### 1.2. Chi tiết sản phẩm

Khối quan trọng nhất là **"Cam kết của REBOX"** (prototype đã có):

```
┌──────────────────────────────────────┐
│ CAM KẾT CỦA REBOX                    │
│ Hoàn trả 100% tiền nếu hàng hóa khui │
│ ra khác xa mô tả (khác trên 30%).    │
│                                      │
│ ĐIỀU KIỆN ĐỂ XỬ LÝ NHANH:            │  ← đổi từ "ĐIỀU KIỆN BẮT BUỘC"
│ Quay video khui hộp liên tục, có ít  │
│ nhất 5 giây đầu quay rõ nhãn niêm    │
│ phong hộp trước khi bóc.             │
│ ℹ️ Không có video vẫn gửi được khiếu │
│ nại, nhưng sẽ xử lý thủ công và lâu  │
│ hơn.                    [Xem chi tiết]│
└──────────────────────────────────────┘
```

**Thay đổi so với prototype — bắt buộc:** đổi "ĐIỀU KIỆN BẮT BUỘC" thành "ĐIỀU KIỆN ĐỂ XỬ LÝ NHANH" và thêm dòng giải thích. Lý do ở `00-TONG-QUAN` L5 và `05-PHAP-LY` §5: điều khoản làm mất quyền khiếu nại có nguy cơ vô hiệu theo Điều 25 Luật BVQLNTD 2023.

Ngoài ra bắt buộc hiển thị (nghĩa vụ của sàn theo Nghị định 85/2021):
- Tên shop, trạng thái xác thực (đã eKYC), địa chỉ kho cấp tỉnh/thành
- Tình trạng hàng chi tiết (`condition_notes` — không được để trống)
- Chính sách đổi trả, quy trình khiếu nại (link tới Quy chế sàn)

### 1.3. Giỏ hàng — tách theo shop

```
┌─────────────────────────────────┐
│ Giỏ Hàng Của Bạn                │
├─────────────────────────────────┤
│ ▾ Shop ABC (Hà Nội)             │
│   ☑ Váy lụa Satin      225.000đ │
│   Tạm tính:            225.000đ │
│   Phí vận chuyển:            0đ │
│   ✅ Đơn ≥100k — Freeship       │
├─────────────────────────────────┤
│ ▾ Shop XYZ (TP.HCM)             │
│   ☑ Ốp lưng iPhone      60.000đ │
│   Tạm tính:             60.000đ │
│   Phí vận chuyển:       15.000đ │
│   💡 Mua thêm 40.000đ từ shop   │
│      này để được freeship       │
├─────────────────────────────────┤
│ TỔNG CỘNG:             300.000đ │
│        [ĐẶT HÀNG]               │
└─────────────────────────────────┘
```

**Khác biệt quan trọng so với prototype:** prototype hiển thị giỏ phẳng với một dòng "Phí vận chuyển: 15.000đ". Thực tế phải **tách theo shop** vì ngưỡng freeship 100k tính theo từng shop (L8), và mỗi shop là một kiện hàng riêng, một QR thanh toán riêng.

Gợi ý "mua thêm X để freeship" là đòn bẩy AOV mạnh và hoàn toàn khớp với mục tiêu chống tách đơn trong tài liệu.

### 1.4. Thanh toán

```
Bước 1: Chọn phương thức
  ┌──────────────────────────────┐
  │ ○ Thanh toán QR (khuyến nghị)│
  │   +1 điểm thưởng             │  ← ưu đãi để đẩy khỏi COD
  │ ○ Ship COD                   │
  │   ⚠ Có thể không khả dụng    │
  └──────────────────────────────┘

Bước 2 (nếu QR, nhiều shop): hiển thị TỪNG QR một
  ┌──────────────────────────────┐
  │ Thanh toán 1/2 — Shop ABC    │
  │        [QR CODE]             │
  │ Số tiền: 225.000đ            │
  │ Nội dung: RBX01J8XK...       │
  │ ⏱ Còn 14:32                  │
  │ Đang kiểm tra giao dịch...   │
  │ [Đã chuyển khoản]  [Huỷ]     │
  └──────────────────────────────┘
```

**Đây là điểm ma sát UX lớn nhất của mô hình.** Vì tiền đi thẳng về từng seller, buyer mua 3 shop phải quét 3 QR. Phương án giảm đau:

1. **Mặc định gợi ý mua trong 1 shop** — bố cục trang chủ nhóm theo shop, gợi ý "sản phẩm khác từ shop này".
2. **Nếu nhiều shop:** hiển thị tuần tự có thanh tiến độ, tự chuyển QR tiếp theo khi webhook xác nhận QR trước.
3. **Cho phép thanh toán từng phần** — shop nào trả rồi thì đơn shop đó đi tiếp, không chờ nhau.
4. **Cân nhắc nghiêm túc:** nếu tỷ lệ giỏ đa shop cao, nên chuyển sang mô hình tiền qua PSP rồi tách — nhưng khi đó cần giấy phép/đối tác trung gian thanh toán (`05-PHAP-LY` §2). Đây là đánh đổi kiến trúc–pháp lý cần ban dự án quyết.

**Polling trạng thái:** sau khi buyer bấm "Đã chuyển khoản", client poll `GET /orders/{id}/payment-status` mỗi 3s trong 2 phút, rồi giãn ra 10s. Có SSE thì tốt hơn nhưng poll là đủ ở quy mô v1.

**Đếm ngược hết hạn:** khi còn 3 phút, đổi màu cảnh báo. Khi hết hạn, hiển thị màn hình rõ ràng: "Đơn đã hết hạn giữ chỗ. Nếu bạn đã chuyển khoản, liên hệ CSKH kèm mã RBX..." — tuyệt đối không để buyer chuyển tiền xong mà màn hình trống.

### 1.5. Hồ sơ cá nhân & khiếu nại

Prototype đã đúng. Bổ sung:

```
┌────────────────────────────────┐
│ Đơn #RBX-99821       ĐÃ GIAO   │
│ Váy lụa dáng dài Satin         │
│ ⏱ Còn 2 ngày 4 giờ để khiếu nại│  ← đếm ngược từ claim_deadline_at
│              [GỬI KHIẾU NẠI]   │
└────────────────────────────────┘
```

Đồng hồ đếm ngược là chi tiết nhỏ nhưng quan trọng: nó vừa nhắc buyer, vừa là bằng chứng REBOX đã thông báo rõ về thời hạn.

### 1.6. Luồng gửi khiếu nại (màn hình quan trọng nhất)

```
Bước 1 — Chọn lý do
  ○ Hàng khác xa mô tả
  ○ Hàng bị hư hỏng
  ○ Thiếu hàng / hộp rỗng
  ○ Nghi ngờ hàng giả
  ○ Khác

Bước 2 — Hướng dẫn quay video  ← THIẾU TRONG PROTOTYPE, BẮT BUỘC BỔ SUNG
  Animation 10 giây minh họa:
    1. Quay 4 mặt + nắp hộp, thấy rõ nhãn niêm phong  (≥5 giây)
    2. Bóc hộp trong cùng một lần quay, KHÔNG tắt máy
    3. Quay rõ sản phẩm bên trong
  [Tôi đã hiểu — Bắt đầu quay]

Bước 3 — Quay video trong app
  - Đếm ngược 3-2-1 rồi tự động ghi
  - Overlay "5 giây đầu: quay nhãn niêm phong" + progress bar
  - Cảnh báo realtime nếu phát hiện tạm dừng
  - Tối đa 180 giây, tối thiểu 15 giây
  - [Quay lại] [Dùng video này]
  - Link nhỏ: "Tôi đã quay bằng ứng dụng khác" → chọn từ thư viện

Bước 4 — Mô tả + ảnh bổ sung
  Textarea (tối thiểu 20 ký tự) + tối đa 5 ảnh

Bước 5 — Xác nhận & gửi
  Hiển thị: số tiền yêu cầu hoàn, quy trình xử lý, thời gian dự kiến
  Checkbox: "Tôi cam đoan thông tin trung thực"  ← có giá trị pháp lý

Bước 6 — Theo dõi
  Timeline: Đã gửi → Đang xác minh → Kết quả
  Nếu bị từ chối: hiển thị lý do + nút "Khiếu nại lại" (7 ngày)
```

**Upload:** nền tảng (background upload, `expo-task-manager`), có thanh tiến độ, tiếp tục được khi mất mạng. Video 60 giây ở 720p ≈ 50–80MB — trên 4G Việt Nam mất 1–3 phút. Cho phép buyer thoát app trong lúc upload.

**Nén trước khi upload:** transcode xuống 720p/2Mbps ngay trên máy. Giảm ~60% dung lượng, giảm chi phí lưu trữ, giảm thời gian upload. **Lưu ý:** ghi rõ trong `capture_meta` là đã nén bằng app, để AI không nhầm dấu vết transcode thành dấu hiệu cắt ghép.

---

## 2. Luồng Seller — Mobile

> Tham chiếu `luồng đăng bán - seller.png` và `luồng xem kho hàng và đối soát- seller.png`

### 2.1. Thanh trạng thái ký quỹ (luôn hiển thị)

Prototype hiển thị "SỐ DƯ KHẢ DỤNG: 300.000 VNĐ". Cần mở rộng thành 3 trạng thái:

```
Bình thường (coverage ≥ 0.3)
┌──────────────────────────────────┐
│ SỐ DƯ KHẢ DỤNG      300.000 VNĐ │
│ Đang giữ cho đơn:   225.000 VNĐ │
└──────────────────────────────────┘

Cảnh báo (coverage < 0.15)
┌──────────────────────────────────┐
│ ⚠ SỐ DƯ THẤP         80.000 VNĐ │
│ 12/40 sản phẩm đã tạm ẩn         │
│              [NẠP THÊM QUỸ]      │
└──────────────────────────────────┘

Khóa (không phủ nổi listing nào)
┌──────────────────────────────────┐
│ 🔒 KHO ĐANG BỊ KHÓA              │
│ Nạp tối thiểu 220.000đ để mở lại │
│              [NẠP NGAY]          │
└──────────────────────────────────┘
```

**Nguyên tắc:** không bao giờ chỉ báo "kho bị khóa". Luôn kèm **số tiền chính xác cần nạp** và **nút nạp ngay**. Đây là lúc seller sắp bỏ nền tảng.

### 2.2. Màn hình quét mã vận đơn

Prototype có 4 bước rất đúng: khung quét → "Đang đồng bộ sàn ngoài..." → hiện dữ liệu → "Đăng bán thành công". Cần bổ sung xử lý thực tế:

```
State machine của màn hình quét:

IDLE ──quét được mã──► RESOLVING (hiện skeleton ngay, KHÔNG chặn màn hình)
                            │
        ┌───────────────────┼──────────────────┬─────────────────┐
        ▼                   ▼                  ▼                 ▼
   FOUND_LOCAL         FOUND_CSV         FOUND_API        NOT_FOUND
   (~50ms)             (~100ms)          (1-3s)           (sau 8s)
        │                   │                  │                 │
        └───────────────────┴──────────────────┴─────────────────┘
                            ▼
                      REVIEW (form đã điền / form trống)
                            │
                   [CHỈNH SỬA]  [ĐĂNG BÁN]
                            ▼
                      PUBLISHING → PUBLISHED
                            │
                    tự động quay lại IDLE sau 1,5s
                    (nhân viên kho quét liên tục)
```

**Chi tiết bắt buộc cho môi trường kho:**

| Yêu cầu | Lý do |
|---|---|
| Sau khi đăng xong, **tự quay lại chế độ quét sau 1,5s** | Nhân viên quét hàng trăm kiện/ngày, không ai muốn bấm "quét tiếp" 200 lần |
| **Phản hồi âm thanh + rung** khi quét thành công | Nhân viên không nhìn màn hình liên tục |
| **Hàng đợi offline** | Kho thường sóng yếu; lưu cục bộ, đồng bộ sau, badge "N chờ đồng bộ" |
| **Đèn flash toggle** | Kho tối, nhãn vận đơn hay bị mờ |
| **Nhập tay mã vận đơn** | Nhãn rách/mờ là chuyện thường xuyên |
| **Lịch sử 20 mã vừa quét** | Để kiểm tra nhanh, phát hiện quét sót |
| **Cảnh báo quét trùng** | "Mã này đã đăng bán ngày 20/8" + link tới listing |

**Optimistic UI cho bước API sàn:** hiển thị form ngay ở mốc 1,5s với các trường đã có (từ CSV/local). Nếu API sàn trả về sau đó, **điền bù các trường còn trống** kèm hiệu ứng highlight, không ghi đè trường seller đã sửa.

### 2.3. Form đăng bán

```
┌──────────────────────────────────────┐
│ ĐỒNG BỘ DỮ LIỆU SÀN SHOPEE/TIKTOK    │
│ Sản phẩm:  Váy lụa dáng dài Satin    │
│ SKU:       Màu Đen - Size M          │
│ Giá gốc:   250.000 VNĐ               │
│ Giá trần xả kho (90%): 225.000 VNĐ   │
├──────────────────────────────────────┤
│ Giá bán *    [225.000        ] VNĐ   │
│ ⓘ Tối đa 225.000đ (90% giá gốc)      │
│                                      │
│ Tình trạng * ▼ Mới 99% - Đơn hoàn    │
│ Mô tả tình trạng *  ← BẮT BUỘC       │
│ [Hộp còn nguyên, chưa qua sử dụng]   │
│ ⓘ Mô tả trung thực khuyết điểm là    │
│   nghĩa vụ pháp lý và giảm khiếu nại │
│                                      │
│ Ảnh * (tối thiểu 1, tối đa 6)        │
│ [📷 Chụp] [🖼 Chọn]                  │
│                                      │
│ Cân nặng * [500] g   ⓘ Cần để tính   │
│ KT (cm) [30]x[20]x[5]   cước chính xác│
├──────────────────────────────────────┤
│ 💰 Nếu bán được:                     │
│    Bạn nhận:      225.000đ (về TK)   │
│    Phí sàn trừ ví: -45.000đ          │
│    Ví sẽ giữ tạm:  270.000đ          │
│    ⚠ Số dư sau khi giữ: 30.000đ      │
├──────────────────────────────────────┤
│      [LƯU NHÁP]      [ĐĂNG BÁN]      │
└──────────────────────────────────────┘
```

**Khối "Nếu bán được" là thay đổi quan trọng nhất so với prototype.** Mô hình ký quỹ rất dễ gây hiểu lầm — seller thấy "phí 20%" nhưng không hình dung được rằng tiền hàng về ngân hàng còn phí thì trừ ví. Hiển thị minh bạch ngay tại thời điểm đăng bán sẽ giảm mạnh khiếu nại và tăng tỷ lệ giữ chân.

**Cảnh báo trước:** nếu đăng thêm listing này khiến `coverage` xuống dưới ngưỡng, hiện cảnh báo vàng trước khi bấm đăng, không phải sau.

### 2.4. Kho hàng xả kho

Prototype đúng. Bổ sung bộ lọc và trạng thái thứ tư:

```
┌────────────────────────────────────┐
│ Kho Hàng Xả Kho                    │
│ [🔍 Tìm SKU, mã vận đơn...]        │
│ [Tất cả][Đang bán][Đã bán]         │
│ [Khiếu nại][Bị ẩn 12]  ← MỚI       │
├────────────────────────────────────┤
│ 👗 Váy lụa Satin       225.000đ    │
│    SKU: Đen-M | Tồn: 1  [ĐANG BÁN] │
│                                    │
│ 👟 Giày Jordan         850.000đ    │
│    SKU: Đỏ-42 | Tồn: 1  [KHIẾU NẠI]│
│    ⏱ Cần phản hồi trong 18h        │  ← MỚI: SLA phản hồi
│                                    │
│ 🎧 Sony XM4            950.000đ    │
│    SKU: Bạc  | Tồn: 0    [ĐÃ BÁN]  │
│                                    │
│ 🧥 Áo khoác dạ         450.000đ    │
│    SKU: Be-L | Tồn: 1   [BỊ ẨN]    │  ← MỚI
│    ⚠ Thiếu ký quỹ 180.000đ         │
└────────────────────────────────────┘
```

Nhóm "Bị ẩn" phải nổi bật với **tổng số tiền cần nạp để mở lại tất cả** — biến một thông báo tiêu cực thành một lời kêu gọi hành động rõ ràng.

### 2.5. Đối soát tài chính

Prototype hiển thị 3 con số: Số dư ký quỹ / Tạm khóa đối soát / Tổng doanh thu thực nhận. Cần làm rõ nguồn của từng con số vì chúng đến từ **hai nơi khác nhau** — điểm dễ gây hiểu lầm nhất trong toàn bộ sản phẩm:

```
┌──────────────────────────────────────┐
│ VÍ KÝ QUỸ REBOX                      │
│ (tiền bạn nạp để bảo đảm giao dịch)  │
│ Khả dụng:            300.000 VNĐ     │
│ Đang giữ cho 2 đơn:  850.000 VNĐ     │
│ [NẠP QUỸ]  [RÚT QUỸ]                 │
├──────────────────────────────────────┤
│ DOANH THU BÁN HÀNG                   │
│ (tiền về THẲNG tài khoản ngân hàng   │
│  của bạn — REBOX không giữ)          │
│ Tháng này:         4.320.000 VNĐ     │
│ TK nhận: Vietcombank ****1234        │
├──────────────────────────────────────┤
│ PHÍ SÀN ĐÃ TRỪ (từ ví ký quỹ)        │
│ Tháng này:           864.000 VNĐ     │
├──────────────────────────────────────┤
│ LỊCH SỬ GIAO DỊCH VÍ                 │
│ #RBX-99821  Hoàn tiền khiếu nại      │
│             -165.000đ    hôm qua     │
│ #RBX-99812  Phí sàn đơn Váy lụa      │
│             -45.000đ     20/08       │
│ Nạp quỹ                              │
│             +500.000đ    18/08       │
└──────────────────────────────────────┘
```

Ba khối tách bạch, có chú thích ngắn cho từng khối. Kèm nút xuất CSV cho kế toán và trang "Đối chiếu với sao kê ngân hàng" hướng dẫn seller tự khớp.

---

## 3. Luồng Seller — Web App

> Tham chiếu `website-seller-đăng bán.png`

Web App phục vụ **tổng kho xử lý lô lớn**, khác hẳn mobile. Layout 3 cột theo prototype: sidebar (Đăng bán / Quản lý kho hàng / Đối soát dòng tiền) + nội dung chính.

### 3.1. Đăng bán hàng loạt (thế mạnh của web)

```
┌───────────────────────────────────────────────────────┐
│ Đăng Bán Hàng Loạt                                    │
├───────────────────────────────────────────────────────┤
│ Cách 1: Máy quét mã vạch cầm tay                      │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 🔴 Đang lắng nghe máy quét...  Đã quét: 47        │ │
│ │ [ô input ẩn nhận keystroke từ máy quét USB]       │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Cách 2: Tải lên CSV từ Shopee/TikTok Seller Center    │
│ [📁 Kéo thả file] [Tải mẫu CSV] [Hướng dẫn export]    │
├───────────────────────────────────────────────────────┤
│ ĐÃ QUÉT (47)         [Điền nhanh ▼] [Đăng tất cả]     │
│ ┌──┬─────────┬────────┬──────┬────────┬─────────────┐ │
│ │☑ │Mã VĐ    │Sản phẩm│Giá gốc│Giá bán│Tình trạng   │ │
│ ├──┼─────────┼────────┼──────┼────────┼─────────────┤ │
│ │☑ │SPX...821│Váy lụa │250.000│225.000│Mới 99% ▼   │ │
│ │☑ │SPX...834│Giày J4 │950.000│855.000│Mới 99% ▼   │ │
│ │⚠ │SPX...901│(trống) │  --   │       │Cần nhập tay │ │
│ └──┴─────────┴────────┴──────┴────────┴─────────────┘ │
├───────────────────────────────────────────────────────┤
│ 📊 Đăng 47 sản phẩm, tổng giá trị 12.400.000đ         │
│ Ký quỹ cần có: 3.100.000đ · Hiện có: 800.000đ         │
│ ⚠ 34 sản phẩm sẽ bị tạm ẩn. [Nạp 2.300.000đ]         │
│                              [ĐĂNG 47 SẢN PHẨM]       │
└───────────────────────────────────────────────────────┘
```

**Chi tiết kỹ thuật cho máy quét cầm tay:** máy quét USB hoạt động như bàn phím, gửi chuỗi ký tự rồi `Enter`. Bắt bằng listener `keydown` toàn cục, phân biệt với gõ tay bằng **tốc độ gõ** (máy quét < 30ms/ký tự, người > 80ms). Không cần driver, không cần WebUSB.

**Điền nhanh (bulk edit):** chọn nhiều dòng → đặt cùng tình trạng, cùng % giảm giá so với giá gốc, cùng cân nặng. Đây là tính năng tiết kiệm thời gian lớn nhất cho tổng kho — quan trọng hơn cả tốc độ quét.

**Cảnh báo ký quỹ ở cuối bảng** biến thời điểm đăng hàng loạt thành thời điểm bán ký quỹ. Đúng lúc, đúng ngữ cảnh.

### 3.2. Quản lý kho hàng + Thống kê SKU

Bảng kho theo prototype, bổ sung tab **"Phân tích hàng hoàn theo SKU"** — đây là Gain Creator (f) trong tài liệu nhưng chưa có trong prototype:

```
┌─────────────────────────────────────────────────────────┐
│ Phân Tích Hàng Hoàn Theo SKU                            │
│ [30 ngày ▼]                                             │
├──────────────┬────────┬────────┬─────────┬──────────────┤
│ SKU          │Đã bán  │Bị hoàn │Tỷ lệ    │Lý do chính   │
├──────────────┼────────┼────────┼─────────┼──────────────┤
│ Váy Satin-M  │  120   │   48   │ 40% 🔴  │Sai size (72%)│
│ Váy Satin-L  │   95   │    8   │  8% 🟢  │Đổi ý         │
│ Giày J4-42   │   60   │   12   │ 20% 🟡  │Lỗi keo (58%) │
└──────────────┴────────┴────────┴─────────┴──────────────┘
│ 💡 Váy Satin size M có tỷ lệ hoàn 40%, cao gấp 5 lần    │
│    size L. Nguyên nhân chính: sai size. Đề xuất kiểm    │
│    tra lại bảng size hoặc bổ sung ảnh đo thực tế.       │
└─────────────────────────────────────────────────────────┘
```

Đây là tính năng giữ chân seller mạnh nhất trong toàn bộ sản phẩm: nó chuyển REBOX từ "chỗ xả hàng" thành "công cụ giảm tỷ lệ hoàn". Nên ưu tiên cao hơn nhiều tính năng hào nhoáng khác.

### 3.3. Cài đặt kết nối

Trang gộp: liên kết sàn (Shopee/TikTok OAuth), liên kết phần mềm kho (client_id/secret + webhook URL + log giao webhook gần đây), tài khoản ngân hàng nhận tiền, địa chỉ kho, cấu hình ĐVVC mặc định.

---

## 4. Luồng Admin

> Tham chiếu `luồng admin.png` (mobile) và `website-seller-đăng bán.png` tab AI Admin Hub

### 4.1. Hàng đợi AI Triage

```
┌──────────────────────────────────────────────────────┐
│ Hàng Đợi Tranh Chấp (14)                             │
│ [Sắp quá SLA 3][Giá trị cao 2][Thường 9]             │
├──────────────────────────────────────────────────────┤
│ #RBX-99834   ⏱ Còn 4h        Giày Jordan · 850.000đ  │
│ Điểm AI: 18 · Cờ: cắt ghép, hộp trống                │
│                                          [XỬ LÝ →]   │
├──────────────────────────────────────────────────────┤
│ #RBX-99841   ⏱ Còn 22h       Áo khoác · 320.000đ     │
│ Điểm AI: 78 · Vượt trần auto-approve (300k)          │
│                                          [XỬ LÝ →]   │
└──────────────────────────────────────────────────────┘
```

Sắp xếp mặc định theo `sla_deadline` tăng dần, không theo điểm AI. Việc sắp theo điểm AI khiến admin xử lý theo thứ tự máy gợi ý thay vì theo mức khẩn — một dạng automation bias.

### 4.2. Màn hình phân xử

```
┌────────────────────────────┬─────────────────────────┐
│ VIDEO KHIẾU NẠI            │ PHÂN TÍCH AI            │
│ ┌────────────────────────┐ │ Điểm tổng: 18/100       │
│ │                        │ │                         │
│ │    [video player]      │ │ Toàn vẹn video     0.12 │
│ │                        │ │ ⚠ Phát hiện 3 điểm cắt  │
│ └────────────────────────┘ │   tại 0:03, 0:07, 0:15  │
│ ▬▬▬🔴▬▬▬🔴▬▬▬▬▬▬🔴▬▬▬▬▬▬  │                         │
│    ↑ mốc AI đánh dấu       │ Niêm phong         0.20 │
│ [0.5x][1x][2x] [◀◀][▶][▶▶] │ ⚠ Hộp đã mở trước       │
├────────────────────────────┤                         │
│ SO SÁNH VỚI MÔ TẢ          │ Bằng chứng hư hỏng 0.15 │
│ Ảnh listing │ Frame video  │ ⚠ Không thấy sản phẩm   │
│  [ảnh]      │   [frame]    │   trong video           │
│ "Giày Jordan 4, mới 99%,   │                         │
│  hộp còn nguyên"           │ Rủi ro người mua   0.65 │
├────────────────────────────┤ ⚠ 4 khiếu nại/30 ngày,  │
│ LỜI KHAI BUYER             │   3 bị từ chối          │
│ "Mở ra thấy hộp trống"     │                         │
│                            │ Rủi ro người bán   0.08 │
│ PHẢN HỒI SELLER            │ ✓ 340 đơn, 2 khiếu nại  │
│ "Đã quay video đóng gói,   │                         │
│  đính kèm bên dưới"        │ [Xem báo cáo đầy đủ]    │
│ [video đóng gói của seller]│                         │
├────────────────────────────┴─────────────────────────┤
│ QUYẾT ĐỊNH                                           │
│ ○ Hoàn tiền toàn bộ  ○ Hoàn một phần [_____]đ        │
│ ○ Từ chối khiếu nại                                  │
│ ☐ Lỗi thuộc về người bán (ảnh hưởng phí ship)        │
│ ☐ Yêu cầu trả hàng về shop                           │
│ Lý do (bắt buộc, ≥30 ký tự):                         │
│ [_________________________________________________]  │
│                                        [XÁC NHẬN]    │
└──────────────────────────────────────────────────────┘
```

**Bốn nguyên tắc thiết kế bắt buộc:**

1. **Không có nút "Chấp nhận đề xuất AI".** Admin phải tự chọn. Chống automation bias.
2. **Mốc thời gian AI đánh dấu trên thanh video** — biến điểm số trừu tượng thành thứ admin kiểm chứng được bằng mắt trong 5 giây.
3. **Luôn hiển thị phản hồi của seller** cạnh lời khai buyer. Nghe cả hai bên là nguyên tắc tố tụng cơ bản và là yêu cầu của quy trình giải quyết tranh chấp trên sàn.
4. **Lý do bắt buộc ≥30 ký tự** — nó đi vào thông báo gửi cho cả hai bên và là hồ sơ khi có kháng nghị hoặc khiếu nại tới cơ quan quản lý.

### 4.3. Thống kê vận hành & Tham số AI

Theo prototype: tỷ lệ duyệt tự động, độ chính xác AI, tỷ lệ auto-refund vs escalate; trang cấu hình ngưỡng có slider.

**Bổ sung bắt buộc cho trang tham số:**
- Mọi thay đổi ngưỡng ghi vào `system_configs` với `effective_from`, `changed_by`, `reason` — **không sửa đè**. Cần chứng minh được ngưỡng nào đang áp dụng tại thời điểm nào.
- Hiển thị "thay đổi này ảnh hưởng ~X% tranh chấp trong 30 ngày qua" (mô phỏng trên dữ liệu lịch sử) trước khi lưu.
- Yêu cầu duyệt 2 người với thay đổi ngưỡng auto-approve.
- **Bỏ nhãn "Độ chính xác AI: 99.8%"** khỏi UI production nếu chưa có phương pháp đo được kiểm chứng. Con số này sẽ bị hỏi đến trong mọi buổi thẩm định và trong mọi khiếu nại.

---

## 5. Ma trận màn hình → API

| Màn hình | Endpoint chính |
|---|---|
| Buyer — Home | `GET /listings` |
| Buyer — Chi tiết | `GET /listings/{id}` |
| Buyer — Giỏ | `GET /cart`, `POST /cart/items` |
| Buyer — Checkout | `POST /checkout/init`, `POST /checkout/{id}/pay` |
| Buyer — Chờ thanh toán | `GET /orders/{id}/payment-status` (poll 3s) |
| Buyer — Đơn của tôi | `GET /orders?role=buyer` |
| Buyer — Khiếu nại | `POST /orders/{id}/disputes`, `POST /disputes/{id}/evidence/init` + `/complete` |
| Seller — Quét mã | `POST /seller/scan` |
| Seller — Đăng bán | `POST /seller/listings` |
| Seller — Đăng hàng loạt | `POST /seller/listings/bulk`, `POST /seller/imports/csv` |
| Seller — Kho | `GET /seller/listings` |
| Seller — Đối soát | `GET /seller/wallet`, `GET /seller/wallet/transactions` |
| Seller — Nạp/rút | `POST /seller/wallet/topup`, `POST /seller/wallet/withdraw` |
| Seller — Phân tích SKU | `GET /seller/analytics/returns-by-sku` |
| Admin — Hàng đợi | `GET /admin/disputes` |
| Admin — Phân xử | `GET /admin/disputes/{id}`, `POST /admin/disputes/{id}/resolve` |
| Admin — Tham số | `GET/PUT /admin/configs` |

---

## 6. Khoảng trống giữa prototype và sản phẩm thực

Bảng này liệt kê những gì prototype chưa có nhưng bắt buộc phải có khi triển khai:

| # | Thiếu | Mức độ | Lý do |
|---|---|---|---|
| 1 | Giỏ hàng tách theo shop | **Chặn** | Ngưỡng freeship 100k tính theo shop (L8) |
| 2 | Nhiều QR khi mua nhiều shop | **Chặn** | Hệ quả trực tiếp của mô hình tiền đi thẳng về seller |
| 3 | Hướng dẫn quay video trước khi quay | **Chặn** | Không có thì video không đạt chuẩn, AI không chấm được, tranh chấp tăng vọt |
| 4 | Đăng bán hàng loạt trên web | **Chặn** | Tổng kho là khách hàng chính; đăng từng món là không dùng được |
| 5 | Đổi "ĐIỀU KIỆN BẮT BUỘC" → "ĐỂ XỬ LÝ NHANH" | **Chặn** | Rủi ro điều khoản vô hiệu (L5) |
| 6 | Nhãn "Tài trợ" cho listing quảng bá | **Chặn** | Nghĩa vụ pháp lý |
| 7 | Khối "Nếu bán được" ở form đăng bán | Cao | Mô hình ký quỹ khó hiểu, dễ gây khiếu nại |
| 8 | Trạng thái "Bị ẩn do thiếu quỹ" | Cao | Seller không hiểu vì sao hàng biến mất |
| 9 | Đếm ngược hạn khiếu nại | Cao | Vừa là UX vừa là bằng chứng đã thông báo |
| 10 | Tab phân tích SKU | Cao | Gain Creator (f) trong tài liệu, chưa có trong prototype |
| 11 | Chế độ offline cho màn hình quét | Cao | Kho sóng yếu |
| 12 | Phản hồi của seller trong màn phân xử | Cao | Nguyên tắc nghe cả hai bên |
| 13 | Kênh khiếu nại/CSKH cho buyer | Cao | Nghĩa vụ theo Nghị định 85/2021 |
| 14 | Trang Quy chế sàn, Chính sách bảo mật, Giải quyết tranh chấp | **Chặn** | Bắt buộc khi đăng ký sàn TMĐT |
