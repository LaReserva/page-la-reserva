// src/components/admin/clients/ClientDetailModal.tsx
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  X, Save, User, Phone, Mail, Building, MapPin, 
  CreditCard, Instagram, FileText, Loader2, Plus,
  CalendarPlus, CheckCircle, XCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import { useUserRole } from '@/hooks/useUserRole'; 
import { CreateManualEventModal } from '../events/CreateManualEventModal'; 

// ==========================================
// COMPONENTE: MODAL DE FEEDBACK (HEADLESS UI)
// ==========================================
interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error';
}

function FeedbackModal({ isOpen, onClose, title, message, type = 'success' }: FeedbackModalProps) {
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
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-center shadow-xl transition-all border border-secondary-100">
                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-4 ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                   {type === 'success' ? <CheckCircle className="h-8 w-8 text-green-600" /> : <XCircle className="h-8 w-8 text-red-600" />}
                </div>
                <Dialog.Title as="h3" className="text-xl font-bold text-secondary-900 mb-2">
                  {title}
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-secondary-500 mb-6">
                    {message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-full inline-flex justify-center rounded-xl shadow-lg px-4 py-3 text-base font-bold text-white focus:outline-none transition-all transform active:scale-95 ${
                     type === 'success' 
                     ? 'bg-green-600 hover:bg-green-700 shadow-green-200' 
                     : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  }`}
                >
                  {type === 'success' ? 'Entendido' : 'Cerrar'}
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL (HEADLESS UI)
// ==========================================

interface ClientDetailModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (client: Client) => void; 
}

export function ClientDetailModal({ client, isOpen, onClose, onUpdate }: ClientDetailModalProps) {
  const { isSuperAdmin } = useUserRole();
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  
  const [feedback, setFeedback] = useState<{ show: boolean, type: 'success' | 'error', title: string, message: string }>({
    show: false, type: 'success', title: '', message: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCreating = !client;

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (client) {
        setFormData(client);
      } else {
        setFormData({
          name: '', email: '', phone: '', second_phone: '', document_id: '',
          company: '', address: '', instagram: '', notes: '',
          total_events: 0, total_spent: 0
        });
      }
    }
  }, [client, isOpen]);

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "El nombre es obligatorio.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) newErrors.email = "Ingresa un correo válido.";
    const phoneRegex = /^\d{9}$/; 
    if (!formData.phone) newErrors.phone = "El teléfono es obligatorio.";
    else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) newErrors.phone = "El celular debe contener 9 dígitos.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;
    if (!validateForm()) return; 

    try {
      setSaving(true);
      let resultData;
      
      if (isCreating) {
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: formData.name || '',
            email: formData.email || '',
            phone: formData.phone || '',
            second_phone: formData.second_phone || '', 
            document_id: formData.document_id || '',
            address: formData.address || '',
            instagram: formData.instagram || '',
            company: formData.company || '',
            notes: formData.notes || '',
            total_events: 0, total_spent: 0
          })
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      } else {
        const { data, error } = await supabase
          .from('clients')
          .update({
            name: formData.name, email: formData.email, phone: formData.phone,
            second_phone: formData.second_phone, document_id: formData.document_id,
            address: formData.address, instagram: formData.instagram,
            company: formData.company, notes: formData.notes
          })
          .eq('id', client!.id) 
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      }
      
      onUpdate(resultData as Client);
      onClose(); 
    } catch (error: any) {
      console.error('Error saving client:', error);
      setFeedback({
        show: true,
        type: 'error',
        title: 'Error al Guardar',
        message: error.message || 'Ocurrió un error inesperado.'
      });
    } finally {
      setSaving(false);
    }
  };

  const title = isCreating ? 'Nuevo Cliente' : (isSuperAdmin ? 'Editar Cliente' : 'Detalles del Cliente');
  const isEditable = isCreating || isSuperAdmin;

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          {/* Backdrop */}
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

          {/* Container Scrollable */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 sm:p-6 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                {/* Panel Principal */}
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all flex flex-col max-h-[90vh]">
                  
                  {/* Header Sticky */}
                  <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50 flex justify-between items-center shrink-0">
                    <div>
                      <Dialog.Title as="h3" className="text-xl font-display font-bold text-secondary-900 flex items-center gap-2">
                        {isCreating && <Plus className="w-5 h-5 text-primary-600" />}
                        {title}
                      </Dialog.Title>
                      <p className="text-sm text-secondary-500">
                        {isCreating ? 'Registrar un nuevo cliente manualmente' : `ID: ${client?.id.slice(0, 8)}`}
                      </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-full transition-colors outline-none focus:ring-2 focus:ring-secondary-300">
                      <X className="w-5 h-5 text-secondary-500" />
                    </button>
                  </div>

                  {/* Formulario Scrollable */}
                  <form id="client-form" onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-white">
                    <div className="space-y-6">
                      
                      {/* Sección Personal */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider border-b pb-2">Información Personal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Nombre */}
                          <div>
                            <label className="text-xs text-secondary-500 font-medium block mb-1">Nombre Completo *</label>
                            <div className="relative">
                              <User className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                              <input required type="text" value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} disabled={!isEditable} className={`w-full pl-9 p-2 border rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50 ${errors.name ? 'border-red-500 focus:ring-red-200' : 'border-secondary-200'}`} />
                            </div>
                            {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name}</p>}
                          </div>
                          {/* DNI */}
                          <div>
                             <label className="text-xs text-secondary-500 font-medium block mb-1">DNI / RUC</label>
                             <div className="relative">
                               <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                               <input type="text" value={formData.document_id || ''} onChange={e => handleChange('document_id', e.target.value)} disabled={!isEditable} className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50" placeholder="00000000" />
                             </div>
                          </div>
                        </div>
                        {/* Email y Empresa */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                            <label className="text-xs text-secondary-500 font-medium block mb-1">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                              <input type="email" value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} disabled={!isEditable} className={`w-full pl-9 p-2 border rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50 ${errors.email ? 'border-red-500 focus:ring-red-200' : 'border-secondary-200'}`} />
                            </div>
                            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
                           </div>
                           <div>
                             <label className="text-xs text-secondary-500 font-medium block mb-1">Empresa</label>
                             <div className="relative">
                               <Building className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                               <input type="text" value={formData.company || ''} onChange={e => handleChange('company', e.target.value)} disabled={!isEditable} className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50" />
                             </div>
                           </div>
                        </div>
                      </div>

                      {/* Sección Contacto */}
                      <div className="space-y-4">
                         <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider border-b pb-2">Contacto & Redes</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <label className="text-xs text-secondary-500 font-medium block mb-1">Teléfono Principal *</label>
                             <div className="relative">
                               <Phone className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                               <input required type="tel" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} disabled={!isEditable} className={`w-full pl-9 p-2 border rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50 ${errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-secondary-200'}`} />
                             </div>
                             {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</p>}
                           </div>
                           <div>
                              <label className="text-xs text-secondary-500 font-medium block mb-1">Teléfono Secundario</label>
                              <div className="relative">
                                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                                <input type="tel" value={formData.second_phone || ''} onChange={e => handleChange('second_phone', e.target.value)} disabled={!isEditable} placeholder="(Opcional)" className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50" />
                              </div>
                           </div>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                               <label className="text-xs text-secondary-500 font-medium block mb-1">Dirección</label>
                               <div className="relative">
                                 <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                                 <input type="text" value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} disabled={!isEditable} className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50" />
                               </div>
                            </div>
                            <div>
                               <label className="text-xs text-secondary-500 font-medium block mb-1">Instagram</label>
                               <div className="relative">
                                 <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                                 <input type="text" value={formData.instagram || ''} onChange={e => handleChange('instagram', e.target.value)} disabled={!isEditable} placeholder="@usuario" className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50" />
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Notas */}
                      <div className="space-y-2">
                         <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider border-b pb-2">Notas Internas</h3>
                         <div className="relative">
                           <FileText className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                           <textarea value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} disabled={!isEditable} rows={3} className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm resize-none focus:ring-primary-500 focus:border-primary-500 outline-none disabled:bg-secondary-50" placeholder="Información adicional relevante..." />
                         </div>
                      </div>
                    </div>
                  </form>

                  {/* Footer Sticky */}
                  <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50 flex justify-between items-center shrink-0 rounded-b-2xl">
                    {!isCreating ? (
                      <button 
                        type="button"
                        onClick={() => setIsCreateEventOpen(true)}
                        className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium text-sm rounded-lg flex items-center gap-2 transition-colors border border-purple-200"
                      >
                        <CalendarPlus className="w-4 h-4" />
                        Agendar Evento
                      </button>
                    ) : <div />}

                    <div className="flex gap-3">
                      <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-sm font-medium text-secondary-600 hover:bg-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-200"
                      >
                        Cerrar
                      </button>
                      {isEditable && (
                        <button 
                          form="client-form"
                          type="submit"
                          disabled={saving}
                          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2 transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          {isCreating ? 'Crear Cliente' : 'Guardar Cambios'}
                        </button>
                      )}
                    </div>
                  </div>

                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* MODAL DE CREAR EVENTO */}
      {client && (
        <CreateManualEventModal
          isOpen={isCreateEventOpen}
          onClose={() => setIsCreateEventOpen(false)}
          onCreated={() => {
            setIsCreateEventOpen(false);
            setFeedback({
              show: true,
              type: 'success',
              title: '¡Evento Agendado!',
              message: 'El evento se ha creado exitosamente para este cliente.'
            });
          }}
          initialClient={client}
        />
      )}

      {/* MODAL DE FEEDBACK (Success / Error) */}
      <FeedbackModal 
        isOpen={feedback.show}
        onClose={() => setFeedback(prev => ({ ...prev, show: false }))}
        title={feedback.title}
        message={feedback.message}
        type={feedback.type}
      />
    </>
  );
}