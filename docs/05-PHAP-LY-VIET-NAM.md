# REBOX - Rà soát pháp lý Việt Nam

> **Miễn trừ:** đây là bản rà soát kỹ thuật do người thiết kế hệ thống lập ra để nhận diện nghĩa vụ pháp lý cần đưa vào sản phẩm. **Không phải ý kiến tư vấn pháp luật.** Mô hình REBOX chạm vào ba lĩnh vực có điều kiện (sàn TMĐT, trung gian thanh toán, xử lý dữ liệu cá nhân nhạy cảm), nên **bắt buộc phải có luật sư/công ty luật rà soát trước khi vận hành thật**.
>
> **Mốc kiểm tra: 25/08/2026.** Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 và Nghị định 356/2025/NĐ-CP đã có hiệu lực từ 01/01/2026; Nghị định 13/2023/NĐ-CP đã hết hiệu lực. Luật Thương mại điện tử 122/2025/QH15 đã có hiệu lực từ 01/07/2026. Nghị định 330/2026/NĐ-CP về xử phạt trong an ninh mạng và bảo vệ dữ liệu cá nhân có hiệu lực từ 19/08/2026. Vì vậy các phân tích cũ dựa trên Nghị định 52/2013, 85/2021 hoặc 13/2023 chỉ là lịch sử và phải được Legal remap sang khung hiện hành trước production.
>
> Tài liệu này đặt **legal gate** cho kiến trúc; [`07-ARCHITECTURE-DECISIONS.md`](07-ARCHITECTURE-DECISIONS.md) là nguồn canonical cho quyết định kỹ thuật. Không suy ngược từ việc dùng Supabase/PSP/WORM rằng hệ thống đã tuân thủ pháp luật.

---

## 0. Bản đồ rủi ro - đọc phần này trước

| #  | Vấn đề                                                                                                                                                                  | Mức              | Chặn ra mắt?                                                   |
| -- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------- |
| 1  | **Ví ký quỹ + hoàn tiền cho buyer = hoạt động trung gian thanh toán có điều kiện**                                                                      | 🔴 Nghiêm trọng | **Có**                                                    |
| 2  | Đăng ký sàn TMĐT với Bộ Công Thương                                                                                                                              | 🔴 Nghiêm trọng | **Có**                                                    |
| 3  | Điều khoản "mất quyền khiếu nại nếu video sai quy tắc" có nguy cơ vô hiệu                                                                                     | 🔴 Nghiêm trọng | **Có** (phải sửa UI + T&C)                              |
| 4  | Video khui hộp chứa hình ảnh/giọng nói ⇒ dữ liệu cá nhân, có thể là dữ liệu nhạy cảm                                                                     | 🔴 Nghiêm trọng | **Có** (phải chốt căn cứ xử lý, notice/record và hồ sơ tác động) |
| 4b | **Người thứ ba trong video khui hộp** (người thân, trẻ em) - buyer không có thẩm quyền đồng ý thay, mà video lại được đưa cho người bán xem | 🔴 Nghiêm trọng | **Có** (không đưa video gốc cho seller - xem §3.4.3) |
| 5  | Nghĩa vụ khấu trừ, nộp thuế thay người bán của sàn TMĐT                                                                                                        | 🟠 Cao            | Không, nhưng phải xong trước khi có doanh thu              |
| 6  | Lộ mã vận đơn ⇒ rò rỉ dữ liệu người mua trên sàn khác (L4)                                                                                                  | 🟠 Cao            | **Có** (sửa thiết kế)                                  |
| 7  | Hàng giả, hàng cấm, hàng đã qua sử dụng có điều kiện                                                                                                          | 🟠 Cao            | Không, nhưng phải có quy trình từ ngày đầu              |
| 8  | Quyết định tự động bằng AI ảnh hưởng quyền lợi                                                                                                                 | 🟠 Cao            | **Có** (phải có người quyết định + kháng nghị)   |
| 9  | Chương trình điểm thưởng/voucher = khuyến mại, phải thông báo/đăng ký                                                                                       | 🟡 Trung bình    | Không; loyalty/voucher đã hoãn khỏi GĐ1                          |
| 10 | Nhãn "Tài trợ" cho listing quảng bá trả phí                                                                                                                         | 🟡 Trung bình    | Không                                                           |
| 11 | Lưu trữ/chuyển dữ liệu qua hạ tầng Singapore cần đánh giá áp dụng                                                                      | 🟠 Cao            | **Có** với production cloud                                     |
| 12 | Sở hữu trí tuệ nội bộ — mã nguồn đang thuộc cá nhân; "góp vốn bằng công sức" không hợp lệ theo Luật Doanh nghiệp                                                                                                              | 🟠 Cao            | Không, nhưng càng để lâu càng khó gỡ                    |

---

## 1. Đăng ký sàn giao dịch thương mại điện tử

### 1.1. REBOX thuộc loại nào

REBOX cho phép người bán thứ ba mở gian hàng, đăng bán và giao dịch trên nền tảng ⇒ là **sàn giao dịch thương mại điện tử**, thuộc nhóm _website/ứng dụng cung cấp dịch vụ TMĐT_.

**Hệ quả kỹ thuật:** REBOX phải coi hồ sơ/điều kiện vận hành nền tảng là gate trước khi mở public. Quy trình cụ thể phải được Legal cập nhật theo Luật Thương mại điện tử 122/2025/QH15 và văn bản thi hành; không tiếp tục dùng checklist Nghị định 52/2013/85/2021 như kết luận hiện hành.

GĐ1 chỉ ra mắt web. Nếu app mobile GĐ3 được triển khai, Legal phải đánh giá và hoàn thành nghĩa vụ riêng áp dụng cho app trước khi phát hành.

### 1.2. Điều kiện tiên quyết

| Điều kiện                                           | Ghi chú                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Là thương nhân/tổ chức có đăng ký kinh doanh | **Phải thành lập pháp nhân trước.** Cá nhân không đăng ký sàn được |
| Ngành nghề phù hợp                                 | Đăng ký mã ngành TMĐT khi thành lập                                               |
| Tên miền hợp lệ                                    | Nên dùng`.vn` cho hồ sơ                                                             |
| Có đề án cung cấp dịch vụ                       | Mô tả mô hình, quy trình giao dịch, phân định trách nhiệm                      |

### 1.3. Hồ sơ bắt buộc - và ảnh hưởng lên sản phẩm

| Tài liệu                                                                 | Nội dung bắt buộc                                                                                                                                                                                                    | Ảnh hưởng lên sản phẩm                                                                                                                                           |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quy chế hoạt động sàn**                                       | Quyền/nghĩa vụ các bên; quy trình giao dịch;**quy trình giải quyết tranh chấp**; biện pháp xử lý vi phạm; chính sách bảo vệ thông tin cá nhân; quy trình kiểm tra, giám sát hàng hóa | Phải có trang công khai, version/hash/body bất biến và ngày hiệu lực; lưu acceptance theo đúng user/version/time/audit khi đăng ký hoặc khi Legal yêu cầu chấp nhận lại |
| **Mẫu hợp đồng/điều kiện giao dịch chung với người bán** | Điều khoản ký quỹ, khấu trừ phí, khóa kho, xử lý tranh chấp                                                                                                                                                 | Toàn bộ cơ chế ký quỹ và auto-lock**phải có căn cứ trong văn bản này**, nếu không việc trừ tiền và khóa kho là hành vi không có cơ sở |
| **Đề án cung cấp dịch vụ**                                     | Mô hình tổ chức, phân định trách nhiệm sàn ↔ người bán                                                                                                                                                    |                                                                                                                                                                        |
| Giấy chứng nhận ĐKKD                                                   |                                                                                                                                                                                                                         |                                                                                                                                                                        |

### 1.4. Nghĩa vụ thường xuyên của sàn (đưa thẳng vào backlog)

| Nghĩa vụ                                                        | Hiện thực trong hệ thống                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Xác thực danh tính người bán**                      | `shops.kyc_status` phải `VERIFIED` mới được publish. Sprint 1 dùng trạng thái fake/seed để kiểm thử gate; tích hợp provider eKYC thật thuộc Sprint 2 và chỉ bật sau privacy/provider gate |
| Công khai thông tin người bán trên trang sản phẩm         | Tên, trạng thái xác thực, địa chỉ kho -`03-FE` §1.2                                      |
| Cơ chế tiếp nhận & giải quyết khiếu nại                   | Module Dispute + kênh CSKH - Sprint 6, 7                                                           |
| Biện pháp ngăn chặn hàng giả, hàng cấm                    | Kiểm duyệt listing + danh mục cấm -`02-FLOWS` §2.4                                           |
| Gỡ bỏ hàng hóa vi phạm khi có yêu cầu                     | Nút gỡ khẩn cấp trong Admin + SLA nội bộ 24h                                                  |
| Lưu trữ thông tin giao dịch                                   | `orders`, `sub_orders`, `audit_logs` - **không được xóa cứng**                    |
| Cung cấp thông tin cho cơ quan quản lý khi được yêu cầu | Chức năng xuất dữ liệu trong Admin                                                             |
| Báo cáo định kỳ                                              | Legal Officer theo dõi biểu mẫu và kỳ hạn hiện hành                                         |

