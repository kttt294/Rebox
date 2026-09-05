# REBOX - Luồng Frontend chi tiết

Bám sát prototype trong `docs/REBOX-UI/`, nhưng phạm vi hiện hành tuân theo `07-ARCHITECTURE-DECISIONS.md`: GĐ1 là web responsive; native mobile và AI UI là GĐ3.

---

## 0'. Truy vết prototype → đặc tả

Bảng đối chiếu từng file trong `docs/REBOX-UI/` (và ảnh tương ứng trong `REBOX.docx`) với phần đặc tả đã viết. Prototype là nguồn tham khảo UX, không thắng quyết định canonical.

| File prototype                                 | Ảnh trong docx | Màn hình                                                                               | Đặc tả tại             | Ghi chú khi hiện thực                                                                                         |
| ---------------------------------------------- | -------------- | -------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `luồng đăng bán - seller.png`                  | Hình 2         | Seller mobile: quét mã → đồng bộ → xem trước → đăng bán (4 bước)                       | §2.3, §2.4             | Bổ sung chọn nguồn import, state machine quét local, tự quay lại quét sau 1,5s, khối "Nếu bán được"          |
| `website-seller-đăng bán.png` (ảnh 1) + Hình 3 | Hình 3         | Seller web: tab **Đăng Bán** - chọn nguồn import + preview lô + giá trần 90%            | §3.1                   | Prototype đăng từng món; implementation phải bán nguyên package từ manifest đã commit |
| `luồng xem kho hàng và đối soát- seller.png`   | Hình 4         | Seller mobile: Kho hàng xả kho + Đối soát tài chính                                    | §2.5, §2.6             | Bổ sung trạng thái **BỊ ẨN** (thiếu quỹ) + tách 3 khối tiền                                                   |
| `website-seller-đăng bán.png` (ảnh 2, 3)       | Hình 5         | Seller web: Quản lý kho hàng + Đối soát tài chính & Ví ký quỹ                          | §3.2                   | Tab **Phân tích hàng hoàn theo SKU** là target GĐ3, chưa có trong prototype                                   |
| `luồng mua hàng - buyer.png`                   | Hình 6         | Buyer: chi tiết SP → giỏ → QR → hồ sơ & khiếu nại                                      | §1.2, §1.3, §1.4, §1.5 | Giỏ lưu nhiều kiện; **mỗi checkout đúng một package/một QR**; sửa nhãn "ĐIỀU KIỆN BẮT BUỘC"                 |
| -                                              | Hình 7         | Buyer web: chi tiết SP + giỏ bên phải + hồ sơ & lịch sử đơn                            | §1.2, §1.3             | Khối "Sàn REBOX Bảo Vệ Dòng Tiền 100%" ghi "hoàn tiền trong 10s" - xem M7                                     |
| `luồng admin.png`                              | Hình 8         | Admin mobile: danh sách tranh chấp → chi tiết AI Tầng 1 → thống kê → tham số AI        | §4.1, §4.2, §4.3       | Bỏ nhánh **AI TỪ CHỐI** (L6); ngưỡng 70% ở đây vs 80% ở bản web (M8)                                          |
| -                                              | Hình 9         | Admin web: AI Risk Triage & Arbitration Console                                        | §4.2, §4.3             | Bảng tính hoàn tiền trong mock **sai công thức** (M9); bỏ nhãn "Độ chính xác AI 99.8%"                        |
| `BMC rebox.png`                                | Hình 10        | Business Model Canvas                                                                  | -                      | Nguồn của gói quảng bá 20.000đ/SP/tuần → §1.1 (bắt buộc nhãn "Tài trợ")                                       |
| `cơ cấu tổ chức.png`                           | -              | Sơ đồ tổ chức (bản cũ, 10 thành viên)                                                            | `04-PLAN` §10          | **Đã lỗi thời** - đội thực tế là 3 người, xem `04-PLAN` §1.1                                                                                   |

**Ba chi tiết trong prototype đã được giữ nguyên vì đúng và tốt:**

1. **Toggle SELLER/BUYER ở góc phải header** - đổi context giao diện cho người vừa bán vừa mua. Admin tách route/role nội bộ và không nằm trong toggle.
2. **Thanh "SỐ DƯ KHẢ DỤNG" cố định trên đầu mọi màn hình seller** - ký quỹ là ràng buộc thường trực của mô hình, đặt nó thường trực trong tầm mắt là đúng.
3. **Ba tab đáy cho seller (Đăng bán / Kho hàng / Đối soát)** - khớp chính xác ba việc mà một nhân viên kho làm trong ngày. Không thêm tab thứ tư.

---

## 0. Nền tảng chung

### 0.1. Phân chia ứng dụng

| App              | Đối tượng               | Nền tảng                                     | Ghi chú                                                                 |
| ---------------- | ----------------------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| **REBOX Buyer**  | Người mua               | Next.js responsive (GĐ1); Expo GĐ3 | Web cần SSR để SEO trang sản phẩm |
| **REBOX Seller** | Chủ shop, nhân viên kho | Next.js responsive (GĐ1); Expo GĐ3 | Web ưu tiên bảng biểu/máy quét; native chỉ làm khi web là điểm nghẽn |
| **REBOX Admin**  | Nội bộ                  | Web only ở MVP | MFA/AAL2; không có admin mobile approval ở GĐ1 |

**Quyết định:** GĐ1 có một web app. Toggle Buyer/Seller chỉ đổi context; quyền thật lấy từ `shop_memberships`. Buyer là capability mặc định, admin nằm trong `platform_staff_roles`. Khi làm GĐ3 mới cân nhắc một binary mobile Buyer/Seller.

### 0.2. Kiến trúc state

```
TanStack Query   → toàn bộ server state (cache, retry, optimistic, invalidation)
Zustand          → UI state cục bộ (giỏ hàng chưa gửi, form nháp, vai trò hiện tại)
React Hook Form + Zod  → form, dùng chung schema với backend qua @rebox/shared
localStorage           → chỉ persist giỏ hàng/nháp không nhạy cảm; KHÔNG tự lưu auth token
Supabase Auth adapter  → session web/SSR; không tự xây password/refresh-token flow
```

**Nguyên tắc:** mọi con số tiền tính lại ở backend, frontend chỉ hiển thị. Frontend **được phép** hiển thị ước tính (ví dụ "phí sàn dự kiến ~30.000đ") nhưng phải gắn nhãn "dự kiến" và số chốt luôn lấy từ API.

Supabase Realtime, nếu bật, chỉ invalidate query rồi client refetch NestJS API. Không dùng payload Realtime để xác nhận payment/order/wallet/hold/dispute; polling vẫn là fallback.

