import { useState, useEffect } from 'react';
import { 
  Search, 
  MessageCircle, 
  CheckCircle2, 
  XCircle, 
  FileText,
  Calendar,
  Users,
  ChevronDown,
  Loader2,
  Eye,
  CalendarCheck // ✅ Icono para indicar que está en calendario
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Quote, QuoteStatus } from '@/types';
import { cn } from '@/utils/utils';
import { QuoteDetailModal } from './QuoteDetailModal';

type IconComponent = React.ComponentType<{ className?: string }>;

const STATUS_CONFIG: Record<QuoteStatus, { label: string; color: string; icon: IconComponent }> = {
  new: { 
    label: 'Nueva', 
    color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20', 
    icon: CircleIcon 
  },
  contacted: { 
    label: 'Contactada', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200 ring-yellow-500/20', 
    icon: MessageCircle 
  },
  quoted: { 
    label: 'Cotizada', 
    color: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20', 
    icon: FileText 
  },
  converted: { 
    label: 'Cerrada', 
    color: 'bg-green-50 text-green-700 border-green-200 ring-green-500/20', 
    icon: CheckCircle2 
  },
  declined: { 
    label: 'Declinada', 
    color: 'bg-red-50 text-red-700 border-red-200 ring-red-500/20', 
    icon: XCircle 
  },
};

function CircleIcon({ className }: { className?: string }) {
  return <div className={cn("w-2 h-2 rounded-full bg-current", className)} />;
}

export function QuotesView() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<QuoteStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes((data as Quote[]) || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    } finally {
      setLoading(false);
    }
  }

  const openDetailModal = (quote: Quote) => {
    setSelectedQuote(quote);
    setIsModalOpen(true);
  };

  const handleQuoteUpdated = (updatedQuote: Quote) => {
    setQuotes(prev => prev.map(q => q.id === updatedQuote.id ? updatedQuote : q));
  };

  async function handleStatusChange(id: string, newStatus: QuoteStatus) {
    const previousQuotes = [...quotes];
    setQuotes(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));

    try {
      const { error } = await supabase
        .from('quotes')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating status:', error);
      setQuotes(previousQuotes);
      alert('Error al actualizar el estado');
    }
  }

  const handleWhatsAppAction = (e: React.MouseEvent, quote: Quote) => {
    e.stopPropagation();
    const phone = quote.client_phone.replace(/\D/g, '');
    const firstName = quote.client_name.split(' ')[0];
    const eventDate = new Date(quote.event_date).toLocaleDateString('es-PE');
    const message = `Hola ${firstName} 👋, te saludo de La Reserva. Recibimos tu solicitud para el evento del ${eventDate} (${quote.event_type}). ¿Tienes unos minutos para conversar?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');

    if (quote.status === 'new') {
      handleStatusChange(quote.id, 'contacted');
    }
  };

  const filteredQuotes = quotes.filter(quote => {
    const matchesStatus = filterStatus === 'all' || quote.status === filterStatus;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      quote.client_name.toLowerCase().includes(searchLower) ||
      quote.client_email.toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-secondary-200">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-secondary-200">
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
              filterStatus === 'all' 
                ? "bg-secondary-900 text-white shadow-md" 
                : "bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200"
            )}
          >
            Todas
          </button>
          
          {(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map((status) => {
            const StatusIcon = STATUS_CONFIG[status].icon;
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap flex items-center gap-2",
                  filterStatus === status
                    ? STATUS_CONFIG[status].color + " ring-1 shadow-sm"
                    : "bg-white border-secondary-200 text-secondary-500 hover:border-secondary-300"
                )}
              >
                <StatusIcon className="w-3 h-3" />
                {STATUS_CONFIG[status].label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        {filteredQuotes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-secondary-300" />
            </div>
            <h3 className="text-secondary-900 font-medium mb-1">No se encontraron cotizaciones</h3>
            <p className="text-secondary-500 text-sm">Intenta ajustar los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary-50/50 text-secondary-500 font-medium border-b border-secondary-200">
                <tr>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Detalles del Evento</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredQuotes.map((quote) => (
                  <tr 
                    key={quote.id} 
                    onClick={() => openDetailModal(quote)}
                    className="hover:bg-secondary-50/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="font-bold text-secondary-900">{quote.client_name}</div>
                      <div className="text-secondary-400 text-xs mt-0.5 font-mono">{quote.client_email}</div>
                      <div className="text-secondary-400 text-xs mt-0.5">{quote.client_phone}</div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="capitalize px-2 py-0.5 rounded text-xs font-medium bg-secondary-100 text-secondary-700 border border-secondary-200">
                          {quote.event_type.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-secondary-500 text-xs">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {quote.guest_count} inv.
                        </span>
                        {quote.estimated_price && (
                          <span className="font-semibold text-green-600">
                            S/ {quote.estimated_price}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-secondary-700">
                        <Calendar className="w-4 h-4 text-secondary-400" />
                        {/* ✅ CORRECCIÓN DE FECHA EN TABLA: Agregar T00:00:00 */}
                        {new Date(quote.event_date + 'T00:00:00').toLocaleDateString('es-PE', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-secondary-400 mt-1 pl-6">
                        Recibido: {new Date(quote.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="relative flex items-center gap-2">
                        {/* ✅ ICONO DE CALENDARIO SI YA ES EVENTO */}
                        {quote.status === 'converted' && (
                          <div 
                            className="p-1 bg-green-100 text-green-600 rounded-full" 
                            title="Evento creado en calendario"
                          >
                            <CalendarCheck className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="relative inline-block">
                          <select
                            value={quote.status}
                            onChange={(e) => handleStatusChange(quote.id, e.target.value as QuoteStatus)}
                            className={cn(
                              "appearance-none cursor-pointer pl-3 pr-8 py-1.5 rounded-full text-xs font-bold border ring-1 ring-inset transition-all focus:outline-none focus:ring-2 focus:ring-primary-500",
                              STATUS_CONFIG[quote.status].color
                            )}
                          >
                            {(Object.keys(STATUS_CONFIG) as QuoteStatus[]).map((s) => (
                              <option key={s} value={s} className="bg-white text-secondary-900">
                                {STATUS_CONFIG[s].label}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); openDetailModal(quote); }}
                          className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Ver detalles completos"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => handleWhatsAppAction(e, quote)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 text-[#128C7E] hover:bg-[#25D366]/20 border border-[#25D366]/20 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Contactar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <QuoteDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        quote={selectedQuote}
        onUpdate={handleQuoteUpdated}
      />
    </div>
  );
}