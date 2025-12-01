// src/components/admin/dashboard/DashboardStats.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Users, MessageSquare, CalendarDays } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import type { AdminUser } from '@/types';

// Aceptamos el rol como prop desde el padre
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
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

        // 1. Consultas Operativas (Todos las ven)
        const { count: quotesCount } = await supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'new');

        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmed', 'completed'])
          .gte('event_date', firstDayOfYear);

        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });

        // 2. Consulta Financiera (Solo Super Admin)
        let revenue = 0;
        if (userRole === 'super_admin') {
          const { data: revenueRaw } = await supabase
            .from('events')
            .select('total_price')
            .in('status', ['confirmed', 'completed'])
            .gte('event_date', firstDayOfMonth);
          
          const revenueData = revenueRaw as { total_price: number }[] | null;
          revenue = revenueData?.reduce((acc, curr) => acc + (curr.total_price || 0), 0) || 0;
        }

        setStats({
          newQuotes: quotesCount || 0,
          confirmedEventsYear: eventsCount || 0,
          monthlyRevenue: revenue,
          activeClients: clientsCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    if (userRole) fetchStats(); // Solo buscar si ya sabemos el rol
  }, [userRole]);

  // Definimos todas las tarjetas
  const allCards = [
    {
      id: 'quotes',
      label: 'Cotizaciones Nuevas',
      value: stats.newQuotes,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      subtext: 'Pendientes de respuesta'
    },
    {
      id: 'events',
      label: 'Eventos Cerrados (Año)',
      value: stats.confirmedEventsYear,
      icon: CalendarDays,
      color: 'text-primary-600',
      bg: 'bg-primary-50',
      subtext: 'Eventos confirmados'
    },
    {
      id: 'revenue',
      label: 'Ingresos (Mes)',
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bg: 'bg-green-50',
      subtext: 'Facturación bruta',
      requiresSuperAdmin: true // Flag de seguridad
    },
    {
      id: 'clients',
      label: 'Cartera de Clientes',
      value: stats.activeClients,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      subtext: 'Clientes registrados'
    },
  ];

  // Filtramos las tarjetas según el rol
  const visibleCards = allCards.filter(card => {
    if (card.requiresSuperAdmin && userRole !== 'super_admin') return false;
    return true;
  });

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