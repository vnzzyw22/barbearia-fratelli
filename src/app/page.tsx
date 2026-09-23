import { ClubSection } from "@/components/site/club-section";
import { ContactSection } from "@/components/site/contact-section";
import { FaqSection } from "@/components/site/faq-section";
import { Footer } from "@/components/site/footer";
import { GallerySection } from "@/components/site/gallery-section";
import { Hero } from "@/components/site/hero";
import { MobileBookBar } from "@/components/site/mobile-book-bar";
import { Navbar } from "@/components/site/navbar";
import { ServicesSection } from "@/components/site/services-section";
import { TeamSection } from "@/components/site/team-section";
import {
  getActiveServices,
  getActiveStaff,
  getBusinessSettings,
  getPublicGalleryPhotos,
} from "@/lib/supabase/queries";

export default async function Home() {
  const [business, services, staff, galleryPhotos] = await Promise.all([
    getBusinessSettings(),
    getActiveServices(),
    getActiveStaff(),
    getPublicGalleryPhotos(),
  ]);

  return (
    <>
      <Navbar />
      <main id="conteudo" className="flex flex-1 flex-col">
        <Hero />
        <ServicesSection services={services} />
        <ClubSection />
        <TeamSection staff={staff} />
        <GallerySection photos={galleryPhotos} />
        <ContactSection business={business} />
        <FaqSection />
      </main>
      <Footer business={business} services={services} />
      <MobileBookBar />
    </>
  );
}
