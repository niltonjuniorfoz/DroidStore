import { redirect } from "next/navigation";
import { auth } from "../../auth";
import AccountSidebar from "../../src/components/account/AccountSidebar";

export default async function ContaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = session.user.name ?? "Cliente Aura Tech";
  const email = session.user.email ?? "";
  return <div className="account-page">
    <div className="account-heading"><span className="eyebrow">Área do cliente</span><h1>Minha conta</h1><p>Acompanhe seus pedidos e mantenha seus dados atualizados.</p></div>
    <div className="account-layout"><AccountSidebar name={name} email={email} /><main className="account-content">{children}</main></div>
  </div>;
}
