# REBOX - Kế hoạch triển khai

Xây dựng theo mô hình Lean Startup như tài liệu gốc định hướng, với một điều chỉnh quan trọng: **phạm vi trong tài liệu vượt xa năng lực của đội 3 người (2 lập trình viên + 1 pháp lý) trong 6 tháng**. Kế hoạch này cắt phạm vi để có sản phẩm chạy thật. Mọi quyết định kiến trúc và phạm vi trong kế hoạch này tuân theo [`07-ARCHITECTURE-DECISIONS.md`](07-ARCHITECTURE-DECISIONS.md).

---

## 1. Đánh giá năng lực thực tế

### 1.1. Đội hình thực tế

**3 thành viên**, tất cả tham gia giai đoạn đầu **không nhận thù lao**, coi như góp vốn bằng công sức:

| Người | Ngành | Vai trò |
|---|---|---|
| Thành viên 1 | Công nghệ thông tin | Phát triển hệ thống: backend, CSDL, tích hợp API, triển khai |
| Thành viên 2 | Công nghệ thông tin | Frontend, kiểm thử, hỗ trợ tích hợp |
| Thành viên 3 | Luật | Pháp lý: quy chế sàn, hồ sơ đăng ký, DPIA, danh mục hàng cấm, hợp đồng |

> ⚠️ "Góp vốn bằng công sức" **không phải hình thức góp vốn hợp pháp** theo Luật Doanh nghiệp 2020, và hiện tại **mã nguồn đang thuộc sở hữu cá nhân của 2 bạn CNTT, không thuộc dự án**. Phải ký thoả thuận sáng lập + chuyển giao quyền SHTT — xem `05-PHAP-LY` §9.3. Đây là việc của thành viên ngành Luật và **làm được ngay tuần này**.

**Điểm mạnh ít đội sinh viên có:** một thành viên chuyên trách pháp lý ngay trong nhóm sáng lập. Với mô hình chạm đồng thời ba lĩnh vực kinh doanh có điều kiện (sàn TMĐT, trung gian thanh toán, dữ liệu cá nhân nhạy cảm), đây chính là nhóm rào cản làm chết phần lớn dự án tương tự. Người này nên **được giao đường găng GĐ0**, không phải làm nền.

**Điểm yếu:** chỉ 2 lập trình viên, và **không có ai làm marketing** — trong khi mô hình nền tảng hai chiều sống chết bằng việc thu hút đồng thời người bán và người mua.

### 1.2. Khoảng cách năng lực

Phạm vi trong `REBOX.docx` (2 mobile app + 2 web app + admin console + sàn giao dịch + ví ký quỹ + AI thị giác máy tính + tích hợp 3 sàn + 2 ĐVVC + cổng thanh toán + public API) tương ứng khoảng **18–30 người-tháng** cho một đội có kinh nghiệm.

Hai sinh viên làm bán thời gian trong 6 tháng cho ra khoảng **6–9 người-tháng**.

Chênh lệch khoảng **3 lần**. Ba cách xử lý, có thể kết hợp:

| Phương án | Nội dung | Đánh đổi |
|---|---|---|
| **A. Cắt phạm vi** (bắt buộc, không phải lựa chọn) | MVP theo kế hoạch dưới đây: 1 web app responsive, không app mobile ở GĐ1, AI làm sau | Mất "mobile-first" và "AI triage" khỏi bản demo đầu |
| **B. Bổ sung người** (khuyến nghị làm thêm) | +1 full-stack, +1 marketing — xem §1.3 | Cần vốn từ GĐ2, hoặc chia cổ phần |
| **C. Kéo dài thời gian** | 12–15 tháng cho phạm vi đầy đủ | Mất lợi thế thời điểm |

Kế hoạch này triển khai **A ngay từ đầu**, và **B từ GĐ2** khi đã có bằng chứng thị trường.

### 1.3. Kế hoạch bổ sung nhân sự

Thứ tự ưu tiên: **full-stack dev** trước, **marketing** sau. Ba hình thức, xếp theo mức độ ưu tiên:

| Hình thức | Chi phí tiền mặt | Ghi chú |
|---|---|---|
| **Mời đồng sáng lập, cổ phần có vesting** | 0đ | **Ưu tiên nhất** — phù hợp túi tiền sinh viên, gắn bó dài hạn. Bắt buộc ký chuyển giao SHTT ngay từ ngày đầu |
| Cộng tác viên bán thời gian (CLB CNTT của trường) | 4–6tr/tháng/người | Khi có vốn GĐ2 |
| Thuê ngoài theo đầu việc (thiết kế, video) | 3–5tr/hạng mục | Linh hoạt, dùng cho việc không cần liên tục |

**Về việc không trả công giai đoạn đầu:** hợp lý và phổ biến với dự án sinh viên, nhưng có hai rủi ro cần quản lý. Thứ nhất, **không có tiền thì phải có văn bản** — vesting là thứ thay thế lương để giữ người, và nó chỉ có tác dụng khi đã ký. Thứ hai, nên **giữ một khoản phụ cấp nhỏ** (1–2tr/tháng/người) ngay khi có nguồn thu hoặc giải thưởng đầu tiên; con số không lớn nhưng nó là tín hiệu dự án còn sống, có tác dụng giữ người hơn nhiều người nghĩ.