### 0.3. Xử lý lỗi chuẩn

| Mã                     | Ý nghĩa                    | UI                                                                    |
| ---------------------- | -------------------------- | --------------------------------------------------------------------- |
| `ITEM_BEING_PURCHASED` | Người khác đang thanh toán | Toast "Sản phẩm đang được người khác đặt mua" + tự bỏ khỏi giỏ sau 3s |
| `ITEM_SOLD`            | Đã bán mất                 | Modal "Rất tiếc, sản phẩm vừa được mua" + gợi ý sản phẩm tương tự     |
| `SHOP_UNAVAILABLE`     | Shop thiếu ký quỹ          | "Shop tạm ngừng bán" + nút bỏ item khỏi giỏ                           |
| `HOLD_EXPIRED`         | Quá 30 phút chưa chọn phương thức hoặc quá deadline tương ứng | Quay về giỏ; giao dịch đến sau deadline chuyển xử lý tay |
| `MULTI_SELLER_CHECKOUT_NOT_SUPPORTED` | Request lẫn nhiều shop | Giữ giỏ, yêu cầu chọn một nhóm shop để checkout |
| `INSUFFICIENT_DEPOSIT` | (Seller) không đủ ký quỹ   | Banner đỏ + nút "Nạp ngay" + số tiền cần nạp                          |
| `NETWORK`              | Mất mạng                   | Retry tự động 3 lần, sau đó nút "Thử lại"; form giữ nguyên dữ liệu    |

**Quy tắc offline cho web kho ở GĐ1:** IndexedDB chỉ giữ draft do seller tự nhập, không nhạy cảm, theo namespace user, TTL tối đa 24h và xóa khi logout. Không persist raw mã vận đơn, địa chỉ, token, ảnh/file hoặc payload bên thứ ba; scan cần các dữ liệu đó phải có mạng hoặc chỉ giữ trong memory của tab rồi yêu cầu quét lại. Chỉ gửi lệnh publish khi có mạng và vẫn qua API/idempotency. MMKV/background task chỉ áp dụng nếu native mobile được triển khai ở GĐ3 và phải có privacy design riêng.

---

## 1. Luồng Buyer — web responsive MVP, native mobile ở GĐ3

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
│ │ KIỆN CHƯA MỞ KIỂM TRA │   │  ← disclosure bắt buộc
│ │ [ảnh SP từ bản kê]    │   │
│ │ Kiện hoàn: 4 SP khai báo│ │
│ │ 600.000đ  8̶7̶0̶.̶0̶0̶0̶đ̶ -31%│   │
│ │ 📍 Hà Nội · Shop ABC  │   │
│ │ 🚚 Freeship            │   │  ← hiện khi giá ≥ 100k
│ └───────────────────────┘   │
├─────────────────────────────┤
│  🏠 Săn hàng  🛒 Giỏ  👤 CN │
└─────────────────────────────┘
```

**Dữ liệu:** `GET /listings?cursor=&category=&sort=` - phân trang con trỏ, không dùng offset (danh sách thay đổi liên tục vì mỗi món chỉ có 1).

**Đặc thù bắt buộc của sàn bán nguyên kiện:**

- Mỗi món chỉ có 1 ⇒ danh sách "hết hàng" rất nhanh. Dùng **polling nhẹ 30s**; nếu bật Supabase Realtime thì sự kiện chỉ invalidate cache để client gọi lại NestJS API. Không coi payload Realtime là nguồn trạng thái cuối cùng.
- Package listing phải hiển thị nổi bật **`UNOPENED_UNINSPECTED`**; listing thủ công cũ mới dùng `condition_grade`. Không được hiển thị condition của sản phẩm cho kiện chưa mở.
- Không hiển thị "còn X sản phẩm" - luôn là 1, hiển thị chỉ gây rối.

**GĐ3 — khu vực quảng bá:** khi paid promotion được mở lại, listing trả phí phải gắn nhãn "Tài trợ" và qua Legal review (`05-PHAP-LY` §8). GĐ1 không có gói 20.000đ/tuần hoặc ranking trả phí.

**Quy tắc hiển thị giá theo `price_source` (`01-SPEC` §4.2.2) - áp dụng ở MỌI nơi có giá, không chỉ trang chi tiết:**

```
price_source = VERIFIED_PLATFORM / VERIFIED_SPREADSHEET → price_source = SELLER_DECLARED
┌───────────────────────────┐                        ┌───────────────────────────┐
│ 225.000đ  2̶5̶0̶.̶0̶0̶0̶đ̶ -10%   │                        │ 225.000đ                  │
│ ✓ Giá gốc đối chiếu Shopee│                        │ (không gạch ngang,        │
└───────────────────────────┘                        │  không %, không nhãn)     │
                                                       └───────────────────────────┘
