# REBOX Marketplace

REBOX bán lại nguyên kiện hàng hoàn giữa doanh nghiệp và người tiêu dùng. Kiện không được mở để kiểm đếm hay kiểm định trước khi đăng bán.

## Language

**Kiện hoàn (`ReturnPackage`)**:
Một kiện hàng hoàn vật lý còn nguyên trạng bên ngoài; đây là đơn vị tồn kho và đơn vị được bán trên REBOX.
_Avoid_: món hàng, unit, SKU tồn kho

**Dòng khai báo (`ReturnLine`)**:
Một dòng sản phẩm mà nguồn Shopee/TikTok khai báo thuộc kiện hoàn. Dòng này mô tả nội dung dự kiến, không chứng minh vật bên trong thực tế.
_Avoid_: món thực nhận, hàng đã kiểm định

**Bản kê nguồn (`ReturnManifest`)**:
Thông tin package và các dòng khai báo đã được chuẩn hóa từ CSV hoặc API sàn.
_Avoid_: kết quả kiểm đếm, kết quả kiểm định

**Nguồn bản kê (`ManifestSource`)**:
Kênh seller chủ động dùng để nhập bản kê: `SPREADSHEET` (CSV/XLSX) hoặc `PLATFORM_API` (Shopee/TikTok). Hai kênh ngang hàng và cùng tạo `ReturnManifestDraft`; không kênh nào là fallback của kênh kia.
_Avoid_: ingest method `SCAN`

**Listing kiện**:
Card công khai bán đúng một kiện hoàn; số lượng khả dụng chỉ có thể là 1 hoặc 0.
_Avoid_: listing SKU, listing từng dòng, listing nhiều unit

**Chưa mở kiểm tra (`UNOPENED_UNINSPECTED`)**:
Công bố rằng REBOX và seller không mở kiện, không xác nhận nội dung hoặc tình trạng sản phẩm bên trong.
_Avoid_: mới 99%, như mới, đã kiểm định

**Tình trạng vỏ kiện (`SealStatus`)**:
Quan sát bên ngoài của seal/bao bì: `INTACT`, `DAMAGED` hoặc `UNKNOWN`; không phải tình trạng sản phẩm bên trong.
_Avoid_: condition grade của sản phẩm
