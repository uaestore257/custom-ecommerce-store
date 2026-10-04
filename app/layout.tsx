import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PLATFORM_FALLBACK_NAME } from "@/lib/platform-brand";
import "./globals.css";

// Only the platform's own UI fonts load globally (admin and business
// site). Storefront typography belongs to each template (templates/*/
// fonts.ts) and is loaded only by the template a store uses.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Every route sets its own title; this is only a neutral fallback.
export const metadata: Metadata = {
  title: {
    default: PLATFORM_FALLBACK_NAME,
    template: `%s | ${PLATFORM_FALLBACK_NAME}`,
  },
  description: "Ecommerce platform and online stores.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
