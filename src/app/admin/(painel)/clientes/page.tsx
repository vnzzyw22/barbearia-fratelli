import { ClientsManager } from "@/components/admin/clients-manager";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { getAllClients } from "@/lib/supabase/admin-queries";

export default async function ClientesPage() {
  const clients = await getAllClients();

  return (
    <div>
      <h1 className={pageTitleClass}>Clientes</h1>
      <p className={pageSubtitleClass}>
        Clientes cadastrados a cada agendamento pelo site.
      </p>
      <ClientsManager clients={clients} />
    </div>
  );
}