---

## 2. Nguyên tắc cắt phạm vi

| Nguyên tắc                   | Áp dụng                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Web trước, mobile sau**    | Next.js responsive dùng được trên điện thoại. Quét mã chạy bằng camera trình duyệt (`BarcodeDetector` / ZXing) - **có giới hạn trên iOS**, xem `01-SPEC` §2.6. Tiết kiệm ~4 người-tháng. Chiến lược tái sử dụng cho mobile: `01-SPEC` §2.3 |
| **Con người trước, AI sau**  | GĐ1 admin xử lý 100% tranh chấp thủ công. Ở 500 đơn/tháng với ~3% khiếu nại = 15 vụ/tháng - một người xử lý thừa sức. AI chỉ đáng làm khi đạt ~2.000 đơn/tháng. |
| **Hai kênh nhập, một contract** | `SPREADSHEET` và `PLATFORM_API` cùng trả `ReturnManifestDraft`. Bản đầu bật CSV/XLSX; nút API để “Sắp có” tới khi đủ partner/ToS gate. |
| **Đúng tiền trước, đẹp sau** | Ví ký quỹ và sổ cái phải hoàn thiện từ ngày đầu. Sai sót ở đây không sửa được bằng bản vá.                                                                      |
| **Mua thay vì tự xây**       | eKYC, cổng thanh toán và gửi SMS/ZNS dùng dịch vụ có sẵn sau provider gate. Phát hiện video giả chỉ xem xét cùng AI GĐ3.                                       |

---

## 3. Lộ trình theo giai đoạn

```
GĐ 0  T1        Nền móng & pháp lý          ← không chặn Sprint 1; chặn slice phụ thuộc và production
GĐ 1  T1–T4     MVP end-to-end              ← fake/sandbox; tiền thật chỉ sau toàn bộ gate
GĐ 2  T5–T6     Thử nghiệm 100 shop Hà Nội  ← đúng mục tiêu tài liệu gốc
GĐ 3  T7–T9     Tự động hóa & mở rộng       ← AI triage, app mobile, API sàn
GĐ 4  T10–T12   Thương mại hóa              ← mở rộng địa bàn, public API ERP
```

---

## 4. Giai đoạn 0 - Nền móng (Tháng 1, song song)

Những việc này **không viết code nhưng chặn ngày ra mắt**. Bắt đầu ngay từ tuần 1.

| #    | Công việc                                                                                           | Phụ trách              | Thời gian               | Ghi chú                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| 0.1  | Thành lập pháp nhân (Công ty TNHH hoặc CP)                                                          | Pháp lý + Trưởng dự án | 2–3 tuần                | Bắt buộc có trước khi đăng ký sàn TMĐT                                                                          |
| 0.2  | **Thỏa thuận sáng lập + chuyển giao quyền SHTT**                                                    | Pháp lý                | 1 tuần                  | Mã nguồn hiện thuộc sở hữu cá nhân 2 dev, không thuộc dự án. "Góp vốn bằng công sức" không hợp lệ theo Luật DN 2020 - xem `05-PHAP-LY` §9.3 |
| 0.3  | Đăng ký nhãn hiệu "REBOX"                                                                           | Pháp lý                | nộp sớm                 | Thủ tục kéo dài 18–24 tháng, nộp càng sớm càng tốt                                                              |
| 0.4  | Soạn Quy chế hoạt động sàn, Chính sách bảo mật, Quy trình giải quyết tranh chấp, Hợp đồng người bán | Pháp lý                | 3–4 tuần                | Đầu vào bắt buộc của hồ sơ đăng ký sàn - xem `05-PHAP-LY` §1                                                    |
| 0.5  | **Đăng ký sàn TMĐT tại online.gov.vn**                                                              | Pháp lý                | nộp T2, duyệt 1–3 tháng | **Đường găng dài nhất.** Nộp ngay khi có pháp nhân                                                              |
| 0.6  | **Chốt đối tác thanh toán có giấy phép**                                                            | Business + Pháp lý     | 4–6 tuần                | Blocker của Sprint 4. Xem `05-PHAP-LY` §2                                                                       |
| 0.7  | Đàm phán hợp đồng GHN/GHTK                                                                          | Business               | 3–4 tuần                | Điều khoản quan trọng: **COD chi hộ thẳng về TK seller**                                                        |
| 0.8  | Chốt danh mục hàng cấm/hạn chế                                                                      | Pháp lý                | 1 tuần                  | Đầu vào Sprint 2                                                                                                |
| 0.9  | Hồ sơ đề xuất cấp độ an toàn hệ thống thông tin                                                     | Pháp lý + Tech         | 3 tuần                  | Xem `05-PHAP-LY` §4                                                                                             |
| 0.10 | Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân                                                       | Pháp lý                | 2 tuần                  | Nộp Bộ Công an. Xem `05-PHAP-LY` §3                                                                             |
| 0.11 | Đánh giá Supabase Singapore, DPA/chuyển dữ liệu và quyết định real-data/production go/no-go          | Pháp lý + Tech         | 1–2 tuần                | Trước A14, dev/staging chỉ dùng synthetic/anonymized fixture; không đưa dữ liệu thật lên                         |
| 0.12 | Chốt nhà cung cấp kho evidence có WORM/Object Lock và quy trình xóa                                  | Tech + Pháp lý         | 2–4 tuần                | Blocker của Sprint 6; Supabase Storage không đáp ứng WORM A12                                                    |
| 0.13 | Chốt tax/accounting model, hóa đơn điện tử và nghĩa vụ khấu trừ theo A10                             | Kế toán + Legal + Tech | 2–4 tuần                | Chặn doanh thu thật; xác định commission gross/net, VAT/tax payable, báo cáo và provider hóa đơn                |