```

Card sản phẩm ở trang chủ, kết quả tìm kiếm, và trang chi tiết đều đọc `original_price` + `discount_pct` từ response - **không tự tính** `% giảm` ở client dù có sẵn cả hai con số trong payload, vì API đã **không trả** `original_price` khi `price_source = SELLER_DECLARED` (xem `01-SPEC` §4.2.2). Nếu field đó vắng mặt, UI chỉ render `price`, tuyệt đối không fallback tự so sánh hay tự bịa % giảm.

Mỗi card nguồn hàng hoàn bán đúng một `ReturnPackage` chưa mở. Card hiển thị bản kê sản phẩm do CSV/API cung cấp, nhãn bắt buộc “Kiện chưa mở kiểm tra” và `availableQuantity` bằng 1 hoặc 0 theo trạng thái package. Tracking không được có trong payload public.

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

**Thay đổi so với prototype - bắt buộc:** đổi "ĐIỀU KIỆN BẮT BUỘC" thành "ĐIỀU KIỆN ĐỂ XỬ LÝ NHANH" và thêm dòng giải thích. Lý do ở `00-TONG-QUAN` L5 và `05-PHAP-LY` §5: điều khoản làm mất quyền khiếu nại có nguy cơ vô hiệu theo Điều 25 Luật BVQLNTD 2023.

Ngoài ra policy UI bắt buộc hiển thị các thông tin dưới đây; Legal phải map wording cuối cùng sang Luật TMĐT 122/2025 và văn bản thi hành hiện hành trước production:

- Tên shop, trạng thái xác thực (đã eKYC), địa chỉ kho cấp tỉnh/thành
- Cảnh báo `UNOPENED_UNINSPECTED`, tình trạng seal bên ngoài và bản kê nguồn chưa kiểm chứng
- Chính sách đổi trả, quy trình khiếu nại (link tới Quy chế sàn)

### 1.3. Giỏ hàng - nhóm theo shop, checkout từng shop

```
┌─────────────────────────────────┐
│ Giỏ Hàng Của Bạn                │
├─────────────────────────────────┤
│ ▾ Shop ABC (Hà Nội)             │
│   ◉ Váy lụa Satin      225.000đ │
│   Tạm tính:            225.000đ │
│   Phí vận chuyển:            0đ │
│   ✅ Đơn ≥100k - Freeship       │
├─────────────────────────────────┤
│ ▾ Shop XYZ (TP.HCM)             │
│   ○ Ốp lưng iPhone      60.000đ │
│   Tạm tính:             60.000đ │
│   Phí vận chuyển:       15.000đ │
│   💡 Mua thêm 40.000đ từ shop   │
│      này để được freeship       │
├─────────────────────────────────┤
│ ĐANG CHỌN SHOP ABC:    225.000đ │
│   [CHECKOUT SHOP ABC]            │
└─────────────────────────────────┘
```

**Khác biệt quan trọng so với prototype:** giỏ có thể lưu nhiều package, nhưng mỗi lần checkout package-backed chỉ chọn đúng một listing, quantity 1. Như vậy mỗi đơn tạo đúng một nhãn mới dán lên đúng kiện cũ. API từ chối nhiều package bằng `ONE_PACKAGE_PER_CHECKOUT` và lẫn seller bằng `MULTI_SELLER_CHECKOUT_NOT_SUPPORTED`.

Không hiển thị gợi ý “mua thêm để freeship” trong flow nguyên kiện vì MVP không gộp nhiều kiện vào một shipment.

### 1.4. Thanh toán

```
Bước 1: Chọn phương thức
  ┌──────────────────────────────┐
  │ ○ Thanh toán QR (khuyến nghị)│
  │ ○ Ship COD                   │
  │   ⚠ Có thể không khả dụng    │
  └──────────────────────────────┘

Bước 2 (nếu QR): một checkout, một package, một QR
  ┌──────────────────────────────┐
  │ Thanh toán - Shop ABC        │
  │        [QR CODE]             │
  │ Số tiền: 225.000đ            │
  │ Nội dung: RBX01J8XK...       │
  │ ⏱ Seller xác nhận trong 11:59│
  │ Chưa ghi nhận chuyển khoản   │
  │ [Đã chuyển khoản]  [Huỷ]     │
  └──────────────────────────────┘
```

**Quy tắc GĐ1:** mỗi checkout package-backed chỉ có một kiện; các listing khác ở lại giỏ. Không có checkout đa seller, gộp nhiều kiện, chuỗi nhiều QR hoặc thanh toán một phần.

**Polling trạng thái:** sau khi buyer bấm "Đã chuyển khoản", UI hiển thị “Đã báo chuyển khoản — chờ seller xác nhận”. Client poll `GET /orders/{id}/payment-status`; Realtime, nếu bật, chỉ là tín hiệu để refetch endpoint này. Phải phân biệt `BUYER_REPORTED`, `PAYMENT_OBSERVED` và `CONFIRMED`; không hiển thị “đã thanh toán” chỉ vì buyer bấm nút.

**Đếm ngược 12 giờ:** tính từ `orders.created_at`, không reset khi reload hay khi buyer bấm lại. Khi hết hạn mà seller chưa xác nhận:

- Có giao dịch provider đã khớp: “Đơn đã hủy do seller chưa xác nhận. REBOX đang hoàn đúng số tiền bạn đã chuyển từ ký quỹ seller.”
- Chưa có bằng chứng chuyển khoản: “Đơn đã hủy, không phát sinh hoàn tiền.”
- Buyer đã báo chuyển nhưng giao dịch chưa khớp: “Đơn đã hủy và đang được đối soát”; không hứa đã hoàn tiền.

Chỉ sau `CONFIRMED` mới hiển thị “Seller đã nhận tiền — đang chuẩn bị bàn giao cho ĐVVC”.

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
Bước 1 - Chọn lý do
  ○ Hàng khác xa mô tả
  ○ Hàng bị hư hỏng
  ○ Thiếu hàng / hộp rỗng
  ○ Nghi ngờ hàng giả
  ○ Khác

Bước 2 - Hướng dẫn quay video  ← THIẾU TRONG PROTOTYPE, BẮT BUỘC BỔ SUNG
  Animation 10 giây minh họa:
    1. Quay 4 mặt + nắp hộp, thấy rõ nhãn niêm phong  (≥5 giây)
    2. Bóc hộp trong cùng một lần quay, KHÔNG tắt máy
    3. Quay rõ sản phẩm bên trong

  ⚠ Lưu ý riêng tư (bắt buộc hiển thị - xem 05-PHAP-LY §3.4.3):
    • Nên quay ở nơi riêng tư
    • Tránh quay người khác, đặc biệt là trẻ em
    • Tránh quay giấy tờ cá nhân, màn hình có thông tin riêng
  [Tôi đã hiểu - Tiếp tục]

Bước 2b - THÔNG BÁO & GHI NHẬN LỰA CHỌN  ← BẮT BUỘC, ĐỨNG TRƯỚC KHI QUAY
```

Không được đặt sau khi đã quay xong: lúc đó buyer đã tạo dữ liệu trước khi nhận thông báo/ghi nhận lựa chọn. Xem `05-PHAP-LY` §3.4.5.

```
  ┌──────────────────────────────────────────────┐
  │  Trước khi quay video khiếu nại               │
  │                                               │
  │  Video của bạn sẽ được dùng để:               │
  │  • Nhân viên REBOX xem để phân xử             │
  │  • NGƯỜI BÁN xem để phản hồi khiếu nại        │
  │    (chỉ bản đã che khuôn mặt và thông tin PII)│
  │                                               │
  │  Video có thể chứa hình ảnh khuôn mặt và      │
  │  giọng nói của bạn - đây là dữ liệu cá nhân   │
  │  nhạy cảm.                                    │
  │                                               │
  │  Mốc giữ mục tiêu: video gốc 90 ngày sau khi  │
  │  đóng case; ảnh đã che/biên bản 3 năm. Có thể │
  │  lâu hơn nếu đang kháng nghị/legal hold hoặc  │
  │  Object Lock chưa hết.                        │
  │                                               │
  │  ☐ Tôi đã đọc thông báo và chọn gửi video để  │
  │    giải quyết khiếu nại              [bắt buộc]│
  │                                               │
  │  ☐ Tôi hiểu cần tránh quay người khác và dữ   │
  │    liệu riêng tư không liên quan     [bắt buộc]│
  │                                               │
  │  [Tiếp tục không gửi video]  [Bắt đầu quay]   │
  │  [Xem chính sách đầy đủ]                      │
  └──────────────────────────────────────────────┘
```

