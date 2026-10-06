import { SERVICE_CATEGORIES } from "@/lib/platform/services";
import { getAgencyProfile } from "@/lib/server/agency";
import { getTemplateShowcase } from "@/lib/server/platform/showcase";
import { ClosingCta } from "../ClosingCta";
import { Hero } from "../home/Hero";
import { PlatformTeaser } from "../home/PlatformTeaser";
import { ServiceMarquee } from "../home/ServiceMarquee";
import { ServicesExplorer } from "../home/ServicesExplorer";
import { WhyUs } from "../home/WhyUs";
import { CONTAINER, SectionHeading, StudioMain } from "../primitives";
import { ProcessLine } from "../ProcessLine";

/**
 * The homepage presents the agency, its services, reasons to work together,
 * the platform underneath, and how to get started.
 */
export async function HomePage() {
  const [showcase, agency] = await Promise.all([getTemplateShowcase(), getAgencyProfile()]);
  const [lead, second] = showcase;

  return (
    <StudioMain>
      {lead && <Hero tagline={agency.tagline} lead={lead} second={second} />}
      <ServiceMarquee />

      <section aria-labelledby="build-title" className="border-t border-border">
        <div className={`${CONTAINER} py-24 lg:py-36`}>
          <SectionHeading
            index="01"
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
          <SectionHeading index="04" eyebrow="Process" id="process-title" title="From first call to a store that grows." />
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