**Rủi ro đường găng:** mục 0.5 và 0.6 có thể mất 2–3 tháng. Nếu bắt đầu ở tháng 4 thì sản phẩm xong nhưng không được phép mở. **Bắt đầu ngay tuần 1.**

---

## 5. Giai đoạn 1 - MVP (Tháng 1–4, 8 sprint × 2 tuần)

Mục tiêu: **một luồng đơn hàng end-to-end từ đăng bán đến đối soát/khiếu nại bằng fake hoặc sandbox**. Chỉ chạy tiền thật khi A10, A12, A14 và legal launch gate đều đã đóng.

### Sprint 1 - Vertical slice đầu tiên

> ⚠️ **Sprint 1 dài 3 tuần thay vì 2**, vì tuần đầu dành cho việc làm quen công nghệ. NestJS có decorator, dependency injection, module system - mất khoảng 1 tuần nếu chưa từng dùng. **Đừng vừa học vừa code module ví.** Nếu cả hai dev đã quen NestJS + Next.js thì bỏ tuần này, quay lại 2 tuần.
>
> Tuần học: dựng thử một CRUD nhỏ có transaction + test, không phải đọc tài liệu suông.

| Việc                                                                                       | Nghiệm thu                                                                        |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **🔬 Khảo sát nhãn vật lý trên kiện hàng hoàn** - xem bên dưới                             | Bảng liệt kê trường dữ liệu in trên nhãn, theo từng nguồn                         |
| Kiểm tra skeleton monorepo; cấu hình CI, dev/staging và migration policy                    | Workspace chạy thống nhất; migration dựng lại DB sạch ở môi trường mới            |
| Supabase Auth adapter + NestJS JWT/JWKS guard                                                | Login bằng Supabase; API nhận đúng actor, không tự lưu password/refresh token      |
| Schema tối thiểu cho `profile → shop → membership → listing`                               | Migration chỉ tạo phần cần cho slice; `shop_memberships` có test capability       |
| RLS/grant baseline; service-role secret chỉ ở server                                        | Client không ghi trực tiếp bảng listing/order/funds; policy có test âm             |
| Vertical slice `Auth → shop profile/membership → manual listing → public listing detail`    | Dùng trạng thái eKYC fake/seed: VERIFIED publish được, PENDING bị chặn; người khác xem được trang public |
| Khung PostgreSQL outbox + worker claim bằng `SKIP LOCKED`                                   | Một event mẫu được ghi cùng transaction, xử lý idempotent; không cần Redis/BullMQ  |
| Layout web responsive + log có cấu trúc/health check                                        | Buyer/Seller context hoạt động; truy vết được request của slice                    |

Không tạo đủ mọi bảng hoặc abstraction ngay Sprint 1. `packages/shared`, `core`, `api-client`, `ui-tokens` và adapter chỉ nhận code khi vertical slice có consumer thật; implementation nghiệp vụ dùng chung nằm trong `packages/backend`.

#### 🔬 Việc 1.0 - Khảo sát nhãn vật lý (chặn thiết kế, làm trước tiên)

> **Rẻ, nhanh, nhưng quyết định kiến trúc của tính năng chủ lực.** Một buổi chiều là xong. Không làm thì Sprint 2 code mù.

**Câu hỏi cần trả lời:** trên nhãn của kiện hàng hoàn thật, **mã đơn hàng (order SN) có được in ra không**, hay chỉ có mã vận đơn?

Đây là điểm rẽ giữa Đường A và Đường B ở `01-SPEC` §7.1.2:

| Kết quả khảo sát                  | Hệ quả                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| Nhãn **có** mã đơn hàng, đọc được | **Đường A** - quét → 1 lần gọi API. Gọn, tối thiểu hoá triệt để                              |
| Nhãn **chỉ có** mã vận đơn        | **Đường B** - phải quét danh sách đơn để đối chiếu. Phức tạp hơn, giảm thiểu dữ liệu kém hơn |

**Cách làm:**

1. Xin 20–30 kiện hàng hoàn thật từ 2–3 shop quen (đây cũng là bước tiếp cận 100 seller đầu tiên)
2. Chụp lại nhãn, phân loại theo nguồn: **SPX, GHN, GHTK, J&T, Ninja Van, Viettel Post, TikTok**
3. Với mỗi nguồn, ghi lại:
   - Có mấy mã vạch? Mã hoá gì? (dùng app quét thử để đọc nội dung thật)
   - Có in mã đơn hàng dạng text không?
   - Định dạng/tiền tố mã vận đơn ra sao → làm đầu vào cho bảng nhận diện nguồn
   - Nhãn của **hàng bom** và **hàng khách trả** có khác nhau không? (hai kịch bản này có thể dùng nhãn khác nhau)