Ô thứ hai chỉ là xác nhận đã đọc hướng dẫn giảm thiểu dữ liệu, không phải lời cam đoan rằng buyer có thể đồng ý thay cho mọi người vô tình xuất hiện và không phải miễn trừ trách nhiệm của REBOX. Nó **không thay thế** các biện pháp kỹ thuật ở bước REDACT: xem `05-PHAP-LY` §3.4.3.

Năm ràng buộc bắt buộc lên màn hình này:

| Ràng buộc                                                                           | Vì sao                                                                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Hai ô xác nhận đều **mặc định tắt**                                                    | Không được coi im lặng là đã đọc/đã chọn; wording/căn cứ cuối cùng do Legal duyệt     |
| Nút "Bắt đầu quay" chỉ bật khi hai ô được tick                                      | Chỉ ràng buộc việc nộp video, không ràng buộc quyền mở khiếu nại                     |
| Nút "Tiếp tục không gửi video" luôn hiện, không bị làm mờ/giấu                       | Ghi nhận lựa chọn từ chối rồi đưa hồ sơ sang manual review, tránh dark pattern       |
| Phải nêu rõ **người bán sẽ xem**                                                    | Thông tin ảnh hưởng trực tiếp đến quyết định của buyer; cũng là thứ hay bị giấu nhất |
| Ghi nhận **theo từng vụ việc**, không phải một lần khi đăng ký tài khoản            | Mỗi khiếu nại là một bối cảnh xử lý riêng                                            |
| Không hiển thị lựa chọn huấn luyện/cải thiện AI ở GĐ1                                | AI là GĐ3; mục đích phụ sau này cần bản ghi tự nguyện tách biệt                      |

Khi bấm một trong hai hành động, client gọi `POST /disputes/{id}/processing-record {noticeArtifactId, decisions[{purpose, decision}]}` và **chờ phản hồi** trước khi mở camera/file picker hoặc chuyển manual review. Server tự resolve exact artifact/hash, `recordType` và `legalBasis`, tạo record cho interaction rồi append vào stable purpose chain; client không được tự khai các field pháp lý. Im lặng không được suy thành `GRANTED`; rút consent là interaction/event `WITHDRAWN` mới. Legal duyệt việc dùng `NOTICE_ACK` hay `CONSENT`; UI không tự gọi mọi trường hợp là "đồng ý". Không có processing record hợp lệ cho purpose upload thì không có `dispute_evidences` (`01-SPEC` §4.2).

Nếu buyer từ chối: **không chặn khiếu nại.** Hồ sơ vẫn được tiếp nhận, đi thẳng vào luồng `ADMIN_REVIEW` thủ công (L5). Hiển thị đúng như vậy, không đe doạ mất quyền lợi.

```
Bước 3 - Quay video trên web GĐ1 (native app ở GĐ3)
  - Đếm ngược 3-2-1 rồi tự động ghi
  - Overlay "5 giây đầu: quay nhãn niêm phong" + progress bar
  - Cảnh báo realtime nếu phát hiện tạm dừng
  - Tối đa 90 giây, tối thiểu 15 giây
  - [Quay lại] [Dùng video này]
  - Link nhỏ: "Tôi đã quay bằng ứng dụng khác" → chọn từ thư viện

  - Ghi `MediaRecorder` pause/resume/error và capture metadata
  - GĐ1 không chạy face/label detection hoặc chấm `integrity_score` trên client

Bước 4 - Mô tả + ảnh bổ sung
  Textarea (tối thiểu 20 ký tự) + tối đa 5 ảnh

Bước 5 - Xác nhận & gửi
  Hiển thị: số tiền yêu cầu hoàn, quy trình xử lý, thời gian dự kiến
  Checkbox: "Tôi cam đoan thông tin trung thực"  ← có giá trị pháp lý

Bước 6 - Theo dõi
  Timeline: Đã gửi → Đang xác minh → Kết quả
  Nếu được duyệt: "Chờ hoàn tiền" (FULL_REFUND_PENDING/PARTIAL_REFUND_PENDING)
  → "Đã hoàn toàn bộ/một phần" chỉ sau PSP PAID hoặc seller-direct VERIFIED;
  payout UNKNOWN/FAILED vẫn hiển thị đang xử lý, không báo đã hoàn
  Nếu bị từ chối: hiển thị lý do + nút "Khiếu nại lại" (7 ngày)
```

**Upload GĐ1:** web dùng upload tiếp tục theo từng phần trong khi tab còn mở, có thanh tiến độ và retry/idempotency. Không hứa tiếp tục sau khi đóng trình duyệt. Background upload bằng native task manager chỉ được xem xét cùng app GĐ3.

**Tính toàn vẹn:** giữ nguyên file mà người dùng đã nộp làm bản gốc WORM. Có thể tạo derivative 720p để phát/xử lý, nhưng phải ghi checksum, codec và lịch sử biến đổi trong `capture_meta`; không ghi đè bản gốc.

Face/label detection và cảnh báo CV on-device là target GĐ3; phải qua privacy/eval gate và không được chặn quyền gửi khiếu nại.

---

## 2. Luồng Seller — web responsive/narrow warehouse flow GĐ1

> Tham chiếu `luồng đăng bán - seller.png` và `luồng xem kho hàng và đối soát- seller.png`

### 2.1. Thanh trạng thái ký quỹ (luôn hiển thị)

Prototype hiển thị "SỐ DƯ KHẢ DỤNG: 300.000 VNĐ". Cần mở rộng thành 3 trạng thái:

