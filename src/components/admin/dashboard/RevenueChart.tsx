// src/components/admin/dashboard/RevenueChart.tsx
import { formatCurrency } from '@/utils/formatters';

// Datos de prueba para visualizar el diseño
const MOCK_DATA = [
  { month: 'Ene', amount: 4500 },
  { month: 'Feb', amount: 8200 },
  { month: 'Mar', amount: 12000 },
  { month: 'Abr', amount: 6500 },
  { month: 'May', amount: 9000 },
  { month: 'Jun', amount: 15000 },
];

export function RevenueChart() {
  // Aquí luego conectaremos Supabase. Por ahora usamos MOCK_DATA.
  const data = MOCK_DATA;
  
  const maxVal = Math.max(...data.map(d => d.amount));

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-secondary-200 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-bold text-lg text-secondary-900">Ingresos Mensuales</h3>
          <p className="text-sm text-secondary-500">Rendimiento 1er Semestre 2025</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-secondary-400 uppercase tracking-wider">Total</p>
          <p className="text-xl font-bold text-green-600">
            {formatCurrency(data.reduce((acc, curr) => acc + curr.amount, 0))}
          </p>
        </div>
      </div>

      {/* Gráfico de Barras CSS Simple */}
      <div className="flex items-end justify-between gap-2 h-64 mt-auto">
        {data.map((item) => {
          // Calculamos la altura porcentual relativa al valor máximo
          const heightPercentage = (item.amount / maxVal) * 100;
          
          return (
            <div key={item.month} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
              {/* Tooltip con el monto */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-secondary-900 text-white text-xs py-1 px-2 rounded mb-1 whitespace-nowrap">
                {formatCurrency(item.amount)}
              </div>
              
              {/* La Barra */}
              <div 
                className="w-full bg-primary-100 rounded-t-lg relative overflow-hidden group-hover:bg-primary-200 transition-colors"
                style={{ height: `${heightPercentage}%` }}
              >
                <div className="absolute bottom-0 left-0 w-full bg-primary-500 h-1 group-hover:h-full transition-all duration-500 opacity-20"></div>
              </div>
              
              {/* Etiqueta del mes */}
              <span className="text-xs font-medium text-secondary-500">{item.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}