### 1.5. Rủi ro nếu bỏ qua

Vận hành sàn TMĐT chưa đăng ký bị xử phạt hành chính theo Nghị định 98/2020/NĐ-CP (sửa đổi bởi Nghị định 17/2022/NĐ-CP), kèm biện pháp khắc phục là đình chỉ hoạt động. Với một startup, việc bị yêu cầu dừng hoạt động thường là kết thúc.

**⏱ Đây là đường găng dài nhất của dự án. Nộp hồ sơ ngay tháng 1.**

---

## 2. 🔴 Vấn đề nghiêm trọng nhất: ví ký quỹ và dòng tiền

### 2.1. Bản chất pháp lý của thiết kế hiện tại

Hệ thống REBOX như mô tả trong tài liệu gốc thực hiện các hành vi sau:

1. **Nhận tiền của người bán** vào ví ký quỹ do REBOX quản lý
2. **Giữ và phong tỏa** khoản tiền đó theo lệnh của hệ thống
3. **Tự động trừ** để thu phí
4. **Dùng tiền đó chi trả cho người mua** khi hoàn tiền

Hành vi 1 + 2 + 4 - nhận, giữ, và chi tiền của người này trả cho người khác - có đặc điểm của **dịch vụ trung gian thanh toán** (ví điện tử / hỗ trợ thu hộ, chi hộ) theo pháp luật về thanh toán không dùng tiền mặt (Luật Các tổ chức tín dụng 2024, Nghị định 52/2024/NĐ-CP và các văn bản hướng dẫn của Ngân hàng Nhà nước).

**Cung ứng dịch vụ trung gian thanh toán mà không có Giấy phép của Ngân hàng Nhà nước là hành vi bị cấm.** Đây không phải rủi ro nhỏ có thể xử lý sau - đây là rủi ro có thể chấm dứt dự án.

### 2.2. Vì sao thiết kế "tiền đi thẳng về seller" chưa giải quyết được vấn đề

Nhóm dự án đã có trực giác đúng khi để tiền hàng đi thẳng từ buyer về tài khoản seller (không qua REBOX). Điều đó **loại bỏ được rủi ro với tiền hàng**. Nhưng **ví ký quỹ vẫn nằm nguyên trong vùng rủi ro**, vì REBOX vẫn nhận, giữ, và chi tiền của người dùng.

Đặc biệt hành vi **dùng tiền ký quỹ của shop A để chi cho buyer B** là chuyển giá trị giữa hai người dùng qua trung gian - đúng bản chất của hoạt động thanh toán.

Ngoài ra, mock UI ghi _"96% về Shop / 4% phí tạm thu"_ (M2). Nếu triển khai theo phương án này thì REBOX **chắc chắn** đang giữ tiền của người khác. **Phải loại bỏ phương án 96/4.**

### 2.3. Bốn hướng xử lý (phải chọn một trước Sprint 4)

| Phương án                                                                | Cách làm                                                                                                                                                                                                                                                                                                                                           | Ưu                                                                                                      | Nhược                                                                                                                                 |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Hợp tác với đơn vị có giấy phép TGTT** ⭐ khuyến nghị | Toàn bộ ví ký quỹ do một tổ chức được NHNN cấp phép vận hành. REBOX chỉ ra lệnh nghiệp vụ qua API, không tự giữ tiền                                                                                                                                                                                                          | An toàn pháp lý; có sẵn hạ tầng đối soát, payout, AML                                          | Mất phí; phụ thuộc đối tác; cần thời gian đàm phán 4–8 tuần                                                               |
| **B. Tài khoản đảm bảo thanh toán tại ngân hàng**            | Mở tài khoản chuyên dùng, tách hoàn toàn khỏi tài khoản hoạt động của REBOX; tiền ký quỹ không phải tài sản của REBOX                                                                                                                                                                                                         | Minh bạch, dễ giải trình                                                                             | **Vẫn chưa chắc đủ** để loại trừ tính chất TGTT khi có chi cho bên thứ ba. Bắt buộc phải hỏi ý kiến luật sư |
| **C. Cấu trúc lại thành tiền đặt cọc thuần túy**            | Ký quỹ chỉ dùng để**cấn trừ nghĩa vụ của seller với REBOX** (phí sàn, phí ship). **Không dùng để chi cho buyer.** Việc hoàn tiền do seller trực tiếp chuyển cho buyer, REBOX chỉ ra quyết định và giám sát; seller không thực hiện thì REBOX cấn trừ cọc để bù cho chính mình rồi tự đòi | Gần với chế định đặt cọc (Điều 328 Bộ luật Dân sự 2015) hơn; giảm mạnh tính chất TGTT | Trải nghiệm hoàn tiền chậm và kém hơn hẳn; mất lời hứa "hoàn tiền tự động"                                             |
| **D. Sandbox**                                                        | Tham gia cơ chế thử nghiệm có kiểm soát trong lĩnh vực ngân hàng nếu mô hình thuộc phạm vi áp dụng                                                                                                                                                                                                                                 | Đúng kênh cho mô hình mới                                                                          | Thủ tục nặng, không phù hợp quy mô sinh viên ở GĐ1                                                                            |

**Khuyến nghị:** phương án **A** cho sản phẩm chính thức. Trong giai đoạn thử nghiệm 100 shop, có thể vận hành theo hướng **C** với quy mô nhỏ và đối soát thủ công, **sau khi có ý kiến bằng văn bản của luật sư**.

### 2.4. Yêu cầu bắt buộc lên kiến trúc

Đây là lý do `01-SPEC` §7.3 đặt toàn bộ tương tác thanh toán sau interface `PaymentProvider`: **khả năng thay đổi mô hình dòng tiền mà không phải viết lại hệ thống là một yêu cầu pháp lý, không phải sở thích kỹ thuật.**

### 2.5. Nghĩa vụ đi kèm nếu chạm vào dòng tiền

- A10/Legal phải xác định **chủ thể báo cáo** và nghĩa vụ của từng bên theo Luật Phòng, chống rửa tiền 2022. PSP/ngân hàng thực hiện nghĩa vụ pháp định của họ khi họ là đối tượng báo cáo; REBOX chỉ thực hiện nghĩa vụ pháp định trực tiếp áp dụng cho mình và phần hỗ trợ/monitoring đã cam kết trong hợp đồng, không tự tuyên bố thay PSP báo cáo mọi giao dịch.
- Hệ thống chuẩn bị capability theo phân công đã duyệt: cờ bất thường, ngưỡng cấu hình có version, freeze/review, xuất hồ sơ và audit. Không hardcode ngưỡng “giao dịch lớn” trước khi Legal/PSP mapping vai trò.

---

## 3. Bảo vệ dữ liệu cá nhân

### 3.1. Khung pháp lý

Baseline hiện hành của tài liệu là **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** và **Nghị định 356/2025/NĐ-CP**, cùng có hiệu lực từ 01/01/2026; chế tài hiện hành còn có **Nghị định 330/2026/NĐ-CP** từ 19/08/2026. Nghị định 13/2023/NĐ-CP đã hết hiệu lực; mọi mapping điều khoản cũ phải được Legal làm lại trước production.

### 3.2. REBOX xử lý những loại dữ liệu nào

| Loại dữ liệu                                                                                            | Phân loại                                   | Rủi ro            |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------ |
| Họ tên, SĐT, email, địa chỉ giao hàng                                                               | Cơ bản                                      | Trung bình        |
| **Ảnh CCCD, dữ liệu eKYC, dữ liệu sinh trắc (khuôn mặt)**                                    | **Nhạy cảm**                          | 🔴 Cao             |
| Số tài khoản ngân hàng                                                                                | **Nhạy cảm** (thông tin tài khoản) | 🔴 Cao             |
| **Video khui hộp** - có thể chứa khuôn mặt, giọng nói, hình ảnh nhà riêng, người thân | **Có thể là nhạy cảm**             | 🔴 Cao             |
| Lịch sử mua hàng, hành vi                                                                              | Cơ bản                                      | Trung bình        |
| **Mã vận đơn đơn hoàn** - chứa dữ liệu của người mua trên sàn khác                   | Cơ bản,**của bên thứ ba**          | 🔴 Cao (xem §3.6) |
| Raw bank/PSP/carrier event, sender/account/reference ngoài REBOX                    | Có thể chứa dữ liệu tài chính của bên thứ ba | 🔴 Cao; chỉ ingest allowlist tối thiểu, không lưu nguyên sao kê |

### 3.3. Nghĩa vụ và cách hiện thực