4. Ghi nhận **tỷ lệ nhãn hỏng** - rách, dán đè, ướt, mờ. Đây là số liệu đầu vào để thiết kế đường lùi OCR/nhập tay

**Đầu ra:** một bảng đưa vào `01-SPEC` §7.1.2, cộng bộ ảnh mẫu làm dữ liệu test cho khâu quét ở Sprint 2.

### Sprint 2 - Catalog & Kho hàng hoàn

| Việc                                                      | Nghiệm thu                                      |
| --------------------------------------------------------- | ----------------------------------------------- |
| ReturnPackage + ReturnLine + Listing + upload ảnh (presigned) | Một package chưa mở tạo đúng một card; tracking không ra public |
| Chọn nguồn nhập                                          | Hai nút ngang hàng: Shopee/TikTok và CSV/XLSX; nút API hiện “Sắp có” khi chưa đủ gate |
| Import/preview CSV/XLSX hàng hoàn                        | 100 dòng nguồn; nhóm theo tracking, dedupe Package/Line và báo lỗi từng dòng/package |
| Contract `ReturnManifestDraft` + seam nguồn               | Hai kênh trả cùng DTO; chỉ spreadsheet có implementation, không dựng API adapter giả |
| Scan lookup local tối thiểu                              | Quét package đã commit và get-or-create một listing draft số lượng 1 |
| Danh mục + danh sách cấm/hạn chế                          | Chặn được sản phẩm thuộc danh mục cấm           |
| Tìm kiếm PG FTS tiếng Việt (`unaccent` + `pg_trgm`)       | Tìm "vay lua" ra "Váy lụa"                      |
| Trang chi tiết sản phẩm SSR                               | Lighthouse SEO ≥ 90                             |
| eKYC integration: notice/record, provider session trực tiếp, webhook idempotent, trạng thái/manual review | Seller bên ngoài chỉ publish sau `VERIFIED`; không đưa CCCD/selfie base64 qua API; retention theo Legal |

Bản chạy đầu chỉ bật CSV/XLSX vì chưa có credential. Đây là thứ tự giao hàng, không phải quy tắc ưu tiên nguồn: khi API sàn được bật, seller chủ động chọn một trong hai nút và cả hai dùng chung preview/commit. Chưa dựng adapter/OAuth giả. Không có intake/inspection hoặc `ReturnUnit` trong slice nguyên kiện.

### Sprint 3 - Ví ký quỹ & Sổ cái ⭐ sprint quan trọng nhất

| Việc                                               | Nghiệm thu                                              |
| -------------------------------------------------- | ------------------------------------------------------- |
| Sổ cái kép `ledger_transactions` + `ledger_postings` | Property test: 10.000 giao dịch ngẫu nhiên, từng transaction và từng account đối soát cân |
| Hold: create / release / capture / partial capture | Test đồng thời 50 luồng, không sai số dư                |
| Fee/hold policy + **bảng golden test A08**          | 8/8 dòng canonical pass, reserve cố định 45.000đ, UI không tự tính |
| Idempotency middleware                             | Gửi lại cùng key 100 lần ⇒ 1 bút toán                   |
| Greedy hide + tính coverage                        | Số dư tụt ⇒ ẩn đúng listing, nạp vào ⇒ hiện lại đúng    |
| Job đối soát sổ cái hằng giờ                       | Cố tình chèn lệch ⇒ alert kích hoạt                     |
| Màn hình đối soát cho seller                       | Tách available/order-locked/withdrawal-pending/unmatched-reserve/debt; không cộng bucket bị chặn vào khả dụng |
| Debt/top-up và unmatched reserve                   | Top-up trả debt trước; property test reserve create/release/capture không âm/không lệch |

**Không sang Sprint 4 khi chưa qua toàn bộ mục trên.** Đây là phần duy nhất trong hệ thống mà lỗi gây mất tiền thật và không sửa được bằng hotfix.

Không dùng một `CHECK` thông thường để khẳng định tổng nhiều dòng posting bằng 0. Cân sổ được bảo vệ qua một interface ghi sổ duy nhất, transaction database, constraint phù hợp/deferred validation, property test và reconciliation job.

### Sprint 4 - Thanh toán

Sprint này đang **BLOCKED bởi A10**. Trước khi PSP được duyệt bằng văn bản, chỉ được làm contract, fake adapter, sandbox và reconciliation test; không bật tiền thật ngoài production pilot đã được phê duyệt.

