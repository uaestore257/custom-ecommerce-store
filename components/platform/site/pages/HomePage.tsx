import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import { getAgencyProfile } from "@/lib/server/agency";
import { getTemplateShowcase } from "@/lib/server/platform/showcase";
import { ClosingCta } from "../ClosingCta";
import { Hero } from "../home/Hero";
import { PlatformTeaser } from "../home/PlatformTeaser";
import { ServiceMarquee } from "../home/ServiceMarquee";
import { ServicesExplorer } from "../home/ServicesExplorer";
import { WhyUs } from "../home/WhyUs";
import { ArrowLink, CONTAINER, SectionHeading, StudioMain } from "../primitives";
import { ProcessLine } from "../ProcessLine";
import { NextStoreCard } from "../work/NextStoreCard";
import { WorkCase } from "../work/WorkCase";

/**
 * The homepage, in the order a client decides: see the work, see what we
 * build, see why us, then (briefly) what it runs on, how it happens and
 * how to start.
 */
export async function HomePage() {
  const [showcase, agency] = await Promise.all([getTemplateShowcase(), getAgencyProfile()]);
  const [lead, second] = showcase;

  return (
    <StudioMain>
      {lead && <Hero tagline={agency.tagline} lead={lead} second={second} />}
      <ServiceMarquee />

      <section aria-labelledby="work-title">
        <div className={`${CONTAINER} py-24 lg:py-36`}>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <SectionHeading
              index="01"
              eyebrow="Selected work"
              id="work-title"
              title="Live stores, not mock-ups."
              lede="Every store below is running on our platform right now. Open one, browse the collection, add to the cart and walk through checkout."
            />
            <ArrowLink href="/portfolio">All work</ArrowLink>
          </div>
          <div className="mt-20 space-y-28 lg:mt-28 lg:space-y-40">
            {showcase.map((entry, position) => (
              <WorkCase key={entry.key} entry={entry} index={position + 1} reverse={position % 2 === 1} detailsHref="/portfolio#live-demos" />
            ))}
          </div>
          <div className="mt-28 lg:mt-36">
            <NextStoreCard />
          </div>
        </div>
      </section>

      <section aria-labelledby="build-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-36`}>
          <SectionHeading
            index="02"
            eyebrow="What we build"
            id="build-title"
            title="Everything your business needs online."
            lede="Ecommerce is where we started and what we know best. Around it, we build the websites, apps, AI and automation that make a business run."
          />
          <div className="mt-16">
            <ServicesExplorer categories={SERVICE_CATEGORIES.filter((category) => category.featured)} />
          </div>
        </div>
      </section>

      <WhyUs />
      <PlatformTeaser />

      <section aria-labelledby="process-title">
        <div className={`${CONTAINER} py-24 lg:py-36`}>
          <SectionHeading index="05" eyebrow="Process" id="process-title" title="From first call to a store that grows." />
          <div className="mt-16 lg:mt-20">
            <ProcessLine />
          </div>
        </div>
      </section>

      <ClosingCta
        title={
          <>
            Let&apos;s build something <em className="text-accent">worth visiting</em>.
          </>
        }
        text="Tell us about your business and what you want it to do online. We'll show you the stores running today and how yours would come together."
      />
    </StudioMain>
  );
}
