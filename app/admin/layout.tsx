import AdminShell from '../../src/components/admin/AdminShell';
import { redirect } from 'next/navigation';
import { auth } from '../../auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(role ?? '')) redirect('/login');
  return (
    <AdminShell user={session.user.name ?? session.user.email ?? 'Admin'} role={role ?? "MANAGER"}>{children}</AdminShell>
  );
}
