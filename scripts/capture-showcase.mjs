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

const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM ?? import.meta.url);
const { chromium } = require("playwright");

const base = process.argv[2] ?? "localhost:3000";
// Tall captures stop before the sample products, which have no photographs yet.
const STORES = { atelier: { slug: "nest-and-oak", tall: 1380 }, classic: { slug: "threadline", tall: 1130 } };
const OUT = new URL("../public/showcase/", import.meta.url).pathname;

const browser = await chromium.launch();
for (const [template, { slug, tall }] of Object.entries(STORES)) {
  for (const [kind, viewport, height] of [
    ["desktop", { width: 1440, height: 900 }, 900],
    ["tall", { width: 1440, height: 900 }, tall],
    ["mobile", { width: 390, height: 844 }, 844],
  ]) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: kind === "mobile" ? 2 : 1.25, reducedMotion: "reduce" });
    await page.goto(`http://${slug}.${base}/`, { waitUntil: "networkidle" });
    // Hide the Next.js development indicator, if any.
    await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    // The demo notice is the first child of the storefront root.
    const notice = await page.locator("[data-template] > p").first().boundingBox();
    const top = notice ? Math.round(notice.y + notice.height) : 0;
    await page.screenshot({
      path: `${OUT}${template}-${kind}.jpg`,
      type: "jpeg",
      quality: 82,
      fullPage: kind === "tall",
      clip: { x: 0, y: top, width: viewport.width, height },
    });
    await page.close();
  }
}
await browser.close();
console.log("Showcase screenshots written to public/showcase/");