```
Bình thường (coverage ≥ 0.15)
┌──────────────────────────────────┐
│ SỐ DƯ KHẢ DỤNG      300.000 VNĐ │
│ Đang giữ cho đơn:   225.000 VNĐ │
│ Đang chờ payout:          0 VNĐ │
│ Tạm chặn do đối soát:     0 VNĐ │
│ Nghĩa vụ còn thiếu:       0 VNĐ │
└──────────────────────────────────┘

Cảnh báo (0 < coverage < 0.15)
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

**Nguyên tắc:** không bao giờ chỉ báo "kho bị khóa". Luôn kèm **số tiền chính xác cần nạp** và **nút nạp ngay**. Chỉ dùng trạng thái khóa coverage khi shop có listing cần phủ nhưng không phủ nổi; shop chưa có listing không bị khóa. KYC, PAUSED, debt và activation là banner/gate riêng, không giả thành coverage thấp.

### 2.2. Chọn nguồn nhập bản kê

```text
┌──────────────────────────────────────────────────┐
│ Nhập các kiện hoàn                               │
│                                                  │
│ [Import trực tiếp từ Shopee/TikTok]              │
│  Kết nối sàn và chọn đơn hoàn                    │
│  Trạng thái bản đầu: Sắp có                      │
│                                                  │
│ [Import bằng CSV/XLSX]                           │
│  Tải file export từ Seller Center                │
│  Trạng thái bản đầu: Có thể sử dụng              │
└──────────────────────────────────────────────────┘
```

Hai nút có cùng cấp bậc trên UI và cùng dẫn tới một màn preview package. Không gọi API thất bại rồi tự chuyển sang file, cũng không tải file thất bại rồi tự gọi API. Khi API chưa đủ gate, giữ nút để người dùng hiểu hướng sản phẩm nhưng disable rõ ràng với nhãn “Sắp có”.

### 2.3. Màn hình quét mã vận đơn

Prototype có 4 bước rất đúng: khung quét → "Đang đồng bộ sàn ngoài..." → hiện dữ liệu → "Đăng bán thành công". Cần bổ sung xử lý thực tế:

```
State machine của màn hình quét:

IDLE ──quét được mã──► RESOLVING (hiện skeleton ngay, KHÔNG chặn màn hình)
                            │
                    ┌───────┼──────────────┐
                    ▼       ▼              ▼
              FOUND_LOCAL DUPLICATE    NOT_FOUND
                    │       │              │
                    └───────┴──────────────┘
                            ▼
                  PACKAGE_PREVIEW (package + bản kê nguồn)
                            │
                    [XÁC NHẬN KIỆN CHƯA MỞ]
                            ▼
                  CREATE_DRAFT → PUBLISHING → PUBLISHED
                            │
                    tự động quay lại IDLE sau 1,5s
                    (nhân viên kho quét liên tục)
