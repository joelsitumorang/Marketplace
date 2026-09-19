import { getSession } from "@/lib/session";
import AdminSidebar from "@/components/AdminSidebar";
import AdminBottomNav from "@/components/AdminBottomNav";
import { Toaster } from "sonner";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  // If no session, we are likely on the login page (enforced by middleware)
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex print:!block print:!bg-white">
      <AdminSidebar role={session.role} userBranch={session.asal_cabang} />

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-64 p-4 pb-24 md:p-8 md:pb-8 min-h-screen relative overflow-y-auto print:!ml-0 print:!p-0 print:!pb-0 print:!overflow-visible">
        <div className="absolute top-0 left-0 md:left-1/4 w-full md:w-96 h-32 bg-brand-600/5 rounded-full blur-3xl pointer-events-none print:!hidden" />
        <div className="relative z-10 print:!static">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <AdminBottomNav />
      
      <Toaster position="top-right" richColors closeButton />
    </div>
  );
}
