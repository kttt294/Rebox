# REBOX — Kế hoạch triển khai

Xây dựng theo mô hình Lean Startup như tài liệu gốc định hướng, với một điều chỉnh quan trọng: **phạm vi trong tài liệu vượt xa năng lực của đội 1–2 lập trình viên trong 6 tháng**. Kế hoạch này cắt phạm vi để có sản phẩm chạy thật, thay vì có một sản phẩm đầy đủ tính năng nhưng không kịp ra mắt.

---

## 1. Đánh giá năng lực thực tế

Theo sơ đồ tổ chức, mảng Kỹ thuật có **1 Technical Lead** (Kiều Thị Thu Trang) phụ trách Mobile App, Web App, thiết kế CSDL, Backend, tích hợp API, triển khai & bảo trì, cộng **1 QA Tester** (Lại Thùy Trang).

**Ước lượng thẳng thắn:** phạm vi trong `REBOX.docx` (2 mobile app + 2 web app + admin console + sàn giao dịch + ví ký quỹ + AI thị giác máy tính + tích hợp 3 sàn + 2 ĐVVC + cổng thanh toán + public API) tương ứng khoảng **18–30 người-tháng** cho một đội có kinh nghiệm. Một người trong 6 tháng cho ra khoảng **4–6 người-tháng**.

Chênh lệch khoảng **4–5 lần**. Có ba cách xử lý, phải chọn một:

| Phương án | Nội dung | Đánh đổi |
|---|---|---|
| **A. Cắt phạm vi** (khuyến nghị) | MVP theo kế hoạch dưới đây: 1 web app responsive, không có app mobile ở GĐ1, AI làm sau | Mất "mobile-first" và "AI triage" khỏi bản demo đầu |
| **B. Tăng người** | Tuyển/thuê thêm 2–3 dev | Ngân sách GĐ1 20 triệu không đủ; cần ~120–180 triệu |
| **C. Kéo dài thời gian** | 12–15 tháng cho phạm vi đầy đủ | Mất lợi thế thời điểm, đội sinh viên khó duy trì |

Phần còn lại của tài liệu này triển khai **phương án A**.

---

## 2. Nguyên tắc cắt phạm vi

| Nguyên tắc | Áp dụng |
|---|---|
| **Web trước, mobile sau** | Next.js responsive dùng được trên điện thoại. Quét mã vận đơn chạy được bằng camera trên trình duyệt (`BarcodeDetector` API / ZXing). Tiết kiệm ~4 người-tháng. |
| **Con người trước, AI sau** | GĐ1 admin xử lý 100% tranh chấp thủ công. Ở 500 đơn/tháng với ~3% khiếu nại = 15 vụ/tháng — một người xử lý thừa sức. AI chỉ đáng làm khi đạt ~2.000 đơn/tháng. |
| **CSV trước, API sàn sau** | Import CSV là 3 ngày công. Tích hợp Shopee Open API là 3–4 tuần cộng rủi ro không được duyệt (L7). |
| **Đúng tiền trước, đẹp sau** | Ví ký quỹ và sổ cái phải hoàn thiện từ ngày đầu. Sai sót ở đây không sửa được bằng bản vá. |
| **Mua thay vì tự xây** | eKYC, cổng thanh toán, gửi SMS/ZNS, phát hiện video giả — dùng dịch vụ có sẵn. |

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

## 4. Giai đoạn 0 — Nền móng (Tháng 1, song song)

Những việc này **không viết code nhưng chặn ngày ra mắt**. Bắt đầu ngay từ tuần 1.

