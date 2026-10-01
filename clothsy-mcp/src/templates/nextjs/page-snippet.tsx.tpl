// In the existing product page (server or client component), e.g. app/products/[id]/page.tsx:
import { ProductTryOn } from "@/components/ProductTryOn"; // adjust the path if the project has no "@/" alias

// ...inside the JSX, next to the add-to-cart button:
<ProductTryOn productId={product.id} />
