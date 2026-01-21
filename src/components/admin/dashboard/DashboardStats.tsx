import { useEffect, useState, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { DollarSign, Users, MessageSquare, CalendarDays, TrendingUp } from 'lucide-react'; // Iconos originales
import { formatCurrency } from '@/utils/formatters';
import type { AdminUser } from '@/types';
import { endOfMonth } from 'date-fns';
import { cn } from '@/utils/utils';

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
        const lastDayOfMonth = endOfMonth(now).toISOString();
        const firstDayOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

        // 1. Eventos
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmed', 'completed'])
          .gte('event_date', firstDayOfYear);

        let quotesCount = 0;
        let clientsCount = 0;
        let calculatedRevenue = 0;

        // 2. Datos Ventas/Admin
        if (userRole === 'super_admin' || userRole === 'sales') {
          const { count: q } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'new');
          quotesCount = q || 0;

          const { count: c } = await supabase.from('clients').select('*', { count: 'exact', head: true });
          clientsCount = c || 0;
        }

        // 3. Ingresos Reales (Neto) - Solo lógica modificada
        if (userRole === 'super_admin') {
          // Ingresos
          const { data: paymentsRaw } = await supabase
            .from('event_payments')
            .select('amount')
            .gte('payment_date', firstDayOfMonth)
            .lte('payment_date', lastDayOfMonth);
          
          const gross = paymentsRaw?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

          // Gastos (Restar)
          const { data: expensesRaw } = await supabase
            .from('expenses')
            .select('amount')
            .gte('date', firstDayOfMonth)
            .lte('date', lastDayOfMonth);

          const expenses = expensesRaw?.reduce((acc, curr) => acc + (curr.amount || 0), 0) || 0;

          calculatedRevenue = gross - expenses;
        }

        setStats({
          newQuotes: quotesCount,
          confirmedEventsYear: eventsCount || 0,
          monthlyRevenue: calculatedRevenue,
          activeClients: clientsCount,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    }

    if (userRole) fetchStats();
  }, [userRole]);

  // Configuración original de tarjetas (Sin cambios visuales)
  const cards = [
    {
      id: 'revenue',
      label: 'Ingreso Neto (Mes)', // Cambio mínimo en texto para reflejar realidad
      value: formatCurrency(stats.monthlyRevenue),
      icon: DollarSign, // Mantenemos el signo de dólar
      color: 'text-green-600', // Mantenemos verde
      bg: 'bg-green-50 border-green-100', // Mantenemos fondo verde
      subtext: 'Flujo de caja registrado',
      allowedRoles: ['super_admin'],
      trend: true 
    },
    {
      id: 'events',
      label: 'Eventos Confirmados',
      value: stats.confirmedEventsYear,
      icon: CalendarDays,
      color: 'text-primary-600',
      bg: 'bg-primary-50 border-primary-100',
      subtext: 'Acumulado del año actual',
      allowedRoles: ['super_admin', 'sales', 'operations', 'admin']
    },
    {
      id: 'quotes',
      label: 'Nuevas Cotizaciones',
      value: stats.newQuotes,
      icon: MessageSquare,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      subtext: 'Solicitudes sin responder',
      allowedRoles: ['super_admin', 'sales', 'admin']
    },
    {
      id: 'clients',
      label: 'Cartera de Clientes',
      value: stats.activeClients,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
      subtext: 'Clientes totales',
      allowedRoles: ['super_admin', 'sales', 'admin']
    },
  ];

  const visibleCards = cards.filter(card => 
    userRole && card.allowedRoles.includes(userRole)
  );

  return (
    <div className={cn(
      "grid grid-cols-1 gap-6",
      userRole === 'super_admin' ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
    )}>
      {visibleCards.map((card, index) => (
        <div 
          key={card.id} 
          className="relative bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 flex items-start justify-between transition-all duration-300 hover:shadow-md hover:border-secondary-300 group"
        >
          <div className="flex flex-col justify-between h-full">
            <div>
              <p className="text-sm font-medium text-secondary-500 mb-1 flex items-center gap-2">
                {card.label}
              </p>
              
              <div className="h-10 flex items-center">
                <Transition
                  show={!loading}
                  as={Fragment}
                  enter="transition ease-out duration-500"
                  enterFrom="opacity-0 translate-y-2"
                  enterTo="opacity-100 translate-y-0"
                >
                  <h3 className="text-3xl font-display font-bold text-secondary-900 tracking-tight">
                    {card.value}
                  </h3>
                </Transition>

                <Transition
                  show={loading}
                  as={Fragment}
                  leave="transition ease-in duration-200"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute h-8 w-24 bg-secondary-100 rounded animate-pulse" />
                </Transition>
              </div>
            </div>
            
            <p className="text-xs text-secondary-400 mt-2 font-medium">
              {card.subtext}
            </p>
          </div>

          <div className={cn("p-3 rounded-xl border transition-transform duration-300 group-hover:scale-110", card.bg)}>
            <card.icon className={cn("w-6 h-6", card.color)} />
          </div>

          {card.trend && !loading && (
            <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
               <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}