export type StoreProduct = {
  id: string;
  title: string;
  price: number;
  sold: string;
  visualLabel: string;
  gradient: string;
  sponsored?: boolean;
};

export type CartGroup = {
  id: string;
  shopName: string;
  product: StoreProduct & { variant: string };
};

const gradients = [
  "linear-gradient(137deg, #4f8ad1 14%, #a8c9f0 86%)",
  "linear-gradient(137deg, #4278b2 14%, #94bae5 86%)",
  "linear-gradient(137deg, #5c91bf 14%, #b8d1e8 86%)",
  "linear-gradient(137deg, #4796b8 14%, #a8d1de 86%)",
  "linear-gradient(137deg, #4f7dc2 14%, #adc9ed 86%)",
  "linear-gradient(137deg, #4070ad 14%, #9ebfe0 86%)"
] as const;

export const storefrontProducts: StoreProduct[] = [
  { id: "tech", title: "Tai nghe Bluetooth chống ồn cao cấp", price: 299000, sold: "1,2k đã bán", visualLabel: "TECH", gradient: gradients[0], sponsored: true },
  { id: "watch", title: "Đồng hồ thông minh pin bền 7 ngày", price: 479000, sold: "860 đã bán", visualLabel: "WATCH", gradient: gradients[1], sponsored: true },
  { id: "style", title: "Khăn choàng dệt kim mềm ấm cao cấp", price: 89000, sold: "2k+ đã bán", visualLabel: "STYLE", gradient: gradients[2], sponsored: true },
  { id: "beauty", title: "Máy sấy tóc hai chiều công suất lớn", price: 329000, sold: "730 đã bán", visualLabel: "BEAUTY", gradient: gradients[3], sponsored: true },
  { id: "fashion", title: "Áo khoác nỉ basic form rộng unisex", price: 219000, sold: "1,5k đã bán", visualLabel: "FASHION", gradient: gradients[4], sponsored: true },
  { id: "home", title: "Chăn lông cừu mềm mịn giữ nhiệt", price: 389000, sold: "920 đã bán", visualLabel: "HOME", gradient: gradients[5], sponsored: true },
  { id: "care", title: "Combo sữa tắm dưỡng ẩm hương dịu nhẹ", price: 159000, sold: "3k+ đã bán", visualLabel: "CARE", gradient: gradients[0] },
  { id: "clean", title: "Máy hút bụi cầm tay lực hút mạnh", price: 549000, sold: "640 đã bán", visualLabel: "CLEAN", gradient: gradients[1] },
  { id: "shoes", title: "Dép quai ngang đế cao chống trượt", price: 119000, sold: "1,8k đã bán", visualLabel: "SHOES", gradient: gradients[2] },
  { id: "fan", title: "Quạt mini cầm tay pin trâu tiện lợi", price: 139000, sold: "2,4k đã bán", visualLabel: "FAN", gradient: gradients[3] },
  { id: "skin", title: "Nước tẩy trang dịu nhẹ cho da nhạy cảm", price: 189000, sold: "970 đã bán", visualLabel: "SKIN", gradient: gradients[4] },
  { id: "basic", title: "Áo thun cotton cổ tròn form thoải mái", price: 149000, sold: "1,1k đã bán", visualLabel: "BASIC", gradient: gradients[5] }
];

export const shopProducts: StoreProduct[] = [
  storefrontProducts[0]!,
  storefrontProducts[1]!,
  storefrontProducts[7]!,
  storefrontProducts[5]!,
  storefrontProducts[9]!,
  storefrontProducts[10]!,
  storefrontProducts[11]!,
  { id: "case", title: "Ốp lưng chống sốc trong suốt cao cấp", price: 99000, sold: "2,2k đã bán", visualLabel: "CASE", gradient: gradients[0] },
  { id: "light", title: "Đèn bàn LED chống cận 3 chế độ sáng", price: 259000, sold: "870 đã bán", visualLabel: "LIGHT", gradient: gradients[3] },
  { id: "bag", title: "Túi tote canvas tối giản nhiều ngăn", price: 119000, sold: "1,4k đã bán", visualLabel: "BAG", gradient: gradients[2] },
  storefrontProducts[6]!,
  { id: "power", title: "Sạc nhanh GaN 65W nhỏ gọn", price: 429000, sold: "1,9k đã bán", visualLabel: "POWER", gradient: gradients[4] },
  storefrontProducts[8]!,
  { id: "desk", title: "Kệ bàn làm việc tối giản đa năng", price: 219000, sold: "760 đã bán", visualLabel: "DESK", gradient: gradients[3] },
  { id: "cable", title: "Cáp sạc bọc dù 100W siêu bền", price: 89000, sold: "4,2k đã bán", visualLabel: "CABLE", gradient: gradients[0] }
];

export function findStoreProduct(id: string): StoreProduct | undefined {
  return [...storefrontProducts, ...shopProducts].find((product) => product.id === id);
}

export const cartGroups: CartGroup[] = [
  {
    id: "official-tech",
    shopName: "REBOX Official Store",
    product: {
      ...storefrontProducts[0]!,
      title: "Tai nghe Bluetooth chống ồn cao cấp - Fullbox 99%",
      variant: "Đen / Like New"
    }
  },
  {
    id: "partner-home",
    shopName: "REBOX Partner - Gadget Hub",
    product: {
      ...storefrontProducts[7]!,
      title: "Máy hút bụi cầm tay lực hút mạnh - hàng đổi trả",
      visualLabel: "HOME",
      gradient: gradients[4],
      variant: "Xanh Navy / 98%"
    }
  }
];

export function formatPrice(price: number): string {
  return `${price.toLocaleString("vi-VN")}đ`;
}