| Việc                                                    | Nghiệm thu                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Interface `PaymentProvider` + contract test             | Fake/sandbox test PSP_CUSTODIAL và SELLER_DIRECT theo scenario; production chỉ bật mode được A10 duyệt |
| Nạp ký quỹ qua PSP + webhook sau gate A10               | Nạp 100.000đ ở sandbox, webhook lặp không cộng ví hai lần      |
| Sinh VietQR qua sandbox/fake provider                    | Payload có đúng tài khoản/số tiền/nội dung theo contract; chưa yêu cầu app ngân hàng thật |
| Webhook biến động số dư + đối chiếu tự động             | Chỉ CREDIT FINAL/SETTLED đúng account/currency/amount/ref/TTL ⇒ CONFIRMED; same-ID/different-hash bị P0 |
| `payment_unmatched` workflow + maker/checker             | Thiếu/thừa/muộn ⇒ proposal hash, maker≠checker; expired order không hồi sinh; reserve/withdrawal block đúng A10 |
| Rút ký quỹ + kiểm soát rủi ro sau gate A10              | Stable payout key; `PENDING→SETTLED|TERMINAL_FAILED|UNKNOWN/RECONCILING`; UNKNOWN không release; cooldown 72h |

### Sprint 5 - Đơn hàng & Vận chuyển

| Việc                                     | Nghiệm thu                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Giỏ nhóm theo shop; checkout đúng một shop | Giỏ 2 shop vẫn giữ 2 nhóm; request lẫn shop nhận 422; mỗi checkout tạo đúng 1 sub-order |
| Checkout init + reservation/hold TTL 30 phút | 2 tab cùng mua 1 món ⇒ 1 thành công, 1 nhận `ITEM_BEING_PURCHASED` |
| State machine sub-order đầy đủ           | Chuyển trạng thái sai bị từ chối, có test                          |
| Adapter GHN + GHTK: quote, create, label | In được nhãn vận đơn thật khổ 10×15                                |
| Webhook trạng thái + job polling bù      | Tắt webhook ⇒ polling vẫn cập nhật trong 30 phút                   |
| COD/carrier settlement contract           | Snapshot gross/fee/deduction/net/beneficiary; test gross-vs-net không double charge |
| Job settle từ PostgreSQL outbox           | Chỉ settle VIETQR CONFIRMED/COD_REMITTED, dùng snapshot và không release khi case/remittance mở |

### Sprint 6 - Khiếu nại (xử lý thủ công)

| Việc                                                        | Nghiệm thu                                               |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| Mở khiếu nại + state machine dispute                        | Quá hạn vẫn nhận, gắn cờ `LATE_CLAIM`                    |
| Upload evidence tới fake/provider WORM sau gate A12, version + hash + Object Lock | Original/derivative target đúng version; retention watchdog/lifecycle test pass |
| Quay video web (`MediaRecorder`) + màn hướng dẫn            | Quay tối đa 90s; upload tiếp tục khi tab mở, retry an toàn |
| Màn phân xử cho admin (chưa có AI)                          | Admin xử lý trọn 1 vụ, lý do bắt buộc ≥30 ký tự          |
| Thực thi refund theo fault/funder/return/cost                | Seller/carrier/platform không debit nhầm; WAITING_RETURN/COST giữ hold; partial không return/over-refund |
| Hai execution mode refund bằng fake/sandbox                 | PSP: stable key + UNKNOWN reconcile; seller-direct: action/proof/overdue; chỉ báo paid sau PAID/VERIFIED |
| Kháng nghị/case closure                                      | APPEAL_WINDOW giữ hold; final_closed_at chỉ sau appeal/remediation, legal hold độc lập |

### Sprint 7 - Thông báo, retention và trang pháp lý

| Việc                                                                                   | Nghiệm thu                                               |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Thông báo: push web, email, ZNS                                                        | 12 loại thông báo theo bảng sự kiện                      |
| **Trang Quy chế sàn, Chính sách bảo mật, Giải quyết tranh chấp, Điều khoản người bán** | Artifact version/hash/body bất biến + acceptance đúng user/version/time khi áp dụng |
| Kênh CSKH: form ticket + hotline                                                       | Nội dung/quy trình theo Legal và khung TMĐT hiện hành    |
| Processing record theo căn cứ Legal duyệt                                              | Client chỉ gửi artifact+decision; server resolve basis/type, append stable chain và withdrawal interaction mới |
| Retention/lifecycle evidence                                                           | Policy/version snapshot; multi-hold/provider reconcile; staging purge; bytes delete state+receipt; legal hold không dịch case close |
| Quyền chủ thể dữ liệu                                                                  | `privacy_request` có step-up, SLA, export/delete exception/receipt và backup tombstone |
| Tax/reporting/hóa đơn tối thiểu                                                        | Commission gross/net + tax version snapshot; báo cáo seller/fee và sandbox provider hóa đơn pass trước doanh thu thật |

Loyalty/voucher thuộc A15 và không nằm trong GĐ1.

### Sprint 8 - Làm cứng & chạy thử nội bộ

| Việc                                            | Nghiệm thu                                        |
| ----------------------------------------------- | ------------------------------------------------- |
| Rà soát bảo mật: OWASP Top 10, IDOR, rate limit | Không còn phát hiện mức High                      |
| Kiểm thử tải: 200 CCU, 50 checkout đồng thời    | p95 trong ngưỡng `01-SPEC` §9.1                   |
| Supabase PITR/logical backup + evidence backup, **diễn tập phục hồi** | Restore trong boundary; replay deletion/anonymization tombstone + active holds trước mở access; ghi RPO/RTO thực đo |
| Runbook vận hành + trực sự cố                   | Tài liệu 10 sự cố thường gặp và cách xử lý        |
| Chạy thử end-to-end nội bộ                        | 20 đơn fake/sandbox, sổ cái khớp 100%; pilot tiền thật chỉ là bước conditional sau toàn bộ gate |