| # | Công việc | Phụ trách | Thời gian | Ghi chú |
|---|---|---|---|---|
| 0.1 | Thành lập pháp nhân (Công ty TNHH hoặc CP) | Pháp lý + Trưởng dự án | 2–3 tuần | Bắt buộc có trước khi đăng ký sàn TMĐT |
| 0.2 | **Thỏa thuận sáng lập + chuyển giao quyền SHTT** | Pháp lý | 1 tuần | 10 thành viên góp công sức — không có văn bản này thì quyền sở hữu mã nguồn và thương hiệu là tranh chấp chờ nổ |
| 0.3 | Đăng ký nhãn hiệu "REBOX" | Pháp lý | nộp sớm | Thủ tục kéo dài 18–24 tháng, nộp càng sớm càng tốt |
| 0.4 | Soạn Quy chế hoạt động sàn, Chính sách bảo mật, Quy trình giải quyết tranh chấp, Hợp đồng người bán | Pháp lý | 3–4 tuần | Đầu vào bắt buộc của hồ sơ đăng ký sàn — xem `05-PHAP-LY` §1 |
| 0.5 | **Đăng ký sàn TMĐT tại online.gov.vn** | Pháp lý | nộp T2, duyệt 1–3 tháng | **Đường găng dài nhất.** Nộp ngay khi có pháp nhân |
| 0.6 | **Chốt đối tác thanh toán có giấy phép** | Business + Pháp lý | 4–6 tuần | Blocker của Sprint 4. Xem `05-PHAP-LY` §2 |
| 0.7 | Đàm phán hợp đồng GHN/GHTK | Business | 3–4 tuần | Điều khoản quan trọng: **COD chi hộ thẳng về TK seller** |
| 0.8 | Chốt danh mục hàng cấm/hạn chế | Pháp lý | 1 tuần | Đầu vào Sprint 2 |
| 0.9 | Hồ sơ đề xuất cấp độ an toàn hệ thống thông tin | Pháp lý + Tech | 3 tuần | Xem `05-PHAP-LY` §4 |
| 0.10 | Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân | Pháp lý | 2 tuần | Nộp Bộ Công an. Xem `05-PHAP-LY` §3 |

**Rủi ro đường găng:** mục 0.5 và 0.6 có thể mất 2–3 tháng. Nếu bắt đầu ở tháng 4 thì sản phẩm xong nhưng không được phép mở. **Bắt đầu ngay tuần 1.**

---

## 5. Giai đoạn 1 — MVP (Tháng 1–4, 8 sprint × 2 tuần)

Mục tiêu: **một đơn hàng thật, từ đăng bán đến hoàn tất đối soát, có thu phí, có xử lý được khiếu nại.**

### Sprint 1 — Nền tảng kỹ thuật

| Việc | Nghiệm thu |
|---|---|
| Monorepo, CI/CD, môi trường dev/staging/prod | Push lên `main` tự động deploy staging |
| Schema DB + migration (toàn bộ bảng ở `01-SPEC` §4) | `pnpm db:migrate` chạy sạch từ đầu |
| Auth: đăng ký/đăng nhập OTP, JWT, refresh xoay vòng, RBAC | Test tự động cho 3 vai trò |
| Layout Next.js + design system | Trang chủ, đăng nhập, layout seller/buyer |
| Observability: log có cấu trúc, trace, health check | Xem được trace một request đầy đủ trên Grafana |

### Sprint 2 — Catalog & Kho hàng hoàn

| Việc | Nghiệm thu |
|---|---|
| CRUD listing + upload ảnh (presigned) + validate giá trần | Đăng được sản phẩm, ảnh lên storage |
| Import CSV hàng hoàn (Shopee + TikTok format) | Upload 100 dòng, dedupe đúng, báo lỗi từng dòng |
| Quét barcode trên web (BarcodeDetector + fallback ZXing) | Quét được nhãn GHTK/GHN thật bằng webcam |
| Danh mục + danh sách cấm/hạn chế | Chặn được sản phẩm thuộc danh mục cấm |
| Tìm kiếm PG FTS tiếng Việt (`unaccent` + `pg_trgm`) | Tìm "vay lua" ra "Váy lụa" |
| Trang chi tiết sản phẩm SSR | Lighthouse SEO ≥ 90 |

### Sprint 3 — Ví ký quỹ & Sổ cái ⭐ sprint quan trọng nhất

| Việc | Nghiệm thu |
|---|---|
| Sổ cái kép, bảng account, ràng buộc `SUM = 0` | Property test: 10.000 giao dịch ngẫu nhiên, sổ luôn cân |
| Hold: create / release / capture / partial capture | Test đồng thời 50 luồng, không sai số dư |
| Fee Engine + **bảng golden test ở `01-SPEC` §5.4** | 8/8 dòng bảng test pass |
| Idempotency middleware | Gửi lại cùng key 100 lần ⇒ 1 bút toán |
| Greedy hide + tính coverage | Số dư tụt ⇒ ẩn đúng listing, nạp vào ⇒ hiện lại đúng |
| Job đối soát sổ cái hằng giờ | Cố tình chèn lệch ⇒ alert kích hoạt |
| Màn hình đối soát cho seller | 3 khối tách bạch theo `03-FE` §2.5 |

