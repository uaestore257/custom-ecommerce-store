import type { Metadata } from "next";
import { StoreOverviewView } from "@/components/admin/StoreOverviewView";

export const metadata: Metadata = { title: "Store overview" };

export default async function StoreOverviewPage({ searchParams }: PageProps<"/admin/stores/[storeId]">) {
  const { created } = await searchParams;
  return <StoreOverviewView justCreated={created === "1"} />;
}
