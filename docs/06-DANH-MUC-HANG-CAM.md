# REBOX — Danh mục hàng hóa cấm và hạn chế

> **Miễn trừ:** đây là bản rà soát do người thiết kế hệ thống lập ra để đưa vào sản phẩm dưới dạng bộ lọc kiểm duyệt. **Không phải ý kiến tư vấn pháp luật.** Thành viên phụ trách Pháp lý phải rà soát và ký duyệt trước khi đưa vào vận hành, và kiểm tra lại hiệu lực văn bản tại thời điểm triển khai.
>
> Đây là **tài liệu sống**. Rà soát định kỳ hằng quý và mỗi khi có văn bản pháp luật mới. Kiến trúc kiểm duyệt tuân theo [`07-ARCHITECTURE-DECISIONS.md`](07-ARCHITECTURE-DECISIONS.md); nội dung danh mục chỉ có hiệu lực production sau khi Legal ký duyệt phiên bản.

Mốc kiểm tra tài liệu là 25/08/2026. Luật Thương mại điện tử 122/2025/QH15 đã có hiệu lực từ 01/07/2026; Legal phải remap các nghĩa vụ từng dựa trên Nghị định 52/2013/85/2021 sang khung hiện hành. Về sản phẩm, REBOX vẫn giữ policy an toàn: có **cơ chế kiểm tra, giám sát**, chặn danh mục không được phép và gỡ khi có quyết định hợp lệ.

---

## 1. Ba mức kiểm soát

| Mức | Ý nghĩa | Hành vi hệ thống |
|---|---|---|
| `BANNED` | Cấm tuyệt đối trên REBOX | **Chặn cứng** khi đăng bán. Không có đường ngoại lệ. Gắn cờ tài khoản nếu cố tình lặp lại |
| `MANUAL_REVIEW` | Cần điều kiện kinh doanh hoặc giấy tờ | Vào hàng đợi **admin duyệt tay**, yêu cầu nộp ảnh tem/nhãn/giấy tờ trước khi hiển thị |
| `DISCLOSURE` | Được bán nhưng phải mô tả rõ | Bắt buộc điền `condition_notes` chi tiết + chọn `condition_grade` |

Bảng `restricted_categories` trong DB (`01-SPEC` §4.2, `02-FLOWS` §2.4) lưu danh mục này kèm `keywords[]`, `effective_from`, và người phê duyệt.

---

## 2. `BANNED` — Chặn cứng

### 2.1. Nhóm cấm kinh doanh tuyệt đối

Căn cứ: Luật Đầu tư 2020 (ngành nghề cấm đầu tư kinh doanh), Bộ luật Hình sự 2015, Nghị định 98/2020/NĐ-CP.

| Nhóm | Ví dụ từ khóa nhận diện |
|---|---|
| Ma túy và tiền chất | cần sa, ketamine, "cỏ Mỹ", bóng cười, "nước vui", tem giấy |
| Hóa chất, khoáng vật cấm | theo danh mục Công ước quốc tế |
| Mẫu vật động thực vật hoang dã nguy cấp | ngà voi, sừng tê giác, vảy tê tê, hổ, gấu, mật gấu, cao hổ |
| Mô, bộ phận cơ thể người, dịch vụ liên quan | máu, nội tạng, tinh trùng, noãn |
| Mại dâm, mua bán người | |
| Pháo nổ, vật liệu nổ | pháo hoa nổ, thuốc pháo, kíp nổ |
| Vũ khí, công cụ hỗ trợ, quân trang | súng, đạn, dao găm, kiếm, roi điện, bình xịt hơi cay, còng số 8, quân phục |
| Văn hóa phẩm đồi trụy, phản động | |

### 2.2. Nhóm cấm bán trực tuyến hoặc cấm theo văn bản chuyên ngành

