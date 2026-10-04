import type { SpecimenCatalogue } from "./catalogue";

export const SPECIMEN_VIEWS = ["home", "product", "cart"] as const;
export type SpecimenView = (typeof SPECIMEN_VIEWS)[number];

export const SPECIMEN_VIEW_LABELS: Record<SpecimenView, string> = {
  home: "Homepage",
  product: "Product page",
  cart: "Cart",
};

export interface SpecimenViewProps {
  catalogue: SpecimenCatalogue;
}