---

## 6. Giai đoạn 2 - Thử nghiệm 100 shop (Tháng 5–6)

Bám mục tiêu tài liệu gốc: 100 chủ shop đầu tiên tại Hà Nội. **Không onboard người dùng hoặc giao dịch thật** trước khi A10, A12, A14 và checklist `05` §10 đều đã đóng; nếu gate chưa xong, mốc này lùi thay vì dùng workaround dòng tiền/dữ liệu.

| Tuần  | Trọng tâm                                                                |
| ----- | ------------------------------------------------------------------------ |
| 17–18 | Onboard 10 shop thân thiết. Hỗ trợ tận nơi. Ghi lại mọi điểm vướng       |
| 19–20 | Sửa theo phản hồi. Đăng bán hàng loạt trên web + hỗ trợ máy quét cầm tay |
| 21–22 | Mở lên 50 shop. Bắt đầu marketing buyer trên Facebook/TikTok             |
| 23–24 | 100 shop. Đo các chỉ số then chốt. Quyết định có mở rộng hay không       |

**Chỉ số cần đạt cuối GĐ2 (điều kiện để sang GĐ3):**

| Chỉ số                               | Mục tiêu  | Ý nghĩa                                  |
| ------------------------------------ | --------- | ---------------------------------------- |
| Shop đăng ≥10 sản phẩm               | ≥ 40/100  | Đo mức độ chấp nhận thật của seller      |
| Đơn hoàn tất/tháng                   | ≥ 300     | 60% điểm hòa vốn                         |
| Tỷ lệ khiếu nại                      | < 5%      | Trên 8% là mô hình có vấn đề nền tảng    |
| Tỷ lệ đối soát thanh toán tay        | < 5%      | Đo mức khả thi của mô hình tiền đi thẳng |
| Sai lệch sổ cái                      | **0**     | Không thương lượng                       |
| Tỷ lệ giữ chân seller (tháng 2)      | ≥ 60%     |                                          |
| Thời gian trung bình đăng 1 sản phẩm | < 60 giây | Lời hứa cốt lõi của sản phẩm             |

**Chỉ số thứ tư - tỷ lệ đối soát tay - là chỉ số quyết định kiến trúc.** Nếu vượt 10%, mô hình VietQR đi thẳng không vận hành nổi ở quy mô lớn và phải chuyển sang PSP giữ tiền tạm, kéo theo yêu cầu giấy phép.

---

## 7. Giai đoạn 3 - Tự động hóa (Tháng 7–9)

Chỉ làm khi GĐ2 đạt chỉ số. Thứ tự ưu tiên:

| Ưu tiên | Hạng mục                         | Người-tuần       | Điều kiện kích hoạt                                      |
| ------- | -------------------------------- | ---------------- | -------------------------------------------------------- |
| 1       | **App mobile (React Native)**    | 8                | Khi >30% truy cập từ điện thoại và web app là điểm nghẽn |
| 2       | **AI Triage tầng 1**             | 6                | Khi >50 khiếu nại/tháng (dưới mức này xử lý tay rẻ hơn)  |
| 3       | **Phân tích hàng hoàn theo SKU** | 3                | Khi dữ liệu đủ sạch và seller xác nhận nhu cầu báo cáo   |
| 4       | **Tích hợp Shopee Open API**     | 4 + rủi ro duyệt | Sau khi có pháp nhân và lượng shop đủ để thuyết phục     |
| 5       | Gói quảng bá sản phẩm 20k/tuần   | 2                | Khi traffic đủ giá trị và Legal duyệt nhãn quảng cáo     |

**Về AI Triage - lộ trình 3 bước, không làm một lần:**

```
Bước 1 (2 tuần)  Kiểm tra kỹ thuật: ffprobe metadata, độ dài, phát hiện scene cut.
                 Không quyết định gì, chỉ gắn cờ hỗ trợ admin.
                 → Đo: cờ có tương quan với quyết định của admin không?

Bước 2 (2 tuần)  Thêm thị giác: phát hiện niêm phong, so khớp vật thể với ảnh listing.
                 Vẫn không tự quyết. Chạy song song, so kết quả với admin.
                 → Đo: nếu để AI quyết thì sai bao nhiêu %?

Bước 3 (2 tuần)  Bật auto-approve, ngưỡng cao (85), trần giá trị thấp (300k).
                 Theo dõi hằng ngày, sẵn sàng tắt.
                 → Đo: tỷ lệ auto-approve bị kháng nghị thành công.
```

Không bao giờ bật AI tự quyết trước khi có ít nhất **200 vụ đã xử lý tay làm tập đối chứng**. Không có dữ liệu này thì ngưỡng 70 hay 85 chỉ là con số đoán.

---

## 8. Giai đoạn 4 - Thương mại hóa (Tháng 10–12)