| Nhóm | Căn cứ và lý do |
|---|---|
| **Thuốc chữa bệnh** | Luật Dược — kinh doanh dược phải có Giấy chứng nhận đủ điều kiện; thuốc kê đơn không được bán lẻ trực tuyến. **REBOX cấm toàn bộ nhóm thuốc**, kể cả thuốc không kê đơn, vì mô hình hàng hoàn không kiểm soát được nguồn gốc và bảo quản |
| **Thuốc lá điện tử, thuốc lá nung nóng** | Quốc hội đã có nghị quyết cấm sản xuất, kinh doanh, nhập khẩu, vận chuyển, sử dụng từ 2025. Cấm tuyệt đối |
| Thuốc lá điếu, xì gà | Kinh doanh có điều kiện, có giấy phép riêng; cấm quảng cáo. Không phù hợp mô hình |
| **Hàng giả, hàng xâm phạm quyền sở hữu trí tuệ** | Luật Sở hữu trí tuệ, Nghị định 98/2020. Xem §5 về quy trình xử lý |
| Hàng nhập lậu, hàng không rõ nguồn gốc xuất xứ | Nghị định 98/2020 |
| **Hàng tiêu dùng đã qua sử dụng có nguồn gốc nhập khẩu** | Nghị định 69/2018/NĐ-CP — hàng tiêu dùng đã qua sử dụng thuộc danh mục **cấm nhập khẩu**. Xem cảnh báo ở §6.2 |
| Ngoại tệ, vàng miếng, tiền mã hóa | Pháp luật về quản lý ngoại hối; tiền mã hóa chưa được công nhận là phương tiện thanh toán |
| **Tài khoản ngân hàng, SIM đã kích hoạt, giấy tờ tùy thân** | Mua bán tài khoản thanh toán bị nghiêm cấm. Đây cũng là công cụ rửa tiền — bắt buộc chặn |
| Phần mềm, thiết bị gián điệp, thiết bị phá sóng | camera ngụy trang, định vị lén, thiết bị nghe lén |
| Sách, đĩa, phần mềm sao chép lậu | Luật Sở hữu trí tuệ |
| Động vật sống | Không phù hợp mô hình logistics và điều kiện vận chuyển |
| Chất phóng xạ, chất thải nguy hại | |

### 2.3. Nhóm REBOX chủ động cấm vì đặc thù mô hình

Không phải vì pháp luật cấm, mà vì mô hình hàng hoàn không kiểm soát được rủi ro:

| Nhóm | Lý do |
|---|---|
| Thực phẩm tươi sống, đông lạnh | Không có chuỗi lạnh; hàng hoàn đã qua vận chuyển nhiều lần |
| Đồ lót, đồ bơi **đã qua sử dụng** | Vệ sinh và tranh chấp. Hàng còn nguyên tem, nguyên seal thì cho phép |
| Chất lỏng dễ cháy, bình gas, hóa chất tẩy rửa công nghiệp | Quy định vận chuyển hàng nguy hiểm của ĐVVC |
| Pin, thiết bị chứa pin lithium rời | Hạn chế vận chuyển hàng không; ĐVVC thường từ chối |
| Sản phẩm đã quá hạn sử dụng | Bất kể danh mục nào |

---

## 3. `MANUAL_REVIEW` — Bắt buộc admin duyệt

Nhóm này **được phép bán** nhưng gắn với điều kiện kinh doanh, yêu cầu công bố sản phẩm, hoặc rủi ro hàng giả cao.

| Nhóm | Yêu cầu bổ sung khi đăng bán |
|---|---|
| **Mỹ phẩm** | Ảnh rõ số tiếp nhận Phiếu công bố sản phẩm mỹ phẩm và hạn sử dụng trên bao bì. Từ chối nếu mờ, bong tróc, hoặc hết hạn |
| **Thực phẩm chức năng, thực phẩm bảo vệ sức khỏe** | Ảnh Giấy tiếp nhận đăng ký bản công bố + hạn dùng. Rủi ro hàng giả rất cao ở nhóm này |
| Thực phẩm bao gói sẵn | Hạn dùng còn tối thiểu 1/3 vòng đời; ảnh nhãn đầy đủ |
| **Sữa và sản phẩm dinh dưỡng cho trẻ dưới 24 tháng** | Có quy định hạn chế quảng cáo riêng. Cần Pháp lý xác nhận có cho bán hay không |
| **Trang thiết bị y tế** | Phân loại A/B/C/D; loại C, D yêu cầu điều kiện chặt. Mặc định chỉ cho phép loại A |
| **Đồ chơi trẻ em** | Bắt buộc có dấu hợp quy CR. Ảnh rõ dấu CR trên sản phẩm hoặc bao bì |
| **Thiết bị điện, điện tử gia dụng** | Nhóm phải chứng nhận hợp quy: ảnh dấu CR |
| **Mũ bảo hiểm cho người đi mô tô, xe máy** | Bắt buộc dấu CR |
| **Hàng hiệu, thương hiệu cao cấp** | Giá trị cao + rủi ro hàng giả. Yêu cầu ảnh chi tiết tem, mã, hộp, phiếu bảo hành |
| Rượu, đồ uống có cồn | Kinh doanh rượu là ngành có điều kiện, bán trực tuyến bị hạn chế. Mặc định **để ở BANNED** cho tới khi Pháp lý xác nhận |
| Sản phẩm giá trị trên 2.000.000đ | Không phải nhóm pháp lý, nhưng cần duyệt tay vì rủi ro tài chính và ký quỹ |
| Vàng trang sức, đá quý | Điều kiện kinh doanh riêng |
| Sách, ấn phẩm | Kiểm tra sách lậu |

