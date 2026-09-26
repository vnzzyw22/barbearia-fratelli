import { ChangePasswordForm } from "@/components/account/change-password-form";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { getAccess } from "@/lib/auth/access";

export default async function BarbeiroContaPage() {
  const access = await getAccess();
  return (
    <div>
      <h1 className={pageTitleClass}>Minha conta</h1>
      <p className={pageSubtitleClass}>Troque a sua senha de acesso.</p>
      <div className="mt-6">
        <ChangePasswordForm email={access?.email ?? null} />
      </div>
    </div>
  );
}
