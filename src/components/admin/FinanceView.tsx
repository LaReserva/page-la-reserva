import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Expense, Payment } from '@/types/index';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Download, X,
  Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, Loader2, Plus, Minus
} from 'lucide-react';

type FinanceTransaction = 
  | { type: 'income'; date: string; amount: number; description: string; category: string; id: string; reference?: string }
  | { type: 'expense'; date: string; amount: number; description: string; category: string; id: string; reference?: string };

export default function FinanceView() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]); // Para proyección
  const [activeEvents, setActiveEvents] = useState<{id: string, client: {name: string}}[]>([]); // Para el select del modal
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Estados de Modales
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  // Formularios
  const [formData, setFormData] = useState({
    description: '', amount: '', category: 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Eventos (Proyección y Lista para Select)
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, total_price, status, event_date, client:clients(name)')
        .neq('status', 'cancelled'); // Traemos activos para el select

      // 2. Pagos
      const { data: paymentsData } = await supabase
        .from('event_payments' as any) 
        .select('*, event:events(id, client:clients(name))');

      // 3. Gastos
      const { data: expensesData } = await supabase
        .from('expenses' as any)
        .select('*, event:events(id, client:clients(name))');

      const allEvents = (eventsData as unknown as Event[]) || [];
      
      setEvents(allEvents.filter(e => ['confirmed', 'completed'].includes(e.status))); // Solo confirmados para KPI proyección
      setActiveEvents(allEvents.map((e: any) => ({ id: e.id, client: e.client })) || []); // Lista simple para el select
      
      setPayments(paymentsData || []);
      setExpenses(expensesData || []);

    } catch (error) {
      console.error('Error cargando finanzas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const { kpi, chartData, transactions } = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

    const monthPayments = payments.filter(p => isWithinInterval(parseISO(p.payment_date), { start, end }));
    const monthExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end }));
    const monthEvents = events.filter(e => isWithinInterval(parseISO(e.event_date), { start, end }));

    // --- LÓGICA CORE FINANCIERA MEJORADA ---
    
    // 1. Detectar Devoluciones (Gastos con categoría 'devolucion' o descripción similar)
    const refunds = monthExpenses.filter(e => e.category === 'devolucion');
    const refundAmount = refunds.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 2. Gastos Operativos Reales (Todo gasto MENOS devoluciones)
    const operationalExpensesList = monthExpenses.filter(e => e.category !== 'devolucion');
    const totalOperationalExpenses = operationalExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    // 3. Ingreso Bruto (Entrada de dinero total)
    const grossIncome = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // 4. Ingreso Neto Real (Lo que entró - Lo que devolviste)
    const netRealIncome = grossIncome - refundAmount;

    // 5. Proyección (Contratos cerrados)
    const totalProjectedIncome = monthEvents.reduce((sum, e) => sum + (e.total_price || 0), 0);
    
    // 6. Utilidad (Ingreso Neto - Gastos Operativos)
    const netProfit = netRealIncome - totalOperationalExpenses;
    
    // 7. Por Cobrar
    const pendingCollection = totalProjectedIncome - netRealIncome; 

    // --- CONSTRUCCIÓN DE TABLA ---
    const incomeItems: FinanceTransaction[] = monthPayments.map(p => ({
        type: 'income',
        id: p.id,
        date: p.payment_date,
        amount: p.amount,
        description: p.notes || (p.is_deposit ? 'Adelanto' : 'Ingreso'),
        category: p.payment_method || 'Transferencia',
        reference: (p as any).event?.client?.name ? `Evento: ${(p as any).event.client.name}` : 'Ingreso General'
    }));

    const expenseItems: FinanceTransaction[] = monthExpenses.map(e => ({
        type: 'expense',
        id: e.id,
        date: e.date,
        amount: e.amount,
        description: e.description,
        category: e.category,
        reference: (e as any).event?.client?.name ? `Evento: ${(e as any).event.client.name}` : 'Gasto General'
    }));

    const allTransactions = [...incomeItems, ...expenseItems].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // --- GRÁFICO (Usamos Ingreso Neto vs Gasto Operativo) ---
    const daysInMonth = end.getDate();
    const chart = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      // Ingreso del día menos devoluciones del día
      const dayRawIncome = monthPayments.filter(p => parseISO(p.payment_date).getDate() === day).reduce((s, p) => s + p.amount, 0);
      const dayRefunds = monthExpenses.filter(e => e.category === 'devolucion' && parseISO(e.date).getDate() === day).reduce((s, e) => s + e.amount, 0);
      
      const dayIncome = dayRawIncome - dayRefunds;
      
      // Gasto del día (sin devoluciones)
      const dayExpense = monthExpenses.filter(e => e.category !== 'devolucion' && parseISO(e.date).getDate() === day).reduce((s, e) => s + e.amount, 0);
      
      return { day, income: dayIncome > 0 ? dayIncome : 0, expense: dayExpense };
    });

    return {
      kpi: { totalProjectedIncome, netRealIncome, totalOperationalExpenses, netProfit, pendingCollection, refundAmount },
      transactions: allTransactions,
      chartData: chart
    };
  }, [events, expenses, payments, currentDate]);

  // --- HANDLERS ---
  const handleSaveTransaction = async (e: React.FormEvent, type: 'income' | 'expense') => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    try {
      const table = type === 'income' ? 'event_payments' : 'expenses';
      
      // Construimos el objeto base limpio
      let payload: any = {
        amount: parseFloat(formData.amount),
        event_id: formData.event_id === '' ? null : formData.event_id,
      };

      // Asignamos campos específicos según la tabla
      if (type === 'income') {
        payload.payment_date = formData.date; // event_payments usa payment_date
        payload.payment_method = formData.category; 
        payload.notes = formData.description;
      } else {
        payload.date = formData.date; // expenses usa date
        payload.description = formData.description;
        payload.category = formData.category;
      }

      const { error } = await supabase.from(table as any).insert([payload]);

      if (error) throw error;
      
      await fetchData();
      setIsExpenseModalOpen(false);
      setIsIncomeModalOpen(false);
      // Reset form
      setFormData({ description: '', amount: '', category: 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: '' });
      
      // Feedback visual simple (opcional, ya que se cierra el modal)
      // alert('Movimiento guardado'); 
      
    } catch (error: any) {
      console.error('Error detallado:', error.message); // Ver consola para detalles
      alert(`Error al guardar: ${error.message}`);
    }
  };

  const openModal = (type: 'income' | 'expense') => {
    setFormData({ description: '', amount: '', category: type === 'income' ? 'transferencia' : 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: '' });
    if (type === 'income') setIsIncomeModalOpen(true);
    else setIsExpenseModalOpen(true);
  };

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-secondary-400" /></div>;

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen font-sans text-secondary-900">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Finanzas</h1><p className="text-sm text-gray-500">Flujo de caja y control</p></div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded">{'<'}</button>
          <div className="flex items-center gap-2 px-2 font-medium min-w-[140px] justify-center text-sm">
            <CalendarIcon size={16} className="text-primary-500" />{format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}
          </div>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-100 rounded">{'>'}</button>
        </div>
        <div className="flex gap-2">
            <button onClick={() => openModal('income')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"><Plus size={16} /> Ingreso</button>
            <button onClick={() => openModal('expense')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"><Minus size={16} /> Gasto</button>
        </div>
      </div>

      {/* KPI Cards MEJORADAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
            title="Ingreso Real (Neto)" 
            value={kpi.netRealIncome} 
            icon={DollarSign} 
            color="bg-green-100 text-green-700" 
            subText={kpi.refundAmount > 0 ? `Se descontaron ${formatMoney(kpi.refundAmount)} en dev.` : "Dinero en caja limpio"}
        />
        <KpiCard title="Proyectado" value={kpi.totalProjectedIncome} icon={TrendingUp} color="bg-blue-100 text-blue-700" subText="Contratos confirmados" />
        <KpiCard title="Gastos Operativos" value={kpi.totalOperationalExpenses} icon={TrendingDown} color="bg-red-100 text-red-700" subText="No incluye devoluciones" />
        <KpiCard title="Utilidad Neta" value={kpi.netProfit} icon={Wallet} color={kpi.netProfit >= 0 ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"} isBold subText="Real - Gastos" />
      </div>

      {/* Gráfico */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Flujo Diario (Neto)</h3>
          <div className="flex items-end h-48 gap-1">
              {chartData.map((d) => {
                  const max = Math.max(...chartData.map(x => Math.max(x.income, x.expense))) || 1;
                  return (
                      <div key={d.day} className="flex-1 flex flex-col justify-end gap-0.5 group relative h-full">
                          {d.income > 0 && <div style={{ height: `${(d.income / max) * 100}%` }} className="bg-green-400 opacity-80 rounded-t-sm w-full min-h-[4px]"></div>}
                          {d.expense > 0 && <div style={{ height: `${(d.expense / max) * 100}%` }} className="bg-red-400 opacity-80 rounded-t-sm w-full min-h-[4px]"></div>}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-[10px] p-2 rounded z-10 whitespace-nowrap">Día {d.day}: +{d.income} / -{d.expense}</div>
                      </div>
                  )
              })}
          </div>
        </div>
        {/* Balance */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Balance</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Por Cobrar</span><span className="font-bold text-orange-600">{formatMoney(kpi.pendingCollection)}</span>
                </div>
                <div className="h-px bg-gray-100 my-2"></div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Ingresos Brutos</span><span className="text-gray-800 font-medium">{formatMoney(kpi.netRealIncome + kpi.refundAmount)}</span></div>
                    <div className="flex justify-between"><span className="text-red-500">Devoluciones</span><span className="text-red-600 font-medium">-{formatMoney(kpi.refundAmount)}</span></div>
                    <div className="h-px bg-gray-100 my-1"></div>
                    <div className="flex justify-between"><span className="text-gray-500">Gastos Op.</span><span className="text-red-600 font-medium">-{formatMoney(kpi.totalOperationalExpenses)}</span></div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t"><span>Ganancia</span><span className={kpi.netProfit >= 0 ? "text-indigo-600" : "text-red-500"}>{formatMoney(kpi.netProfit)}</span></div>
                </div>
            </div>
        </div>
      </div>

      {/* Tabla Movimientos */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800">Movimientos Recientes</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
              <tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">Descripción</th><th className="px-6 py-3">Referencia</th><th className="px-6 py-3">Cat./Método</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-center">Tipo</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin movimientos</td></tr> : transactions.map((t) => (
                <tr key={`${t.type}-${t.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-600">{format(parseISO(t.date), 'dd MMM', { locale: es })}</td>
                    <td className="px-6 py-3 text-gray-800">{t.description}</td>
                    <td className="px-6 py-3 text-xs text-gray-500 italic">{t.reference}</td>
                    <td className="px-6 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${t.category === 'devolucion' ? 'bg-red-100 text-red-700 border-red-200' : t.type === 'income' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{t.category}</span></td>
                    <td className={`px-6 py-3 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}</td>
                    <td className="px-6 py-3 text-center">{t.type === 'income' ? <ArrowDownLeft size={16} className="mx-auto text-green-500"/> : <ArrowUpRight size={16} className="mx-auto text-red-500"/>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Reutilizable para Ingreso y Gasto */}
      {(isExpenseModalOpen || isIncomeModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{isIncomeModalOpen ? 'Registrar Ingreso Manual' : 'Registrar Salida de Dinero'}</h3>
              <button onClick={() => {setIsExpenseModalOpen(false); setIsIncomeModalOpen(false)}}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={(e) => handleSaveTransaction(e, isIncomeModalOpen ? 'income' : 'expense')} className="p-6 space-y-4">
              
              {/* Selector de Evento */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar a Evento (Opcional)</label>
                <select 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                    value={formData.event_id}
                    onChange={e => setFormData({...formData, event_id: e.target.value})}
                >
                    <option value="">-- Sin asignar (General) --</option>
                    {activeEvents.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.client.name} ({ev.id.slice(0,4)})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                <input type="text" required className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder={isIncomeModalOpen ? "Ej: Venta de mobiliario" : "Ej: Pago staff"} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto (S/)</label>
                  <input type="number" required min="0" step="0.01" className="w-full px-3 py-2 border rounded-lg font-mono" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                   <input type="date" required className="w-full px-3 py-2 border rounded-lg" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isIncomeModalOpen ? 'Método de Pago' : 'Categoría'}</label>
                <select className="w-full px-3 py-2 border rounded-lg bg-white" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  {isIncomeModalOpen ? (
                      <>
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                        <option value="yape">Yape / Plin</option>
                        <option value="tarjeta">Tarjeta</option>
                        <option value="otros">Otros</option>
                      </>
                  ) : (
                      <>
                        <option value="insumos">Insumos</option>
                        <option value="personal">Personal</option>
                        <option value="marketing">Marketing</option>
                        <option value="devolucion">Devolución</option>
                        <option value="otros">Otros</option>
                      </>
                  )}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => {setIsExpenseModalOpen(false); setIsIncomeModalOpen(false)}} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">Cancelar</button>
                <button type="submit" className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-md ${isIncomeModalOpen ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {isIncomeModalOpen ? 'Guardar Ingreso' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, subText, isBold = false }: any) {
    const formatted = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
    return (
      <div className="bg-white p-5 rounded-xl border shadow-sm flex items-start justify-between">
        <div><p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p><h3 className={`text-2xl ${isBold ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>{formatted}</h3><p className="text-[10px] text-gray-400 mt-1">{subText}</p></div>
        <div className={`p-3 rounded-lg ${color}`}><Icon size={24} /></div>
      </div>
    );
}