**Không sang Sprint 4 khi chưa qua toàn bộ mục trên.** Đây là phần duy nhất trong hệ thống mà lỗi gây mất tiền thật và không sửa được bằng hotfix.

### Sprint 4 — Thanh toán

| Việc | Nghiệm thu |
|---|---|
| Interface `PaymentProvider` + adapter PSP đã chốt ở 0.6 | Đổi provider chỉ cần sửa 1 file cấu hình |
| Nạp ký quỹ qua PSP + webhook | Nạp thật 10.000đ ở sandbox, ví tăng đúng |
| Sinh VietQR động về tài khoản seller | Quét QR bằng app ngân hàng thật, thấy đúng số tiền + nội dung |
| Webhook biến động số dư + đối chiếu tự động | Chuyển tiền thật ⇒ đơn tự chuyển CONFIRMED trong <10s |
| Bảng `payment_unmatched` + màn hình ops xử lý tay | Chuyển thiếu 1.000đ ⇒ vào hàng đợi, không tự confirm |
| Rút ký quỹ + kiểm soát rủi ro | Đổi TK ngân hàng ⇒ khóa rút 72h |

### Sprint 5 — Đơn hàng & Vận chuyển

| Việc | Nghiệm thu |
|---|---|
| Giỏ hàng tách theo shop | Giỏ 2 shop ⇒ 2 sub-order, phí ship tính riêng |
| Checkout init + reservation lock + hold | 2 tab cùng mua 1 món ⇒ 1 thành công, 1 nhận `ITEM_BEING_PURCHASED` |
| State machine sub-order đầy đủ | Chuyển trạng thái sai bị từ chối, có test |
| Adapter GHN + GHTK: quote, create, label | In được nhãn vận đơn thật khổ 10×15 |
| Webhook trạng thái + job polling bù | Tắt webhook ⇒ polling vẫn cập nhật trong 30 phút |
| Job settle + cộng điểm thưởng | Đơn giao xong 72h ⇒ tự trừ phí, cộng điểm đúng bậc |

### Sprint 6 — Khiếu nại (xử lý thủ công)

| Việc | Nghiệm thu |
|---|---|
| Mở khiếu nại + state machine dispute | Quá hạn vẫn nhận, gắn cờ `LATE_CLAIM` |
| Upload video: presigned multipart, hash, Object Lock | Video 100MB upload xong, sửa file trong bucket ⇒ bị chặn |
| Quay video trong app (web: `MediaRecorder`) + màn hướng dẫn | Quay 60s trên Chrome Android, upload nền thành công |
| Màn phân xử cho admin (chưa có AI) | Admin xử lý trọn 1 vụ, lý do bắt buộc ≥30 ký tự |
| Thực thi hoàn tiền + trừ phí ship seller | Ledger đúng theo `02-FLOWS` §5.5, hold dư release đúng |
| Chi hoàn tiền cho buyer qua PSP | Buyer nhận được tiền, ghi `REFUND_PAID` |
| Kháng nghị | Kháng nghị chuyển đúng cấp cao hơn |

### Sprint 7 — Loyalty, thông báo, trang pháp lý

| Việc | Nghiệm thu |
|---|---|
| Điểm lũy tiến + chống tách đơn | Tách 3 đơn 40k cùng địa chỉ/shop/24h ⇒ gộp điểm, gắn cờ |
| Voucher freeship 15 điểm | Đổi voucher, áp dụng đúng đơn <100k |
| Thông báo: push web, email, ZNS | 12 loại thông báo theo bảng sự kiện |
| **Trang Quy chế sàn, Chính sách bảo mật, Giải quyết tranh chấp, Điều khoản người bán** | Nội dung do Pháp lý duyệt, có phiên bản và ngày hiệu lực |
| Kênh CSKH: form ticket + hotline | Nghĩa vụ theo Nghị định 85/2021 |
| Bảng đồng ý xử lý dữ liệu cá nhân (consent) | Ghi nhận đồng ý theo từng mục đích, rút lại được |

