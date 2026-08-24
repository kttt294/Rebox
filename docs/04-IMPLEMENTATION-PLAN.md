# REBOX - Kế hoạch triển khai

Xây dựng theo mô hình Lean Startup như tài liệu gốc định hướng, với một điều chỉnh quan trọng: **phạm vi trong tài liệu vượt xa năng lực của đội 3 người (2 lập trình viên + 1 pháp lý) trong 6 tháng**. Kế hoạch này cắt phạm vi để có sản phẩm chạy thật, thay vì có một sản phẩm đầy đủ tính năng nhưng không kịp ra mắt.

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
| **Web trước, mobile sau**    | Next.js responsive dùng được trên điện thoại. Quét mã vận đơn chạy được bằng camera trên trình duyệt (`BarcodeDetector` API / ZXing). Tiết kiệm ~4 người-tháng. |
| **Con người trước, AI sau**  | GĐ1 admin xử lý 100% tranh chấp thủ công. Ở 500 đơn/tháng với ~3% khiếu nại = 15 vụ/tháng - một người xử lý thừa sức. AI chỉ đáng làm khi đạt ~2.000 đơn/tháng. |
| **CSV trước, API sàn sau**   | Import CSV là 3 ngày công. Tích hợp Shopee Open API là 3–4 tuần cộng rủi ro không được duyệt (L7).                                                              |
| **Đúng tiền trước, đẹp sau** | Ví ký quỹ và sổ cái phải hoàn thiện từ ngày đầu. Sai sót ở đây không sửa được bằng bản vá.                                                                      |
| **Mua thay vì tự xây**       | eKYC, cổng thanh toán, gửi SMS/ZNS, phát hiện video giả - dùng dịch vụ có sẵn.                                                                                  |

---

## 3. Lộ trình theo giai đoạn

