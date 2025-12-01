// src/components/admin/dashboard/DashboardView.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DashboardStats } from './DashboardStats';
import { RevenueChart } from './RevenueChart';
import { TeamTasks } from './TeamTasks';
import type { AdminUser } from '@/types';
import { Loader2 } from 'lucide-react';

export function DashboardView() {
  const [role, setRole] = useState<AdminUser['role'] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .single();
          
          // ✅ CORRECCIÓN: Le decimos a TS qué forma tiene 'data'
          const adminData = data as { role: AdminUser['role'] } | null;
          
          // Usamos la variable tipeada
          setRole(adminData?.role || 'admin');
        }
      } catch (error) {
        console.error('Error fetching role:', error);
        setRole('admin'); // Fallback seguro
      } finally {
        setLoading(false);
      }
    }

    getUserRole();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isSuperAdmin = role === 'super_admin';

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 1. KPIs */}
      <DashboardStats userRole={role} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. Columna Principal */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Si es Super Admin: Ve Gráfico de Ingresos */}
          {isSuperAdmin && (
            <RevenueChart />
          )}

          {/* Si NO es Super Admin */}
          {!isSuperAdmin && (
            <div className="bg-white p-6 rounded-xl border border-secondary-200 h-64 flex items-center justify-center">
              <p className="text-secondary-400 italic">
                Aquí verás el calendario de tus próximos eventos asignados.
              </p>
            </div>
          )}

        </div>

        {/* 3. Columna Lateral */}
        <div className="space-y-8">
          <TeamTasks />
        </div>

      </div>
    </div>
  );
}