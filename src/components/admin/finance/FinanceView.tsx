// src/components/admin/finance/FinanceView.tsx
import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import type { Event } from '@/types/index';
// ✅ PERFORMANCE: Eliminamos el import estático de XLSX
import { 
  format, parseISO, startOfMonth, endOfMonth, isWithinInterval, 
  subMonths, addMonths, startOfDay, endOfDay, eachDayOfInterval, 
  differenceInDays, isValid 
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, TrendingDown, Wallet, Plus, X,
  Calendar as CalendarIcon, ArrowUpRight, ArrowDownLeft, Loader2, Minus, 
  Filter, FileSpreadsheet, Check, ChevronDown, RefreshCw
} from 'lucide-react';

// --- TIPOS ---
type FinanceTransaction = 
  | { type: 'income'; date: string; amount: number; description: string; category: string; id: string; reference?: string; clientId?: string; created_at: string }
  | { type: 'expense'; date: string; amount: number; description: string; category: string; id: string; reference?: string; clientId?: string; created_at: string };
// --- COMPONENTE LISTBOX ---
interface FinanceListboxProps {
  value: any;
  onChange: (value: any) => void;
  options: { id: string | number; name: string }[];
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}

function FinanceListbox({ value, onChange, options, label, placeholder = "Seleccionar", icon }: FinanceListboxProps) {
  const selectedOption = options.find(opt => opt.id === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative mt-1 w-full">
        {label && <Listbox.Label className="block text-xs font-bold text-secondary-500 uppercase mb-1">{label}</Listbox.Label>}
        <Listbox.Button className="relative w-full cursor-pointer rounded-xl bg-white py-2.5 pl-3 pr-10 text-left border border-secondary-200 focus:outline-none focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20 sm:text-sm transition-all hover:bg-secondary-50">
          <span className="flex items-center gap-2 truncate text-secondary-900">
            {icon && <span className="text-secondary-400 min-w-[16px]">{icon}</span>}
            {selectedOption ? <span className="truncate">{selectedOption.name}</span> : <span className="text-secondary-400">{placeholder}</span>}
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDown className="h-4 w-4 text-secondary-400" aria-hidden="true" />
          </span>
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {/* ✅ UI FIX: z-50 asegura que se vea por encima, pero dependía del overflow del padre (corregido abajo) */}
          <Listbox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl bg-white py-1 text-base shadow-xl ring-1 ring-black/5 focus:outline-none sm:text-sm border border-secondary-100">
            {options.map((option, optionIdx) => (
              <Listbox.Option
                key={optionIdx}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-secondary-50 text-secondary-900' : 'text-secondary-900'
                  }`
                }
                value={option.id}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {option.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600">
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function FinanceView() {
  const [loading, setLoading] = useState(true);
  
  // Data States
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
  const [modalState, setModalState] = useState<{ isOpen: boolean; type: 'income' | 'expense' }>({
    isOpen: false, type: 'income'
  });

  const [formData, setFormData] = useState({
    description: '', amount: '', category: 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`id, total_price, status, event_date, quote_id, client:clients(id, name), event_payments(amount)`)
        .neq('status', 'cancelled');
      if (eventsError) throw eventsError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from('event_payments') 
        .select('*, event:events(id, client:clients(id, name))');
      if (paymentsError) throw paymentsError;

      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
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

  // --- CÁLCULOS (useMemo) ---
  const { kpi, chartData, transactions, dateRangeLabel } = useMemo(() => {
    let start: Date, end: Date;

    // Validación de fechas
    const isValidRange = filterStartDate && filterEndDate && isValid(parseISO(filterStartDate)) && isValid(parseISO(filterEndDate));
    
    if (isValidRange) {
      start = startOfDay(parseISO(filterStartDate));
      end = endOfDay(parseISO(filterEndDate));
      if (differenceInDays(end, start) > 365 || differenceInDays(end, start) < 0) {
        start = startOfMonth(currentDate);
        end = endOfMonth(currentDate);
      }
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    // Filtrado inicial
    let filteredPayments = payments.filter(p => isWithinInterval(parseISO(p.payment_date), { start, end }));
    let filteredExpenses = expenses.filter(e => isWithinInterval(parseISO(e.date), { start, end }));
    let filteredEvents = events.filter(e => isWithinInterval(parseISO(e.event_date), { start, end }));

    if (filterClient) {
        filteredPayments = filteredPayments.filter((p: any) => p.event?.client?.id === filterClient);
        filteredExpenses = filteredExpenses.filter((e: any) => e.event?.client?.id === filterClient);
        filteredEvents = filteredEvents.filter((e: any) => (e as any).client?.id === filterClient);
    }

    // Cálculos KPI
    const refunds = filteredExpenses.filter(e => e.category === 'devolucion');
    const refundAmount = refunds.reduce((sum, e) => sum + (e.amount || 0), 0);
    const operationalExpensesList = filteredExpenses.filter(e => e.category !== 'devolucion');
    const totalOperationalExpenses = operationalExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);

    const grossIncome = filteredPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const netRealIncome = grossIncome - refundAmount;
    const totalProjectedIncome = filteredEvents.reduce((sum, e) => sum + (e.total_price || 0), 0);
    const netProfit = netRealIncome - totalOperationalExpenses;
    
    const pendingCollection = filteredEvents.reduce((acc, event: any) => {
        const totalPaidForEvent = event.event_payments?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
        const balance = (event.total_price || 0) - totalPaidForEvent;
        return acc + (balance > 0 ? balance : 0);
    }, 0);

    // ✅ Mapeo incluyendo created_at para el ordenamiento
    const incomeItems: FinanceTransaction[] = filteredPayments.map(p => ({
        type: 'income', id: p.id, date: p.payment_date, amount: p.amount,
        description: p.notes || (p.is_deposit ? 'Adelanto' : 'Ingreso'),
        category: p.payment_method || 'Transferencia',
        reference: (p as any).event?.client?.name ? `Evento: ${(p as any).event.client.name}` : 'Ingreso Manual',
        clientId: (p as any).event?.client?.id,
        created_at: p.created_at // Importante para desempate
    }));

    const expenseItems: FinanceTransaction[] = filteredExpenses.map(e => ({
        type: 'expense', id: e.id, date: e.date, amount: e.amount,
        description: e.description, category: e.category,
        reference: (e as any).event?.client?.name ? `Evento: ${(e as any).event.client.name}` : 'Gasto General',
        clientId: (e as any).event?.client?.id,
        created_at: e.created_at // Importante para desempate
    }));

    // ✅ LOGIC FIX: Ordenamiento Descendente (Fecha > Hora de Creación)
    const allTransactions = [...incomeItems, ...expenseItems].sort((a, b) => {
      // 1. Comparar Fechas del movimiento
      const dateA = parseISO(a.date).getTime();
      const dateB = parseISO(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA; // Si son fechas distintas, gana la más reciente
      
      // 2. Desempate: Si es el mismo día, usar created_at (el último registrado va arriba)
      const createdA = a.created_at ? parseISO(a.created_at).getTime() : 0;
      const createdB = b.created_at ? parseISO(b.created_at).getTime() : 0;
      return createdB - createdA; 
    });

    // Generación del gráfico
    let chart: { date: string; label: string; income: number; expense: number }[] = [];
    try {
        const intervalDays = eachDayOfInterval({ start, end });
        chart = intervalDays.map(date => {
            const dayStr = format(date, 'yyyy-MM-dd');
            const dayLabel = format(date, 'd');
            const dayRawIncome = filteredPayments.filter(p => p.payment_date === dayStr).reduce((s, p) => s + p.amount, 0);
            const dayRefunds = filteredExpenses.filter(e => e.category === 'devolucion' && e.date === dayStr).reduce((s, e) => s + e.amount, 0);
            const dayIncome = Math.max(0, dayRawIncome - dayRefunds); 
            const dayExpense = filteredExpenses.filter(e => e.category !== 'devolucion' && e.date === dayStr).reduce((s, e) => s + e.amount, 0);
            return { date: dayStr, label: dayLabel, income: dayIncome, expense: dayExpense };
        });
    } catch (e) {
        chart = [];
    }

    const label = filterStartDate && filterEndDate 
        ? `${format(parseISO(filterStartDate), 'dd MMM')} - ${format(parseISO(filterEndDate), 'dd MMM')}`
        : format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase();

    return { kpi: { totalProjectedIncome, netRealIncome, totalOperationalExpenses, netProfit, pendingCollection, refundAmount, grossIncome }, transactions: allTransactions, chartData: chart, dateRangeLabel: label };
  }, [events, expenses, payments, currentDate, filterStartDate, filterEndDate, filterClient]);

  // ==========================================
  // ✅ PERFORMANCE: Importación dinámica de XLSX (Lazy Load)
  // ==========================================
  const handleExportXLSX = async () => {
    if (transactions.length === 0) return alert("No hay datos para exportar");

    try {
        // Importación dinámica: Solo carga la librería cuando se hace click
        const XLSX = await import('xlsx');

        // 1. Mapeo de datos para legibilidad
        const dataToExport = transactions.map(t => ({
        FECHA: format(parseISO(t.date), 'dd/MM/yyyy'),
        TIPO: t.type === 'income' ? 'INGRESO' : 'GASTO',
        DESCRIPCIÓN: t.description,
        REFERENCIA: t.reference || '-',
        CATEGORÍA: t.category.toUpperCase(),
        MONTO: t.type === 'income' ? t.amount : -t.amount,
        }));

        // 2. Crear Hoja de Trabajo
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);

        // 3. Ajustar Ancho de Columnas
        const wscols = [
        { wch: 12 }, // A: Fecha
        { wch: 10 }, // B: Tipo
        { wch: 40 }, // C: Descripción
        { wch: 30 }, // D: Referencia
        { wch: 20 }, // E: Categoría
        { wch: 15 }, // F: Monto
        ];
        worksheet['!cols'] = wscols;

        // 4. Crear Libro y Descargar
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Finanzas");
        XLSX.writeFile(workbook, `Finanzas_LaReserva_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } catch (e) {
        console.error("Error al exportar Excel:", e);
        alert("Hubo un error al generar el Excel.");
    }
  };

  // --- HANDLERS (Guardar Transacción) ---
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    const type = modalState.type;
    try {
      const table = type === 'income' ? 'event_payments' : 'expenses';
      const amountVal = parseFloat(formData.amount);
      const payload: any = { amount: amountVal, event_id: formData.event_id === '' ? null : formData.event_id };

      if (type === 'income') {
        payload.payment_date = formData.date; payload.payment_method = formData.category; payload.notes = formData.description;
      } else {
        payload.date = formData.date; payload.description = formData.description; payload.category = formData.category;
      }

      const { error } = await supabase.from(table as any).insert([payload]);
      if (error) throw error;

      if (type === 'income' && formData.event_id) {
         const { data: eventData } = await supabase.from('events').select('total_price, quote_id').eq('id', formData.event_id).single();
         if (eventData) {
             const newTotal = (eventData.total_price || 0) + amountVal;
             await supabase.from('events').update({ total_price: newTotal }).eq('id', formData.event_id);
             if (eventData.quote_id) await supabase.from('quotes').update({ estimated_price: newTotal }).eq('id', eventData.quote_id);
         }
      }
      await fetchData();
      setModalState({ ...modalState, isOpen: false });
      setFormData({ description: '', amount: '', category: 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: '' });
    } catch (error: any) { alert(`Error al guardar: ${error.message}`); }
  };

  const openModal = (type: 'income' | 'expense') => {
    setFormData({ description: '', amount: '', category: type === 'income' ? 'transferencia' : 'insumos', date: format(new Date(), 'yyyy-MM-dd'), event_id: '' });
    setModalState({ isOpen: true, type });
  };
  const clearFilters = () => { setFilterStartDate(''); setFilterEndDate(''); setFilterClient(''); setCurrentDate(new Date()); };
  const formatMoney = (amount: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  if (loading) return <div className="flex justify-center items-center h-[50vh]"><Loader2 className="animate-spin h-8 w-8 text-secondary-400" /></div>;

  const clientOptions = Array.from(new Map(activeEvents.map(item => [item.client.id, item.client])).values()).map((c: any) => ({ id: c.id, name: c.name }));
  clientOptions.unshift({ id: '', name: 'Todos los Clientes' });

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 min-h-screen font-sans text-secondary-900 animate-in fade-in duration-500">
      
      {/* Header & Controles */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-secondary-900">Finanzas</h1>
              <p className="text-sm text-secondary-500">Flujo de caja y control financiero</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <button onClick={handleExportXLSX} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 hover:border-secondary-300 transition-all shadow-sm whitespace-nowrap">
                  <FileSpreadsheet size={18} className="text-green-600"/> 
                  Exportar
                </button>
                <button onClick={() => openModal('income')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-md transition-colors shadow-green-200 whitespace-nowrap">
                  <Plus size={16} /> Ingreso
                </button>
                <button onClick={() => openModal('expense')} className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors shadow-red-200 whitespace-nowrap">
                  <Minus size={16} /> Gasto
                </button>
            </div>
        </div>

        {/* BARRA DE FILTROS */}
        <div className="bg-white p-4 rounded-2xl border border-secondary-200 shadow-sm flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 w-full items-start md:items-center">
                
                {/* Selector Mes */}
                <div className={`flex items-center gap-2 bg-secondary-50 p-1.5 rounded-xl border border-secondary-200 w-full md:w-auto justify-between md:justify-start ${filterStartDate ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-secondary-500">{'<'}</button>
                    <div className="flex items-center gap-2 px-3 font-bold text-sm text-secondary-700 truncate">
                        <CalendarIcon size={16} className="text-secondary-400 shrink-0" />
                        {format(currentDate, 'MMMM yyyy', { locale: es }).toUpperCase()}
                    </div>
                    <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-secondary-500">{'>'}</button>
                </div>

                <div className="h-8 w-px bg-secondary-200 hidden lg:block"></div>

                {/* Filtro Rango Fechas */}
                <div className="grid grid-cols-2 gap-2 w-full md:w-auto">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-secondary-400 mb-1">Desde</span>
                        <input type="date" className="border border-secondary-200 rounded-xl px-2 py-2 text-sm text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none bg-secondary-50/50 hover:bg-white transition-colors w-full" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-secondary-400 mb-1">Hasta</span>
                        <input type="date" className="border border-secondary-200 rounded-xl px-2 py-2 text-sm text-secondary-700 focus:ring-2 focus:ring-primary-500 outline-none bg-secondary-50/50 hover:bg-white transition-colors w-full" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} />
                    </div>
                </div>

                {/* Filtro Cliente */}
                <div className="w-full md:w-64">
                    <FinanceListbox label="Filtrar por Cliente" value={filterClient} onChange={setFilterClient} options={clientOptions} icon={<Filter className="w-4 h-4" />} />
                </div>
            </div>

            {/* Botón Limpiar */}
            {(filterStartDate || filterClient) && (
                <button onClick={clearFilters} className="w-full lg:w-auto justify-center group flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all text-xs font-bold shadow-sm whitespace-nowrap">
                    <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" /> Limpiar
                </button>
            )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Ingreso Real (Neto)" value={kpi.netRealIncome} icon={DollarSign} color="bg-green-50 text-green-700 border-green-100" subText={kpi.refundAmount > 0 ? `-${formatMoney(kpi.refundAmount)} dev.` : "Limpio en caja"} />
        <KpiCard title="Proyectado" value={kpi.totalProjectedIncome} icon={TrendingUp} color="bg-blue-50 text-blue-700 border-blue-100" subText="Eventos activos del periodo" />
        <KpiCard title="Gastos Operativos" value={kpi.totalOperationalExpenses} icon={TrendingDown} color="bg-red-50 text-red-700 border-red-100" subText="Sin devoluciones" />
        <KpiCard title="Utilidad Neta" value={kpi.netProfit} icon={Wallet} color={kpi.netProfit >= 0 ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-orange-50 text-orange-700 border-orange-100"} isBold subText="Real - Gastos" />
      </div>

      {/* Gráfico y Balance */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-secondary-900">Flujo Diario</h3>
            <span className="text-xs font-bold bg-secondary-100 px-3 py-1.5 rounded-full text-secondary-600 uppercase tracking-wide">{dateRangeLabel}</span>
          </div>
          <div className="flex-1 flex items-end gap-1 h-64 pb-6 relative border-b border-dashed border-secondary-200">
              {chartData.map((d, i) => {
                  const max = Math.max(...chartData.map(x => Math.max(x.income, x.expense))) || 1;
                  const showLabel = chartData.length > 20 ? i % 5 === 0 : true;
                  return (
                      <div key={d.date} className="flex-1 flex flex-col justify-end gap-1 group relative h-full cursor-pointer">
                          <div className="w-full flex gap-[2px] items-end justify-center h-full">
                             {d.income > 0 && <div style={{ height: `${(d.income / max) * 100}%` }} className="bg-green-400 w-full min-h-[4px] rounded-t-sm"></div>}
                             {d.expense > 0 && <div style={{ height: `${(d.expense / max) * 100}%` }} className="bg-red-400 w-full min-h-[4px] rounded-t-sm"></div>}
                          </div>
                          {showLabel && <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[9px] sm:text-[10px] text-secondary-400 font-medium">{d.label}</span>}
                      </div>
                  )
              })}
          </div>
        </div>

        {/* Resumen Lateral */}
        <div className="bg-white p-6 rounded-2xl border border-secondary-200 shadow-sm h-fit">
            <h3 className="text-lg font-bold mb-4 text-secondary-900">Resumen Periodo</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-orange-50 border border-orange-100 rounded-xl">
                    <span className="text-sm font-medium text-orange-800">Por Cobrar</span>
                    <span className="font-bold text-orange-600 text-lg">{formatMoney(kpi.pendingCollection)}</span>
                </div>
                <div className="h-px bg-secondary-100 my-2"></div>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-secondary-500">Ingresos Brutos</span><span className="text-secondary-900 font-bold">{formatMoney(kpi.grossIncome)}</span></div>
                    <div className="flex justify-between"><span className="text-red-500">Devoluciones</span><span className="text-red-600 font-medium">-{formatMoney(kpi.refundAmount)}</span></div>
                    <div className="h-px bg-secondary-50 my-1"></div>
                    <div className="flex justify-between"><span className="text-secondary-500">Gastos Op.</span><span className="text-red-600 font-medium">-{formatMoney(kpi.totalOperationalExpenses)}</span></div>
                    <div className="flex justify-between text-base font-bold pt-3 border-t border-secondary-200 mt-2">
                      <span>Ganancia</span>
                      <span className={kpi.netProfit >= 0 ? "text-indigo-600" : "text-red-500"}>{formatMoney(kpi.netProfit)}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Tabla Movimientos */}
      <div className="bg-white rounded-2xl border border-secondary-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200 bg-secondary-50 flex justify-between items-center">
          <h3 className="font-bold text-secondary-900">Movimientos Detallados</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-secondary-500 uppercase bg-secondary-50 border-b border-secondary-200 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Ref. / Cliente</th>
                <th className="px-6 py-4">Método</th>
                <th className="px-6 py-4 text-right">Monto</th>
                <th className="px-6 py-4 text-center">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-secondary-400">No hay movimientos.</td></tr> 
              ) : transactions.map((t) => (
                <tr key={`${t.type}-${t.id}`} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-secondary-700">{format(parseISO(t.date), 'dd MMM', { locale: es })}</td>
                    <td className="px-6 py-4 text-secondary-900 font-medium">{t.description}</td>
                    <td className="px-6 py-4 text-xs text-secondary-500 italic">{t.reference}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${t.category === 'devolucion' ? 'bg-red-50 text-red-700 border-red-100' : t.type === 'income' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                          {t.type === 'income' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL UNIFICADO --- */}
      <Transition appear show={modalState.isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setModalState({ ...modalState, isOpen: false })}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                {/* ✅ UI FIX: Eliminado 'overflow-hidden' para permitir que el Listbox salga del contenedor */}
                <Dialog.Panel className="w-full max-w-md transform rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-secondary-100">
                  <div className="flex justify-between items-center mb-6 border-b border-secondary-100 pb-4">
                    <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 flex items-center gap-2">
                        {modalState.type === 'income' ? (
                          <span className="flex items-center gap-2 text-green-700"><div className="p-1 bg-green-100 rounded-lg"><Plus size={18}/></div> Nuevo Ingreso</span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-700"><div className="p-1 bg-red-100 rounded-lg"><Minus size={18}/></div> Nueva Salida</span>
                        )}
                    </Dialog.Title>
                    <button onClick={() => setModalState({ ...modalState, isOpen: false })} className="text-secondary-400 hover:bg-secondary-100 p-1.5 rounded-lg transition-colors"><X size={20} /></button>
                  </div>
                  <form onSubmit={handleSaveTransaction} className="space-y-5">
                    <div>
                      <FinanceListbox label="Asignar a Evento (Opcional)" value={formData.event_id} onChange={(val) => setFormData({...formData, event_id: val})} options={[{ id: '', name: '-- Sin asignar (General) --' }, ...activeEvents.map((ev: any) => ({ id: ev.id, name: `${ev.client.name} (${ev.id.slice(0,4)})` }))]} placeholder="Buscar evento..." />
                      {modalState.type === 'income' && formData.event_id && <p className="text-[11px] text-blue-600 mt-2 bg-blue-50 p-2 rounded-lg border border-blue-100">ℹ️ Nota: Al guardar, el precio total del evento aumentará automáticamente.</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Descripción</label>
                      <input type="text" required className="w-full px-3 py-2.5 border border-secondary-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm" placeholder="Ej: Pago adicional" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Monto (S/)</label>
                        <input type="number" required min="0" step="0.01" className="w-full px-3 py-2.5 border border-secondary-200 rounded-xl font-mono font-bold text-secondary-900 focus:ring-2 focus:ring-primary-500 outline-none text-sm" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-secondary-500 uppercase mb-1">Fecha</label>
                          <input type="date" required className="w-full px-3 py-2.5 border border-secondary-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none bg-white" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <FinanceListbox label={modalState.type === 'income' ? 'Método de Pago' : 'Categoría del Gasto'} value={formData.category} onChange={(val) => setFormData({ ...formData, category: val })} options={modalState.type === 'income' ? [{ id: 'transferencia', name: 'Transferencia Bancaria' }, { id: 'efectivo', name: 'Efectivo' }, { id: 'yape', name: 'Yape / Plin' }, { id: 'tarjeta', name: 'Tarjeta Crédito/Débito' }, { id: 'otros', name: 'Otros' }] : [{ id: 'insumos', name: 'Compra de Insumos' }, { id: 'personal', name: 'Pago de Personal' }, { id: 'marketing', name: 'Marketing / Publicidad' }, { id: 'devolucion', name: 'Devolución al Cliente' }, { id: 'otros', name: 'Otros Gastos' }]} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t border-secondary-100 mt-2">
                      <button type="button" onClick={() => setModalState({ ...modalState, isOpen: false })} className="px-4 py-2 text-sm font-bold text-secondary-600 hover:bg-secondary-50 rounded-xl transition-colors">Cancelar</button>
                      <button type="submit" className={`px-6 py-2 text-sm font-bold text-white rounded-xl shadow-lg transition-transform active:scale-95 ${modalState.type === 'income' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}>{modalState.type === 'income' ? 'Guardar Ingreso' : 'Registrar Salida'}</button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, subText, isBold = false }: any) {
    const formatted = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(value);
    return (
      <div className={`bg-white p-5 rounded-2xl border border-secondary-200 shadow-sm flex items-start justify-between group hover:border-primary-200 transition-colors`}>
        <div><p className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-1">{title}</p><h3 className={`text-xl md:text-2xl ${isBold ? 'font-black text-secondary-900' : 'font-bold text-secondary-800'}`}>{formatted}</h3><p className="text-[10px] text-secondary-400 mt-1 font-medium">{subText}</p></div>
        <div className={`p-3 rounded-xl ${color} group-hover:scale-110 transition-transform duration-300`}><Icon size={24} /></div>
      </div>
    );
}