### Sprint 8 — Làm cứng & chạy thử nội bộ

| Việc | Nghiệm thu |
|---|---|
| Rà soát bảo mật: OWASP Top 10, IDOR, rate limit | Không còn phát hiện mức High |
| Kiểm thử tải: 200 CCU, 50 checkout đồng thời | p95 trong ngưỡng `01-SPEC` §9.1 |
| Backup + **diễn tập phục hồi** | Restore thành công từ backup lên môi trường sạch |
| Runbook vận hành + trực sự cố | Tài liệu 10 sự cố thường gặp và cách xử lý |
| **Chạy thử end-to-end với tiền thật** | 20 đơn thật giữa các thành viên, sổ cái khớp 100% |

---

## 6. Giai đoạn 2 — Thử nghiệm 100 shop (Tháng 5–6)

Bám đúng mục tiêu tài liệu gốc: 100 chủ shop đầu tiên tại Hà Nội.

| Tuần | Trọng tâm |
|---|---|
| 17–18 | Onboard 10 shop thân thiết. Hỗ trợ tận nơi. Ghi lại mọi điểm vướng |
| 19–20 | Sửa theo phản hồi. Đăng bán hàng loạt trên web + hỗ trợ máy quét cầm tay |
| 21–22 | Mở lên 50 shop. Bắt đầu marketing buyer trên Facebook/TikTok |
| 23–24 | 100 shop. Đo các chỉ số then chốt. Quyết định có mở rộng hay không |

**Chỉ số cần đạt cuối GĐ2 (điều kiện để sang GĐ3):**

| Chỉ số | Mục tiêu | Ý nghĩa |
|---|---|---|
| Shop đăng ≥10 sản phẩm | ≥ 40/100 | Đo mức độ chấp nhận thật của seller |
| Đơn hoàn tất/tháng | ≥ 300 | 60% điểm hòa vốn |
| Tỷ lệ khiếu nại | < 5% | Trên 8% là mô hình có vấn đề nền tảng |
| Tỷ lệ đối soát thanh toán tay | < 5% | Đo mức khả thi của mô hình tiền đi thẳng |
| Sai lệch sổ cái | **0** | Không thương lượng |
| Tỷ lệ giữ chân seller (tháng 2) | ≥ 60% | |
| Thời gian trung bình đăng 1 sản phẩm | < 60 giây | Lời hứa cốt lõi của sản phẩm |

**Chỉ số thứ tư — tỷ lệ đối soát tay — là chỉ số quyết định kiến trúc.** Nếu vượt 10%, mô hình VietQR đi thẳng không vận hành nổi ở quy mô lớn và phải chuyển sang PSP giữ tiền tạm, kéo theo yêu cầu giấy phép.

---

## 7. Giai đoạn 3 — Tự động hóa (Tháng 7–9)

Chỉ làm khi GĐ2 đạt chỉ số. Thứ tự ưu tiên:

| Ưu tiên | Hạng mục | Người-tuần | Điều kiện kích hoạt |
|---|---|---|---|
| 1 | **App mobile (React Native)** | 8 | Khi >30% truy cập từ điện thoại và web app là điểm nghẽn |
| 2 | **AI Triage tầng 1** | 6 | Khi >50 khiếu nại/tháng (dưới mức này xử lý tay rẻ hơn) |
| 3 | **Phân tích hàng hoàn theo SKU** | 3 | Ngay — đây là tính năng giữ chân seller mạnh nhất |
| 4 | **Tích hợp Shopee Open API** | 4 + rủi ro duyệt | Sau khi có pháp nhân và lượng shop đủ để thuyết phục |
| 5 | **Public API + webhook ERP** | 4 | Khi có ≥5 shop dùng KiotViet/Sapo yêu cầu |
| 6 | Gói quảng bá sản phẩm 20k/tuần | 2 | Khi lượng truy cập buyer đủ để vị trí có giá trị |

**Về AI Triage — lộ trình 3 bước, không làm một lần:**

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

## 8. Giai đoạn 4 — Thương mại hóa (Tháng 10–12)

Mở rộng địa bàn (TP.HCM, Đà Nẵng), tối ưu chi phí vận chuyển theo vùng, chương trình giới thiệu shop, tối ưu SEO, xây dựng báo cáo tài chính cho vòng gọi vốn.

---