| Nghĩa vụ                                                                   | Hiện thực                                                                                                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Căn cứ xử lý/notice/consent theo từng mục đích do Legal duyệt | `processing_records` lưu notice đã render; `processing_purpose_events` append-only lưu từng purpose/căn cứ/quyết định và withdrawal. **Không dùng một checkbox chung; im lặng không phải đồng ý.** NĐ 330/2026 Điều 43 đặt rủi ro xử phạt cụ thể cho việc không tách mục đích hoặc không giữ được nhật ký/chứng cứ đồng ý |
| Luồng riêng cho dữ liệu nhạy cảm                                      | Màn hình riêng cho eKYC và video khiếu nại; Legal chốt trường hợp là `NOTICE_ACK` hay `CONSENT` trước khi viết copy production                                           |
| **Thông báo xử lý dữ liệu** trước khi thu thập                | Trang Chính sách bảo mật + thông báo ngắn tại điểm thu thập                                                                                                                |
| **Hồ sơ đánh giá tác động xử lý dữ liệu cá nhân** | Lập/cập nhật theo khung 2026 và quy trình Legal xác nhận. Nếu bật AI GĐ3, phải cập nhật data flow, provider và mục đích trước khi xử lý thật |
| Đánh giá tác động chuyển dữ liệu ra nước ngoài                   | Cần nếu dùng cloud/AI API đặt ngoài Việt Nam (§4)                                                                                                                             |
| **Quyền của chủ thể dữ liệu**                                    | Trong ứng dụng: xem, sửa, xuất dữ liệu, rút lại đồng ý, yêu cầu xóa, phản đối xử lý tự động                                                                     |
| Workflow thực thi quyền | `privacy_requests` có step-up auth, SLA/config version, inventory, exception/hold, receipt và audit; trả rõ phần đã xử lý, phần phải giữ và độ trễ purge backup |
| Thời hạn lưu trữ                                                         | Registry versioned theo data class/purpose/start event/action; mỗi workflow delete/anonymize/pseudonymize phải test. Chỉ evidence/KYC cần per-record `retention_until`; ledger/audit áp policy và hold phù hợp, không xóa row máy móc |
| Thông báo vi phạm                                                         | Quy trình xử lý sự cố rò rỉ; thông báo cơ quan trong thời hạn luật định                                                                                                |
| Chỉ định người/bộ phận phụ trách BVDLCN                             | Legal Officer kiêm nhiệm ở GĐ1                                                                                                                                                    |

Không mặc định dựa vào miễn trừ dành cho startup/SME: REBOX dự kiến trực tiếp xử lý eKYC/sinh trắc, tài khoản và evidence nhạy cảm. Legal phải kiểm tra điều kiện loại trừ miễn trừ và lập hồ sơ tác động/chuyển dữ liệu đầy đủ nếu thuộc diện áp dụng trước khi có dữ liệu thật.

### 3.4. Video khui hộp - điểm nóng nhất

Đây là loại dữ liệu rủi ro cao và đặc thù riêng của REBOX.

#### 3.4.1. "Buyer tự nguyện tải lên" có đủ không? - Không

Buyer chỉ nộp video khi **chính họ** muốn khiếu nại. Đó là hành động tự nguyện, và đây là một lập luận hay được nêu ra để cho rằng REBOX không cần làm gì thêm. **Lập luận này sai.**

Tính tự nguyện chỉ là **một trong nhiều điều kiện** để sự đồng ý có giá trị. Thiết kế giữ checklist bảo thủ dưới đây; Legal phải map từng dòng sang Luật 91/2025 và Nghị định 356/2025 trước khi duyệt nội dung production:

| Điều kiện                                                                                            | Hành vi "bấm nút tải lên" có thoả không?                                                                                       |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Tự nguyện                                                                                             | ✅ Có                                                                                                                                 |
| **Cụ thể cho từng mục đích** - không gộp nhiều mục đích                               | ❌ Không. Buyer nghĩ mình "gửi bằng chứng", có thể không biết admin xử lý và người bán xem derivative |
| **Được thông tin đầy đủ** - dữ liệu gì, ai xử lý, ai xem, giữ bao lâu, quyền gì  | ❌ Không, trừ khi có màn hình nói rõ                                                                                            |
| **Chứng minh được** - lưu ở định dạng in/sao chép/kiểm chứng được                  | ❌ Không, trừ khi ghi lại bản ghi đồng ý                                                                                        |
| **Với dữ liệu nhạy cảm: phải nói rõ đó là dữ liệu nhạy cảm** trước khi thu thập | ❌ Không                                                                                                                              |

Quan trọng hơn: **nếu sự đồng ý là căn cứ được Legal chọn**, sự đồng ý hợp lệ vẫn không xoá bỏ các nghĩa vụ còn lại - thông báo, giới hạn mục đích, bảo mật, giới hạn thời hạn lưu và đáp ứng quyền của chủ thể dữ liệu. Nó không phải giấy miễn trừ.

#### 3.4.2. Bẫy thứ hai: sự đồng ý bị điều kiện hoá

Nếu chính sách là _"không có video thì không được hoàn tiền"_, thì sự đồng ý **không còn tự nguyện thật** - nó bị đánh đổi bằng quyền lợi. Buyer không có lựa chọn nào khác ngoài việc đồng ý.

Đây là lý do khuyến nghị **L5** (video là _chứng cứ ưu tiên_, không phải _điều kiện tiên quyết_) quan trọng gấp đôi: nó vừa xử lý rủi ro điều khoản vô hiệu theo Luật BVQLNTD 2023 (§5.1), **vừa** khôi phục tính tự nguyện thật cho sự đồng ý theo pháp luật dữ liệu. Một thay đổi thiết kế, gỡ được hai rủi ro độc lập.

#### 3.4.3. 🔴 Người thứ ba trong video - rủi ro lớn nhất và chưa có lời giải trọn vẹn

**Buyer không thể đồng ý thay cho người khác.**

Video khui hộp quay tại nhà thường vô tình ghi lại: người thân đi ngang, trẻ em, giọng nói người khác, nội thất nhà riêng. Buyer đồng ý cho dữ liệu **của chính họ** - họ không có thẩm quyền đồng ý thay cho mẹ, con, hay bạn cùng phòng. Những dữ liệu đó sau đó được đưa cho **một người bán xa lạ** xem.

Không xoá bỏ được hoàn toàn, nhưng giảm mạnh bằng thiết kế:

| Biện pháp                                                                                                                          | Hiệu quả                                                          | Bắt buộc? |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------- |
| Cảnh báo trong màn hình hướng dẫn quay                                                                                        | Trung bình - chuyển một phần trách nhiệm, không xoá rủi ro | Có         |
| **Không đưa video gốc cho seller.** Seller chỉ xem tóm tắt vụ việc + 6–10 khung hình đã chọn, đã làm mờ khuôn mặt | **Cao - khuyến nghị mạnh nhất**                           | Có         |
| Làm mờ toàn bộ khuôn mặt trong mọi bản chia sẻ; GĐ1 có bước admin duyệt thủ công                                          | Cao                                                                 | Có         |
| Chỉ admin cấp phân xử xem được bản gốc, mỗi lượt xem ghi audit                                                           | Cao                                                                 | Có         |
| Giới hạn thời lượng 90 giây                                                                                                    | Trung bình - giảm lượng dữ liệu thừa thu thập               | Có         |

Biện pháp thứ hai đáng làm nhất. Seller cần biết **hàng có bị hỏng không**, không cần xem phòng khách nhà buyer. Ở GĐ1, tóm tắt và khung hình đã che mặt được admin duyệt thủ công; AI không phải điều kiện để thực hiện kiểm soát này.

Hiện thực kỹ thuật: tách `dispute_evidences` thành **bản gốc** và **bản dẫn xuất đã khử nhận dạng** - xem `01-SPEC` §4.2.

#### 3.4.4. Đừng đặt tất cả lên nền "sự đồng ý"

Sự đồng ý **rút lại được**. Kịch bản xấu: buyer nộp video → được hoàn tiền → rút lại đồng ý và yêu cầu xoá. Lúc đó REBOX phải xoá chứng cứ của một quyết định đã chuyển tiền, và mất khả năng tự bảo vệ nếu seller khởi kiện.

**Giả thuyết cấu trúc căn cứ hai lớp để Legal thẩm định:**

| Lớp                     | Phạm vi                                                                                                              | Căn cứ                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lớp lõi**      | Lưu, phân tích để phân xử, giữ làm hồ sơ vụ việc                                                         | Căn cứ phù hợp theo khung 2026, có thể liên quan thực hiện nghĩa vụ theo hợp đồng; **chưa được tài liệu này kết luận** |
| **Lớp đồng ý** | Yếu tố sinh trắc học (khuôn mặt, giọng nói) + mọi mục đích phụ (huấn luyện AI, cải thiện sản phẩm) | Sự đồng ý riêng, tách bạch, mặc định tắt, rút lại được, từ chối không ảnh hưởng quyền khiếu nại                                                                        |

