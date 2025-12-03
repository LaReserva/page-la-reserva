// src/components/admin/dashboard/DashboardView.tsx
import { DashboardStats } from './DashboardStats';
import { RevenueChart } from './RevenueChart';
import { TeamTasks } from './TeamTasks';
import { Loader2 } from 'lucide-react';
// ✅ Usamos el Hook
import { useUserRole } from '@/hooks/useUserRole';

export function DashboardView() {
  // ✅ Una sola línea para obtener todo
  const { role, loading, isSuperAdmin } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      <DashboardStats userRole={role} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          {isSuperAdmin && (
            <RevenueChart />
          )}

          {!isSuperAdmin && (
            <div className="bg-white p-6 rounded-xl border border-secondary-200 h-64 flex items-center justify-center">
              <p className="text-secondary-400 italic">
                Aquí verás el calendario de tus próximos eventos asignados.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <TeamTasks />
        </div>

      </div>
    </div>
  );
}