## 9. Hạ tầng & chi phí

### 9.1. Giai đoạn 1 (Tháng 1–6)

| Hạng mục | Cấu hình | VNĐ/tháng |
|---|---|---|
| VPS ứng dụng | 4 vCPU / 8GB / 100GB SSD (VNG Cloud hoặc Vultr Singapore) | 900.000 |
| PostgreSQL managed | 2 vCPU / 4GB / 50GB + backup tự động | 700.000 |
| Redis | 1GB | 200.000 |
| Object storage | Cloudflare R2, 100GB + egress 0đ | 100.000 |
| CDN + WAF | Cloudflare Pro | 500.000 |
| Tên miền + SSL | .vn + .com | 100.000 |
| SMS OTP | ~2.000 tin × 350đ | 700.000 |
| eKYC | ~150 lượt × 3.000đ | 450.000 |
| Giám sát, lỗi | Grafana Cloud + Sentry free tier | 0 |
| **Tổng** | | **~3.650.000** |

**So với dự toán trong tài liệu:** Bảng 6.1 ghi "Thuê hạ tầng Cloud và CSDL: 12.000.000 cho 6 tháng" = 2.000.000/tháng. Con số thực tế cao hơn khoảng 1,8 lần, chủ yếu do SMS OTP và eKYC — hai khoản chưa xuất hiện trong dự toán gốc nhưng **bắt buộc phải có** (eKYC là nghĩa vụ xác thực người bán theo Nghị định 85/2021).

**Đề nghị điều chỉnh FC1: 20.000.000 → 30.000.000 VNĐ.**

### 9.2. Giai đoạn 2–3 (Tháng 7–12, ở mức ~2.000 đơn/tháng)

| Hạng mục | VNĐ/tháng |
|---|---|
| Hạ tầng cơ bản (như trên, nâng cấp) | 5.000.000 |
| Lưu trữ video khiếu nại (~60 video/tháng × 60MB, giữ 2 năm) | 300.000 |
| AI: VLM inference (~60 vụ × 10 keyframe) | 500.000 |
| SMS/ZNS | 1.500.000 |
| eKYC | 900.000 |
| **Tổng** | **~8.200.000** |

Cao hơn con số 5.000.000/tháng trong Bảng 6.3. Điều này **đẩy điểm hòa vốn từ 500 lên khoảng 820 đơn/tháng** (≈27 đơn/ngày) với lợi nhuận đóng góp 10.000đ/đơn. Cần cập nhật lại phần 6.2 của tài liệu gốc.

### 9.3. Chi phí chưa có trong dự toán gốc

| Hạng mục | Ước tính | Ghi chú |
|---|---|---|
| Thành lập doanh nghiệp | 3.000.000 | Một lần |
| Tư vấn pháp lý (soạn quy chế, hợp đồng, rà soát) | 15.000.000 – 40.000.000 | **Không cắt được.** Rủi ro pháp lý của mô hình này rất cao |
| Đăng ký nhãn hiệu | 3.000.000 | Một lần |
| Phí cổng thanh toán / PSP | theo giao dịch | Phụ thuộc đối tác đã chốt |
| Tài khoản Apple Developer + Google Play | 3.000.000/năm | Khi làm app mobile ở GĐ3 |
| Bảo hiểm trách nhiệm (nếu có) | — | Cân nhắc khi quy mô lớn |

---

## 10. Phân công theo sơ đồ tổ chức

| Vai trò trong sơ đồ | Trách nhiệm trong dự án kỹ thuật |
|---|---|
| **Technical Lead** (Kiều Thị Thu Trang) | Toàn bộ Sprint 1–8. Ưu tiên tuyệt đối cho Sprint 3 (ví & sổ cái) |
| **QA Tester** (Lại Thùy Trang) | Viết test case từ Sprint 2. **Sở hữu bảng golden test của Fee Engine.** Kiểm thử thủ công luồng tiền |
| **Legal Officer** (Nguyễn Kiều Trang) | Toàn bộ GĐ0. Sở hữu danh mục hàng cấm, Quy chế sàn, hồ sơ đăng ký sàn, hồ sơ DPIA |
| **Finance** (Nguyễn Phạm Kiều Trang) | Chốt Q1/Q2 (ký quỹ, công thức hold). Đối soát thủ công GĐ2. Cập nhật mô hình tài chính theo §9 |
| **Business Development** | Đàm phán GHN/GHTK và PSP (mục 0.6, 0.7 — đường găng) |
| **Marketing + Content** | Nội dung trang chủ, hướng dẫn seller, video hướng dẫn quay khui hộp |
| **CSKH** | Vận hành từ GĐ2: xử lý ticket, đối soát thanh toán tay, phân xử tranh chấp thủ công |
| **Research** | Thiết kế bảng khảo sát GĐ2, đo các chỉ số ở §6 |
| **Project Coordinator** | Theo dõi sprint, giữ nhịp GĐ0 vì nó chạy song song và dễ bị bỏ quên |