```

Scan chỉ đọc package đã commit trong REBOX, bất kể package được nhập từ API hay spreadsheet. `NOT_FOUND` đưa seller về §2.2 để tự chọn kênh import; scan không tự gọi nguồn ngoài.

**Chi tiết bắt buộc cho môi trường kho:**

| Yêu cầu                                                 | Lý do                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------- |
| Sau khi đăng xong, **tự quay lại chế độ quét sau 1,5s** | Nhân viên quét hàng trăm kiện/ngày, không ai muốn bấm "quét tiếp" 200 lần |
| **Phản hồi âm thanh + rung** khi quét thành công        | Nhân viên không nhìn màn hình liên tục                                    |
| **Hàng đợi offline giới hạn**                           | Chỉ draft không nhạy cảm, TTL 24h; mã vận đơn/ảnh/PII không persist, mất mạng thì yêu cầu quét lại |
| **Đèn flash toggle**                                    | Kho tối, nhãn vận đơn hay bị mờ                                           |
| **Nhập tay mã vận đơn**                                 | Nhãn rách/mờ là chuyện thường xuyên                                       |
| **Lịch sử 20 mã vừa quét**                              | Để kiểm tra nhanh, phát hiện quét sót                                     |
| **Cảnh báo quét trùng**                                 | "Kiện này đã được nhập" + link tới listing/package hiện có |

Nếu package được import lại qua nguồn khác, conflict được xử lý ở preview/commit chứ không ở màn scan. Không trộn field âm thầm hoặc thay listing đang bán.

### 2.4. Form đăng bán

Flow scan không có form kiểm đếm sản phẩm. Seller chỉ xem bản kê nguồn, xác nhận kiện chưa mở, kiểm tra seal/bao bì bên ngoài và giá bán cả kiện đã có trong CSV/API. Nếu thiếu cân nặng/kích thước để tạo vận đơn mới, seller cân/đo bên ngoài mà không mở kiện.

```
┌──────────────────────────────────────┐
│ ĐỒNG BỘ DỮ LIỆU SÀN SHOPEE/TIKTOK    │
│ KIỆN HOÀN CHƯA MỞ                     │
│ Bản kê: 3 áo Đen/M + 1 mũ Đen        │
│ Tổng giá trị nguồn: 870.000 VNĐ       │
│ Giá bán cả kiện: 600.000 VNĐ          │
├──────────────────────────────────────┤
│ Công bố: Chưa mở và chưa kiểm tra    │
│ Seal ngoài: [Nguyên / Hỏng / Không rõ]│
│ Ghi chú vỏ kiện: [tuỳ chọn]           │
│                                      │
│ Cân nặng kiện: 930 g                  │
│ KT kiện: 35 × 25 × 15 cm             │
├──────────────────────────────────────┤
│ 💰 Nếu bán được:                     │
│    Bạn nhận:      600.000đ (về TK)   │
│    Phí sàn dự kiến: 120.000đ          │
│    Dự phòng vận chuyển: 45.000đ       │
│    Ví sẽ giữ tạm:  765.000đ          │
│    ⚠ Số dư sau khi giữ: 35.000đ      │
├──────────────────────────────────────┤
│      [LƯU NHÁP]      [ĐĂNG BÁN]      │
└──────────────────────────────────────┘
```

**Khối "Nếu bán được" là thay đổi quan trọng nhất so với prototype.** Ví dụ giả định ví khả dụng 800.000đ và dùng công thức canonical: `600.000 + 120.000 commission + 45.000 reserve = 765.000đ`. Đây chỉ là hold ước tính; commission chỉ được ghi nhận khi đơn hoàn tất. UI phải render breakdown do API trả về, không tự tính.

**Cảnh báo trước:** nếu đăng thêm listing này khiến `coverage` xuống dưới ngưỡng, hiện cảnh báo vàng trước khi bấm đăng, không phải sau.

### 2.5. Xác nhận nhận tiền và bàn giao ĐVVC

```
┌────────────────────────────────────────┐
│ Đơn #RBX-99821 · CHỜ XÁC NHẬN TIỀN    │
│ Buyer phải trả:             225.000đ  │
│ Bank hub: Đã thấy giao dịch khớp       │
│ ⏱ Còn 08:14:32                         │
│ [TÔI ĐÃ NHẬN ĐỦ TIỀN]                  │
└────────────────────────────────────────┘
```

Nút xác nhận phải hiển thị số tiền, mã đơn và hộp xác nhận lần cuối; API ghi actor/time/audit. Sau khi seller xác nhận, UI mới mở nút tạo/in vận đơn. Không cho seller xác nhận sau deadline hoặc từ shop khác.

Nếu hết 12 giờ chưa xác nhận, đơn chuyển sang “Đã hủy do quá hạn”. Nếu hệ thống đã đối chiếu có tiền, seller thấy rõ số tiền hoàn đang bị khấu trừ từ ký quỹ. Nếu ĐVVC báo `SELLER_NO_HANDOVER/PICKUP_FAILED` và hủy trước khi nhận kiện, UI cũng hiển thị full refund cho buyer từ ký quỹ seller. Khi không có bằng chứng buyer đã chuyển, cả hai tình huống chỉ hủy đơn, không hiện giao dịch hoàn.

### 2.6. Kho hàng xả kho

Prototype đúng. Bổ sung bộ lọc và trạng thái thứ tư:

```
┌────────────────────────────────────┐
│ Kho Hàng Xả Kho                    │
│ [🔍 Tìm SKU...]                    │
│ [Tất cả][Đang bán][Đã bán]         │
│ [Khiếu nại][Bị ẩn 12]  ← MỚI       │
├────────────────────────────────────┤
│ 📦 Kiện hoàn RBX-01... 600.000đ    │
│    4 SP khai báo | Tồn: 1 [ĐANG BÁN]│
│                                    │
│ 📦 Kiện hoàn RBX-02... 850.000đ    │
│    1 SP khai báo | Tồn: 0 [KHIẾU NẠI]│
│    ⏱ Cần phản hồi trong 18h        │  ← MỚI: SLA phản hồi
│                                    │
│ 📦 Kiện hoàn RBX-03... 950.000đ    │
│    1 SP khai báo | Tồn: 0 [ĐÃ BÁN] │
│                                    │
│ 📦 Kiện hoàn RBX-04... 450.000đ    │
│    2 SP khai báo | Tồn: 1 [BỊ ẨN]  │  ← MỚI
│    ⚠ Thiếu ký quỹ 180.000đ         │
└────────────────────────────────────┘
```

Nhóm "Bị ẩn" phải nổi bật với **tổng số tiền cần nạp để mở lại tất cả** - biến một thông báo tiêu cực thành một lời kêu gọi hành động rõ ràng.

`Tồn` ở bảng này chỉ là 1 khi package `AVAILABLE`, ngược lại là 0. Seller không sửa trực tiếp con số này.

### 2.7. Đối soát tài chính

Prototype hiển thị 3 con số: Số dư ký quỹ / Tạm khóa đối soát / Tổng doanh thu thực nhận. Cần làm rõ nguồn của từng con số vì chúng đến từ **hai nơi khác nhau** - điểm dễ gây hiểu lầm nhất trong toàn bộ sản phẩm:

```
┌──────────────────────────────────────┐
│ VÍ KÝ QUỸ REBOX                      │
│ (tiền bạn nạp để bảo đảm giao dịch)  │
│ Khả dụng:            300.000 VNĐ     │
│ Đang giữ cho 2 đơn:  850.000 VNĐ     │
│ Đang chờ payout:      100.000 VNĐ     │
│ Tạm chặn unmatched:     50.000 VNĐ     │
│ Nghĩa vụ còn thiếu:     20.000 VNĐ     │
│ Có thể rút:            300.000 VNĐ     │
│ [NẠP QUỸ]  [RÚT QUỸ]                 │
├──────────────────────────────────────┤
│ DOANH THU BÁN HÀNG                   │
│ (tiền về THẲNG tài khoản ngân hàng   │
│  của bạn - REBOX không giữ)          │
│ Tháng này:         4.320.000 VNĐ     │
│ TK nhận: Vietcombank ****1234        │
├──────────────────────────────────────┤
│ PHÍ SÀN ĐÃ TRỪ (từ ví ký quỹ)        │
│ Tháng này:           864.000 VNĐ     │
├──────────────────────────────────────┤
│ LỊCH SỬ GIAO DỊCH VÍ                 │
│ #RBX-99821  Hoàn tiền khiếu nại      │
│             -150.000đ    hôm qua     │
│ #RBX-99812  Phí sàn đơn Váy lụa      │
│             -45.000đ     20/08       │
│ Nạp quỹ                              │
│             +500.000đ    18/08       │
└──────────────────────────────────────┘
```

Ba khối tách bạch, có chú thích ngắn cho từng khối. Kèm nút xuất CSV cho kế toán và trang "Đối chiếu với sao kê ngân hàng" hướng dẫn seller tự khớp.

### 2.8. Phản hồi khiếu nại ← THIẾU TRONG PROTOTYPE, BẮT BUỘC BỔ SUNG

Màn hình này không có trong prototype nhưng bắt buộc phải có: seller có quyền được phản hồi trước khi bị trừ tiền. Đây cũng là nơi quy tắc bảo vệ dữ liệu bên thứ ba được thực thi trong sản phẩm.

```
┌──────────────────────────────────────────────┐
│ ← Khiếu nại #RBX-99834      ⏳ còn 18 giờ     │
├──────────────────────────────────────────────┤
│ Giày Sneaker Jordan 4 · 850.000đ             │
│ Lý do: "Mở ra thấy hộp trống"                │
│ Số tiền yêu cầu hoàn: 850.000đ               │
├──────────────────────────────────────────────┤
│ BẰNG CHỨNG NGƯỜI MUA CUNG CẤP                │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐   │
│ │0:02│ │0:05│ │0:11│ │0:19│ │0:24│ │0:31│   │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘   │
│ ℹ️ Ảnh trích từ video, khuôn mặt đã được     │
│    che để bảo vệ quyền riêng tư.             │
│                                              │
│ Tóm tắt vụ việc do REBOX cung cấp:           │
│ • Niêm phong: đã mở trước khi quay           │
│ • Không phát hiện sản phẩm trong video        │
│ [Xem báo cáo đầy đủ]                         │
├──────────────────────────────────────────────┤
│ PHẢN HỒI CỦA BẠN                             │
│ ○ Đồng ý hoàn tiền  ○ Không đồng ý           │
│ Giải trình: [__________________________]     │
│ Đính kèm: [📎 Video đóng gói] [📷 Ảnh]       │
│                              [GỬI PHẢN HỒI]  │
└──────────────────────────────────────────────┘
```

**Quy tắc tuyệt đối:** seller **không bao giờ** được xem video gốc - chỉ xem `evidence_derivatives` có `visible_to = 'SELLER'`, tức các khung hình đã che khuôn mặt. Xem `05-PHAP-LY` §3.4.3 và `01-SPEC` §4.2.

Lý do: seller cần biết **hàng có bị hỏng không**, không cần xem nhà buyer. Ở GĐ1, admin chọn/che các frame và viết tóm tắt thủ công; GĐ3 có thể hỗ trợ tự động nhưng output vẫn phải qua kiểm soát trước khi chia sẻ.

| Ràng buộc                                             | Chi tiết                                                                                                         |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Không có nút tải xuống, không có link chia sẻ         | Ảnh phục vụ qua presigned URL 5 phút, kèm watermark mã vụ việc                                                   |
| Câu chú thích "khuôn mặt đã được che" là **bắt buộc** | Cho seller biết họ đang xem bản đã xử lý, tránh hiểu nhầm là bằng chứng bị cắt xén                               |
| Chưa có bản derivative đã được duyệt                  | **Không hiển thị gì cho seller.** Admin chọn và che khung hình thủ công; không bao giờ fallback về video gốc    |
| Hết 24 giờ không phản hồi                             | Vụ việc chuyển tiếp cho admin xử lý, ghi nhận seller đã được tạo cơ hội phản hồi                                 |

---

## 3. Luồng Seller — desktop wide/bulk enhancements GĐ1

> Tham chiếu `website-seller-đăng bán.png`

Web App GĐ1 phục vụ **tổng kho xử lý lô lớn**. Layout 3 cột theo prototype: sidebar (Đăng bán / Quản lý kho hàng / Đối soát dòng tiền) + nội dung chính.

### 3.1. Đăng bán hàng loạt (thế mạnh của web)

```
┌───────────────────────────────────────────────────────┐
│ Đăng Bán Hàng Loạt                                    │
├───────────────────────────────────────────────────────┤
│ Chọn một nguồn nhập                                   │
│ [Shopee/TikTok · Sắp có]  [CSV/XLSX · Dùng ngay]     │
│                                                       │
│ CSV/XLSX: [Kéo thả file] [Tải mẫu] [Hướng dẫn export] │
├───────────────────────────────────────────────────────┤
│ PREVIEW KIỆN (47)                                     │
│ ┌──┬─────────┬──────────┬─────────────┬─────────────┐ │
│ │☑ │Mã VĐ    │Số line   │SL khai báo  │Trạng thái   │ │
│ ├──┼─────────┼──────────┼─────────────┼─────────────┤ │
│ │☑ │SPX...821│2         │4            │Sẵn sàng bán │ │
│ │☑ │SPX...901│1         │2            │Sẵn sàng bán │ │
│ │⚠ │SPX...777│--        │--           │Lỗi dữ liệu   │ │
│ └──┴─────────┴──────────┴─────────────┴─────────────┘ │
├───────────────────────────────────────────────────────┤
│ 47 package → 47 listing nguyên kiện                   │
│ Hold ước tính để phủ toàn bộ: [API trả về]            │
│ Ví khả dụng: 800.000đ · [N] món có thể hiển thị       │
│                              [XÁC NHẬN IMPORT]        │
└───────────────────────────────────────────────────────┘
```

**Grain spreadsheet:** một dòng là một `ReturnLine`; nhiều dòng cùng tracking ghép thành một package. Field cấp package phải giống nhau trên mọi dòng. `source_quantity` chỉ là số nguồn khai báo. Mỗi package tạo đúng một listing; không gom/tách theo SKU.

**Cảnh báo coverage ở cuối bảng** chỉ là ước tính hiển thị từ API. Publish không khóa tiền thật; hold chỉ phát sinh khi checkout. Nếu không phủ đủ, backend dùng thuật toán canonical để xác định listing nào hiển thị.

### 3.2. Quản lý kho hàng + Thống kê SKU — target GĐ3

Bảng kho cơ bản thuộc GĐ1. Tab **"Phân tích hàng hoàn theo SKU"** dưới đây là target GĐ3 sau khi có đủ dữ liệu; không nằm trong API/UI MVP:

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

GĐ1 chỉ có tài khoản ngân hàng nhận tiền, địa chỉ kho và cấu hình ĐVVC mặc định. Liên kết sàn Shopee/TikTok là GĐ3 sau partner approval/ToS; Public API/client credential/webhook cho phần mềm kho thuộc GĐ4 sau khi có ít nhất 5 shop thật yêu cầu.

---

## 4. Luồng Admin — web only ở GĐ1

> Prototype mobile/AI chỉ là tham khảo. GĐ1 dùng web console và phân xử thủ công; các panel điểm số AI dưới đây là target GĐ3.

### 4.1. Hàng đợi tranh chấp

Ở GĐ1, hàng đợi sắp theo SLA/giá trị/risk flag do rule vận hành; ẩn cột điểm AI và không auto-approve. Khi module AI GĐ3 vượt qua eval và legal gate, UI mới bật thêm các trường AI trong mock sau.

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

Sắp xếp mặc định theo `sla_deadline` tăng dần, không theo điểm AI. Việc sắp theo điểm AI khiến admin xử lý theo thứ tự máy gợi ý thay vì theo mức khẩn - một dạng automation bias.

### 4.2. Màn hình phân xử

Mock dưới đây là **overlay target GĐ3** để bảo toàn ý tưởng prototype. Ở GĐ1, bỏ toàn bộ cột `PHÂN TÍCH AI` và mốc AI; thay bằng metadata/hash, snapshot listing, evidence, lịch sử hai bên và công cụ admin tự chọn frame để khử nhận dạng.

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
│ Lỗi: ○ Seller  ○ ĐVVC  ○ REBOX  ○ Chưa xác định      │
│ ☐ Yêu cầu trả hàng về shop                           │
│ Lý do (bắt buộc, ≥30 ký tự):                         │
│ [_________________________________________________]  │
│                                        [XÁC NHẬN]    │
└──────────────────────────────────────────────────────┘
```

