import { GalleryManager } from "@/components/admin/gallery-manager";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { getAllGalleryPhotos } from "@/lib/supabase/admin-queries";

export default async function GaleriaPage() {
  const photos = await getAllGalleryPhotos();

  return (
    <div>
      <h1 className={pageTitleClass}>Galeria</h1>
      <p className={pageSubtitleClass}>
        Fotos publicadas aparecem no site. Máx. 5MB por imagem.
      </p>
      <GalleryManager photos={photos} />
    </div>
  );
}