**Quy tắc vận hành:** hàng đợi duyệt tay có SLA 24 giờ. Quá hạn thì tự động escalate, **không** tự động duyệt.

---

## 4. `DISCLOSURE` — Được bán, bắt buộc mô tả trung thực

Đây là nhóm cốt lõi của REBOX. Nghĩa vụ pháp lý nền tảng: **cung cấp thông tin chính xác, đầy đủ về hàng hóa** theo Luật Bảo vệ quyền lợi người tiêu dùng 2023 (xem `05-PHAP-LY` §5.3).

| Nhóm | Bắt buộc khai báo |
|---|---|
| Đồ điện tử đã qua sử dụng | Tình trạng hoạt động, còn bảo hành hay không, phụ kiện kèm theo, lỗi ngoại hình |
| Quần áo, giày dép đã thử | Đã bóc tem chưa, có vết bẩn/xước không |
| Hàng thiếu phụ kiện, thiếu hộp | Liệt kê chính xác thứ còn thiếu |
| Hàng lỗi ngoại hình | Ảnh cận cảnh **đúng vị trí lỗi** |
| Hàng cận hạn sử dụng | Ghi rõ ngày hết hạn |

### 4.1. Thang tình trạng thống nhất

Bắt buộc chọn một, không cho nhập tự do:

| Mã | Nhãn hiển thị | Điều kiện |
|---|---|---|
| `NEW_SEALED` | Mới, nguyên seal | Chưa bóc, còn nguyên niêm phong nhà sản xuất |
| `LIKE_NEW_99` | Như mới 99% | Đã bóc hộp, chưa sử dụng, không lỗi ngoại hình |
| `GOOD` | Tốt | Đã sử dụng nhẹ, hoạt động bình thường, lỗi ngoại hình nhỏ |
| `FAIR` | Khá | Lỗi ngoại hình rõ, vẫn dùng tốt |
| `DEFECT` | Có lỗi | Lỗi chức năng — **bắt buộc mô tả cụ thể lỗi gì** |

> ⚠️ **Ràng buộc sản phẩm quan trọng:** chỉ hàng bom, tức hàng bị từ chối nhận và chưa từng mở, mới được chọn `NEW_SEALED` và đăng từ dữ liệu quét mà không cần ảnh thật. Mọi trường hợp còn lại **bắt buộc có ảnh chụp thực tế**. Dùng ảnh studio của hàng mới để bán hàng khách đã trả là mô tả sai sự thật. Xem `05-PHAP-LY` §5.3 và `01-TECHNICAL-SPEC` §4.2.1.

---

## 5. Quy trình xử lý xâm phạm sở hữu trí tuệ

Đây là quy trình bắt buộc theo policy REBOX và nghĩa vụ SHTT; Legal phải remap căn cứ nền tảng TMĐT sang Luật 122/2025 và văn bản thi hành hiện hành trước production, không tiếp tục viện dẫn Nghị định 85/2021 như baseline hiện hành.

```
1. Kênh tiếp nhận công khai:  ip-report@rebox.vn  + biểu mẫu trên web
2. Chủ thể quyền nộp: giấy chứng nhận đăng ký nhãn hiệu + danh sách listing vi phạm
3. REBOX gỡ listing trong 24 giờ kể từ khi nhận thông báo hợp lệ
4. Thông báo cho seller, cho quyền phản hồi trong 5 ngày làm việc
5. Seller phản hồi có căn cứ  → khôi phục, thông báo lại chủ thể quyền
   Seller không phản hồi      → gỡ vĩnh viễn
6. Ba lần vi phạm có căn cứ  → khóa gian hàng
```

Mọi bước ghi `audit_logs`. Policy đề xuất là giữ hồ sơ cần thiết 3 năm từ `ip_case.closed_at`, nhưng Legal phải duyệt data class, start event và action delete/anonymize cụ thể. Vụ đang khiếu kiện/yêu cầu cơ quan nhà nước dùng legal hold có lý do/audit; không giữ vô hạn theo mặc định.

