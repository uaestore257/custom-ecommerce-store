import { formatMinorUnits } from "@/lib/money";
import type { PlateKind } from "./FurniturePlate";

// ---------------------------------------------------------------
// The sample catalogue every specimen shows: the seeded furniture demo
// store (lib/demo-data.ts, "Nest & Oak Home"), so a specimen and the live
// demo tell the same story. The same catalogue renders in every template —
// one store's data, different presentation, which is the platform's point.
//
// The Arabic edition is store CONTENT in Arabic (a store whose default
// language is Arabic renders dir="rtl"). Template interface labels stay
// English because that is what the templates ship today
// (manifest.capabilities.uiLocales); the specimens don't pretend otherwise.
// Prices go through the platform's own money formatter (exact minor units).
// ---------------------------------------------------------------

export interface SpecimenProduct {
  name: string;
  category: string;
  price: string;
  plate: PlateKind;
}

export interface SpecimenCatalogue {
  locale: string;
  storeName: string;
  monogram: string;
  tagline: string;
  heroTitle: string;
  heroText: string;
  categories: readonly { name: string; count: number; plate: PlateKind }[];
  products: readonly SpecimenProduct[];
  description: string;
  subtotal: string;
  /** Per-item delivery charge, and the free-delivery threshold (the demo store's settings). */
  delivery: string;
  freeOver: string;
}

const aed = (fils: number, locale: string) => formatMinorUnits(BigInt(fils), "AED", 2, locale);

function catalogue(
  locale: string,
  text: Omit<SpecimenCatalogue, "locale" | "categories" | "products" | "subtotal" | "delivery" | "freeOver"> & {
    categories: readonly [string, string, string, string];
    products: readonly [string, string, string, string, string, string];
  },
): SpecimenCatalogue {
  const [living, bedroom, storage, office] = text.categories;
  const [sofa, table, bed, wardrobe, desk, shelf] = text.products;
  return {
    ...text,
    locale,
    categories: [
      { name: living, count: 2, plate: "sofa" },
      { name: bedroom, count: 2, plate: "bed" },
      { name: storage, count: 3, plate: "shelf" },
      { name: office, count: 1, plate: "desk" },
    ],
    products: [
      { name: sofa, category: living, price: aed(249900, locale), plate: "sofa" },
      { name: table, category: living, price: aed(69900, locale), plate: "table" },
      { name: bed, category: bedroom, price: aed(189900, locale), plate: "bed" },
      { name: wardrobe, category: bedroom, price: aed(129900, locale), plate: "wardrobe" },
      { name: desk, category: office, price: aed(54900, locale), plate: "desk" },
      { name: shelf, category: storage, price: aed(44900, locale), plate: "shelf" },
    ],
    subtotal: aed(319800, locale),
    delivery: aed(3000, locale),
    freeOver: aed(75000, locale),
  };
}

export const CATALOGUE_EN = catalogue("en-AE", {
  storeName: "Nest & Oak Home",
  monogram: "N",
  tagline: "Furniture and storage for calm, tidy homes.",
  heroTitle: "Good things for your home, picked with care",
  heroText: "Solid wood furniture and clever storage that keeps every room calm. Delivered across the UAE.",
  description: "A deep, low three-seater in solid oak with removable linen covers.",
  categories: ["Living Room", "Bedroom", "Storage", "Office"],
  products: [
    "Oakline 3-Seater Sofa",
    "Walnut Coffee Table",
    "Linen Bed Frame — Queen",
    "Two-Door Wardrobe",
    "Compact Writing Desk",
    "Cube Storage Shelf",
  ],
});

export const CATALOGUE_AR = catalogue("ar-AE", {
  storeName: "دار البلوط",
  monogram: "د",
  tagline: "أثاث هادئ لبيوت مرتّبة",
  heroTitle: "قطع مختارة بعناية لبيتك",
  heroText: "أثاث من الخشب الصلب وحلول تخزين ذكية تمنح كل غرفة هدوءها، مع التوصيل إلى جميع الإمارات.",
  description: "أريكة منخفضة وعميقة من خشب البلوط الصلب بأغطية كتان قابلة للإزالة.",
  categories: ["غرفة المعيشة", "غرفة النوم", "التخزين", "المكتب"],
  products: [
    "أريكة أوكلاين بثلاثة مقاعد",
    "طاولة قهوة من خشب الجوز",
    "سرير بإطار من الكتان",
    "خزانة ملابس ببابين",
    "مكتب كتابة صغير",
    "رف تخزين مكعّب",
  ],
});