⚠️ **Điểm phải hỏi luật sư, không tự quyết:** cách áp dụng các căn cứ xử lý theo Luật 91/2025/NĐ 356/2025 cho evidence tranh chấp chưa được tài liệu này kết luận. Hướng phân tách hai lớp là giả thuyết thiết kế để Legal đánh giá, **không phải kết luận đã chắc chắn**.

#### 3.4.5. Yêu cầu triển khai

| Yêu cầu                      | Cách làm                                                                                                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Màn hình notice/lựa chọn riêng | Hiện **trước khi mở camera/file picker**, không phải sau khi đã tạo dữ liệu. Đặc tả tại `03-FRONTEND` §1.6                                             |
| Không gộp mục đích phụ         | GĐ1 không xin dùng evidence để huấn luyện AI. Nếu GĐ3 có mục đích này, phải có bản ghi tự nguyện tách biệt, mặc định tắt                              |
| Ghi nhận theo từng vụ việc     | Không phải một lần khi đăng ký tài khoản. Mỗi khiếu nại là một bối cảnh riêng; từ chối video không làm mất quyền mở khiếu nại                         |
| Ghi bằng chứng xử lý           | `processing_records` + timeline append-only `processing_purpose_events`; withdrawal là event mới, không cập nhật mất lịch sử (`01-SPEC` §4.2) |
| Công khai người nhận       | **Phải nói rõ người bán sẽ được xem.** Đây là thông tin ảnh hưởng trực tiếp đến quyết định của buyer và cũng là thứ hay bị giấu nhất |
| Giới hạn mục đích         | Chỉ xử lý khiếu nại. Không marketing, không đưa vào tập huấn luyện nếu thiếu đồng ý riêng                                                               |
| Kiểm soát truy cập          | Presigned URL 5 phút;**mọi lượt xem bản gốc ghi audit** kèm danh tính người xem                                                                            |
| Quyền hình ảnh              | Điều 32 Bộ luật Dân sự 2015 về quyền của cá nhân đối với hình ảnh - càng khẳng định không được dùng ngoài mục đích đã công bố             |

#### 3.4.6. Thời hạn lưu - chính sách phân tầng

Có mâu thuẫn thật giữa **giảm thiểu dữ liệu** (xoá càng sớm càng tốt) và **bảo toàn chứng cứ** (thời hiệu khởi kiện về hợp đồng là 3 năm theo Bộ luật Dân sự 2015). Giải quyết bằng cách tách theo loại dữ liệu thay vì chọn một con số duy nhất:

| Dữ liệu                                                                         | Thời hạn                                       | Lý do                                                                                  |
| --------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| **Video gốc**                                                              | Mốc mục tiêu 90 ngày sau `case.final_closed_at`; thực tế không trước khi Object Lock/legal hold hết | Khối lượng lớn, nhạy cảm nhất, chứa dữ liệu bên thứ ba |
| **Khung hình đã khử nhận dạng + tóm tắt kỹ thuật + biên bản phân xử** | Mốc mục tiêu 3 năm sau cùng mốc đóng case; subject to hold/lock | Ít nhạy cảm, dung lượng nhỏ; thời hạn cuối cùng phải được Legal duyệt |
| Vụ việc có kháng nghị / khiếu kiện / yêu cầu của cơ quan nhà nước   | Giữ bản gốc tới khi kết thúc + thời hiệu | Nghĩa vụ bảo toàn chứng cứ                                                        |

Thiết kế này giải quyết được cả hai phía: xoá phần rủi ro cao sớm, giữ phần cần thiết để tự bảo vệ.

**Mâu thuẫn với Object Lock:** chế độ compliance làm file **không xoá được** cho tới hết thời hạn khoá, có thể xung đột với yêu cầu xoá. Tại ingest chưa thể biết `closed_at`, nên hệ thống đặt `object_lock_until` tạm theo horizon tối thiểu do Legal duyệt. Watchdog phải gia hạn trước safety window khi vụ việc chưa đóng hoặc hold chưa release vật lý; claims chốt `final_closed_at` khi appeal/remediation kết thúc, không đợi litigation/regulator hold. Thời điểm xóa thực tế là mốc muộn hơn giữa retention target, lock và `preserve_until`; nhiều hold có thể chồng nhau, `PENDING_RELEASE/FAILED` vẫn chặn xóa. Chỉ physical-release sau hold cuối và provider reconcile. Xóa bytes phải lưu receipt/trạng thái nhưng giữ metadata/hash/chain theo policy. Không được công bố “xóa đúng ngày” nếu khóa bất biến khiến file tồn tại lâu hơn.

### 3.5. Xử lý tự động bằng AI — legal gate GĐ3

AI không nằm trong GĐ1. Phần này chỉ là điều kiện phải đáp ứng nếu A15 được mở lại.

Việc AI tự động quyết định hoàn tiền/từ chối là **ra quyết định tự động ảnh hưởng đến quyền và lợi ích** của người dùng.

Yêu cầu bắt buộc:

- **Công khai** trong Chính sách bảo mật và Quy chế sàn rằng có sử dụng xử lý tự động, và nêu tiêu chí chính
- **Quyền được người xem xét lại** - đây chính là lý do L6 cấm nhánh auto-reject
- **Quyền phản đối** - người dùng có thể yêu cầu không áp dụng xử lý tự động cho hồ sơ của mình
- Lưu bản ghi giải trình đầy đủ (`01-SPEC` §8.3)

### 3.6. 🔴 Mã vận đơn - rò rỉ dữ liệu của bên thứ ba

Tài liệu gốc đề xuất **dùng mã vận đơn làm ID sản phẩm công khai** (L4). Mã vận đơn tra cứu được trên website của đơn vị vận chuyển, có thể để lộ **tên, số điện thoại, địa chỉ của người mua gốc trên Shopee/TikTok** - những người **không hề có quan hệ gì với REBOX và chưa từng đồng ý** cho REBOX xử lý dữ liệu của họ.

Đây là hành vi làm lộ dữ liệu cá nhân của bên thứ ba, không có căn cứ pháp lý.

**Bắt buộc:**

1. ID công khai là ULID nội bộ, không liên quan mã vận đơn
2. Mã vận đơn mã hóa tầng ứng dụng, không xuất hiện trong bất kỳ API công khai nào
3. Dữ liệu người mua gốc từ API sàn: **chỉ lấy thông tin sản phẩm, tuyệt đối không lưu tên/SĐT/địa chỉ người mua gốc**. Bộ lọc allowlist trường dữ liệu ngay tại tầng ingest, trước khi ghi vào `raw_payload`
4. **Không đồng bộ toàn bộ đơn hàng của shop** - chỉ đọc theo yêu cầu, xem §3.6.1

#### 3.6.1. Giảm thiểu dữ liệu trong tích hợp API sàn

Live API sàn là GĐ3. Các yêu cầu dưới đây là gate cho tương lai, không phải chức năng MVP.

Thiết kế truy cập API đã đổi từ _đồng bộ nền toàn bộ đơn hoàn_ sang _tra cứu theo từng đơn khi seller quét mã trên kiện hàng vật lý_ (`01-SPEC` §7.1.1). Đây là một biện pháp **giảm thiểu dữ liệu** theo đúng nghĩa: REBOX chỉ xử lý dữ liệu của những đơn mà seller chủ động đưa ra, thay vì sao chép cơ sở dữ liệu đơn hàng của shop.

Điều này thu hẹp đáng kể bề mặt rủi ro đối với **dữ liệu của người mua gốc trên sàn khác** - nhóm chủ thể dữ liệu chưa từng có quan hệ nào với REBOX.

**⚠️ Phải mô tả đúng, không được nói quá:**

| Cách nói                                                                                                          | Đúng/Sai                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| _"Người bán kiểm soát REBOX được đọc đơn nào"_                                                       | ❌**Sai sự thật.** OAuth của Shopee/TikTok cấp quyền ở tầng shop theo scope; không có cơ chế giới hạn theo từng đơn |
| _"REBOX chỉ đọc đơn mà người bán chủ động quét, và không sao chép cơ sở dữ liệu đơn hàng"_ | ✅ Đúng - đây là**tự giới hạn của REBOX**, thực thi bằng kỹ thuật và quy trình nội bộ                              |

Khác biệt này quan trọng cả trong Chính sách bảo mật, Quy chế sàn, lẫn tài liệu bán hàng. Mô tả sai một biện pháp bảo vệ dữ liệu là hành vi cung cấp thông tin không chính xác cho chủ thể dữ liệu.

Tự giới hạn không phải hình thức: **giảm thiểu dữ liệu là nghĩa vụ của Bên Kiểm soát dữ liệu**, bất kể API cho phép tới đâu.

**Yêu cầu triển khai kèm theo:**

