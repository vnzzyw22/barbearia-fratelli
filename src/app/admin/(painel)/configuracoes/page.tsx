import { SettingsForm } from "@/components/admin/settings-form";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { getBusinessSettings } from "@/lib/supabase/queries";

export default async function ConfiguracoesPage() {
  const business = await getBusinessSettings();

  if (!business) {
    return (
      <div>
        <h1 className={pageTitleClass}>Configurações</h1>
        <p className="mt-2 text-sm text-red-400">
          Não foi possível carregar as configurações do negócio.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={pageTitleClass}>Configurações</h1>
      <p className={pageSubtitleClass}>
        Dados usados no site público e no fluxo de agendamento.
      </p>
      <SettingsForm business={business} />
    </div>
  );
}
