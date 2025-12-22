// src/components/admin/dashboard/RevenueChart.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/utils/formatters';
import { startOfMonth, subMonths, format, parseISO, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

type ChartDataPoint = {
  month: string;
  fullDate: string; // Para ordenamiento
  amount: number;
};

export function RevenueChart() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    async function fetchRevenueData() {
      try {
        // 1. Definimos el rango: Últimos 6 meses
        const today = new Date();
        const startDate = startOfMonth(subMonths(today, 5)); // Hace 5 meses + este mes = 6 meses
        const endDate = endOfMonth(today);

        // 2. Consulta a Supabase
        const { data: payments, error } = await supabase
          .from('event_payments')
          .select('amount, payment_date')
          .gte('payment_date', startDate.toISOString())
          .lte('payment_date', endDate.toISOString());

        if (error) throw error;

        // 3. Inicializamos el mapa de meses
        const initialMap = new Map<string, number>();
        let currentDateIterator = startDate;

        while (currentDateIterator <= endDate) {
          const key = format(currentDateIterator, 'yyyy-MM'); 
          initialMap.set(key, 0);
          currentDateIterator = new Date(currentDateIterator.getFullYear(), currentDateIterator.getMonth() + 1, 1);
        }

        // 4. Sumamos los montos
        let total = 0;
        payments?.forEach((payment) => {
          const paymentMonth = format(parseISO(payment.payment_date), 'yyyy-MM');
          if (initialMap.has(paymentMonth)) {
            const currentAmount = initialMap.get(paymentMonth) || 0;
            initialMap.set(paymentMonth, currentAmount + payment.amount);
            total += payment.amount;
          }
        });

        // 5. Convertimos a Array
        const processedData: ChartDataPoint[] = Array.from(initialMap.entries()).map(([key, amount]) => {
          const dateObj = parseISO(`${key}-01`); 
          return {
            month: format(dateObj, 'MMM', { locale: es }), // Ej: "dic"
            fullDate: key,
            amount: amount,
          };
        });

        setData(processedData);
        setTotalAmount(total);

      } catch (error) {
        console.error('Error fetching revenue chart:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRevenueData();
  }, []);

  const maxVal = Math.max(...data.map(d => d.amount)) || 1;

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200 h-full flex items-center justify-center min-h-[350px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200 h-full flex flex-col min-h-[350px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-secondary-900">Ingresos Mensuales</h3>
          <p className="text-sm text-secondary-500">Últimos 6 meses</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-secondary-400 uppercase tracking-wider">Total Recaudado</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(totalAmount)}
          </p>
        </div>
      </div>

      {/* CORRECCIÓN CSS AQUÍ:
         1. h-64: Altura fija para toda el área del gráfico.
         2. items-end: Alinea las columnas al fondo.
      */}
      <div className="flex items-end justify-between gap-2 h-64 mt-auto w-full">
        {data.map((item) => {
          // Calculamos el porcentaje
          const heightPercentage = (item.amount / maxVal) * 100;
          
          return (
            <div key={item.fullDate} className="flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer relative">
              
              {/* Tooltip flotante */}
              <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-secondary-900 text-white text-xs py-1 px-2 rounded mb-1 whitespace-nowrap z-20 pointer-events-none shadow-lg">
                {formatCurrency(item.amount)}
              </div>
              
              {/* CORRECCIÓN CLAVE:
                 1. flex-1: Ocupa todo el espacio vertical disponible que NO usan el texto o el gap.
                 2. w-full: Ocupa el ancho de la columna.
                 3. flex items-end: Alinea la barra de color al fondo de este espacio reservado.
              */}
              <div className="w-full flex-1 flex items-end relative rounded-t-lg bg-gray-50/50">
                 <div 
                    className={`w-full rounded-t-lg relative overflow-hidden transition-all duration-700 ease-out ${item.amount > 0 ? 'bg-primary-500 group-hover:bg-primary-600' : 'bg-gray-200'}`}
                    // Si el monto es 0, damos 2px de altura para que se vea una linea gris sutil
                    style={{ height: `${item.amount === 0 ? '4px' : `${heightPercentage}%`}` }} 
                  >
                    {/* Brillo interno opcional */}
                    {item.amount > 0 && (
                      <div className="absolute top-0 left-0 w-full h-1 bg-white opacity-20"></div>
                    )}
                 </div>
              </div>
              
              {/* Etiqueta del mes */}
              <span className="text-xs font-medium text-secondary-500 capitalize h-4 block">
                {item.month}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}