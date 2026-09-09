import type { CatalogProduct } from "@/catalog/products";

export type DashboardStep = {
  label: string;
  description: string;
  complete: boolean;
};

export type DashboardSummary = {
  totalProducts: number;
  publishedProducts: number;
  unavailableProducts: number;
  completedSteps: number;
  steps: DashboardStep[];
  nextAction: "create-product" | "add-image" | "publish-product" | "review-store";
};

export function summarizeDashboard(
  products: Pick<
    CatalogProduct,
    "imageUrl" | "published" | "available" | "stock"
  >[],
): DashboardSummary {
  const totalProducts = products.length;
  const publishedProducts = products.filter((product) => product.published).length;
  const unavailableProducts = products.filter(
    (product) => !product.available || product.stock === 0,
  ).length;
  const hasImage = products.some((product) => Boolean(product.imageUrl));

  const steps: DashboardStep[] = [
    {
      label: "Loja criada",
      description: "Seu espaço de trabalho já está protegido e separado.",
      complete: true,
    },
    {
      label: "Cadastre o primeiro produto",
      description: "Comece por um item que você já vende hoje.",
      complete: totalProducts > 0,
    },
    {
      label: "Adicione uma foto",
      description: "Uma boa imagem ajuda a cliente a entender o produto.",
      complete: hasImage,
    },
    {
      label: "Publique um produto",
      description: "Escolha o que já pode aparecer na sua vitrine.",
      complete: publishedProducts > 0,
    },
  ];

  return {
    totalProducts,
    publishedProducts,
    unavailableProducts,
    completedSteps: steps.filter((step) => step.complete).length,
    steps,
    nextAction:
      totalProducts === 0
        ? "create-product"
        : !hasImage
          ? "add-image"
          : publishedProducts === 0
            ? "publish-product"
            : "review-store",
  };
}