**Bốn nguyên tắc thiết kế (mục 1–2 chỉ áp dụng khi mở GĐ3):**

1. **Không có nút "Chấp nhận đề xuất AI".** Admin phải tự chọn. Chống automation bias.
2. **Mốc thời gian AI đánh dấu trên thanh video** - biến điểm số trừu tượng thành thứ admin kiểm chứng được bằng mắt trong 5 giây.
3. **Luôn hiển thị phản hồi của seller** cạnh lời khai buyer. Nghe cả hai bên là nguyên tắc tố tụng cơ bản và là yêu cầu của quy trình giải quyết tranh chấp trên sàn.
4. **Lý do bắt buộc ≥30 ký tự** - nó đi vào thông báo gửi cho cả hai bên và là hồ sơ khi có kháng nghị hoặc khiếu nại tới cơ quan quản lý.

### 4.3. Thống kê vận hành & Tham số AI — GĐ3

Theo prototype: tỷ lệ duyệt tự động, độ chính xác AI, tỷ lệ auto-refund vs escalate; trang cấu hình ngưỡng có slider.

**Bổ sung bắt buộc cho trang tham số:**

- Mọi thay đổi ngưỡng ghi vào `system_configs` với `effective_from`, `changed_by`, `reason` - **không sửa đè**. Cần chứng minh được ngưỡng nào đang áp dụng tại thời điểm nào.
- Hiển thị "thay đổi này ảnh hưởng ~X% tranh chấp trong 30 ngày qua" (mô phỏng trên dữ liệu lịch sử) trước khi lưu.
- Yêu cầu duyệt 2 người với thay đổi ngưỡng auto-approve.
- **Bỏ nhãn "Độ chính xác AI: 99.8%"** khỏi UI production nếu chưa có phương pháp đo được kiểm chứng. Con số này sẽ bị hỏi đến trong mọi buổi thẩm định và trong mọi khiếu nại.

