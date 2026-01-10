// src/components/admin/clients/ClientsView.tsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  Search, Users, Mail, Phone, Building, Calendar,
  Loader2, Edit, Eye, Plus, CalendarPlus, CheckCircle, XCircle, MessageCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import { formatCurrency } from '@/utils/formatters';
import { ClientDetailModal } from './ClientDetailModal';
import { useUserRole } from '@/hooks/useUserRole';
import { CreateManualEventModal } from '../events/CreateManualEventModal';
import { cn } from '@/utils/utils'; // Asumo que tienes esta utilidad, si no, usa template literals

// --- TIPO EXTENDIDO ---
interface ClientWithFinancials extends Client {
  events: {
    id: string;
    event_payments: { amount: number }[];
    expenses: { amount: number; category: string }[];
  }[];
}

// --- COMPONENTE INTERNO: FEEDBACK MODAL (HEADLESS UI) ---
interface FeedbackModalProps {
  isOpen: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

function FeedbackModal({ isOpen, type, title, message, onClose }: FeedbackModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-secondary-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center align-middle shadow-xl transition-all border border-secondary-100">
                <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {type === 'success' ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
                </div>
                <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 mb-2">
                  {title}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-secondary-500 mb-6">
                    {message}
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    className={cn(
                      "w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-all active:scale-95",
                      type === 'success' 
                        ? "bg-green-600 hover:bg-green-700 focus-visible:ring-green-500" 
                        : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                    )}
                    onClick={onClose}
                  >
                    Entendido
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

export function ClientsView() {
  const [clients, setClients] = useState<ClientWithFinancials[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados Modales
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForEvent, setClientForEvent] = useState<Client | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  const [feedback, setFeedback] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({
    isOpen: false, type: 'success', title: '', message: ''
  });

  const { isSuperAdmin } = useUserRole();

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          events (
            id,
            event_payments ( amount ),
            expenses ( amount, category )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as any) || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }

  const calculateClientNetTotal = (client: ClientWithFinancials) => {
    let totalIncome = 0;
    let totalRefunds = 0;

    if (client.events && client.events.length > 0) {
      client.events.forEach(event => {
        if (event.event_payments) {
          totalIncome += event.event_payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        }
        if (event.expenses) {
          totalRefunds += event.expenses
            .filter(e => e.category === 'devolucion')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        }
      });
    }
    return totalIncome - totalRefunds;
  };

  // --- HANDLERS ---
  const handleCreateClient = () => {
    setSelectedClient(null);
    setIsClientModalOpen(true);
  };

  const handleOpenClient = (client: Client) => {
    setSelectedClient(client);
    setIsClientModalOpen(true);
  };

  const handleClientSaved = () => {
    fetchClients(); 
  };

  const handleWhatsApp = (e: React.MouseEvent, phone: string) => {
    e.stopPropagation(); 
    const cleanPhone = phone.replace(/\D/g, ''); 
    if (cleanPhone.length < 9) {
      setFeedback({
        isOpen: true, type: 'error', title: 'Número inválido',
        message: 'El número de teléfono no parece tener el formato correcto.'
      });
      return;
    }
    const fullPhone = cleanPhone.length === 9 ? `51${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${fullPhone}`, '_blank');
  };

  const handleEmail = (e: React.MouseEvent, email: string) => {
    e.stopPropagation();
    if (!email) {
      setFeedback({
        isOpen: true, type: 'error', title: 'Sin correo',
        message: 'Este cliente no tiene un correo electrónico registrado.'
      });
      return;
    }
    window.location.href = `mailto:${email}`;
  };

  const handleCreateEventClick = (e: React.MouseEvent, client: Client) => {
    e.stopPropagation();
    setClientForEvent(client);
    setIsCreateEventOpen(true);
  };

  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      (client.company && client.company.toLowerCase().includes(searchLower)) ||
      client.phone.includes(searchLower)
    );
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
        <div className="flex items-center gap-2 text-secondary-500">
          <Users className="w-5 h-5" />
          <span className="font-medium">{clients.length} Clientes registrados</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, empresa, teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-200 resize-none focus:ring-primary-500 focus:border-primary-500 transition-all text-sm"
            />
          </div>