**Điểm rủi ro nhân sự lớn nhất: toàn bộ mảng kỹ thuật phụ thuộc một người.** Giảm thiểu bắt buộc:
- Mọi thứ trong git, không có gì chỉ nằm trên máy cá nhân
- Hạ tầng bằng mã (Docker Compose + script), không cấu hình bằng tay trên server
- README chạy được từ máy trắng
- Ít nhất một thành viên khác có quyền truy cập hạ tầng và biết quy trình deploy

---

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

| # | Rủi ro | Xác suất | Tác động | Phương án |
|---|---|---|---|---|
| P1 | Hồ sơ đăng ký sàn chậm/bị từ chối | Trung bình | **Chặn ra mắt** | Nộp ngay tháng 1; thuê tư vấn có kinh nghiệm hồ sơ sàn |
| P2 | Không tìm được đối tác thanh toán chấp nhận mô hình ký quỹ | Trung bình | **Chặn ra mắt** | Phương án B: ký quỹ bằng chuyển khoản trực tiếp + đối soát tay ở GĐ2 (chấp nhận được ở 100 shop) |
| P3 | Technical Lead bận thi/ốm/nghỉ | **Cao** | Trượt tiến độ | Đệm 20% thời gian; tài liệu hóa; chuẩn bị phương án thuê freelancer 1–2 tháng |
| P4 | Shopee/TikTok từ chối cấp API | Trung bình | Mất tính năng lõi | Đã có Plan B từ đầu (L7): CSV + OCR là luồng chính |
| P5 | Seller không chấp nhận ký quỹ | **Cao** | Chặn mô hình | Kiểm chứng bằng phỏng vấn 20 shop **trước Sprint 3**. Có phương án: ký quỹ 0đ cho 10 shop đầu, REBOX chịu rủi ro để lấy dữ liệu |
| P6 | Buyer không chịu quay video | Trung bình | Tranh chấp khó xử | Không bắt buộc (L5); dùng ưu đãi (xử lý nhanh hơn) thay vì ép buộc |
| P7 | Sai lệch sổ cái sau khi lên production | Thấp | **Rất nghiêm trọng** | Đối soát hằng giờ + tự động chặn rút tiền khi lệch + backup mọi bút toán |
| P8 | Bị lợi dụng bán hàng giả/hàng cấm | Trung bình | **Rủi ro pháp lý cao** | Kiểm duyệt trước với danh mục nhạy cảm + kênh tiếp nhận khiếu nại SHTT + gỡ trong 24h |

---

## 13. Việc cần làm ngay trong 2 tuần tới

| # | Việc | Ai | Vì sao gấp |
|---|---|---|---|
| 1 | Trả lời 8 câu hỏi ở `00-TONG-QUAN` §3 | Ban dự án | Chặn thiết kế chi tiết |
| 2 | Khởi động thành lập pháp nhân | Trưởng dự án | Đường găng dài nhất |
| 3 | Liên hệ 3 PSP để hỏi về mô hình ký quỹ | Business + Legal | Blocker Sprint 4, mất 4–6 tuần |
| 4 | Phỏng vấn 20 chủ shop về việc chấp nhận ký quỹ | Research + BD | Nếu họ từ chối thì phải đổi mô hình trước khi code |
| 5 | Dựng repo + CI + schema DB | Tech Lead | Sprint 1 |
| 6 | Lập danh mục hàng cấm/hạn chế bản đầu | Legal | Đầu vào Sprint 2 |
| 7 | Quyết định chọn phương án A/B/C ở §1 | Ban dự án | Quyết định toàn bộ kế hoạch |
