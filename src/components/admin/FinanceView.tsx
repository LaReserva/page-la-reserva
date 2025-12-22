// src/components/admin/FinanceView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Event, Expense, Payment } from '@/types/index';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, subMonths, addMonths, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Download, Plus, X,
  Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, Loader2, Minus, Search, RefreshCw
} from 'lucide-react';

type FinanceTransaction = 
  | { type: 'income'; date: string; amount: number; description: string; category: string; id: string; reference?: string; clientId?: string }
  | { type: 'expense'; date: string; amount: number; description: string; category: string; id: string; reference?: string; clientId?: string };

export default function FinanceView() {
  const [loading, setLoading] = useState(true);
  
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvents, setActiveEvents] = useState<{id: string, client: {name: string, id: string}}[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  
  // Filtros
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterClient, setFilterClient] = useState('');

  // Modales
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  // Formulario
  const [formData, setFormData] = useState({
    description: '', amount: '', category: 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Eventos: Traemos sus pagos también para calcular el "Por Cobrar" real por evento
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
            id, total_price, status, event_date, quote_id, 
            client:clients(id, name),
            event_payments(amount) 
        `)
        .neq('status', 'cancelled'); // Ignoramos cancelados para la proyección

      if (eventsError) throw eventsError;

      // 2. Pagos (Flujo de Caja)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('event_payments' as any) 
        .select('*, event:events(id, client:clients(id, name))');

      if (paymentsError) throw paymentsError;

      // 3. Gastos
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses' as any)
        .select('*, event:events(id, client:clients(id, name))');

      if (expensesError) throw expensesError;

      const allEvents = (eventsData as unknown as Event[]) || [];
      setEvents(allEvents);
      setActiveEvents(allEvents.map((e: any) => ({ id: e.id, client: e.client })) || []); 
      setPayments(paymentsData || []);
      setExpenses(expensesData || []);

    } catch (error) {
      console.error('Error cargando finanzas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- LÓGICA DE EXPORTAR CSV ---
  const handleExportCSV = () => {
    if (transactions.length === 0) return alert("No hay datos para exportar");

    const headers = ['Fecha', 'Tipo', 'Descripción', 'Referencia', 'Categoría', 'Monto Entrada', 'Monto Salida'];
    const rows = transactions.map(t => {
        const isIncome = t.type === 'income';
        return [
            t.date,
            isIncome ? 'Ingreso' : 'Egreso',
            `"${t.description.replace(/"/g, '""')}"`, // Escapar comillas
            `"${t.reference?.replace(/"/g, '""') || ''}"`,
            t.category,
            isIncome ? t.amount.toFixed(2) : '0.00',
            !isIncome ? t.amount.toFixed(2) : '0.00'
        ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finanzas_la_reserva_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- LÓGICA CENTRAL DE CÁLCULOS ---
  const { kpi, chartData, transactions, dateRangeLabel } = useMemo(() => {
    
    // 1. Rango de Fechas
    let start, end;
    if (filterStartDate && filterEndDate) {
      start = startOfDay(parseISO(filterStartDate));
      end = endOfDay(parseISO(filterEndDate));
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    // 2. Filtrado de Arrays Base
    let filteredPayments = payments.filter(p => isWithinInterval(parseISO(p.payment_date), { start, end }));
    let filteredExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end }));
    // Filtramos eventos que ocurren en este mes (para saber qué cobrar AHORA)
    let filteredEvents = events.filter(e => isWithinInterval(parseISO(e.event_date), { start, end }));

    // 3. Filtro de Cliente
    if (filterClient) {
        filteredPayments = filteredPayments.filter((p: any) => p.event?.client?.id === filterClient);
        filteredExpenses = filteredExpenses.filter((e: any) => e.event?.client?.id === filterClient);
        filteredEvents = filteredEvents.filter((e: any) => (e as any).client?.id === filterClient);
    }

    // --- CÁLCULOS KPI (Corregidos) ---
    
    // A. Devoluciones y Gastos
    const refunds = filteredExpenses.filter(e => e.category === 'devolucion');
    const refundAmount = refunds.reduce((sum, e) => sum + (e.amount || 0), 0);
    const operationalExpensesList = filteredExpenses.filter(e => e.category !== 'devolucion');
    const totalOperationalExpenses = operationalExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    // B. Ingresos
    const grossIncome = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netRealIncome = grossIncome - refundAmount; // ✅ Ingreso Real descuenta devoluciones

    // C. Proyección
    // Solo sumamos eventos activos (no cancelados). Cancelados ya fueron filtrados en fetchData.
    const totalProjectedIncome = filteredEvents.reduce((sum, e) => sum + (e.total_price || 0), 0);
    
    // D. Utilidad
    const netProfit = netRealIncome - totalOperationalExpenses;
    
    // E. POR COBRAR (Lógica Corregida)
    // En lugar de restar flujos mensuales, sumamos la deuda individual de cada evento activo en el periodo.
    const pendingCollection = filteredEvents.reduce((acc, event: any) => {
        // Sumamos todos los pagos históricos de este evento (traídos en el join event_payments)
        const totalPaidForEvent = event.event_payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
        // Calculamos saldo
        const balance = (event.total_price || 0) - totalPaidForEvent;
        // Si el saldo es negativo (error de data) o 0, no sumamos.
        return acc + (balance > 0 ? balance : 0);
    }, 0);

    // --- TABLA ---
    const incomeItems: FinanceTransaction[] = filteredPayments.map(p => ({
        type: 'income',
        id: p.id,
        date: p.payment_date,
        amount: p.amount,
        description: p.notes || (p.is_deposit ? 'Adelanto' : 'Ingreso'),
        category: p.payment_method || 'Transferencia',
        reference: (p as any).event?.client?.name ? `Evento: ${(p as any).event.client.name}` : 'Ingreso Manual',
        clientId: (p as any).event?.client?.id
    }));

    const expenseItems: FinanceTransaction[] = filteredExpenses.map(e => ({
        type: 'expense',
        id: e.id,
        date: e.date,
        amount: e.amount,
        description: e.description,
        category: e.category,
        reference: (e as any).event?.client?.name ? `Evento: ${(e as any).event.client.name}` : 'Gasto General',
        clientId: (e as any).event?.client?.id
    }));

    const allTransactions = [...incomeItems, ...expenseItems].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // --- GRÁFICO ---
    const intervalDays = eachDayOfInterval({ start, end });
    const chart = intervalDays.map(date => {
        const dayStr = format(date, 'yyyy-MM-dd');
        const dayLabel = format(date, 'd');

        const dayRawIncome = filteredPayments.filter(p => p.payment_date === dayStr).reduce((s, p) => s + p.amount, 0);
        const dayRefunds = filteredExpenses.filter(e => e.category === 'devolucion' && e.date === dayStr).reduce((s, e) => s + e.amount, 0);
        const dayIncome = Math.max(0, dayRawIncome - dayRefunds); // Restamos devolución al día para ver el neto
        
        const dayExpense = filteredExpenses.filter(e => e.category !== 'devolucion' && e.date === dayStr).reduce((s, e) => s + e.amount, 0);
        return { date: dayStr, label: dayLabel, income: dayIncome, expense: dayExpense };
    });

    const label = filterStartDate && filterEndDate 
        ? `${format(parseISO(filterStartDate), 'dd MMM')} - ${format(parseISO(filterEndDate), 'dd MMM')}`
        : format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase();

    return {
      kpi: { totalProjectedIncome, netRealIncome, totalOperationalExpenses, netProfit, pendingCollection, refundAmount, grossIncome },
      transactions: allTransactions,
      chartData: chart,
      dateRangeLabel: label
    };
  }, [events, expenses, payments, currentDate, filterStartDate, filterEndDate, filterClient]);

  // --- HANDLERS ---
  const handleSaveTransaction = async (e: React.FormEvent, type: 'income' | 'expense') => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    try {
      const table = type === 'income' ? 'event_payments' : 'expenses';
      const amountVal = parseFloat(formData.amount);
      
      const payload: any = {
        amount: amountVal,
        event_id: formData.event_id === '' ? null : formData.event_id,
      };

      if (type === 'income') {
        payload.payment_date = formData.date;
        payload.payment_method = formData.category; 
        payload.notes = formData.description;
      } else {
        payload.date = formData.date;
        payload.description = formData.description;
        payload.category = formData.category;
      }

      const { error } = await supabase.from(table as any).insert([payload]);
      if (error) throw error;

      // Upselling logic (Solo si es ingreso y tiene evento)
      if (type === 'income' && formData.event_id) {
         const { data: eventData } = await supabase.from('events').select('total_price, quote_id').eq('id', formData.event_id).single();
         if (eventData) {
             const newTotal = (eventData.total_price || 0) + amountVal;
             await supabase.from('events').update({ total_price: newTotal }).eq('id', formData.event_id);
             if (eventData.quote_id) await supabase.from('quotes').update({ estimated_price: newTotal }).eq('id', eventData.quote_id);
         }
      }
      
      await fetchData();
      setIsExpenseModalOpen(false); setIsIncomeModalOpen(false);
      setFormData({ description: '', amount: '', category: 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: '' });
      
    } catch (error: any) {
      alert(`Error al guardar: ${error.message}`);
    }
  };

  const openModal = (type: 'income' | 'expense') => {
    setFormData({ description: '', amount: '', category: type === 'income' ? 'transferencia' : 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: '' });
    if (type === 'income') setIsIncomeModalOpen(true); else setIsExpenseModalOpen(true);
  };

  const clearFilters = () => {
      setFilterStartDate(''); setFilterEndDate(''); setFilterClient(''); setCurrentDate(new Date());
  };

  const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-secondary-400" /></div>;

  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen font-sans text-secondary-900">

      {/* Header & Controles */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div><h1 className="text-2xl font-bold text-gray-900">Finanzas</h1><p className="text-sm text-gray-500">Flujo de caja y control</p></div>
            <div className="flex gap-2">
                <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"><Download size={16} /> Exportar</button>
                <button onClick={() => openModal('income')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"><Plus size={16} /> Ingreso</button>
                <button onClick={() => openModal('expense')} className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"><Minus size={16} /> Gasto</button>
            </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white p-4 rounded-xl border shadow-sm flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 w-full">
                {/* Selector Mes */}
                <div className={`flex items-center gap-2 bg-gray-50 p-1 rounded-lg border ${filterStartDate ? 'opacity-50 pointer-events-none' : ''}`}>
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-200 rounded">{'<'}</button>
                    <div className="flex items-center gap-2 px-2 font-medium min-w-[140px] justify-center text-sm">
                        <CalendarIcon size={16} className="text-gray-500" />{format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}
                    </div>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-200 rounded">{'>'}</button>
                </div>

                <div className="h-8 w-px bg-gray-200 hidden md:block"></div>

                {/* Filtro Rango Fechas */}
                <div className="flex gap-2 items-center">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Desde</span>
                        <input type="date" className="border rounded-lg px-2 py-1 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Hasta</span>
                        <input type="date" className="border rounded-lg px-2 py-1 text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                    </div>
                </div>

                {/* Filtro Cliente */}
                <div className="flex flex-col flex-1 max-w-xs">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Filtrar por Cliente</span>
                    <div className="relative">
                        <Search className="absolute left-2 top-1.5 w-4 h-4 text-gray-400" />
                        <select className="border rounded-lg pl-8 pr-2 py-1.5 text-sm w-full appearance-none bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer" value={filterClient} onChange={(e) => setFilterClient(e.target.value)}>
                            <option value="">Todos los Clientes</option>
                            {Array.from(new Map(activeEvents.map(item => [item.client.id, item.client])).values()).map((client: any) => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* BOTÓN LIMPIAR FILTROS MEJORADO */}
            {(filterStartDate || filterClient) && (
                <button 
                    onClick={clearFilters} 
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all text-xs font-bold shadow-sm"
                >
                    <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                    Limpiar Filtros
                </button>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Ingreso Real (Neto)" value={kpi.netRealIncome} icon={DollarSign} color="bg-green-100 text-green-700" subText={kpi.refundAmount > 0 ? `-${formatMoney(kpi.refundAmount)} dev.` : "Limpio en caja"} />
        <KpiCard title="Proyectado" value={kpi.totalProjectedIncome} icon={TrendingUp} color="bg-blue-100 text-blue-700" subText="Eventos activos del periodo" />
        <KpiCard title="Gastos Operativos" value={kpi.totalOperationalExpenses} icon={TrendingDown} color="bg-red-100 text-red-700" subText="Sin devoluciones" />
        <KpiCard title="Utilidad Neta" value={kpi.netProfit} icon={Wallet} color={kpi.netProfit >= 0 ? "bg-indigo-100 text-indigo-700" : "bg-orange-100 text-orange-700"} isBold subText="Real - Gastos" />
      </div>

      {/* Gráfico y Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-bold text-gray-800">Flujo Diario</h3><span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{dateRangeLabel}</span></div>
          <div className="flex-1 flex items-end gap-1 h-64 pb-6 relative">
              {chartData.map((d, i) => {
                  const max = Math.max(...chartData.map(x => Math.max(x.income, x.expense))) || 1;
                  const showLabel = chartData.length > 20 ? i % 3 === 0 : true; 
                  return (
                      <div key={d.date} className="flex-1 flex flex-col justify-end gap-0.5 group relative h-full">
                          <div className="w-full flex gap-[1px] items-end justify-center h-full">
                             {d.income > 0 && <div style={{ height: `${(d.income / max) * 100}%` }} className="bg-green-400 opacity-80 w-full min-h-[4px] rounded-t-sm"></div>}
                             {d.expense > 0 && <div style={{ height: `${(d.expense / max) * 100}%` }} className="bg-red-400 opacity-80 w-full min-h-[4px] rounded-t-sm"></div>}
                          </div>
                          {showLabel && <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-mono">{d.label}</span>}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-gray-800 text-white text-[10px] p-2 rounded z-10 whitespace-nowrap shadow-lg">
                             <span className="font-bold border-b border-gray-600 pb-1 mb-1">{format(parseISO(d.date), 'dd MMM yyyy', {locale: es})}</span>
                             <span className="text-green-300">In: {formatMoney(d.income)}</span>
                             <span className="text-red-300">Out: {formatMoney(d.expense)}</span>
                          </div>
                      </div>
                  )
              })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Resumen Periodo</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Por Cobrar</span><span className="font-bold text-orange-600">{formatMoney(kpi.pendingCollection)}</span>
                </div>
                <div className="h-px bg-gray-100 my-2"></div>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Ingresos Brutos</span><span className="text-gray-800 font-medium">{formatMoney(kpi.grossIncome)}</span></div>
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
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800">Movimientos Detallados</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
              <tr><th className="px-6 py-3">Fecha</th><th className="px-6 py-3">Descripción</th><th className="px-6 py-3">Ref. / Cliente</th><th className="px-6 py-3">Método</th><th className="px-6 py-3 text-right">Monto</th><th className="px-6 py-3 text-center">Tipo</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay datos con los filtros actuales.</td></tr> : transactions.map((t) => (
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

      {/* Modal (Reutilizado) */}
      {(isExpenseModalOpen || isIncomeModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">{isIncomeModalOpen ? 'Registrar Ingreso Extra' : 'Registrar Salida de Dinero'}</h3>
              <button onClick={() => {setIsExpenseModalOpen(false); setIsIncomeModalOpen(false)}}><X size={20} className="text-gray-400 hover:text-gray-600" /></button>
            </div>
            <form onSubmit={(e) => handleSaveTransaction(e, isIncomeModalOpen ? 'income' : 'expense')} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asignar a Evento (Opcional)</label>
                <select 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                    value={formData.event_id}
                    onChange={e => setFormData({...formData, event_id: e.target.value})}
                >
                    <option value="">-- Sin asignar (General) --</option>
                    {activeEvents.map((ev: any) => (
                        <option key={ev.id} value={ev.id}>{ev.client.name} ({ev.id.slice(0,4)})</option>
                    ))}
                </select>
                {isIncomeModalOpen && formData.event_id && <p className="text-[10px] text-blue-600 mt-1">Nota: Al guardar, el precio total del evento aumentará automáticamente.</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descripción</label>
                <input type="text" required className="w-full px-3 py-2 border rounded-lg" placeholder="Ej: Venta extra" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Monto (S/)</label>
                  <input type="number" required min="0" step="0.01" className="w-full px-3 py-2 border rounded-lg font-mono" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                   <input type="date" required className="w-full px-3 py-2 border rounded-lg" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{isIncomeModalOpen ? 'Método' : 'Categoría'}</label>
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