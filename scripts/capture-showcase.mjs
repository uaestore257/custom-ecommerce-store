// Captures the business site's showcase screenshots from the REAL demo
// storefronts (rendered by the real templates), so the public site never
// shows mock-ups. Run against a local `npm run dev` with the seeded demo
// stores, with Playwright available:
//
//   node scripts/capture-showcase.mjs [baseHost=localhost:3000]
//
// Writes public/showcase/<template>-{desktop,tall,mobile}.jpg. The
// demonstration notice bar is cropped off; everything else is the page as
// a visitor sees it.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM ?? import.meta.url);
const { chromium } = require("playwright");

const base = (process.argv[2] ?? "localhost:3000").replace(/\/+$/, "");
// Tall captures stop before the sample products, which have no photographs yet.
const STORES = {
  atelier: { slug: "nest-and-oak-demo", name: "Nest & Oak Home", tall: 1380 },
  classic: { slug: "threadline-demo", name: "Threadline Boutique", tall: 1130 },
  kinetic: { slug: "pulse-audio", name: "Pulse Audio", tall: 1380 },
  maison: { slug: "maison-lumiere", name: "Maison Lumière", tall: 1380 },
  market: { slug: "daily-basket", name: "Daily Basket", tall: 1380 },
  noor: { slug: "dar-al-oud", name: "دار العود", tall: 1380 },
};
const OUT = fileURLToPath(new URL("../public/showcase/", import.meta.url));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: base.includes("localhost") ? ["--host-resolver-rules=MAP *.localhost 127.0.0.1"] : [],
});
try {
  for (const [template, { slug, name, tall }] of Object.entries(STORES)) {
    for (const [kind, viewport, height] of [
      ["desktop", { width: 1440, height: 900 }, 900],
      ["tall", { width: 1440, height: 900 }, tall],
      ["mobile", { width: 390, height: 844 }, 844],
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: kind === "mobile" ? 2 : 1.25, reducedMotion: "reduce" });
      try {
        const response = await page.goto(`http://${slug}.${base}/`, { waitUntil: "networkidle", timeout: 30_000 });
        if (!response?.ok()) throw new Error(`${template} storefront returned HTTP ${response?.status() ?? "no response"}: ${slug}`);
        const root = page.locator(`[data-template="${template}"]`);
        if (!(await root.count())) throw new Error(`${slug} did not render the expected ${template} template`);
        const noticeElement = root.locator(":scope > p").first();
        const notice = await noticeElement.boundingBox();
        const noticeText = await noticeElement.innerText().catch(() => "");
        if (!notice || !/^(Demonstration store|متجر تجريبي)/u.test(noticeText)) {
          throw new Error(`${slug} is missing the ${template} demonstration notice`);
        }
        if (!(await root.innerText()).includes(name)) {
          throw new Error(`${slug} did not render the expected demo store "${name}"`);
        }
        const top = Math.round(notice.y + notice.height);
        // Hide the Next.js development indicator, if any.
        await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
        await page.screenshot({
          path: join(OUT, `${template}-${kind}.jpg`),
          type: "jpeg",
          quality: 82,
          fullPage: kind === "tall",
          clip: { x: 0, y: top, width: viewport.width, height },
        });
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log("Showcase screenshots written to public/showcase/");
