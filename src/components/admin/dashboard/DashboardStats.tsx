// src/components/admin/dashboard/DashboardStats.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Users, MessageSquare, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import type { AdminUser } from '@/types';
import { endOfMonth } from 'date-fns'; // Recomendado para cerrar el rango del mes

interface Props {
  userRole: AdminUser['role'] | null;
}

interface Stats {
  newQuotes: number;
  confirmedEventsYear: number;
  monthlyRevenue: number;
  activeClients: number;
}

export function DashboardStats({ userRole }: Props) {
  const [stats, setStats] = useState<Stats>({
    newQuotes: 0,
    confirmedEventsYear: 0,
    monthlyRevenue: 0,
    activeClients: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const now = new Date();
        // Definimos el rango del mes actual
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const lastDayOfMonth = endOfMonth(now).toISOString(); // O usa una fecha futura lejana si prefieres
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

        // 1. Eventos Confirmados (Se mantiene igual, visualiza volumen de trabajo)
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmed', 'completed'])
          .gte('event_date', firstDayOfYear);

        // Variables temporales
        let quotesCount = 0;
        let clientsCount = 0;
        let realRevenue = 0;

        // 2. Consultas para Ventas y Super Admin
        if (userRole === 'super_admin' || userRole === 'sales') {
          const { count: q } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'new');
          quotesCount = q || 0;

          const { count: c } = await supabase.from('clients').select('*', { count: 'exact', head: true });
          clientsCount = c || 0;
        }

        // 3. Consulta de INGRESOS REALES (Solo Super Admin)
        // CAMBIO: Ahora miramos 'event_payments' en lugar de 'events'
        if (userRole === 'super_admin') {
          const { data: paymentsRaw } = await supabase
            .from('event_payments')
            .select('amount')
            .gte('payment_date', firstDayOfMonth)
            .lte('payment_date', lastDayOfMonth);
          
          // Sumamos lo realmente cobrado en este mes (depósitos + saldos)
          realRevenue = paymentsRaw?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;
        }

        setStats({
          newQuotes: quotesCount,
          confirmedEventsYear: eventsCount || 0,
          monthlyRevenue: realRevenue,
          activeClients: clientsCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userRole) fetchStats();
  }, [userRole]);

  // CONFIGURACIÓN DE VISIBILIDAD
  const allCards = [
    {
      id: 'quotes',
      label: 'Cotizaciones Nuevas',
      value: stats.newQuotes,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      subtext: 'Pendientes de respuesta',
      allowedRoles: ['super_admin', 'sales', 'admin']
    },
    {
      id: 'events',
      label: 'Eventos Cerrados (Año)',
      value: stats.confirmedEventsYear,
      icon: CalendarDays,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      subtext: 'Eventos confirmados',
      allowedRoles: ['super_admin', 'sales', 'operations', 'admin']
    },
    {
      id: 'clients',
      label: 'Cartera de Clientes',
      value: stats.activeClients,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      subtext: 'Clientes registrados',
      allowedRoles: ['super_admin', 'sales', 'admin']
    },
    {
      id: 'revenue',
      label: 'Ingresos Reales (Mes)', // Etiqueta actualizada
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
      subtext: 'Cobrado en caja (Cash Flow)', // Subtexto actualizado para claridad
      allowedRoles: ['super_admin']
    },
  ];

  // Filtramos las tarjetas
  const visibleCards = allCards.filter(card => 
    userRole && card.allowedRoles.includes(userRole)
  );

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 ${userRole === 'super_admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
      {visibleCards.map((card) => (
        <div key={card.id} className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200 flex items-start justify-between transition-all hover:shadow-md">
          <div>
            <p className="text-sm font-medium text-secondary-500 mb-1">{card.label}</p>
            {loading ? (
              <div className="h-8 w-24 bg-secondary-100 animate-pulse rounded"></div>
            ) : (
              <h3 className="text-2xl font-bold text-secondary-900">{card.value}</h3>
            )}
            <p className="text-xs text-secondary-400 mt-2">{card.subtext}</p>
          </div>
          <div className={`p-3 rounded-lg ${card.bg}`}>
            <card.icon className={`w-6 h-6 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
}