```
GĐ 0  T1        Nền móng & pháp lý          ← chạy song song, không chặn code
GĐ 1  T1–T4     MVP giao dịch được          ← mục tiêu: 1 đơn hàng thật từ đầu đến cuối
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

**Rủi ro đường găng:** mục 0.5 và 0.6 có thể mất 2–3 tháng. Nếu bắt đầu ở tháng 4 thì sản phẩm xong nhưng không được phép mở. **Bắt đầu ngay tuần 1.**

---

## 5. Giai đoạn 1 - MVP (Tháng 1–4, 8 sprint × 2 tuần)

Mục tiêu: **một đơn hàng thật, từ đăng bán đến hoàn tất đối soát, có thu phí, có xử lý được khiếu nại.**

### Sprint 1 - Nền tảng kỹ thuật

| Việc                                                           | Nghiệm thu                                                |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| **🔬 Khảo sát nhãn vật lý trên kiện hàng hoàn** - xem bên dưới | Bảng liệt kê trường dữ liệu in trên nhãn, theo từng nguồn |
| Monorepo, CI/CD, môi trường dev/staging/prod                   | Push lên `main` tự động deploy staging                    |
| Schema DB + migration (toàn bộ bảng ở `01-SPEC` §4)            | `pnpm db:migrate` chạy sạch từ đầu                        |
| Auth: đăng ký/đăng nhập OTP, JWT, refresh xoay vòng, RBAC      | Test tự động cho 3 vai trò                                |
| Layout Next.js + design system                                 | Trang chủ, đăng nhập, layout seller/buyer                 |
| Observability: log có cấu trúc, trace, health check            | Xem được trace một request đầy đủ trên Grafana            |

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
| CRUD listing + upload ảnh (presigned) + validate giá trần | Đăng được sản phẩm, ảnh lên storage             |
| Import CSV hàng hoàn (Shopee + TikTok format)             | Upload 100 dòng, dedupe đúng, báo lỗi từng dòng |
| Quét barcode trên web (BarcodeDetector + fallback ZXing)  | Quét được nhãn GHTK/GHN thật bằng webcam        |
| Danh mục + danh sách cấm/hạn chế                          | Chặn được sản phẩm thuộc danh mục cấm           |
| Tìm kiếm PG FTS tiếng Việt (`unaccent` + `pg_trgm`)       | Tìm "vay lua" ra "Váy lụa"                      |
| Trang chi tiết sản phẩm SSR                               | Lighthouse SEO ≥ 90                             |

### Sprint 3 - Ví ký quỹ & Sổ cái ⭐ sprint quan trọng nhất

| Việc                                               | Nghiệm thu                                              |
| -------------------------------------------------- | ------------------------------------------------------- |
| Sổ cái kép, bảng account, ràng buộc `SUM = 0`      | Property test: 10.000 giao dịch ngẫu nhiên, sổ luôn cân |
| Hold: create / release / capture / partial capture | Test đồng thời 50 luồng, không sai số dư                |
| Fee Engine + **bảng golden test ở `01-SPEC` §5.4** | 8/8 dòng bảng test pass                                 |
| Idempotency middleware                             | Gửi lại cùng key 100 lần ⇒ 1 bút toán                   |
| Greedy hide + tính coverage                        | Số dư tụt ⇒ ẩn đúng listing, nạp vào ⇒ hiện lại đúng    |
| Job đối soát sổ cái hằng giờ                       | Cố tình chèn lệch ⇒ alert kích hoạt                     |
| Màn hình đối soát cho seller                       | 3 khối tách bạch theo `03-FE` §2.5                      |

**Không sang Sprint 4 khi chưa qua toàn bộ mục trên.** Đây là phần duy nhất trong hệ thống mà lỗi gây mất tiền thật và không sửa được bằng hotfix.

### Sprint 4 - Thanh toán

| Việc                                                    | Nghiệm thu                                                    |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| Interface `PaymentProvider` + adapter PSP đã chốt ở 0.6 | Đổi provider chỉ cần sửa 1 file cấu hình                      |
| Nạp ký quỹ qua PSP + webhook                            | Nạp thật 10.000đ ở sandbox, ví tăng đúng                      |
| Sinh VietQR động về tài khoản seller                    | Quét QR bằng app ngân hàng thật, thấy đúng số tiền + nội dung |
| Webhook biến động số dư + đối chiếu tự động             | Chuyển tiền thật ⇒ đơn tự chuyển CONFIRMED trong <10s         |
| Bảng `payment_unmatched` + màn hình ops xử lý tay       | Chuyển thiếu 1.000đ ⇒ vào hàng đợi, không tự confirm          |
| Rút ký quỹ + kiểm soát rủi ro                           | Đổi TK ngân hàng ⇒ khóa rút 72h                               |

### Sprint 5 - Đơn hàng & Vận chuyển

| Việc                                     | Nghiệm thu                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Giỏ hàng tách theo shop                  | Giỏ 2 shop ⇒ 2 sub-order, phí ship tính riêng                      |
| Checkout init + reservation lock + hold  | 2 tab cùng mua 1 món ⇒ 1 thành công, 1 nhận `ITEM_BEING_PURCHASED` |
| State machine sub-order đầy đủ           | Chuyển trạng thái sai bị từ chối, có test                          |
| Adapter GHN + GHTK: quote, create, label | In được nhãn vận đơn thật khổ 10×15                                |
| Webhook trạng thái + job polling bù      | Tắt webhook ⇒ polling vẫn cập nhật trong 30 phút                   |
| Job settle + cộng điểm thưởng            | Đơn giao xong 72h ⇒ tự trừ phí, cộng điểm đúng bậc                 |

### Sprint 6 - Khiếu nại (xử lý thủ công)

| Việc                                                        | Nghiệm thu                                               |
| ----------------------------------------------------------- | -------------------------------------------------------- |
| Mở khiếu nại + state machine dispute                        | Quá hạn vẫn nhận, gắn cờ `LATE_CLAIM`                    |
| Upload video: presigned multipart, hash, Object Lock        | Video 100MB upload xong, sửa file trong bucket ⇒ bị chặn |
| Quay video trong app (web: `MediaRecorder`) + màn hướng dẫn | Quay 60s trên Chrome Android, upload nền thành công      |
| Màn phân xử cho admin (chưa có AI)                          | Admin xử lý trọn 1 vụ, lý do bắt buộc ≥30 ký tự          |
| Thực thi hoàn tiền + trừ phí ship seller                    | Ledger đúng theo `02-FLOWS` §5.5, hold dư release đúng   |
| Chi hoàn tiền cho buyer qua PSP                             | Buyer nhận được tiền, ghi `REFUND_PAID`                  |
| Kháng nghị                                                  | Kháng nghị chuyển đúng cấp cao hơn                       |

### Sprint 7 - Loyalty, thông báo, trang pháp lý

| Việc                                                                                   | Nghiệm thu                                               |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Điểm lũy tiến + chống tách đơn                                                         | Tách 3 đơn 40k cùng địa chỉ/shop/24h ⇒ gộp điểm, gắn cờ  |
| Voucher freeship 15 điểm                                                               | Đổi voucher, áp dụng đúng đơn <100k                      |
| Thông báo: push web, email, ZNS                                                        | 12 loại thông báo theo bảng sự kiện                      |
| **Trang Quy chế sàn, Chính sách bảo mật, Giải quyết tranh chấp, Điều khoản người bán** | Nội dung do Pháp lý duyệt, có phiên bản và ngày hiệu lực |
| Kênh CSKH: form ticket + hotline                                                       | Nghĩa vụ theo Nghị định 85/2021                          |
| Bảng đồng ý xử lý dữ liệu cá nhân (consent)                                            | Ghi nhận đồng ý theo từng mục đích, rút lại được         |

### Sprint 8 - Làm cứng & chạy thử nội bộ

| Việc                                            | Nghiệm thu                                        |
| ----------------------------------------------- | ------------------------------------------------- |
| Rà soát bảo mật: OWASP Top 10, IDOR, rate limit | Không còn phát hiện mức High                      |
| Kiểm thử tải: 200 CCU, 50 checkout đồng thời    | p95 trong ngưỡng `01-SPEC` §9.1                   |
| Backup + **diễn tập phục hồi**                  | Restore thành công từ backup lên môi trường sạch  |
| Runbook vận hành + trực sự cố                   | Tài liệu 10 sự cố thường gặp và cách xử lý        |
| **Chạy thử end-to-end với tiền thật**           | 20 đơn thật giữa các thành viên, sổ cái khớp 100% |

---

## 6. Giai đoạn 2 - Thử nghiệm 100 shop (Tháng 5–6)

Bám đúng mục tiêu tài liệu gốc: 100 chủ shop đầu tiên tại Hà Nội.

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
| 3       | **Phân tích hàng hoàn theo SKU** | 3                | Ngay - đây là tính năng giữ chân seller mạnh nhất        |
| 4       | **Tích hợp Shopee Open API**     | 4 + rủi ro duyệt | Sau khi có pháp nhân và lượng shop đủ để thuyết phục     |
| 5       | **Public API + webhook ERP**     | 4                | Khi có ≥5 shop dùng KiotViet/Sapo yêu cầu                |
| 6       | Gói quảng bá sản phẩm 20k/tuần   | 2                | Khi lượng truy cập buyer đủ để vị trí có giá trị         |

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

Mở rộng địa bàn (TP.HCM, Đà Nẵng), tối ưu chi phí vận chuyển theo vùng, chương trình giới thiệu shop, tối ưu SEO, xây dựng báo cáo tài chính cho vòng gọi vốn.

---

## 9. Hạ tầng & chi phí

### 9.1. Giai đoạn 1 (Tháng 1–6)

| Hạng mục           | Cấu hình                                                  | VNĐ/tháng      |
| ------------------ | --------------------------------------------------------- | -------------- |
| VPS ứng dụng       | 4 vCPU / 8GB / 100GB SSD (VNG Cloud hoặc Vultr Singapore) | 900.000        |
| PostgreSQL managed | 2 vCPU / 4GB / 50GB + backup tự động                      | 700.000        |
| Redis              | 1GB                                                       | 200.000        |
| Object storage     | Cloudflare R2, 100GB + egress 0đ                          | 100.000        |
| CDN + WAF          | Cloudflare Pro                                            | 500.000        |
| Tên miền + SSL     | .vn + .com                                                | 100.000        |
| SMS OTP            | ~2.000 tin × 350đ                                         | 700.000        |
| eKYC               | ~150 lượt × 3.000đ                                        | 450.000        |
| Giám sát, lỗi      | Grafana Cloud + Sentry free tier                          | 0              |
| **Tổng**           |                                                           | **~3.650.000** |

**So với dự toán trong tài liệu:** Bảng 6.1 ghi "Thuê hạ tầng Cloud và CSDL: 12.000.000 cho 6 tháng" = 2.000.000/tháng. Con số thực tế cao hơn khoảng 1,8 lần, chủ yếu do SMS OTP và eKYC - hai khoản chưa xuất hiện trong dự toán gốc nhưng **bắt buộc phải có** (eKYC là nghĩa vụ xác thực người bán theo Nghị định 85/2021).

**Đề nghị điều chỉnh FC1: 20.000.000 → 30.000.000 VNĐ.**

### 9.2. Giai đoạn 2–3 (Tháng 7–12, ở mức ~2.000 đơn/tháng)

| Hạng mục                                                    | VNĐ/tháng      |
| ----------------------------------------------------------- | -------------- |
| Hạ tầng cơ bản (như trên, nâng cấp)                         | 5.000.000      |
| Lưu trữ video khiếu nại (~60 video/tháng × 60MB, giữ 2 năm) | 300.000        |
| AI: VLM inference (~60 vụ × 10 keyframe)                    | 500.000        |
| SMS/ZNS                                                     | 1.500.000      |
| eKYC                                                        | 900.000        |
| **Tổng**                                                    | **~8.200.000** |

Cao hơn con số 5.000.000/tháng trong Bảng 6.3. Điều này **đẩy điểm hòa vốn từ 500 lên khoảng 820 đơn/tháng** (≈27 đơn/ngày) với lợi nhuận đóng góp 10.000đ/đơn. Cần cập nhật lại phần 6.2 của tài liệu gốc.

### 9.3. Chi phí chưa có trong dự toán gốc

| Hạng mục                                         | Ước tính                | Ghi chú                                                    |
| ------------------------------------------------ | ----------------------- | ---------------------------------------------------------- |
| Thành lập doanh nghiệp                           | 3.000.000               | Một lần                                                    |
| Tư vấn pháp lý (soạn quy chế, hợp đồng, rà soát) | 15.000.000 – 40.000.000 | **Không cắt được.** Rủi ro pháp lý của mô hình này rất cao |
| Đăng ký nhãn hiệu                                | 3.000.000               | Một lần                                                    |
| Phí cổng thanh toán / PSP                        | theo giao dịch          | Phụ thuộc đối tác đã chốt                                  |
| Tài khoản Apple Developer + Google Play          | 3.000.000/năm           | Khi làm app mobile ở GĐ3                                   |
| Bảo hiểm trách nhiệm (nếu có)                    | -                       | Cân nhắc khi quy mô lớn                                    |

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
- [ ] Dữ liệu cá nhân được mã hóa và có `retention_until`
- [ ] Đã cập nhật OpenAPI spec
- [ ] QA đã kiểm thử trên staging
- [ ] Text hiển thị cho người dùng đã qua Pháp lý nếu liên quan quyền/nghĩa vụ

---

## 12. Rủi ro dự án và phương án dự phòng

| #   | Rủi ro                                                     | Xác suất   | Tác động               | Phương án                                                                                                                       |
| --- | ---------------------------------------------------------- | ---------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Hồ sơ đăng ký sàn chậm/bị từ chối                          | Trung bình | **Chặn ra mắt**        | Nộp ngay tháng 1; thuê tư vấn có kinh nghiệm hồ sơ sàn                                                                          |
| P2  | Không tìm được đối tác thanh toán chấp nhận mô hình ký quỹ | Trung bình | **Chặn ra mắt**        | Phương án B: ký quỹ bằng chuyển khoản trực tiếp + đối soát tay ở GĐ2 (chấp nhận được ở 100 shop)                                |
| P3  | Technical Lead bận thi/ốm/nghỉ                             | **Cao**    | Trượt tiến độ          | Đệm 20% thời gian; tài liệu hóa; chuẩn bị phương án thuê freelancer 1–2 tháng                                                   |
| P4  | Shopee/TikTok từ chối cấp API                              | Trung bình | Mất tính năng lõi      | Đã có Plan B từ đầu (L7): CSV + OCR là luồng chính                                                                              |
| P5  | Seller không chấp nhận ký quỹ                              | **Cao**    | Chặn mô hình           | Kiểm chứng bằng phỏng vấn 20 shop **trước Sprint 3**. Có phương án: ký quỹ 0đ cho 10 shop đầu, REBOX chịu rủi ro để lấy dữ liệu |
| P6  | Buyer không chịu quay video                                | Trung bình | Tranh chấp khó xử      | Không bắt buộc (L5); dùng ưu đãi (xử lý nhanh hơn) thay vì ép buộc                                                              |
| P7  | Sai lệch sổ cái sau khi lên production                     | Thấp       | **Rất nghiêm trọng**   | Đối soát hằng giờ + tự động chặn rút tiền khi lệch + backup mọi bút toán                                                        |
| P8  | Bị lợi dụng bán hàng giả/hàng cấm                          | Trung bình | **Rủi ro pháp lý cao** | Kiểm duyệt trước với danh mục nhạy cảm + kênh tiếp nhận khiếu nại SHTT + gỡ trong 24h                                           |

---

## 13. Việc cần làm ngay trong 2 tuần tới

| #   | Việc                                                        | Ai               | Vì sao gấp                                                                                       |
| --- | ----------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| 1   | Trả lời 8 câu hỏi ở `00-TONG-QUAN` §3                       | Ban dự án        | Chặn thiết kế chi tiết                                                                           |
| 2   | Khởi động thành lập pháp nhân                               | Trưởng dự án     | Đường găng dài nhất                                                                              |
| 3   | Liên hệ 3 PSP để hỏi về mô hình ký quỹ                      | Business + Legal | Blocker Sprint 4, mất 4–6 tuần                                                                   |
| 4   | Phỏng vấn 20 chủ shop về việc chấp nhận ký quỹ              | Research + BD    | Nếu họ từ chối thì phải đổi mô hình trước khi code                                               |
| 5   | Dựng repo + CI + schema DB                                  | Tech Lead        | Sprint 1                                                                                         |
| 6   | Lập danh mục hàng cấm/hạn chế bản đầu                       | Legal            | Đầu vào Sprint 2                                                                                 |
| 7   | Quyết định chọn phương án A/B/C ở §1                        | Ban dự án        | Quyết định toàn bộ kế hoạch                                                                      |
| 8   | **Xin 20–30 kiện hàng hoàn thật, khảo sát nhãn** (việc 1.0) | BD + Tech Lead   | Rẻ và nhanh, nhưng **quyết định kiến trúc tính năng chủ lực**. Làm sớm để Sprint 2 không code mù |
