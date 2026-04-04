'use client';
import { useAdminAuth } from '@/lib/admin/hooks';
import AdminSidebar from '@/components/admin/layout/AdminSidebar';
import AdminTopbar from '@/components/admin/layout/AdminTopbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin, loading, logout } = useAdminAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent" />
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="flex h-screen bg-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminTopbar adminName={admin.name} onLogout={logout} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
