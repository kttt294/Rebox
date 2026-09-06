import { Suspense } from "react";
import { SellerShell } from "../../../../features/seller-shell";
import { AddProductWorkbench } from "../../../../features/seller-workbench/add-product-workbench";

export default function AddProductPage() {
  return (
    <SellerShell>
      <Suspense>
        <AddProductWorkbench />
      </Suspense>
    </SellerShell>
  );
}

