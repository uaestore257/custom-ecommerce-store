// Captures real screenshots for every eligible Work demo in the configured
// database. Run while `npm run dev` is serving those storefronts:
//
//   npm run capture-showcase
//   npm run capture-showcase -- https://codexstore.org nest-and-oak-demo-2,pulse-audio-demo
//
// An optional comma-separated list limits captures to those store slugs.
// Screenshots are saved by store slug, so newly assigned demo stores need no
// code or image-map changes. The demonstration notice bar is cropped off.
import "dotenv/config";
import { createRequire } from "node:module";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(process.env.PLAYWRIGHT_REQUIRE_FROM ?? import.meta.url);
const { chromium } = require("playwright");
const [{ createPrismaClient }, { resolveWorkServiceSlug }, { isShowcasedTemplate }, { isTemplateKey }, { TEMPLATE_DEMO_STORES }] =
  await Promise.all([
    import("../lib/server/db.ts"),
    import("../lib/platform/work.ts"),
    import("../lib/platform/showcase.ts"),
    import("../lib/templates/registry.ts"),
    import("../lib/template-demo-stores.ts"),
  ]);

const baseValue = (process.argv[2] ?? "localhost:3000").replace(/\/+$/, "");
const base = new URL(/^https?:\/\//i.test(baseValue) ? baseValue : `http://${baseValue}`);
if (base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
  throw new Error("Provide only a storefront host or base URL without credentials, a path, or query parameters.");
}
const requested = process.argv[3]?.split(",").filter(Boolean);
if (requested && (requested.some((slug) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) || new Set(requested).size !== requested.length)) {
  throw new Error("Provide unique, valid store slugs for an optional capture filter.");
}
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const out = join(projectRoot, "public", "showcase");

const db = createPrismaClient();
try {
  let stores;
  try {
    stores = await db.store.findMany({
      where: { isDemo: true, status: "ACTIVE", archivedAt: null, workServiceSlug: { not: null } },
      orderBy: [{ workOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      take: 48,
      select: {
        name: true,
        slug: true,
        templateKey: true,
        workServiceSlug: true,
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });
  } catch {
    throw new Error("Could not read eligible demo stores from the configured database.");
  } finally {
    await db.$disconnect();
  }

  const eligible = stores.filter((store) =>
    store._count.products > 0 &&
    resolveWorkServiceSlug(store.workServiceSlug) !== null &&
    isTemplateKey(store.templateKey) &&
    isShowcasedTemplate(store.templateKey) &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(store.slug),
  );
  const captures = requested ? eligible.filter(({ slug }) => requested.includes(slug)) : eligible;
  if (requested && captures.length !== requested.length) {
    throw new Error("One or more requested slugs are not eligible Work demo stores in the configured database.");
  }
  if (captures.length === 0) {
    console.log("No eligible Work demo stores need screenshots.");
  } else {
    await mkdir(out, { recursive: true });
    const browser = await chromium.launch({
      args: base.hostname === "localhost" ? ["--host-resolver-rules=MAP *.localhost 127.0.0.1"] : [],
    });
    try {
      for (const { slug, name, templateKey } of captures) {
        const key = TEMPLATE_DEMO_STORES[templateKey].slug === slug ? templateKey : slug;
        for (const [kind, viewport, height] of [
          ["desktop", { width: 1440, height: 900 }, 900],
          ["tall", { width: 1440, height: 900 }, 1380],
          ["mobile", { width: 390, height: 844 }, 844],
        ]) {
          const page = await browser.newPage({ viewport, deviceScaleFactor: kind === "mobile" ? 2 : 1.25, reducedMotion: "reduce" });
          try {
            const response = await page.goto(`${base.protocol}//${slug}.${base.host}/`, { waitUntil: "networkidle", timeout: 30_000 });
            if (!response?.ok()) throw new Error(`${slug} storefront returned HTTP ${response?.status() ?? "no response"}.`);
            const root = page.locator(`[data-template="${templateKey}"]`);
            if (!(await root.count())) throw new Error(`${slug} did not render its configured template.`);
            const noticeElement = root.locator(":scope > p").first();
            const notice = await noticeElement.boundingBox();
            const noticeText = await noticeElement.innerText().catch(() => "");
            if (!notice || !/^(Demonstration store|متجر تجريبي)/u.test(noticeText)) {
              throw new Error(`${slug} is missing its demonstration notice.`);
            }
            if (!(await root.innerText()).includes(name)) {
              throw new Error(`${slug} did not render the expected demo store.`);
            }
            const top = Math.round(notice.y + notice.height);
            await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
            await page.screenshot({
              path: join(out, `${key}-${kind}.jpg`),
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
  }
  const manifestPath = join(projectRoot, "lib", "platform", "showcase-capture-manifest.json");
  let manifest = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const { slug, templateKey } of captures) {
    const key = TEMPLATE_DEMO_STORES[templateKey].slug === slug ? templateKey : slug;
    manifest[key] = templateKey;
  }
  const files = await readdir(out);
  const kinds = ["desktop", "tall", "mobile"];
  const entries = Object.entries(manifest)
    .filter(([key, templateKey]) =>
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) &&
      isTemplateKey(templateKey) &&
      isShowcasedTemplate(templateKey) &&
      kinds.every((kind) => files.includes(`${key}-${kind}.jpg`)),
    )
    .sort(([left], [right]) => left.localeCompare(right));
  await writeFile(manifestPath, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Showcase screenshot capture failed.");
  process.exitCode = 1;
}
if (process.exitCode !== 1 && process.argv[3]) console.log("Requested Work demo screenshots captured.");
else if (process.exitCode !== 1) console.log("Eligible Work demo screenshots captured.");
