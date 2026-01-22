import { useState, useEffect, Fragment } from 'react';
import { Combobox, Dialog, Transition, Listbox } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { Check, ChevronsUpDown, Search, Save, FileText, Plus, Trash2, Loader2, ListPlus, CheckCircle, AlertTriangle, XCircle, ChevronDown } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import FileSaver from 'file-saver';
import { ProposalPdf } from '../templates/ProposalPdf';

import { isValidEmail, isValidPeruvianPhone, isFutureDate } from '@/utils/utils';

const DEFAULT_INCLUDES = [
  "2 Bartenders profesionales correctamente uniformados",
  "5 Horas de servicio continuo de Open Bar",
  "1 Barra Capitone de color blanco (2 metros)",
  "Hielo ilimitado durante el servicio",
  "Insumos de primera calidad (Jarabes, Frutas, Decoraciones)",
  "Cristalería completa para todos los cocteles"
];

const EVENT_TYPES = ["Boda", "Corporativo", "Cumpleaños", "Privado", "15 Años", "Graduación"];

export function ProposalEditor({ userRole, onSuccess }: { userRole: string, onSuccess: () => void }) {
  const [source, setSource] = useState<'free' | 'web'>('free');
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    eventType: 'Boda',
    eventDate: '',
    guestCount: 50,
    quoteAmount: '',
    items: DEFAULT_INCLUDES
  });

  const [errors, setErrors] = useState<{email?: string, phone?: string, date?: string}>({});
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [newItem, setNewItem] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  });

  useEffect(() => {
    if (source === 'web' && query.length > 2) {
      const timer = setTimeout(async () => {
        const { data } = await supabase
          .from('quotes')
          .select('*')
          .neq('status', 'quoted')
          .ilike('client_name', `%${query}%`)
          .limit(5);
        setLeads(data || []);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query, source]);

  useEffect(() => {
    if (selectedLead) {
      setFormData(prev => ({
        ...prev,
        clientName: selectedLead.client_name,
        clientEmail: selectedLead.client_email,
        clientPhone: selectedLead.client_phone,
        eventType: selectedLead.event_type || 'Boda',
        eventDate: selectedLead.event_date || '',
        guestCount: selectedLead.guest_count || 50
      }));
    }
  }, [selectedLead]);

  const handlePhoneChange = (val: string) => {
    const sanitized = val.replace(/[^0-9\s+]/g, '');
    setFormData(p => ({ ...p, clientPhone: sanitized }));
    if (sanitized && !isValidPeruvianPhone(sanitized)) {
      setErrors(p => ({ ...p, phone: 'Formato inválido (Ej: 999888777)' }));
    } else {
      setErrors(p => { const { phone, ...rest } = p; return rest; });
    }
  };

  const handleEmailChange = (val: string) => {
    setFormData(p => ({ ...p, clientEmail: val }));
    if (val && !isValidEmail(val)) {
      setErrors(p => ({ ...p, email: 'Email inválido' }));
    } else {
      setErrors(p => { const { email, ...rest } = p; return rest; });
    }
  };

  const handleDateChange = (val: string) => {
    setFormData(p => ({ ...p, eventDate: val }));
    if (val && !isFutureDate(val)) {
      setErrors(p => ({ ...p, date: 'La fecha debe ser futura' }));
    } else {
      setErrors(p => { const { date, ...rest } = p; return rest; });
    }
  };

  const handleSave = async () => {
    if (!formData.clientName) {
      setModalState({ isOpen: true, type: 'warning', title: 'Faltan datos', message: 'Por favor ingresa el nombre del cliente.' });
      return;
    }
    if (errors.email || errors.phone || errors.date) {
      setModalState({ isOpen: true, type: 'error', title: 'Datos Inválidos', message: 'Por favor corrige los campos marcados en rojo.' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        client_name: formData.clientName,
        client_email: formData.clientEmail,
        client_phone: formData.clientPhone,
        event_type: formData.eventType,
        event_date: formData.eventDate || null,
        guest_count: formData.guestCount,
        total_price: Number(formData.quoteAmount) || 0,
        items: formData.items,
        status: 'pending',
        source_quote_id: selectedLead?.id || null,
        user_id: user?.id
      };

      const { error } = await supabase.from('proposals').insert(payload);
      if (error) throw error;
      
      if (selectedLead) {
         await supabase.from('quotes').update({ status: 'quoted' }).eq('id', selectedLead.id);
      }

      setModalState({ 
        isOpen: true, 
        type: 'success', 
        title: '¡Propuesta Guardada!', 
        message: `La propuesta para ${formData.clientName} se ha registrado correctamente.` 
      });

    } catch (e: any) {
      setModalState({ isOpen: true, type: 'error', title: 'Error al Guardar', message: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const closeModal = () => {
    setModalState({ ...modalState, isOpen: false });
    if (modalState.type === 'success') {
      onSuccess();
    }
  };

  const handlePdf = async () => {
     const blob = await pdf(
       <ProposalPdf 
         clientName={formData.clientName}
         clientPhone={formData.clientPhone}
         clientEmail={formData.clientEmail}
         eventType={formData.eventType}
         eventDate={formData.eventDate}
         guestCount={formData.guestCount}
         items={formData.items}
         totalCost={Number(formData.quoteAmount) || 0}
       />
     ).toBlob();
     FileSaver.saveAs(blob, `Propuesta_${formData.clientName.replace(/\s+/g, '_')}.pdf`);
  };

  const addItem = () => { if(newItem.trim()) { setFormData(p => ({...p, items: [...p.items, newItem]})); setNewItem(''); } };
  const removeItem = (idx: number) => { setFormData(p => ({...p, items: p.items.filter((_, i) => i !== idx)})); };
  const today = new Date().toISOString().split('T')[0];

  // CLASE COMÚN PARA INPUTS (Aplicando estilos solicitados)
  const inputClass = "w-full border border-gray-300 rounded-lg p-2 text-sm outline-none resize-none focus:ring-primary-500 focus:border-primary-500 transition-all";

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* --- FEEDBACK MODAL --- */}
      <Transition appear show={modalState.isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                      modalState.type === 'success' ? 'bg-green-100 text-green-600' : 
                      modalState.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {modalState.type === 'success' && <CheckCircle size={30} />}
                      {modalState.type === 'error' && <XCircle size={30} />}
                      {modalState.type === 'warning' && <AlertTriangle size={30} />}
                    </div>

                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
                      {modalState.title}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">{modalState.message}</p>
                    </div>

                    <div className="mt-6 w-full">
                      <button
                        type="button"
                        className={`w-full inline-flex justify-center rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                          modalState.type === 'success' ? 'bg-green-600 hover:bg-green-700 focus-visible:ring-green-500' : 
                          modalState.type === 'error' ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' : 'bg-yellow-500 hover:bg-yellow-600 focus-visible:ring-yellow-500'
                        }`}
                        onClick={closeModal}
                      >
                        {modalState.type === 'success' ? 'Continuar' : 'Entendido'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* HEADER ACCIONES */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm sticky top-0 z-30">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Nueva Propuesta</h2>
          <p className="text-xs text-gray-500">Completa los datos para generar el PDF.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handlePdf} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors leading-none">
            <FileText size={16}/> <span className="hidden sm:inline">Previsualizar</span> PDF
          </button>
          
          <button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium shadow-sm transition-all disabled:opacity-50 leading-none">
            {isSaving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA (Datos) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* TARJETA 1: CLIENTE */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
               <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider">Información del Cliente</h3>
               <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold w-full sm:w-auto">
                 <button onClick={() => {setSource('free'); setSelectedLead(null);}} className={`flex-1 sm:flex-none px-3 py-1 rounded ${source === 'free' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Manual</button>
                 <button onClick={() => setSource('web')} className={`flex-1 sm:flex-none px-3 py-1 rounded ${source === 'web' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Web Lead</button>
               </div>
            </div>

            <div className="space-y-4">
              {source === 'web' ? (
                <Combobox value={selectedLead} onChange={setSelectedLead}>
                  <div className="relative">
                    {/* Actualizado a primary */}
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
                      <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                        displayValue={(lead: any) => lead?.client_name || ''}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar solicitud web..."
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </Combobox.Button>
                    </div>
                    <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                        {leads.map((lead) => (
                          // Actualizado a primary
                          <Combobox.Option key={lead.id} className={({ active }) => `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-600 text-white' : 'text-gray-900'}`} value={lead}>
                            {({ selected, active }) => (
                              <><span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{lead.client_name}</span></>
                            )}
                          </Combobox.Option>
                        ))}
                    </Combobox.Options>
                  </div>
                </Combobox>
              ) : (
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-gray-400"/></div>
                  <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className={`pl-10 ${inputClass}`} placeholder="Nombre completo del cliente"/>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-600 mb-1">Celular</label>
                   <input type="tel" value={formData.clientPhone} onChange={(e) => handlePhoneChange(e.target.value)} className={`${inputClass} ${errors.phone ? 'border-red-500 bg-red-50' : ''}`} placeholder="999 888 777"/>
                   {errors.phone && <span className="text-[10px] text-red-500 mt-1">{errors.phone}</span>}
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                   <input type="email" value={formData.clientEmail} onChange={(e) => handleEmailChange(e.target.value)} className={`${inputClass} ${errors.email ? 'border-red-500 bg-red-50' : ''}`} placeholder="cliente@email.com"/>
                   {errors.email && <span className="text-[10px] text-red-500 mt-1">{errors.email}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA 2: EVENTO */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-4">Detalles del Evento</h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  {/* REEMPLAZO DE SELECT POR LISTBOX (Dropdown con primary-500) */}
                  <Listbox value={formData.eventType} onChange={val => setFormData({...formData, eventType: val})}>
                    <div className="relative">
                      <Listbox.Button className={`text-left bg-white relative flex justify-between items-center ${inputClass}`}>
                        <span className="block truncate">{formData.eventType}</span>
                        <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                      </Listbox.Button>
                      <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50 border border-gray-100">
                          {EVENT_TYPES.map((type) => (
                            <Listbox.Option
                              key={type}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-primary-500 text-white' : 'text-gray-900'
                                }`
                              }
                              value={type}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                    {type}
                                  </span>
                                  {selected ? (
                                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary-600'}`}>
                                      <Check className="h-5 w-5" aria-hidden="true" />
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
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                  <input type="date" min={today} value={formData.eventDate} onChange={(e) => handleDateChange(e.target.value)} className={`${inputClass} ${errors.date ? 'border-red-500' : ''}`}/>
                  {errors.date && <span className="text-[10px] text-red-500 mt-1">{errors.date}</span>}
               </div>
               <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invitados</label>
                  <input type="number" min="1" value={formData.guestCount} onChange={e => setFormData({...formData, guestCount: Math.max(0, Number(e.target.value))})} className={inputClass}/>
               </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-600 mb-1">PRECIO TOTAL (S/)</label>
                {/* Aplico estilos primary tambien aqui para consistencia, aunque mantengo el BG verde suave para denotar dinero */}
                <input type="number" min="0" step="0.01" value={formData.quoteAmount} onChange={e => setFormData({...formData, quoteAmount: e.target.value})} placeholder="0.00" className="w-full border-2 border-green-100 bg-green-50/50 rounded-xl p-3 text-xl font-bold text-green-800 outline-none resize-none focus:ring-green-500 focus:border-green-500 transition-colors"/>
             </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ITEMS (STICKY) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col lg:h-[calc(100vh-140px)] lg:sticky lg:top-24 h-auto">
             <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
               <h3 className="font-bold text-gray-800 flex items-center gap-2"><ListPlus size={18} className="text-primary-500"/> Servicios Incluidos</h3>
             </div>
             
             <div className="p-2 border-b border-gray-100">
               <div className="flex gap-2">
                 <input type="text" value={newItem} onChange={e => setNewItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Nuevo item..." className={`flex-1 ${inputClass}`}/>
                 <button onClick={addItem} className="bg-gray-800 text-white p-2 rounded-lg hover:bg-black transition-colors"><Plus size={16}/></button>
               </div>
             </div>

             <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[300px] lg:min-h-0">
                {formData.items.map((item, idx) => (
                  <div key={idx} className="group flex items-start justify-between p-3 bg-white border border-gray-100 rounded-lg hover:border-primary-200 hover:shadow-sm transition-all">
                     <p className="text-xs text-gray-600 leading-relaxed">{item}</p>
                     <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity p-1"><Trash2 size={14}/></button>
                  </div>
                ))}
             </div>
             
             <div className="p-2 bg-gray-50 text-center text-[10px] text-gray-400 rounded-b-xl">
               {formData.items.length} items en lista
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}