| Yêu cầu                              | Cách làm                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chứng minh được sự tự giới hạn | Mỗi lần đọc đơn ghi`audit_logs`: shop nào, đơn nào, thời điểm, mục đích                                                                                                                                                                                                                      |
| Minh bạch với seller                 | Trang**"REBOX đã đọc những đơn nào"** trong phần cài đặt kết nối                                                                                                                                                                                                                                 |
| Quyền xoá                            | Nút**"Xoá dữ liệu đã đọc"**, xoá cache đơn-đã-quét                                                                                                                                                                                                                                               |
| Giới hạn ở Đường B               | Khi phải quét danh sách đơn để đối chiếu mã vận đơn (`01-SPEC` §7.1.2), chỉ lấy cặp `(order_sn, tracking_number)`, giữ trong bộ nhớ, **không ghi xuống CSDL**. Nêu rõ giới hạn này trong chính sách - giảm thiểu ở tầng lưu trữ, **không** ở tầng đọc |
| Thu hồi uỷ quyền                    | Seller ngắt kết nối ⇒ xoá token + cache trong 24h                                                                                                                                                                                                                                                         |

---

## 4. An ninh mạng và lưu trú dữ liệu

Khung an ninh mạng đã thay đổi với Luật An ninh mạng 116/2025/QH15 có hiệu lực từ 01/07/2026. Tài liệu này không kết luận blanket rằng mọi dữ liệu của REBOX bắt buộc đặt tại Việt Nam; Legal phải xác định nghĩa vụ theo loại dịch vụ, loại dữ liệu, yêu cầu của cơ quan có thẩm quyền và data flow thực tế.

| Gate | Hiện thực kiến trúc |
|---|---|
| Supabase Singapore | Trước A14, dev/staging chỉ dùng synthetic/anonymized fixture; cấm production dump, CCCD/eKYC, evidence, payment và dữ liệu cá nhân thật. Mọi test dùng dữ liệu thật phải qua cùng data inventory, DPA/subprocessor, transfer review và Legal gate như production |
| Evidence | Supabase Storage không phải kho chứng cứ. Chọn provider WORM/Object Lock riêng; contract phải bao phủ region, encryption, access log, retention, legal hold và deletion |
| Hệ thống thông tin theo cấp độ | Legal/Security xác định cấp độ và hồ sơ theo khung hiện hành; không tự khẳng định “cấp 2–3” chỉ từ loại sản phẩm |
| Nhật ký | `audit_logs` + log hạ tầng, có retention/access policy và không ghi secret/token/evidence payload |
| Nội dung người dùng | Có quy trình tiếp nhận/gỡ nội dung và bảo toàn audit theo nghĩa vụ hiện hành trước khi bật review/comment public |

**A14 phải là hồ sơ vận hành, không chỉ một checkbox:** inventory bao phủ Supabase, WORM, eKYC, PSP/bank hub, carrier, log/observability, backup, CDN và AI tương lai; mỗi data flow có owner, provider/subprocessor, region, data class/purpose, legal basis, `first_processing_at`, `first_transfer_at`, deadline do Legal xác nhận, ngày nộp và receipt. Legal phải kiểm tra mốc nộp theo Luật 91/2025/NĐ 356/2025 — bao gồm việc xác nhận mốc 60 ngày có áp dụng cho từng hồ sơ hay không — và tạo trigger cập nhật khi đổi provider, purpose, loại dữ liệu hoặc quốc gia nhận.

Backup cũng là một data class có retention/access/region riêng. Deletion/anonymization tombstone và active hold phải được lưu ngoài snapshot được restore; sau restore phải replay và verify trước khi mở access. Evidence mirror/copy không được có protection yếu hơn bản WORM gốc.

**Nếu bật AI GĐ3:** gửi keyframe/evidence tới bất kỳ AI provider bên ngoài nào có thể tạo thêm luồng chuyển/xử lý dữ liệu. Trước khi bật phải:

- Cập nhật hồ sơ đánh giá tác động và đánh giá chuyển dữ liệu tương ứng
- Công khai trong Chính sách bảo mật
- Khử nhận dạng trước khi gửi nếu mục đích/eval cho phép; không dùng bản gốc mặc định

---

## 5. 🔴 Bảo vệ quyền lợi người tiêu dùng

Căn cứ: **Luật Bảo vệ quyền lợi người tiêu dùng 2023** (hiệu lực 01/7/2024) và Nghị định 55/2024/NĐ-CP.

### 5.1. Điều khoản có nguy cơ vô hiệu - phải sửa trước khi ra mắt

Điều 25 Luật BVQLNTD 2023 quy định các điều khoản **không có hiệu lực**, trong đó có điều khoản **loại trừ, hạn chế quyền khiếu nại, khởi kiện** của người tiêu dùng.

| Quy định hiện tại trong tài liệu/UI                               | Rủi ro               | Sửa thành                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _"Video vi phạm quy tắc sẽ lập tức bị hủy quyền khiếu nại"_ | 🔴 Nguy cơ vô hiệu | Video là**chứng cứ ưu tiên** giúp xử lý nhanh; không có video vẫn được khiếu nại nhưng xử lý thủ công, gánh nặng chứng minh cao hơn                                                                            |
| _"ĐIỀU KIỆN BẮT BUỘC"_ trên UI buyer                            | 🔴 Tương tự        | _"ĐIỀU KIỆN ĐỂ XỬ LÝ NHANH"_ + dòng giải thích (`03-FE` §1.2)                                                                                                                                                                  |
| _"Thời hạn khiếu nại cố định là 03 ngày"_                    | 🟠 Hạn chế quyền   | Giữ 3 ngày cho**quy trình xử lý nhanh nội bộ**, nhưng nêu rõ: hết hạn vẫn tiếp nhận qua CSKH, và **không ảnh hưởng quyền theo pháp luật** (bảo hành, khởi kiện, khiếu nại tới cơ quan nhà nước) |
| Quyết định của REBOX là "chung thẩm"                              | 🟠                    | Nêu rõ: quyết định cuối cùng**trong hệ thống REBOX**, không loại trừ quyền khiếu nại tới cơ quan quản lý, hòa giải, trọng tài hoặc khởi kiện                                                                  |

### 5.2. Nghĩa vụ đối với nền tảng số trung gian

| Nghĩa vụ                                                                         | Hiện thực                                                                               |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Công khai quy trình tiếp nhận, giải quyết khiếu nại                        | Trang riêng + hiển thị trong luồng khiếu nại                                        |
| Công khai đầu mối liên hệ, phương thức liên lạc                         | Footer + trang Liên hệ + trong ứng dụng                                               |
| **Chỉ rõ tiêu chí xác định thứ tự ưu tiên hiển thị sản phẩm** | Trang "Cách REBOX sắp xếp sản phẩm" - nêu rõ tiêu chí và cả yếu tố trả phí |
| **Phân biệt rõ nội dung quảng cáo/tài trợ**                          | Chỉ áp dụng nếu feature quảng bá trả phí A15 được bật; lúc đó nhãn "Tài trợ" là bắt buộc trước lần hiển thị đầu tiên |
| Lưu trữ và cung cấp thông tin người bán khi người tiêu dùng yêu cầu  | Chức năng trong Admin                                                                   |
| Cho phép người tiêu dùng phản hồi, đánh giá                              | Module review (có thể để GĐ3)                                                        |

Ngoài ra, luật đặt ra **nghĩa vụ tăng cường cho nền tảng số lớn** (kiểm toán định kỳ hoạt động quảng cáo và hệ thống thuật toán, báo cáo cơ quan quản lý). REBOX ở GĐ1–2 nhiều khả năng chưa tới ngưỡng, nhưng **thiết kế sẵn khả năng giải trình thuật toán** (`01-SPEC` §8.3) để không phải làm lại sau.

### 5.3. Mô tả trung thực hàng hóa

Sàn bán **hàng đã qua sử dụng / hàng hoàn** ⇒ nghĩa vụ mô tả trung thực rất quan trọng:

- Trường `condition_notes` **bắt buộc không rỗng** khi publish
- Thang tình trạng thống nhất, có định nghĩa công khai
- Badge "MỚI 99% - ĐƠN HOÀN" trong prototype: chỉ được dùng khi đúng thực tế. **Không được đặt mặc định** cho mọi listing tạo từ luồng quét mã
- Cấm hành vi cung cấp thông tin sai lệch, gây nhầm lẫn

#### 5.3.1. 🔴 Giá tham chiếu ảo trong luồng đăng bán thủ công

Với listing tạo từ quét mã hoặc CSV, `original_price` lấy từ dữ liệu sàn - **đối chiếu được**. Với listing đăng thủ công, seller tự gõ **cả hai** con số `original_price` và `price`. REBOX không có cách nào kiểm chứng con số gốc đó.

Nếu vẫn hiển thị giá gốc gạch ngang kèm % giảm cho trường hợp này, REBOX đang xuất bản một **giá tham chiếu không có căn cứ** ra cho người tiêu dùng - hành vi cung cấp thông tin gây nhầm lẫn về giá. Khác với các vi phạm khác trong tài liệu này vốn do hành vi của seller, ở đây **trách nhiệm thuộc về REBOX** với tư cách bên xuất bản thông tin, vì chính nền tảng in ra màn hình mức giảm giá không kiểm chứng được.

