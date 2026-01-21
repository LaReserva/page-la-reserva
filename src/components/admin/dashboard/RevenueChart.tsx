import { useEffect, useState, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/formatters';
import { startOfMonth, subMonths, format, parseISO, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, TrendingUp } from 'lucide-react'; // Icono original
import { cn } from '@/utils/utils';

type ChartDataPoint = {
  month: string;
  fullDate: string;
  amount: number;
};

export function RevenueChart() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    async function fetchRevenueData() {
      try {
        const today = new Date();
        const startDate = startOfMonth(subMonths(today, 5));
        const endDate = endOfMonth(today);

        // 1. Ingresos
        const { data: payments, error: incError } = await supabase
          .from('event_payments')
          .select('amount, payment_date')
          .gte('payment_date', startDate.toISOString())
          .lte('payment_date', endDate.toISOString());

        if (incError) throw incError;

        // 2. Gastos (Lógica nueva estrictamente necesaria)
        const { data: expenses, error: expError } = await supabase
          .from('expenses')
          .select('amount, date')
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString());

        if (expError) throw expError;

        const initialMap = new Map<string, number>();
        let currentDateIterator = startDate;

        while (currentDateIterator <= endDate) {
          const key = format(currentDateIterator, 'yyyy-MM'); 
          initialMap.set(key, 0);
          currentDateIterator = new Date(currentDateIterator.getFullYear(), currentDateIterator.getMonth() + 1, 1);
        }

        let total = 0;

        // Sumar Pagos
        payments?.forEach((payment) => {
          const key = format(parseISO(payment.payment_date), 'yyyy-MM');
          if (initialMap.has(key)) {
            const current = initialMap.get(key) || 0;
            initialMap.set(key, current + payment.amount);
            total += payment.amount;
          }
        });

        // Restar Gastos (Lógica nueva)
        expenses?.forEach((expense) => {
          const key = format(parseISO(expense.date), 'yyyy-MM');
          if (initialMap.has(key)) {
            const current = initialMap.get(key) || 0;
            initialMap.set(key, current - expense.amount);
            total -= expense.amount;
          }
        });

        const processedData: ChartDataPoint[] = Array.from(initialMap.entries()).map(([key, amount]) => {
          const dateObj = parseISO(`${key}-01`); 
          return {
            month: format(dateObj, 'MMM', { locale: es }),
            fullDate: key,
            amount: amount,
          };
        });

        setData(processedData);
        setTotalAmount(total);

      } catch (error) {
        console.error('Error fetching revenue chart:', error);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    }

    fetchRevenueData();
  }, []);

  // Nota: Si el neto es negativo, maxVal asegura que el gráfico no se rompa, pero mantiene el color original
  const maxVal = Math.max(...data.map(d => Math.abs(d.amount))) || 1;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-secondary-200 h-full flex flex-col min-h-[380px] relative overflow-hidden">
      
      <Transition
        show={loading}
        as={Fragment}
        leave="transition ease-in duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-secondary-400" />
        </div>
      </Transition>

      <Transition
        show={!loading}
        as={Fragment}
        enter="transition ease-out duration-500"
        enterFrom="opacity-0 translate-y-4"
        enterTo="opacity-100 translate-y-0"
      >
        <div className="flex flex-col h-full">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="font-display font-bold text-lg text-secondary-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary-500" /> {/* Icono original */}
                Ingresos Mensuales {/* Texto original */}
              </h3>
              <p className="text-sm text-secondary-500 mt-1">Comparativa últimos 6 meses (Neto)</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-secondary-400 uppercase tracking-wider font-semibold mb-1">Total Recaudado</p>
              <div className="flex items-center justify-end gap-1 text-green-600"> {/* Color original */}
                <p className="text-2xl font-bold tracking-tight">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex-1 w-full min-h-[200px]">
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-full border-t border-dashed border-secondary-100 h-px first:border-none last:border-secondary-200" />
              ))}
            </div>

            <div className="absolute inset-0 flex items-end justify-between gap-3 sm:gap-6 px-2">
              {data.map((item, index) => {
                const heightPercentage = (Math.abs(item.amount) / maxVal) * 100;
                
                return (
                  <div key={item.fullDate} className="flex flex-col items-center gap-3 w-full h-full justify-end group relative">
                    <div className="w-full flex-1 flex items-end relative">
                        <div className="w-full h-full flex items-end justify-center">
                          <div 
                            className={cn(
                              "w-full max-w-[40px] rounded-t-lg relative transition-all duration-700 ease-out group-hover:opacity-90 group-hover:scale-[1.02]",
                              item.amount >= 0 ? "bg-green-500 shadow-sm" : "bg-red-400 shadow-sm" // Único cambio visual necesario: rojo si es negativo
                            )}
                            style={{ 
                              height: `${item.amount === 0 ? '4px' : `${heightPercentage}%`}`,
                            }} 
                          >
                            {item.amount > 0 && (
                              <div className="absolute top-0 left-0 w-full h-1 bg-white/20 rounded-t-lg"></div>
                            )}
                          </div>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-[calc(100%+8px)] opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-2 group-hover:translate-y-0 z-20 pointer-events-none">
                      <div className="bg-secondary-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl whitespace-nowrap flex flex-col items-center after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-secondary-900">
                        <span>{formatCurrency(item.amount)}</span>
                        <span className="text-[10px] font-normal text-secondary-300 capitalize">{item.month}</span>
                      </div>
                    </div>

                    <span className="text-xs font-medium text-secondary-400 group-hover:text-secondary-600 transition-colors capitalize">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Transition>
    </div>
  );
}