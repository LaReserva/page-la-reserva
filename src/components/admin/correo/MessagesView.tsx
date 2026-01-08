import { useState, useEffect } from 'react';
import { Search, Inbox, MailOpen, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { ContactMessage } from '@/types';
import { cn } from '@/utils/utils';
import { MessageDetailModal } from './MessageDetailModal';

// Configuración de estilos por estado
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'new' | 'replied'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, []);

  async function fetchMessages() {
    try {
      setLoading(true);
      // Forzamos el tipado porque la tabla puede no estar actualizada en tus tipos locales
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
    
    // Si es nuevo, lo marcamos como leído localmente y en DB
    if (msg.status === 'new') {
      try {
        await supabase
          .from('contact_messages')
          .update({ status: 'read' })
          .eq('id', msg.id);
        
        // Actualizar UI local para reflejar el cambio inmediato
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
      } catch (e) {
        console.error('Error marcando como leído', e);
      }
    }
  };

  const filteredMessages = messages.filter(msg => {
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'replied' ? msg.status === 'replied' : msg.status !== 'replied');
    
    // Búsqueda insensible a mayúsculas/minúsculas
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (msg.name || '').toLowerCase().includes(searchLower) ||
      (msg.email || '').toLowerCase().includes(searchLower) ||
      (msg.subject || '').toLowerCase().includes(searchLower);
    
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
            onClick={fetchMessages}
            className="p-2 text-secondary-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg border border-secondary-200 transition-colors"
            title="Recargar lista"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        {filteredMessages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-8 h-8 text-secondary-300" />
            </div>
            <h3 className="text-secondary-900 font-medium mb-1">No se encontraron mensajes</h3>
            <p className="text-secondary-500 text-sm">Ajusta los filtros o espera nuevos contactos.</p>
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
                  // Fallback por si el status viene undefined o desconocido
                  const statusInfo = STATUS_CONFIG[msg.status] || STATUS_CONFIG.read;
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
        onReplySuccess={fetchMessages}
      />
    </div>
  );
}