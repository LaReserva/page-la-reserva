import { useState, useEffect } from 'react';
import { Search, Inbox, MailOpen, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ContactMessage } from '@/types';
import { cn } from '@/utils/utils';
import { MessageDetailModal } from './MessageDetailModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  new: {
    label: 'Nuevo',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Inbox
  },
  read: {
    label: 'Leído',
    color: 'bg-secondary-100 text-secondary-700 border-secondary-200',
    icon: MailOpen
  },
  replied: {
    label: 'Respondido',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: MailOpen
  }
};

export function MessagesView() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 'all' = Todos
  // 'new' = Pendientes (Incluye "new" y "read", todo lo que falta responder)
  // 'replied' = Respondidos
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'replied'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages(isBackgroundUpdate = false) {
    try {
      if (!isBackgroundUpdate) setLoading(true);
      
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setMessages((data as unknown as ContactMessage[]) || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = async (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setIsModalOpen(true);
    
    // Si el mensaje es "nuevo", lo pasamos a "leído" visualmente y en DB
    if (msg.status === 'new') {
      try {
        await supabase
          .from('contact_messages')
          .update({ status: 'read' })
          .eq('id', msg.id);
        
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
      } catch (e) {
        console.error('Error marcando como leído', e);
      }
    }
  };

  const handleReplySuccess = () => {
    fetchMessages(true);
  };

  // ✅ LÓGICA DE FILTRADO CORREGIDA Y EXPLÍCITA
  const filteredMessages = messages.filter(msg => {
    // 1. Normalizamos el estado (minúsculas y sin espacios) para evitar errores de tipeo en DB
    const currentStatus = (msg.status || '').toLowerCase().trim();

    let matchesStatus = true;

    if (filterStatus === 'new') {
      // PENDIENTES: Mostramos todo lo que NO esté respondido.
      // Esto incluye 'new' (sin leer) y 'read' (leído pero no respondido).
      matchesStatus = currentStatus !== 'replied';
    } else if (filterStatus === 'replied') {
      // RESPONDIDOS: Solo lo que tenga status 'replied'
      matchesStatus = currentStatus === 'replied';
    }
    // Si es 'all', matchesStatus se mantiene true

    // 2. Filtro de Búsqueda
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (msg.name || '').toLowerCase().includes(searchLower) ||
      (msg.email || '').toLowerCase().includes(searchLower) ||
      (msg.subject || '').toLowerCase().includes(searchLower);
    
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-secondary-200">
        <div className="flex gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filterStatus === 'all' 
                ? "bg-secondary-900 text-white shadow-md" 
                : "bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200"
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('new')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filterStatus === 'new' 
                ? "bg-secondary-900 text-white shadow-md" 
                : "bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200"
            )}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilterStatus('replied')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              filterStatus === 'replied' 
                ? "bg-secondary-900 text-white shadow-md" 
                : "bg-white text-secondary-600 hover:bg-secondary-50 border border-secondary-200"
            )}
          >
            Respondidos
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o asunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
            />
          </div>
          <button 
            onClick={() => fetchMessages(false)}
            className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg border border-secondary-200 transition-colors"
            title="Recargar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla con estado de Loading interno */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden min-h-[300px] relative">
        
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-secondary-300" />
            </div>
            <h3 className="text-secondary-900 font-medium mb-1">
              {filterStatus === 'all' ? 'No hay mensajes' : 
               filterStatus === 'new' ? 'No tienes mensajes pendientes' : 
               'No has respondido mensajes aún'}
            </h3>
            <p className="text-secondary-500 text-sm">
              {filterStatus === 'all' ? 'Espera a que los clientes te contacten.' : 'Cambia el filtro para ver otros mensajes.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary-50/50 text-secondary-500 font-medium border-b border-secondary-200">
                <tr>
                  <th className="px-6 py-4">Remitente</th>
                  <th className="px-6 py-4">Asunto</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredMessages.map((msg) => {
                  const safeStatus = (msg.status || 'read').toLowerCase();
                  const statusInfo = STATUS_CONFIG[safeStatus] || STATUS_CONFIG.read;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr 
                      key={msg.id} 
                      onClick={() => handleOpenModal(msg)}
                      className="hover:bg-secondary-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-secondary-900">{msg.name}</div>
                        <div className="text-secondary-400 text-xs mt-0.5 font-mono">{msg.email}</div>
                      </td>
                      
                      <td className="px-6 py-4 max-w-xs">
                        <div className="truncate font-medium text-secondary-700">{msg.subject}</div>
                        <div className="truncate text-secondary-400 text-xs mt-0.5">{msg.message}</div>
                      </td>

                      <td className="px-6 py-4 text-secondary-500 whitespace-nowrap">
                        {new Date(msg.created_at).toLocaleDateString('es-PE', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
                          statusInfo.color
                        )}>
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MessageDetailModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        message={selectedMessage}
        onReplySuccess={handleReplySuccess} 
      />
    </div>
  );
}