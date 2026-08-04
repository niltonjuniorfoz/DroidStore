import { Inter } from 'next/font/google';
import { redirect } from 'next/navigation';
import AdminShell from '../../src/components/admin/AdminShell';
import { auth } from '../../auth';
import './admin-theme.css';

// Fonte própria do painel, self-hosted pelo next/font (sem request externo).
const adminFont = Inter({
  subsets: ['latin'],
  variable: '--font-admin',
  display: 'swap',
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !['ADMIN', 'MANAGER'].includes(role ?? '')) redirect('/login?callbackUrl=/admin');
  return (
    <div className={adminFont.variable}>
      <AdminShell user={session.user.name ?? session.user.email ?? 'Admin'} role={role ?? "MANAGER"}>{children}</AdminShell>
    </div>
  );
}