Trần "giá bán tối đa 90% giá gốc" mà tài liệu gốc và `hosodangky.docx` mô tả cũng vô hiệu trong trường hợp này: seller chỉ cần khai giá gốc cao hơn thực tế để mức giảm luôn hiển thị "hợp lệ" trong khi giá bán thực chất không hề rẻ.

**Bắt buộc:** phân biệt nguồn gốc giá bằng cột `price_source` (`01-SPEC` §4.2.1) và **không hiển thị** `original_price`, `discount_pct`, hay trần 90% cho listing có `price_source = SELLER_DECLARED`. Chỉ hiển thị `price`. Thực thi ở tầng response serializer của API, không phải quy ước ở giao diện - để không phụ thuộc vào việc từng client (web, mobile, đối tác Public API) có tuân thủ đúng hay không.

#### 5.3.2. 🟡 Phân biệt: "giá tham chiếu ảo" (đã xử lý) khác với "chưa kiểm chứng độ cạnh tranh của giá" (không thể xử lý triệt để)

Hai vấn đề dễ bị gộp làm một khi đọc nhanh, nhưng cần tách bạch vì cách xử lý và mức độ rủi ro khác nhau:

| | Giá tham chiếu ảo (§5.3.1) | Chưa kiểm chứng tính cạnh tranh (mục này) |
|---|---|---|
| Câu hỏi pháp lý | REBOX có đang **công bố** một con số sai sự thật không? | REBOX có đang **đảm bảo** một điều mà mình không kiểm chứng được không? |
| Có xử lý dứt điểm được không | Có - ẩn con số không kiểm chứng được là đủ | Không - không tồn tại nguồn dữ liệu độc lập để REBOX biết "giá thị trường" của một món hàng tùy ý |
| Cách xử lý | Kỹ thuật: ẩn `original_price`/`discount_pct` ở tầng API | Sản phẩm: để cơ chế lựa chọn của người mua tự điều tiết (buyer không mua hàng định giá không hợp lý) |
| Rủi ro còn lại nếu xử lý đúng | Không còn - đã loại bỏ được thông tin sai | **Rủi ro không nằm ở việc thiếu cơ chế kiểm soát giá**, mà ở việc **hồ sơ/marketing tuyên bố một cam kết REBOX không giữ được** |

**Quyết định sản phẩm đã chốt:** REBOX không chủ động kiểm soát hay xác nhận tính cạnh tranh của giá đối với listing `SELLER_DECLARED`. Đây là lựa chọn hợp lý, tương tự cách các nền tảng rao vặt ngang hàng vận hành (Chợ Tốt, Facebook Marketplace) - không nền tảng nào giải được bài toán "biết giá thị trường thật" ở mức từng listing riêng lẻ, và cố xử lý bằng luật cứng chỉ tạo ảo giác kiểm soát chứ không tạo ra kiểm soát thật.

**Hệ quả bắt buộc kéo theo:** vì REBOX không giữ cam kết này cho toàn sàn, **mọi phát biểu tuyệt đối kiểu "REBOX luôn có giá thấp hơn thị trường"** - dù trong Quy chế sàn, tài liệu quảng bá, hay chính hồ sơ dự thi - đều là rủi ro thông tin gây nhầm lẫn, cùng bản chất với các mục đã sửa ở §5.4 (M7, "100% có lợi"...). Không cần xây thêm cơ chế kỹ thuật nào, chỉ cần **giới hạn đúng phạm vi câu chữ**: mọi tuyên bố về mức giá tốt hơn thị trường phải nêu rõ áp dụng cho nhóm `VERIFIED_*` (giá đã đối chiếu, trần 90% được ép cứng), không diễn đạt như áp dụng cho toàn bộ sản phẩm trên sàn.

### 5.4. Cam kết quảng bá phải chính xác

| Câu trong tài liệu/UI                               | Vấn đề                                          | Sửa                                                      |
| ------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------- |
| "Tự động hoàn tiền trong**10 giây**"       | GĐ1 không có auto-refund và payout còn bị A10 chặn | Bỏ claim thời gian ở GĐ1; GĐ3 chỉ công bố SLO sau legal/eval/provider gate và số liệu thật |
| "Độ chính xác AI**99.8%**"                   | Không có phương pháp đo được kiểm chứng | Bỏ khỏi giao diện production                           |
| "Hoàn trả**100%** tiền nếu khác xa mô tả" | Cần nêu rõ điều kiện                         | Giữ, nhưng link tới điều kiện đầy đủ ngay cạnh |
| "Cắt giảm**100%** chi phí nhân sự"          | Nói quá                                          | Diễn đạt lại theo hướng định lượng thực tế    |

---

## 6. Hàng hóa: cấm, hạn chế, và hàng giả

### 6.1. Danh mục phải chặn cứng

Legal Officer sở hữu danh sách này, cập nhật ít nhất mỗi quý:

| Nhóm                                                            | Ví dụ                                                                                                                                                                                             |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cấm kinh doanh                                                  | Ma túy, vũ khí, pháo, động thực vật hoang dã nguy cấp, văn hóa phẩm cấm, tiền giả                                                                                                   |
| Cấm trên nền tảng TMĐT hoặc cần điều kiện đặc biệt  | Thuốc chữa bệnh, trang thiết bị y tế, thực phẩm chức năng, rượu, thuốc lá, hóa chất                                                                                                 |
| **Hàng đã qua sử dụng thuộc diện cấm nhập khẩu** | Hàng tiêu dùng đã qua sử dụng nhập khẩu - theo danh mục tại Nghị định 69/2018/NĐ-CP. Hàng hoàn**nội địa** thì không thuộc diện này, nhưng cần cơ chế phân biệt |
| Hàng giả, hàng xâm phạm quyền SHTT                         | Nghị định 98/2020/NĐ-CP                                                                                                                                                                         |

### 6.2. Nhóm cần duyệt tay

Mỹ phẩm (hạn dùng, nguồn gốc), thực phẩm (hạn dùng, công bố), đồ chơi trẻ em (dấu hợp quy CR), thiết bị điện (an toàn), hàng hiệu giá trị cao (rủi ro hàng giả), đồ điện tử đã qua sử dụng.

### 6.3. Quy trình xử lý xâm phạm SHTT

Bắt buộc phải có ngay từ ngày đầu, vì hàng hoàn là môi trường rủi ro cao về hàng giả:

```
1. Kênh tiếp nhận công khai cho chủ thể quyền (form riêng trên web)
2. Tiếp nhận → xác minh sơ bộ → tạm ẩn listing
3. Thông báo cho người bán, cho quyền giải trình
4. Quyết định gỡ vĩnh viễn hoặc khôi phục
5. Xử lý người bán tái phạm: cảnh cáo → tạm ngưng → chấm dứt hợp đồng
6. Lưu toàn bộ hồ sơ
```

Hệ thống cần: bảng `ip_complaints`, nút gỡ khẩn cấp, bộ đếm vi phạm trên `shops`, chức năng xuất hồ sơ.

### 6.4. Nhãn hàng hóa

Hàng hóa lưu thông phải có nhãn theo Nghị định 43/2017/NĐ-CP (sửa đổi bởi Nghị định 111/2021/NĐ-CP). Với hàng hoàn còn nguyên nhãn gốc thì thường đã đáp ứng, nhưng hàng đã bóc nhãn/mất bao bì cần lưu ý - đưa vào hướng dẫn cho người bán.

---

## 7. Thuế

### 7.1. Nghĩa vụ của sàn đối với thuế của người bán

Pháp luật hiện hành đặt ra hai nhóm nghĩa vụ cho sàn TMĐT:

| Nghĩa vụ                                                                 | Nội dung                                                                                                              | Áp dụng cho REBOX                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Cung cấp thông tin người bán cho cơ quan thuế**             | Định kỳ cung cấp thông tin về người bán và doanh thu trên sàn                                              | **Áp dụng** - cần chức năng xuất báo cáo theo biểu mẫu của cơ quan thuế |
| **Khấu trừ, nộp thuế thay** hộ kinh doanh, cá nhân kinh doanh | Sàn**có chức năng thanh toán** phải khấu trừ VAT và TNCN trên từng giao dịch, kê khai và nộp thay | **Cần xác định** - xem §7.2                                                     |

### 7.2. Điểm cần làm rõ với cơ quan thuế

Nghĩa vụ khấu trừ nộp thay gắn với việc sàn **có chức năng thanh toán**. Thiết kế của REBOX cố ý để tiền hàng đi thẳng về seller, nên **về hình thức** có thể không thuộc diện này.

Nhưng REBOX vẫn: sinh mã QR thanh toán, xác nhận giao dịch, giữ ký quỹ, khấu trừ phí, và chi hoàn tiền. Cơ quan thuế có thể xem đây là có chức năng thanh toán.

**Bắt buộc:** xin ý kiến bằng văn bản của cơ quan thuế quản lý trước khi phát sinh doanh thu. Đây là loại rủi ro mà việc "cứ làm rồi tính" dẫn đến truy thu và phạt chậm nộp.