          {isSuperAdmin && (
            <button 
              onClick={handleCreateClient}
              className="px-4 py-2 bg-secondary-900 text-white text-sm font-bold rounded-lg shadow hover:bg-secondary-800 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Cliente
            </button>
          )}
        </div>
      </div>

      {/* Tabla con Transición Suave */}
      <Transition
        appear
        show={true}
        enter="transition-opacity duration-500"
        enterFrom="opacity-0"
        enterTo="opacity-100"
      >
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary-300" />
              </div>
              <h3 className="text-secondary-900 font-medium mb-1">No se encontraron clientes</h3>
              <p className="text-secondary-500 text-sm">Intenta con otro término de búsqueda.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary-50/50 text-secondary-500 font-medium border-b border-secondary-200">
                  <tr>
                    <th className="px-6 py-4">Cliente / Empresa</th>
                    <th className="px-6 py-4">Contacto Directo</th>
                    <th className="px-6 py-4 text-center">Historial</th>
                    {isSuperAdmin && <th className="px-6 py-4 text-right">Inversión Total (Neto)</th>}
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {filteredClients.map((client) => (
                    <tr 
                      key={client.id} 
                      className="hover:bg-secondary-50/30 transition-colors group cursor-pointer"
                      onClick={() => handleOpenClient(client)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-200">
                            {client.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-secondary-900">{client.name}</div>
                            {client.company && (
                              <div className="flex items-center gap-1 text-xs text-secondary-500 mt-0.5">
                                <Building className="w-3 h-3" />
                                {client.company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={(e) => handleWhatsApp(e, client.phone)}
                            className="flex items-center gap-2 text-secondary-600 hover:text-green-600 transition-colors w-fit p-1 -ml-1 rounded hover:bg-green-50"
                            title="Enviar WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="text-xs">{client.phone}</span>
                          </button>

                          <button 
                            onClick={(e) => handleEmail(e, client.email)}
                            className="flex items-center gap-2 text-secondary-600 hover:text-blue-600 transition-colors w-fit p-1 -ml-1 rounded hover:bg-blue-50"
                            title="Enviar Correo"
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span className="text-xs truncate max-w-[150px]">{client.email}</span>
                          </button>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                            client.total_events > 0 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-secondary-50 text-secondary-500 border-secondary-200'
                          )}>
                            <Calendar className="w-3 h-3" />
                            {client.total_events} Eventos
                          </span>
                        </div>
                      </td>

                      {isSuperAdmin && (
                        <td className="px-6 py-4 text-right">
                          <div className="font-bold text-secondary-900">
                            {formatCurrency(calculateClientNetTotal(client))}
                          </div>
                          <div className="text-xs text-secondary-400 mt-0.5">Real (Ing - Dev)</div>
                        </td>
                      )}

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleCreateEventClick(e, client)}
                            className="p-2 text-secondary-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Agendar nuevo evento"
                          >
                            <CalendarPlus className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenClient(client);
                            }}
                            className="p-2 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title={isSuperAdmin ? "Editar Cliente" : "Ver Detalles"}
                          >
                            {isSuperAdmin ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
      </Transition>

      {/* --- MODALES --- */}
      
      <ClientDetailModal 
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        client={selectedClient}
        onUpdate={handleClientSaved}
      />

      {clientForEvent && (
        <CreateManualEventModal
          isOpen={isCreateEventOpen}
          onClose={() => setIsCreateEventOpen(false)}
          onCreated={() => {
            setIsCreateEventOpen(false);
            setFeedback({
              isOpen: true,
              type: 'success',
              title: 'Evento Agendado',
              message: `Se ha creado el evento para ${clientForEvent.name} exitosamente.`
            });
            fetchClients();
          }}
          initialClient={clientForEvent}
        />
      )}

      {/* MODAL DE FEEDBACK REFACTORIZADO CON HEADLESS UI */}
      <FeedbackModal 
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}