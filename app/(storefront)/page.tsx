import { HomeView } from "@/components/storefront/HomeView";

// Homepage content (hero text, featured products, categories) comes from
// the selected client store's settings, so it can be rebranded per store
// in Admin → Store settings without editing this file.
export default function Home() {
  return <HomeView />;
}