**Chuẩn bị kỹ thuật (làm sẵn dù chưa chắc phải dùng):**

- Bảng `tax_withholdings` theo từng giao dịch
- Cấu hình thuế suất theo nhóm hàng hóa và loại người bán
- Báo cáo theo kỳ, xuất được theo định dạng cơ quan thuế yêu cầu
- Thu thập mã số thuế / số định danh của người bán ngay từ bước eKYC

### 7.3. Nghĩa vụ thuế của chính REBOX

| Loại                                               | Áp dụng                                                                                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thuế GTGT trên phí hoa hồng và phí quảng bá | Theo thuế suất hiện hành cho dịch vụ                                                                                                                                                              |
| Thuế TNDN                                          | Trên lợi nhuận                                                                                                                                                                                       |
| **Hóa đơn điện tử**                     | Xuất hóa đơn cho từng khoản phí thu của người bán. Tích hợp nhà cung cấp hóa đơn điện tử (Viettel, VNPT, MISA) -**cần đưa vào backlog, chưa có trong kế hoạch gốc** |
| Thuế nhà thầu nước ngoài                      | Khi trả tiền cho dịch vụ nước ngoài (Cloudflare, Anthropic API...)                                                                                                                               |

### 7.4. Điểm dễ bỏ sót

Ví ký quỹ **không phải doanh thu** - đó là khoản nhận giữ hộ. Chỉ phần **phí đã khấu trừ** mới là doanh thu. Kế toán phải hạch toán tách bạch ngay từ đầu, nếu không sẽ bị tính thuế trên toàn bộ tiền nhận vào.

---

## 8. Khuyến mại, điểm thưởng và quảng cáo

### ~~8.1. Chương trình điểm thưởng và voucher (phần này mình quan tâm sau cũng được)~~

Các chương trình như "tích 15 điểm đổi voucher freeship 15.000đ" mang tính chất **khuyến mại** theo Luật Thương mại 2005 và Nghị định 81/2018/NĐ-CP.

| Yêu cầu                                                | Ghi chú                                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Thông báo/đăng ký** với cơ quan quản lý | Tùy hình thức và phạm vi: chương trình khách hàng thường xuyên và một số hình thức khác có yêu cầu thủ tục riêng. Legal Officer rà soát trước khi chạy |
| Công khai**thể lệ đầy đủ**                  | Trang riêng: điều kiện tích điểm, cách quy đổi, hạn sử dụng, phạm vi áp dụng, cách giải quyết khiếu nại                                                         |
| Giới hạn mức giảm giá                               | Có mức trần theo quy định, trừ các trường hợp được phép                                                                                                                |
| Thực hiện đúng thể lệ đã công bố               | Không được đơn phương thay đổi bất lợi cho người đã tích điểm                                                                                                     |
| Báo cáo kết quả                                      | Theo quy định của hình thức khuyến mại tương ứng                                                                                                                           |

**Nếu A15 được mở lại:** điểm thưởng đã tích sẽ là **nghĩa vụ đã phát sinh**. Feature phải bổ sung ledger riêng và cấu hình có `effective_from`; không xóa điểm hoặc đổi tỷ lệ hồi tố. GĐ1 chưa có bảng/config loyalty.

### 8.2. Gói quảng bá sản phẩm

Gói 20.000đ/sản phẩm/tuần đưa listing lên khu vực gợi ý là **hoạt động quảng cáo**:

- **Bắt buộc gắn nhãn phân biệt** (ví dụ "Tài trợ") - theo Luật BVQLNTD 2023 và pháp luật quảng cáo. Việc hiển thị ngẫu nhiên trong khu vực trả phí **không thay thế được nghĩa vụ gắn nhãn**
- Doanh thu từ gói này chịu thuế GTGT, phải xuất hóa đơn
- Nội dung quảng bá phải tuân thủ quy định về quảng cáo

Lưu ý pháp luật quảng cáo cũng vừa được sửa đổi (Luật sửa đổi, bổ sung một số điều của Luật Quảng cáo, hiệu lực từ 01/01/2026) - cần rà soát bản có hiệu lực.

---

## 9. Hợp đồng và quan hệ nội bộ

### 9.1. Bộ hợp đồng cần có

| Văn bản                                                   | Với ai                                     | Điểm then chốt                                                         |
| ----------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------- |
| Quy chế hoạt động sàn                                  | Công khai                                  | §1.3                                                                     |
| Điều khoản sử dụng (buyer)                             | Người mua                                 | Quy trình khiếu nại, thời hạn, không loại trừ quyền luật định |
| Hợp đồng/điều kiện giao dịch chung với người bán | Người bán                                | **Căn cứ cho ký quỹ, khấu trừ, khóa kho**                    |
| Chính sách bảo mật                                      | Công khai                                  | §3                                                                       |
| Chính sách giải quyết tranh chấp                       | Công khai                                  | §5                                                                       |
| Hợp đồng với ĐVVC                                      | GHN/GHTK                                    | **COD chi hộ thẳng về TK seller** (§2)                          |
| Hợp đồng với đơn vị thanh toán                      | PSP                                         | §2.3                                                                     |
| Hợp đồng với đơn vị eKYC                             | Nhà cung cấp                              | Có điều khoản xử lý dữ liệu cá nhân theo ủy quyền             |
| Thỏa thuận xử lý dữ liệu                              | Mọi bên thứ ba chạm dữ liệu cá nhân | Bắt buộc theo pháp luật BVDLCN                                        |

### 9.2. Điều khoản ký quỹ - soạn cẩn thận

Vì cơ chế cho phép REBOX **đơn phương trừ tiền và khóa toàn bộ gian hàng**, hợp đồng người bán phải quy định rõ:

- Bản chất pháp lý của khoản ký quỹ và quyền sở hữu
- Các trường hợp được khấu trừ, công thức tính, cách thông báo
- Điều kiện khóa/mở kho, **thời hạn thông báo trước**
- Quy trình khiếu nại khi người bán không đồng ý với khoản khấu trừ
- Điều kiện, thủ tục và thời hạn hoàn trả ký quỹ khi chấm dứt hợp tác
- Xử lý `SHOP_DEBT` khi nghĩa vụ vượt hold; số dư materialized không được âm

**Nguyên tắc:** điều khoản cho phép một bên tùy ý định đoạt tài sản của bên kia mà không có thông báo, không có cơ chế phản đối, dễ bị coi là không công bằng. Phải có: **thông báo trước + quyền giải trình + thời hạn cụ thể**.

### 9.3. 🟠 Sở hữu trí tuệ nội bộ và "góp vốn bằng công sức"

Đội hiện tại gồm **3 thành viên**: 2 ngành CNTT (toàn bộ mảng kỹ thuật) và 1 ngành Luật. Cả ba tham gia giai đoạn đầu **không nhận thù lao**, coi đó là hình thức góp vốn bằng công sức.

#### 9.3.1. ⚠️ "Góp vốn bằng công sức" không phải là một hình thức góp vốn hợp pháp

Đây là điểm hay bị hiểu nhầm nhất và cần nói thẳng.

Luật Doanh nghiệp 2020 liệt kê tài sản góp vốn gồm: **Đồng Việt Nam, ngoại tệ tự do chuyển đổi, vàng, quyền sử dụng đất, quyền sở hữu trí tuệ, công nghệ, bí quyết kỹ thuật, và tài sản khác định giá được bằng Đồng Việt Nam.**

**Công sức lao động không nằm trong danh sách này.** Không thể đăng ký "góp vốn bằng công sức" vào vốn điều lệ. Thoả thuận miệng kiểu *"cậu code, tớ cho 30% cổ phần"* **không có giá trị** khi đăng ký doanh nghiệp và cũng không tự động tạo ra quyền sở hữu nào.

Cách làm đúng — chọn một hoặc kết hợp:

| Cách | Nội dung | Ghi chú |
|---|---|---|
| **Góp tiền danh nghĩa + thoả thuận cổ đông** | Mỗi người góp một khoản tiền nhỏ đúng theo tỷ lệ đã thống nhất; phần "công sức" xử lý bằng **điều kiện trao quyền theo thời gian (vesting)** trong thoả thuận cổ đông | **Phổ biến và đơn giản nhất.** Khuyến nghị dùng cách này |
| **Góp bằng quyền sở hữu trí tuệ** | Mã nguồn, thiết kế đã tạo ra được định giá và chuyển giao chính thức cho pháp nhân | Hợp pháp, nhưng phải định giá và làm thủ tục chuyển giao — phức tạp hơn |
| Ghi nhận cổ phần đã thanh toán + thoả thuận nội bộ | Công ty ghi nhận cổ phần, quan hệ thực chất do thoả thuận nội bộ điều chỉnh | Cần luật sư soạn để tránh rủi ro |

**Lưu ý thuế:** việc nhận cổ phần để đổi lấy lao động có thể bị xem là **thu nhập chịu thuế TNCN**. Cần hỏi ý kiến tư vấn thuế khi cấu trúc, đừng để phát sinh nghĩa vụ bất ngờ về sau.