---

## 6. Hai rủi ro đặc thù của REBOX

### 6.1. Hàng hoàn không đồng nghĩa với hàng hợp pháp

Hàng đã từng bán trên Shopee/TikTok **không phải là bằng chứng hàng hợp pháp**. Sàn khác cũng lọt hàng giả. REBOX không được dùng lập luận *"hàng này từ Shopee về nên chắc hợp lệ"* để miễn kiểm duyệt — nếu bán hàng giả thì REBOX chịu trách nhiệm của chính mình.

### 6.2. 🔴 Người bán xuyên biên giới và hàng đã qua sử dụng nhập khẩu

Hồ sơ dự thi xác định một phân khúc mục tiêu là **người bán xuyên biên giới từ Trung Quốc**. Nhóm này làm tăng đáng kể hai rủi ro:

- **Hàng giả, hàng xâm phạm nhãn hiệu** — tỷ lệ cao hơn mặt bằng
- **Hàng tiêu dùng đã qua sử dụng nhập khẩu** — thuộc danh mục **cấm nhập khẩu** theo Nghị định 69/2018/NĐ-CP

Hàng hoàn **phát sinh trong nước** từ đơn đã giao cho người tiêu dùng Việt Nam thì không thuộc diện này. Nhưng hàng đã qua sử dụng **nhập từ nước ngoài về để bán** thì có.

**Khuyến nghị:** yêu cầu người bán cam kết hàng hóa phát sinh từ đơn hàng trong nước, và cân nhắc kỹ lại việc đặt nhóm người bán xuyên biên giới làm phân khúc ưu tiên. Đây là quyết định kinh doanh, nhưng cần ra quyết định khi đã biết rủi ro.

---

## 7. Hiện thực trong sản phẩm

| Lớp | Cơ chế |
|---|---|
| **Chặn tại nguồn** | Danh mục `BANNED` không xuất hiện trong danh sách chọn khi đăng bán |
| **Lọc từ khóa** | Đối chiếu `title` + `description` với `keywords[]`; có xử lý dấu tiếng Việt và biến thể lách từ (`th.uốc`, `thuoc`) |
| **Rule + duyệt tay ở GĐ1** | `listing.moderate` dùng category/keyword/contact/metadata rule xác định; trường hợp nhạy cảm hoặc không chắc chắn vào hàng đợi admin. Classifier chỉ được thêm ở GĐ3 sau eval/legal gate |
| **Đối chiếu ảnh GĐ1** | Exact hash/phash + metadata rule để gắn cờ ảnh trùng; suy luận ảnh chụp màn hình bằng model chỉ thuộc GĐ3 |
| **Hậu kiểm** | Quét định kỳ toàn bộ listing `ACTIVE` khi danh mục cấm được cập nhật |
| **Kênh báo cáo** | Nút "Báo cáo sản phẩm" trên mọi trang chi tiết, cho cả người mua và bên thứ ba |
| **Chế tài** | Vi phạm lần 1 gỡ bài + cảnh báo; lần 2 hạn chế đăng bán 7 ngày; lần 3 khóa gian hàng. Chỉ khóa đúng số tiền cho nghĩa vụ đã document, có thời hạn/review; phần dư hoàn qua flow A10, không tịch thu toàn bộ cọc như hình phạt |

Toàn bộ chế tài phải được **ghi trong Quy chế hoạt động sàn và Hợp đồng người bán** trước khi áp dụng. Không có căn cứ văn bản thì việc khóa gian hàng và giữ ký quỹ là hành vi không có cơ sở — xem `05-PHAP-LY` §1.3.

---

## 8. Việc cần Pháp lý quyết

| # | Câu hỏi | Ảnh hưởng |
|---|---|---|
| 1 | Rượu: `BANNED` hay `MANUAL_REVIEW`? | Mặc định đang để `BANNED` |
| 2 | Sữa cho trẻ dưới 24 tháng: có cho bán không? | Vướng quy định hạn chế quảng cáo |
| 3 | Trang thiết bị y tế: chỉ loại A, hay mở tới loại B? | |
| 4 | Có yêu cầu seller cam kết hàng phát sinh từ đơn trong nước không? | Liên quan §6.2 |
| 5 | Ngưỡng giá trị bắt buộc duyệt tay: 2.000.000đ có hợp lý? | Ảnh hưởng tải công việc vận hành |
