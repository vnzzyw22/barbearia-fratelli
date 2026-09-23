import { StaffManager } from "@/components/admin/staff-manager";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { getAllStaff } from "@/lib/supabase/admin-queries";

export default async function EquipePage() {
  const staff = await getAllStaff();

  return (
    <div>
      <h1 className={pageTitleClass}>Equipe</h1>
      <p className={pageSubtitleClass}>
        Cada profissional ativo aparece no site e no agendamento com a
        própria agenda.
      </p>
      <StaffManager staff={staff} />
    </div>
  );
}