---

## 5. Ma trận màn hình → API

| Màn hình                | Endpoint chính                                                                  |
| ----------------------- | ------------------------------------------------------------------------------- |
| Đăng nhập/phiên         | Supabase Auth; `GET /me` qua NestJS                                             |
| Seller - Onboarding KYC | `POST /seller/kyc/session {noticeArtifactId, decisions[]}` + Idempotency-Key; `GET /seller/kyc/status` |
| Buyer - Home            | `GET /listings`                                                                 |
| Buyer - Chi tiết        | `GET /listings/{id}`                                                            |
| Buyer - Giỏ             | `GET /cart`, `POST /cart/items`                                                 |
| Buyer - Checkout        | `POST /checkout/init`; `POST /checkout/{id}/pay` dùng fake/sandbox tới khi A10 đóng |
| Buyer - Chờ thanh toán  | `GET /orders/{id}/payment-status` (poll 3s; fake/sandbox tới khi A10 đóng)      |
| Buyer - Đơn của tôi     | `GET /orders?role=buyer`                                                        |
| Buyer - Khiếu nại       | `POST /orders/{id}/disputes`, `POST /disputes/{id}/processing-record`, `POST /disputes/{id}/evidence/init`, `POST /disputes/{id}/evidence/complete` |
| Buyer - Kháng nghị       | `POST /disputes/{id}/appeal`; evidence bổ sung vẫn qua processing/evidence init/complete |
| Seller - Chọn nguồn + preview/commit | `POST /v1/shops/{shopId}/return-imports/preview`, `POST /v1/shops/{shopId}/return-imports/{previewId}/commit`; bản đầu nhận CSV/XLSX |
| Seller - Quét mã        | `POST /v1/shops/{shopId}/return-packages/scan`                                  |
| Seller - Đăng bán       | Dùng publish listing hiện có sau khi scan tạo draft package-backed              |
| Seller - Kho            | `GET /seller/listings`                                                          |
| Seller - Đối soát       | `GET /seller/wallet`, `GET /seller/wallet/transactions`                         |
| Seller - Nạp/rút        | `POST /seller/wallet/topup`, `POST /seller/wallet/withdraw` — fake/sandbox tới khi A10 đóng |
| Seller - Phản hồi vụ việc | `POST /disputes/{id}/seller-response`; evidence seller dùng cùng WORM pipeline          |
| Seller - Phân tích SKU GĐ3 | `GET /seller/analytics/returns-by-sku` — không có ở MVP                      |
| Admin - Hàng đợi        | `GET /admin/disputes`                                                           |
| Admin - Phân xử         | `GET /admin/disputes/{id}`, `POST /admin/disputes/{id}/resolve`                 |
| Quyền dữ liệu           | `POST /privacy/requests`, `GET /privacy/requests/{id}`                          |
| Admin - Tham số AI GĐ3  | `GET/PUT /admin/configs`                                                        |

---

## 6. Khoảng trống giữa prototype và sản phẩm thực

Bảng này liệt kê những gì prototype chưa có nhưng bắt buộc phải có khi triển khai:

| #   | Thiếu                                                        | Mức độ   | Lý do                                                                       |
| --- | ------------------------------------------------------------ | -------- | --------------------------------------------------------------------------- |
| 1   | Giỏ nhóm theo shop và chỉ checkout một shop                  | **Chặn** | Bảo toàn quy tắc một seller/checkout và ngưỡng freeship theo shop           |
| 2   | Một checkout = một QR; giữ nhóm shop khác trong giỏ          | **Chặn** | Tránh state thanh toán một phần chưa được thiết kế                           |
| 3   | Hướng dẫn quay video trước khi quay                          | **Chặn** | Không có thì bằng chứng kém chất lượng và tranh chấp tăng mạnh               |
| 4   | Đăng bán hàng loạt trên web                                  | **Chặn** | Tổng kho là khách hàng chính; đăng từng món là không dùng được              |
| 5   | Đổi "ĐIỀU KIỆN BẮT BUỘC" → "ĐỂ XỬ LÝ NHANH"                  | **Chặn** | Rủi ro điều khoản vô hiệu (L5)                                              |
| 6   | Nhãn "Tài trợ" cho listing quảng bá GĐ3                      | Gate GĐ3  | Bắt buộc trước khi bật paid promotion                                       |
| 7   | Khối "Nếu bán được" ở form đăng bán                          | Cao      | Mô hình ký quỹ khó hiểu, dễ gây khiếu nại                                   |
| 8   | Trạng thái "Bị ẩn do thiếu quỹ"                              | Cao      | Seller không hiểu vì sao hàng biến mất                                      |
| 9   | Đếm ngược hạn khiếu nại                                      | Cao      | Vừa là UX vừa là bằng chứng đã thông báo                                    |
| 10  | Tab phân tích SKU GĐ3                                        | GĐ3      | Chỉ làm sau khi có dữ liệu và nhu cầu thật                                  |
| 11  | Draft/hàng đợi quét offline trên web                         | Cao      | Kho sóng yếu; publish lại phải qua API/idempotency                          |
| 12  | Phản hồi của seller trong màn phân xử                        | Cao      | Nguyên tắc nghe cả hai bên                                                  |
| 13  | Kênh khiếu nại/CSKH cho buyer                                | Cao      | Nghĩa vụ theo khung TMĐT hiện hành, copy/quy trình do Legal duyệt           |
| 14  | Trang Quy chế sàn, Chính sách bảo mật, Giải quyết tranh chấp | **Chặn** | Bắt buộc khi đăng ký sàn TMĐT                                               |
| 15  | Onboarding eKYC và trạng thái chờ duyệt                      | **Chặn** | Seller chưa VERIFIED không được publish                                     |
