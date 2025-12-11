
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Expense, FinanceItem } from '@/types/index';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Plus,
  X,
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2
} from 'lucide-react';

export default function FinanceView() {
  // --- Estados ---
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date()); // Para filtrar mes/año
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado para el formulario de nuevo gasto
  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    category: 'insumos',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  // --- Carga de Datos ---
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Traer Eventos (Solo confirmados o completados cuentan como ingreso real/proyectado)
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .in('status', ['confirmed', 'completed']);

      if (eventsError) throw eventsError;

      // 2. Traer Gastos
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*');

      if (expensesError) throw expensesError;

      // En fetchData:
        setEvents((eventsData as unknown as Event[]) || []);
        setExpenses((expensesData as unknown as Expense[]) || []);
    } catch (error) {
      console.error('Error cargando finanzas:', error);
      alert('Error al cargar datos financieros');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Lógica de Filtrado y Cálculos (KPIs) ---
  const { filteredItems, kpi, monthlyChartData } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    // Filtrar por el mes seleccionado
    const filteredEvents = events.filter(e =>
      isWithinInterval(parseISO(e.event_date), { start, end })
    );
    const filteredExpenses = expenses.filter(e =>
      isWithinInterval(parseISO(e.date), { start, end })
    );

    // Cálculos KPI
    const totalIncome = filteredEvents.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
    const totalCollected = filteredEvents.reduce((acc, curr) => acc + (curr.deposit_paid || 0), 0);
    const totalPending = totalIncome - totalCollected;
    const totalExpenses = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const netProfit = totalCollected - totalExpenses;

    // Lista unificada para la tabla
    const items: FinanceItem[] = [
      ...filteredEvents.map(e => ({ type: 'income' as const, data: e })),
      ...filteredExpenses.map(e => ({ type: 'expense' as const, data: e }))
    ].sort((a, b) => {
      const dateA = a.type === 'income' ? a.data.event_date : a.data.date;
      const dateB = b.type === 'income' ? b.data.event_date : b.data.date;
      return new Date(dateB).getTime() - new Date(dateA).getTime(); // Orden descendente
    });

    // Datos simples para gráfico (agrupado por día)
    // Nota: Para un gráfico real robusto usaría Recharts, aquí hacemos una aproximación visual simple
    const daysInMonth = end.getDate();
    const chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dayIncome = filteredEvents
        .filter(e => parseISO(e.event_date).getDate() === day)
        .reduce((sum, e) => sum + e.deposit_paid, 0);
      const dayExpense = filteredExpenses
        .filter(e => parseISO(e.date).getDate() === day)
        .reduce((sum, e) => sum + e.amount, 0);
      return { day, income: dayIncome, expense: dayExpense };
    });

    return {
      filteredItems: items,
      kpi: { totalIncome, totalCollected, totalPending, totalExpenses, netProfit },
      monthlyChartData: chartData
    };
  }, [events, expenses, currentDate]);

  // --- Handlers ---
