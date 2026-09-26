import { StaffManager } from "@/components/admin/staff-manager";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { StaffAccess } from "@/components/admin/commissions/staff-access";
import { getAllStaff } from "@/lib/supabase/admin-queries";
import { getStaffAccess } from "@/lib/supabase/commission-queries";

export default async function EquipePage() {
  const [staff, access] = await Promise.all([getAllStaff(), getStaffAccess()]);

  return (
    <div>
      <h1 className={pageTitleClass}>Equipe</h1>
      <p className={pageSubtitleClass}>
        Cada profissional ativo aparece no site e no agendamento com a
        própria agenda.
      </p>
      <StaffManager staff={staff} />
      <StaffAccess rows={access} />
    </div>
  );
}
