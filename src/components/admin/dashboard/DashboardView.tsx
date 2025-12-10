import { DashboardStats } from './DashboardStats';
import { RevenueChart } from './RevenueChart';
import { TeamTasks } from './TeamTasks';
import { Loader2 } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { EventsCalendarView } from '@/components/admin/events/EventsCalendarView';

export function DashboardView() {
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
        
        {/* Columna Principal (Izquierda) */}
        <div className="lg:col-span-2 space-y-8">
          
          {isSuperAdmin && (
            <RevenueChart />
          )}

          {!isSuperAdmin && (
            /* ✅ AQUÍ PASAMOS showHeader={false} PARA OCULTAR LA LEYENDA */
            <EventsCalendarView showHeader={false} />
          )}
        </div>

        {/* Columna Secundaria (Derecha) - Tareas */}
        <div className="space-y-8">
          <TeamTasks />
        </div>

      </div>
    </div>
  );
}