#### 9.3.2. 🔴 Rủi ro lớn nhất: mã nguồn đang thuộc về cá nhân, không thuộc về dự án

Theo pháp luật sở hữu trí tuệ, **tác giả là chủ sở hữu tác phẩm**, trừ khi tác phẩm được tạo ra theo hợp đồng lao động hoặc hợp đồng giao việc có thoả thuận khác.

Hệ quả với REBOX ở thời điểm hiện tại: **toàn bộ mã nguồn thuộc về hai bạn CNTT với tư cách cá nhân**, không thuộc về dự án. Nếu một người rời nhóm, về nguyên tắc họ vẫn giữ quyền đối với phần mình viết. Không có bản quyền phần mềm rõ ràng thì cũng không nhà đầu tư nào rót vốn.

Rủi ro này **tăng theo thời gian và theo mức độ thành công** của dự án. Ký khi cả ba còn là sinh viên chưa có gì để tranh chấp thì rẻ và nhanh; ký sau khi đã có giải thưởng, có doanh thu, có nhà đầu tư quan tâm thì mỗi chữ đều thành đàm phán.

> **Đội 3 người là thời điểm dễ xử lý nhất việc này.** Với 3 người, một buổi ngồi lại là xong. Đừng để đến lúc 6 người mới bắt đầu.

#### 9.3.3. Việc cần làm ngay

| # | Việc | Vì sao gấp |
|---|---|---|
| 1 | **Thoả thuận thành viên sáng lập** — tỷ lệ sở hữu, vesting (thường 3–4 năm, cliff 1 năm), xử lý khi có người rời nhóm, quyền quyết định | Chống tranh chấp và chống trường hợp người rời nhóm sớm vẫn giữ cổ phần lớn |
| 2 | **Chuyển giao quyền sở hữu trí tuệ cho pháp nhân** — mọi mã nguồn, thiết kế, tài liệu, thương hiệu tạo ra trong dự án | **Quan trọng nhất.** Không có văn bản này thì không gọi được vốn |
| 3 | Cam kết chuyển giao SHTT cho **mọi người tham gia sau** — cộng tác viên, freelancer, người thuê ngoài | Áp dụng ngay từ người đầu tiên, không chờ |
| 4 | Tra cứu nhãn hiệu "REBOX" tại Cục Sở hữu trí tuệ xem đã có ai đăng ký chưa | Làm trước khi đầu tư vào thương hiệu |
| 5 | Nộp đơn **đăng ký nhãn hiệu "REBOX"** | Thủ tục kéo dài, nộp càng sớm càng tốt |
| 6 | Cân nhắc đăng ký bản quyền chương trình máy tính | Tạo chứng cứ về thời điểm và quyền tác giả |

Mục 1 và 2 nằm trong chuyên môn của thành viên ngành Luật, và là việc **có thể làm ngay tuần này** mà không cần chờ thành lập pháp nhân — ký thoả thuận giữa ba cá nhân trước, chuyển giao cho pháp nhân khi công ty ra đời.

---

## 10. Checklist trước khi mở cho người dùng thật

Không mở cho người dùng ngoài khi còn ô chưa tích.

### Bắt buộc (chặn ra mắt)

- [ ] Pháp nhân đã thành lập, ngành nghề phù hợp
- [ ] Nghĩa vụ/hồ sơ nền tảng TMĐT theo Luật 122/2025 đã được Legal hoàn tất cho web; app GĐ3 có gate riêng
- [ ] **Đã chốt phương án dòng tiền hợp pháp và có ý kiến luật sư bằng văn bản** (§2)
- [ ] Quy chế hoạt động sàn đã công khai, có ngày hiệu lực
- [ ] Điều khoản sử dụng + Chính sách bảo mật + Chính sách giải quyết tranh chấp đã công khai
- [ ] **Đã bỏ điều khoản "mất quyền khiếu nại"** khỏi cả UI và văn bản (§5.1)
- [ ] Hợp đồng người bán có căn cứ đầy đủ cho ký quỹ và khóa kho (§9.2)
- [ ] Hồ sơ đánh giá tác động xử lý/chuyển dữ liệu theo khung 2026 đã được Legal hoàn tất
- [ ] Căn cứ xử lý, notice và consent theo từng mục đích đã được Legal duyệt; `processing_records`/`processing_purpose_events` lưu đủ timeline chứng minh
- [ ] Supabase Singapore đã qua DPA/subprocessor/data-transfer review và có production go/no-go bằng văn bản
- [ ] Provider evidence WORM đã được chốt; retention/Object Lock/deletion/legal hold đã được kiểm thử
- [ ] **ID công khai không phải mã vận đơn** (§3.6)
- [ ] eKYC người bán bắt buộc trước khi được đăng bán
- [ ] Danh mục hàng cấm/hạn chế đã cấu hình và chặn được
- [ ] Kênh tiếp nhận khiếu nại SHTT đã hoạt động
- [ ] **AI không có nhánh tự động từ chối**; có quyền kháng nghị (§3.5)
- [ ] Đã bỏ các cam kết không chính xác ("10 giây", "99.8%") (§5.4)

### Trước khi phát sinh doanh thu

- [ ] Đã xin ý kiến cơ quan thuế về nghĩa vụ khấu trừ nộp thay (§7.2)
- [ ] Đã tích hợp hóa đơn điện tử
- [ ] Kế toán hạch toán tách bạch ký quỹ và doanh thu (§7.4)
- [ ] Nếu bật loyalty/voucher: đã thông báo/đăng ký chương trình khuyến mại nếu thuộc diện (§8.1)
- [ ] Nếu bật quảng bá trả phí: nhãn "Tài trợ" hoạt động trước lần hiển thị đầu tiên (§8.2)

### Trong 3 tháng đầu vận hành

- [ ] Hồ sơ đề xuất cấp độ an toàn hệ thống thông tin đã được phê duyệt (§4)
- [ ] Quy trình nội bộ phòng chống rửa tiền và người phụ trách (§2.5)
- [ ] Quy trình xử lý sự cố rò rỉ dữ liệu, có diễn tập
- [ ] Thỏa thuận sáng lập và chuyển giao quyền SHTT đã ký đủ 3 thành viên sáng lập và mọi cộng tác viên (§9.3)
- [ ] Đã nộp đơn đăng ký nhãn hiệu
- [ ] Job xóa dữ liệu đã kiểm chứng cả `retention_until`, đúng object version, Object Lock và legal hold; watchdog không để lock hết khi vụ còn mở

---

## 11. Ba việc pháp lý cần làm trong tuần này

| # | Việc                                                                                                       | Vì sao gấp                                                                                                                                           |
| - | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 | **Đặt lịch tư vấn với luật sư chuyên về fintech/TMĐT, mang theo §2 của tài liệu này** | Nếu mô hình ví ký quỹ phải thay đổi, nó thay đổi cả kiến trúc và cả mô hình kinh doanh. Biết sớm rẻ hơn biết muộn rất nhiều |
| 2 | **Khởi động thành lập pháp nhân**                                                              | Chặn hồ sơ đăng ký sàn, mà hồ sơ đăng ký sàn là đường găng dài nhất                                                               |
| 3 | **Ký thỏa thuận sáng lập + chuyển giao quyền SHTT giữa 3 thành viên**                       | Càng nhiều công sức bỏ ra mà chưa có văn bản, càng khó thỏa thuận sau này                                                               |

---

## 12. Nguồn chính thức đã kiểm tra ngày 25/08/2026

- [Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15](https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroup=) — hiệu lực 01/01/2026.
- [Nghị định 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?classid=1&docid=216387&orggroupid=2&pageid=27160) — hiệu lực 01/01/2026; Nghị định 13/2023/NĐ-CP hết hiệu lực.
- [Nghị định 330/2026/NĐ-CP](https://vanban.chinhphu.vn/?classid=1&docid=219266&pageid=27160) — ban hành và hiệu lực 19/08/2026; Điều 43 có chế tài liên quan đồng ý theo từng mục đích và khả năng chứng minh/ghi nhật ký sự đồng ý.
- [Luật Thương mại điện tử 122/2025/QH15](https://vanban.chinhphu.vn/?docid=216503&pageid=27160) — hiệu lực 01/07/2026.
- [Luật An ninh mạng 116/2025/QH15](https://vanban.chinhphu.vn/?docid=216499&pageid=27160) — hiệu lực 01/07/2026.
- [Luật Phòng, chống rửa tiền 14/2022/QH15](https://vanban.chinhphu.vn/?classid=1&docid=207710&orggroupid=1&pageid=27160) — dùng để Legal xác định đúng đối tượng báo cáo và phân công nghĩa vụ với PSP/ngân hàng.

Các nguồn trên chỉ xác nhận văn bản và ngày hiệu lực. Mapping nghĩa vụ cụ thể của REBOX vẫn cần luật sư chịu trách nhiệm rà soát.
