import { ServicesManager } from "@/components/admin/services-manager";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { getAllServices } from "@/lib/supabase/admin-queries";

export default async function ServicosPage() {
  const services = await getAllServices();

  return (
    <div>
      <h1 className={pageTitleClass}>Serviços</h1>
      <p className={pageSubtitleClass}>
        Preço e duração aparecem no site e no agendamento assim que salvos.
      </p>
      <ServicesManager services={services} />
    </div>
  );
}