const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.amount || !newExpense.description) return;

    try {
      // ✅ CORRECCIÓN: Forzamos el tipo de 'category' usando 'as ...'
      const { error } = await supabase.from('expenses').insert([{
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: newExpense.category as 'insumos' | 'personal' | 'marketing' | 'otros',
        date: newExpense.date,
      }]);

      if (error) throw error;

      await fetchData(); 
      setIsModalOpen(false);
      // Reiniciamos el formulario
      setNewExpense({ 
        description: '', 
        amount: '', 
        category: 'insumos', 
        date: format(new Date(), 'yyyy-MM-dd') 
      });
    } catch (error) {
      console.error(error);
      alert('Error guardando gasto');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Descripción', 'Categoría/Estado', 'Monto Entrada', 'Monto Salida'];
    const rows = filteredItems.map(item => {
      const isIncome = item.type === 'income';
      const date = isIncome ? item.data.event_date : item.data.date;
      const desc = isIncome ? `Evento ID: ${item.data.id.slice(0, 6)}` : item.data.description;
      const cat = isIncome ? item.data.status : item.data.category;
      const inAmount = isIncome ? item.data.deposit_paid : 0;
      const outAmount = isIncome ? 0 : item.data.amount;

      return [date, isIncome ? 'Ingreso' : 'Gasto', desc, cat, inAmount, outAmount].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finanzas_${format(currentDate, 'yyyy_MM')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatMoney = (amount: number) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-gray-500" /></div>;

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">

      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Financiero</h1>
          <p className="text-sm text-gray-500">Resumen económico de La Reserva</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded">{'<'}</button>
          <div className="flex items-center gap-2 px-2 font-medium min-w-[140px] justify-center">
            <CalendarIcon size={16} />
            {format(currentDate, 'MMMM yyyy', { locale: es })}
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded">{'>'}</button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 shadow-sm"
          >
            <Download size={16} /> Exportar
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black shadow-sm transition-colors"
          >
            <Plus size={16} /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* --- KPI Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Ingresos Totales (Proyectado)" value={kpi.totalIncome} icon={TrendingUp} color="text-blue-600" subText="Valor total eventos confirmados" />
        <KpiCard title="Cobrado Real (Caja)" value={kpi.totalCollected} icon={DollarSign} color="text-green-600" subText="Depósitos recibidos" />
        <KpiCard title="Gastos Operativos" value={kpi.totalExpenses} icon={TrendingDown} color="text-red-600" subText="Salidas registradas este mes" />
        <KpiCard
          title="Utilidad Neta (Real)"
          value={kpi.netProfit}
          icon={Wallet}
          color={kpi.netProfit >= 0 ? "text-indigo-600" : "text-red-500"}
          subText="Cobrado - Gastos"
          isBold
        />
      </div>

      {/* --- Gráfico Simplificado (Barras CSS) --- */}
      <div className="bg-white p-6 rounded-xl border shadow-sm">
        <h3 className="text-lg font-semibold mb-6">Flujo de Caja - {format(currentDate, 'MMMM', { locale: es })}</h3>
        <div className="flex items-end h-48 gap-1 md:gap-2">
            {monthlyChartData.map((dayData) => {
                const maxVal = Math.max(...monthlyChartData.map(d => Math.max(d.income, d.expense))) || 1;
                const incomeH = (dayData.income / maxVal) * 100;
                const expenseH = (dayData.expense / maxVal) * 100;
                return (
                    <div key={dayData.day} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                        <div className="w-full flex gap-0.5 items-end justify-center h-full">
                            {/* Barra Ingreso */}
                            <div style={{ height: `${incomeH}%` }} className="w-1.5 md:w-3 bg-green-400 rounded-t-sm opacity-80 hover:opacity-100 transition-all"></div>
                            {/* Barra Gasto */}
                            <div style={{ height: `${expenseH}%` }} className="w-1.5 md:w-3 bg-red-400 rounded-t-sm opacity-80 hover:opacity-100 transition-all"></div>
                        </div>
                        {/* Tooltip simple */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-gray-800 text-white text-xs p-2 rounded z-10 whitespace-nowrap">
                            <span>Día {dayData.day}</span>
                            <span className="text-green-300">In: {formatMoney(dayData.income)}</span>
                            <span className="text-red-300">Out: {formatMoney(dayData.expense)}</span>
                        </div>
                    </div>
                )
            })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-400 border-t pt-2">
            <span>Día 1</span>
            <span>Fin de Mes</span>
        </div>
      </div>

      {/* --- Tabla de Movimientos --- */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="font-semibold text-gray-800">Movimientos del Mes</h3>
          <span className="text-xs bg-gray-200 px-2 py-1 rounded-full text-gray-600">{filteredItems.length} registros</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3">Categoría / Tipo</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">No hay movimientos este mes</td></tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isIncome = item.type === 'income';
                  const date = isIncome ? item.data.event_date : item.data.date;
                  const amount = isIncome ? item.data.deposit_paid : item.data.amount;
                  const description = isIncome
                    ? `Evento (ID: ${item.data.id.slice(0, 4)}...)`
                    : item.data.description;

                  return (
                    <tr key={`${item.type}-${item.data.id}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-600 font-medium">
                        {format(parseISO(date), 'dd MMM', { locale: es })}
                      </td>
                      <td className="px-6 py-3 text-gray-800">{description}</td>
                      <td className="px-6 py-3">
                        {isIncome ? (
                           <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                             Servicio
                           </span>
                        ) : (
                           <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 capitalize">
                             {item.data.category}
                           </span>
                        )}
                      </td>
                      <td className={`px-6 py-3 text-right font-bold ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                        {isIncome ? '+' : '-'}{formatMoney(amount)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {isIncome ? (
                            <ArrowDownLeft size={16} className="mx-auto text-green-500" />
                        ) : (
                            <ArrowUpRight size={16} className="mx-auto text-red-500" />
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Modal Registrar Gasto --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-semibold text-gray-900">Registrar Nuevo Gasto</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-gray-900 focus:outline-none transition-colors"
                  placeholder="Ej: Compra de hielo"
                  value={newExpense.description}
                  onChange={e => setNewExpense({ ...newExpense, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-gray-900 focus:outline-none"
                    placeholder="0.00"
                    value={newExpense.amount}
                    onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })}
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                   <input
                     type="date"
                     required
                     className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-gray-900 focus:outline-none"
                     value={newExpense.date}
                     onChange={e => setNewExpense({ ...newExpense, date: e.target.value })}
                   />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-gray-900 focus:outline-none"
                  value={newExpense.category}
                  onChange={e => setNewExpense({ ...newExpense, category: e.target.value as any })}
                >
                  <option value="insumos">Insumos</option>
                  <option value="personal">Personal</option>
                  <option value="marketing">Marketing</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-black rounded-lg"
                >
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente pequeño auxiliar para las tarjetas
function KpiCard({ title, value, icon: Icon, color, subText, isBold = false }: any) {
  const formatted = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
  return (
    <div className="bg-white p-5 rounded-xl border shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className={`text-2xl ${isBold ? 'font-bold' : 'font-semibold'} text-gray-900`}>{formatted}</h3>
        <p className="text-xs text-gray-400 mt-1">{subText}</p>
      </div>
      <div className={`p-3 rounded-lg bg-opacity-10 ${color.replace('text-', 'bg-')} ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  );
}