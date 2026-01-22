import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Eye, Trash2, FileText, Loader2, Calendar, User, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { ProposalPdf } from '../templates/ProposalPdf';
import type { Proposal } from '@/types';
import { QUOTE_DOC_STATUSES } from '@/utils/constants';
import { Buffer } from 'buffer';

// Polyfill para Buffer si es necesario en el navegador
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = Buffer;
}

// --- SUB-COMPONENTES UI ---

const StatusBadge = ({ status }: { status: string }) => {
  const config = QUOTE_DOC_STATUSES[status as keyof typeof QUOTE_DOC_STATUSES] || QUOTE_DOC_STATUSES.pending;
  const colors: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    green: "bg-green-100 text-green-800 border-green-200",
    red: "bg-red-100 text-red-800 border-red-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors[config.color || 'gray']}`}>
      {config.label}
    </span>
  );
};

// Modal de Feedback Reutilizable
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error';
}

function FeedbackModal({ isOpen, onClose, title, message, type = 'error' }: FeedbackModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[60]" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center shadow-xl transition-all border border-gray-100">
              <div className={`mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4 ${type === 'error' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {type === 'error' ? <XCircle size={32} /> : <CheckCircle size={32} />}
              </div>
              <Dialog.Title as="h3" className="text-lg font-bold text-gray-900 mb-2">
                {title}
              </Dialog.Title>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {message}
              </p>
              <button
                type="button"
                className={`w-full inline-flex justify-center rounded-xl border border-transparent px-4 py-2.5 text-sm font-bold text-white focus:outline-none transition-transform active:scale-95 ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                onClick={onClose}
              >
                Entendido
              </button>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// --- COMPONENTE PRINCIPAL ---

export function ProposalList({ userRole, onViewPdf }: { userRole: string, onViewPdf: (p: Proposal) => void }) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Estados de control
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estado para Feedback (Errores/Éxito)
  const [feedback, setFeedback] = useState<{ show: boolean, title: string, message: string, type: 'success' | 'error' }>({
    show: false, title: '', message: '', type: 'success'
  });

  useEffect(() => {
    fetchProposals();
  }, [searchTerm]);

  async function fetchProposals() {
    setLoading(true);
    try {
      let query = supabase.from('proposals').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.ilike('client_name', `%${searchTerm}%`);
      const { data } = await query;
      setProposals((data || []) as Proposal[]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleDownloadPdf = async (proposal: Proposal) => {
    setIsGenerating(proposal.id);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const FileSaver = (await import('file-saver')).default;

      const itemsArray = typeof proposal.items === 'string' 
        ? JSON.parse(proposal.items) 
        : proposal.items || [];

      const blob = await pdf(
        <ProposalPdf 
          clientName={proposal.client_name}
          clientPhone={proposal.client_phone}
          clientEmail={proposal.client_email}
          eventType={proposal.event_type}
          eventDate={proposal.event_date}
          guestCount={proposal.guest_count || 0}
          items={itemsArray}
          totalCost={Number(proposal.total_price) || 0}
        />
      ).toBlob();

      FileSaver.saveAs(blob, `Propuesta_${proposal.client_name.replace(/\s+/g, '_')}.pdf`);
    } catch (e) {
      setFeedback({
        show: true,
        type: 'error',
        title: 'Error PDF',
        message: 'No se pudo generar el PDF. Verifica los datos de la propuesta.'
      });
    } finally {
      setIsGenerating(null);
    }
  };

  // --- LÓGICA DE ELIMINACIÓN CON CONTROL DE ERROR 409 ---
  
  const executeDelete = async () => {
    if (!proposalToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase.from('proposals').delete().eq('id', proposalToDelete);
      
      if (error) {
        // ERROR 409 / 23503: Integridad Referencial
        if (error.code === '23503') { 
          setFeedback({
            show: true,
            type: 'error',
            title: 'No se puede eliminar',
            message: 'Esta propuesta ya ha sido convertida a un contrato o tiene datos vinculados. Debes eliminar el contrato primero para poder borrar esta propuesta.'
          });
        } else {
          throw error; // Lanzar otros errores para el catch genérico
        }
      } else {
        // Éxito
        setProposals(p => p.filter(x => x.id !== proposalToDelete));
        setFeedback({
            show: true,
            type: 'success',
            title: 'Eliminado',
            message: 'La propuesta se ha eliminado correctamente.'
        });
      }
    } catch (error: any) {
      console.error("Error deleting:", error);
      setFeedback({
        show: true,
        type: 'error',
        title: 'Error del Sistema',
        message: error.message || 'Ocurrió un error inesperado al intentar eliminar.'
      });
    } finally {
      setIsDeleting(false);
      setProposalToDelete(null); // Cerramos el modal de confirmación
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full animate-in fade-in relative">
      
      {/* 1. MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <Transition appear show={!!proposalToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => !isDeleting && setProposalToDelete(null)}>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600">
                    <AlertTriangle size={30} />
                  </div>
                  <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                    ¿Eliminar Propuesta?
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 mt-2 mb-6">
                    Esta acción es irreversible y eliminará el registro del historial.
                  </p>
                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      disabled={isDeleting}
                      className="flex-1 justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
                      onClick={() => setProposalToDelete(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      className="flex-1 justify-center rounded-xl border border-transparent bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 focus:outline-none transition-colors flex items-center  gap-2"
                      onClick={executeDelete}
                    >
                      {isDeleting ? <Loader2 size={16} className="animate-spin" /> : 'Sí, Eliminar'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* 2. MODAL DE FEEDBACK (Error 409 o Éxito) */}
      <FeedbackModal 
        isOpen={feedback.show}
        onClose={() => setFeedback(prev => ({ ...prev, show: false }))}
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
      />

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-primary-500" size={20}/> Historial de Propuestas
        </h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-gray-300"/></div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <FileText size={32} className="mb-2 opacity-20"/> No hay propuestas registradas.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Evento</th>
                <th className="px-6 py-3">Monto</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {proposals.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{p.client_name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1"><User size={10}/> {p.client_email || 'Sin correo'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-700">{p.event_type}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/> {p.event_date || 'Sin fecha'}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-medium text-gray-900">
                    S/ {Number(p.total_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDownloadPdf(p)} 
                        disabled={isGenerating === p.id}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                        title="Descargar PDF"
                      >
                        {isGenerating === p.id ? <Loader2 size={16} className="animate-spin"/> : <Eye size={16}/>}
                      </button>
                      
                      {['super_admin'].includes(userRole) && (
                        <button 
                          onClick={() => setProposalToDelete(p.id)} 
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16}/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}