Mở rộng địa bàn (TP.HCM, Đà Nẵng), tối ưu chi phí vận chuyển theo vùng, chương trình giới thiệu shop, tối ưu SEO, xây dựng báo cáo tài chính cho vòng gọi vốn. Public API + webhook ERP thuộc GĐ4 và chỉ mở khi có ít nhất 5 shop thật yêu cầu theo A15.

---

## 9. Hạ tầng & chi phí

Các con số giá cũ cho VPS/PostgreSQL/Redis/R2 đã bị loại vì không còn đúng topology và có thể thay đổi theo thời điểm. Không dùng chúng để tính runway hoặc hòa vốn.

### 9.1. Topology cần lấy báo giá

| Hạng mục | Phạm vi canonical | Cách lập ngân sách |
|---|---|---|
| Supabase | PostgreSQL + Auth + catalog media, Singapore | Báo giá theo plan, database size, MAU, egress và PITR; production cần gate A14 |
| Web/API/Worker hosting | Ba runtime GĐ1 trong `apps/` | Lấy báo giá theo môi trường, CPU/RAM, build phút và egress; chưa chốt vendor |
| Evidence WORM | Video gốc + derivative/report | Chỉ tính sau khi provider A12 được chốt; gồm storage, request, egress, Object Lock và deletion workflow |
| Payment/PSP | Top-up, payout/refund, webhook/reconciliation | Vendor/fee đang BLOCKED A10; không đưa số giả định vào financial model |
| eKYC | Session, verification, webhook | Lấy báo giá theo số seller onboard và retry rate |
| Email/SMS/ZNS | OTP nếu cấu hình và thông báo vận hành | Tách fixed fee, per-message và failover; Supabase Auth không loại bỏ mọi chi phí gửi tin |
| Observability | Logs, traces, errors, alerting | Tính theo retention và event volume; xác định quota dev/staging/prod |
| Domain/WAF | Domain, TLS, edge protection | Báo giá hằng năm và theo traffic |

MVP không có chi phí Redis/BullMQ. Supabase Storage chỉ dùng catalog/media thông thường; evidence gốc đi sang provider WORM riêng.

### 9.2. Quy tắc cập nhật ngân sách

1. Lấy ít nhất một báo giá thực cho mỗi dòng trước production pilot và ghi ngày, tiền tệ, thuế, quota.
2. Lập ba kịch bản theo MAU/order/evidence: pilot, base và stress; không suy điểm hòa vốn từ một số chi phí chưa có nguồn.
3. Tách chi phí một lần (pháp nhân, pháp lý, nhãn hiệu) khỏi recurring infrastructure.
4. Retention policy hiện có target từ `case.final_closed_at`: original 90 ngày, derivative/biên bản 3 năm; snapshot version Legal duyệt, thời điểm xóa thực tế không trước Object Lock/legal hold/preserve-until. Không hardcode hoặc giả định giữ toàn bộ video hai năm.
5. AI và app-store fee chỉ đưa vào ngân sách GĐ3 sau gate A15.

---

## 10. Phân công cho đội 3 người

| Người | Sở hữu | Ghi chú |
|---|---|---|
| **Dev 1** (CNTT) — hệ thống | Sprint 1–8, **ưu tiên tuyệt đối Sprint 3** (ví & sổ cái). Backend, CSDL, tích hợp API/ĐVVC/PSP, triển khai | Người gánh đường găng kỹ thuật |
| **Dev 2** (CNTT) — frontend & chất lượng | Giao diện web, **sở hữu bảng golden test của Fee Engine**, kiểm thử thủ công luồng tiền, khảo sát nhãn vật lý (việc 1.0) | Kiểm thử luồng tiền không được kiêm nhiệm bởi người viết ra nó |
| **Legal** (Luật) — **sở hữu toàn bộ GĐ0** | Quy chế sàn, hồ sơ đăng ký sàn TMĐT, DPIA, danh mục hàng cấm, hợp đồng người bán, thoả thuận sáng lập + chuyển giao SHTT, đàm phán PSP và ĐVVC | Đường găng dài nhất của cả dự án nằm ở đây, không phải ở code |

**Ba việc chưa có ai làm** — phải phân công rõ, nếu không sẽ rơi:

| Việc | Xử lý tạm | Khi nào cần người thật |
|---|---|---|
| Marketing & phát triển người bán | Cả 3 chia nhau, dùng mạng lưới cá nhân | Ngay khi bước vào GĐ2 (thử nghiệm 100 shop) |
| CSKH & phân xử tranh chấp thủ công | Dev 2 kiêm, ~15 vụ/tháng ở quy mô 500 đơn | Khi vượt ~1.500 đơn/tháng |
| Mô hình tài chính & đối soát | Legal kiêm (đã có nền kinh tế - pháp lý) | Khi có dòng tiền thật |

**Nguyên tắc phân bổ:** thành viên Luật **không phải người hỗ trợ**. Trong mô hình này, GĐ0 pháp lý (đăng ký sàn 1–3 tháng, chốt PSP 4–6 tuần) dài hơn thời gian code MVP. Nếu người này bị coi là tuyến sau và chỉ bắt đầu ở tháng 3, sản phẩm sẽ xong nhưng không được phép mở.

## 11. Định nghĩa hoàn thành (Definition of Done)

Một hạng mục chỉ được coi là xong khi thỏa **toàn bộ**:

- [ ] Có test tự động; hạng mục chạm tiền có thêm property test
- [ ] Xử lý đủ 3 trạng thái: loading, empty, error
- [ ] Có log có cấu trúc và metric cho đường đi chính
- [ ] Endpoint chạm tiền hoặc dữ liệu ngoài đều idempotent
- [ ] Đã kiểm tra phân quyền (không chỉ ở controller mà cả ở tầng truy vấn)
- [ ] Bảng được expose qua Supabase Data API có RLS/grant tối thiểu và policy test; bảng tài chính không expose
- [ ] Mỗi data class/purpose có retention policy versioned + workflow delete/anonymize/pseudonymize đã test; evidence/KYC có per-record override và legal/obligation hold. Evidence WORM chỉ chốt retention sau khi case đóng
- [ ] Đã cập nhật OpenAPI spec
- [ ] QA đã kiểm thử trên staging
- [ ] Migration chạy sạch và thay đổi dữ liệu quan trọng đã có cách backup/restore được diễn tập; restore replay tombstone/hold trước khi mở access
- [ ] Text hiển thị cho người dùng đã qua Pháp lý nếu liên quan quyền/nghĩa vụ

---

## 12. Rủi ro dự án và phương án dự phòng

| #   | Rủi ro                                                     | Xác suất   | Tác động               | Phương án                                                                                                                       |
| --- | ---------------------------------------------------------- | ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Hồ sơ đăng ký sàn chậm/bị từ chối                          | Trung bình | **Chặn ra mắt**        | Nộp ngay tháng 1; thuê tư vấn có kinh nghiệm hồ sơ sàn                                                                          |
| P2  | Không tìm được đối tác thanh toán chấp nhận mô hình ký quỹ | Trung bình | **Chặn ra mắt**        | Giữ production payment tắt; chỉ demo/sandbox và xem lại mô hình kinh doanh với Legal, không tự chuyển sang luồng tiền chưa duyệt |
| P3  | Technical Lead bận thi/ốm/nghỉ                             | **Cao**    | Trượt tiến độ          | Đệm 20% thời gian; tài liệu hóa; chuẩn bị phương án thuê freelancer 1–2 tháng                                                   |
| P4  | Shopee/TikTok từ chối cấp API                              | Trung bình | Không bật được nút import trực tiếp | Kênh CSV/XLSX hoạt động độc lập qua cùng contract nên flow bán nguyên kiện vẫn chạy |
| P5  | Seller không chấp nhận ký quỹ                              | **Cao**    | Chặn mô hình           | Kiểm chứng bằng phỏng vấn 20 shop **trước Sprint 3**; nếu thất bại phải đổi policy/mô hình qua ADR mới, không âm thầm bỏ ký quỹ |
| P6  | Buyer không chịu quay video                                | Trung bình | Tranh chấp khó xử      | Không bắt buộc (L5); dùng ưu đãi (xử lý nhanh hơn) thay vì ép buộc                                                              |
| P7  | Sai lệch sổ cái sau khi lên production                     | Thấp       | **Rất nghiêm trọng**   | Đối soát hằng giờ + tự động chặn rút tiền khi lệch + backup mọi bút toán                                                        |
| P8  | Bị lợi dụng bán hàng giả/hàng cấm                          | Trung bình | **Rủi ro pháp lý cao** | Kiểm duyệt trước với danh mục nhạy cảm + kênh tiếp nhận khiếu nại SHTT + gỡ trong 24h                                           |

---

## 13. Việc cần làm ngay trong 2 tuần tới

Tài liệu quyết định và skeleton monorepo đã có. Hai tuần tiếp theo tập trung vào các blocker thật và chuẩn bị vertical slice; chưa mở rộng thêm codebase.

| #   | Việc | Ai | Đầu ra |
|---|---|---|---|
| 1 | Khởi động pháp nhân/hồ sơ sàn và thỏa thuận SHTT | Trưởng dự án + Legal | Owner, deadline và bộ hồ sơ theo GĐ0 |
| 2 | Liên hệ PSP về đúng mô hình ký quỹ/refund/payout | Business + Legal | Trả lời bằng văn bản cho đủ gate A10 |
| 3 | Đánh giá Supabase Singapore cho production | Legal + Tech | DPA/data-flow, rủi ro chuyển dữ liệu và quyết định go/no-go A14 |
| 4 | Lấy báo giá/PoC provider evidence WORM | Tech + Legal | Xác nhận Object Lock, retention, delete, audit và chi phí A12 |
| 5 | Phỏng vấn 20 shop về activation 100.000đ và hold cố định | Research + BD | Dữ liệu chấp nhận/từ chối; không đổi policy nếu chưa có ADR mới |
| 6 | Chốt danh mục hàng cấm/hạn chế bản đầu | Legal | Bảng policy dùng cho Sprint 2 |
| 7 | Xin 20–30 kiện hàng hoàn thật, khảo sát nhãn | BD + Tech | Bộ ảnh/test matrix cho manual/CSV/scan |
| 8 | Chuẩn bị backlog Sprint 1 theo vertical slice | Hai dev | Acceptance test từ Auth đến public listing, migration/RLS/outbox checklist |
