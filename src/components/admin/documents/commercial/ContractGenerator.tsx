import { useState, useEffect, Fragment } from 'react';
import { Combobox, Dialog, Transition, RadioGroup } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { FileSignature, Search, Check, ChevronsUpDown, Loader2, CheckCircle, AlertTriangle, XCircle, Plus, Trash2, Settings } from 'lucide-react';
import type { Proposal } from '@/types';

// Tipos para los suministros externos
type SupplyType = 'provider' | 'client_all' | 'client_partial';
interface ClientItem { qty: number; description: string; }

export function ContractGenerator({ userRole, onSuccess }: { userRole: string, onSuccess: () => void }) {
  const [query, setQuery] = useState('');
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- ESTADOS DE CONFIGURACIÓN (ACTUALIZADO) ---
  const [contractConfig, setContractConfig] = useState({
    guaranteeDeposit: 0,
    extraHourCost: 300,
    setupHours: 2,
    serviceHours: 5, // ✅ AHORA ES UN NÚMERO EDITABLE (Valor por defecto: 5)
  });

  // Configuración de Suministros
  const [supplyType, setSupplyType] = useState<SupplyType>('provider');
  const [clientItems, setClientItems] = useState<ClientItem[]>([]);
  const [newItem, setNewItem] = useState({ qty: 1, description: '' });

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean; type: 'success' | 'error' | 'warning'; title: string; message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    searchProposals(query);
  }, [query]);

  async function searchProposals(search: string) {
    let q = supabase.from('proposals').select('*').in('status', ['pending', 'accepted']).order('created_at', { ascending: false }).limit(10);
    if (search) q = q.ilike('client_name', `%${search}%`);
    const { data } = await q;
    setPendingProposals((data || []) as Proposal[]);
  }

  // Manejo de Items del Cliente
  const addClientItem = () => {
    if (!newItem.description) return;
    setClientItems([...clientItems, newItem]);
    setNewItem({ qty: 1, description: '' });
  };
  
  const removeClientItem = (idx: number) => {
    setClientItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateContract = async () => {
    if (!selectedProposal) return;

    // ✅ VALIDACIÓN DE SEGURIDAD (FIX DEL ERROR)
    // Aseguramos que la propuesta tenga un ID válido antes de continuar.
    if (!selectedProposal.id) {
       setModalState({ 
         isOpen: true, 
         type: 'error', 
         title: 'Error de Datos', 
         message: "No se ha podido recuperar el ID de la propuesta seleccionada. Por favor, intenta buscarla y seleccionarla nuevamente." 
       });
       return;
    }

    setIsProcessing(true);

    try {
      // 1. Importación dinámica
      const { generateContractWord } = await import('@/utils/ContractGenerator');
      const FileSaver = (await import('file-saver')).default;
      
      // 2. Guardar registro en BD
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        proposal_id: selectedProposal.id,
        client_name: selectedProposal.client_name,
        client_email: selectedProposal.client_email,
        client_phone: selectedProposal.client_phone,
        event_date: selectedProposal.event_date,
        event_type: selectedProposal.event_type,
        total_amount: selectedProposal.total_price,
        items: selectedProposal.items,
        contract_status: 'created',
        user_id: user?.id,
        metadata: { ...contractConfig, supplyType, clientItems } 
      };
      
      // Aquí es donde podría estar ocurriendo el error si la BD tiene triggers.
      const { data: contract, error } = await supabase.from('contracts').insert(payload).select().single();
      if (error) throw error;

      if (selectedProposal.status !== 'accepted') {
        await supabase.from('proposals').update({ status: 'accepted' }).eq('id', selectedProposal.id);
      }

      // 3. GENERAR WORD
      const blob = await generateContractWord({
        proposal: selectedProposal,
        config: contractConfig, // Pasamos la nueva config con el número de horas
        supplies: { type: supplyType, items: clientItems }
      });

      const folio = contract.id.slice(0, 8).toUpperCase();
      FileSaver.saveAs(blob, `Contrato_${selectedProposal.client_name.replace(/\s+/g, '_')}_${folio}.docx`);

      setModalState({ isOpen: true, type: 'success', title: '¡Contrato Generado!', message: `Contrato generado con las nuevas cláusulas.` });

    } catch (e: any) {
      setModalState({ isOpen: true, type: 'error', title: 'Error', message: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    setModalState({ ...modalState, isOpen: false });
    if (modalState.type === 'success') onSuccess();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pt-10 pb-20">
      
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4"><FileSignature size={32}/></div>
        <h2 className="text-2xl font-bold text-gray-900">Generador de Contratos</h2>
        <p className="text-gray-500">Configura las cláusulas y genera el documento legal.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xl space-y-8">
        
        {/* SELECCIÓN DE PROPUESTA */}
        <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 uppercase tracking-wider">1. Seleccionar Propuesta</label>
            <Combobox value={selectedProposal} onChange={setSelectedProposal}>
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-gray-50 text-left border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><Search size={20}/></div>
                  <Combobox.Input className="w-full border-none py-4 pl-10 pr-10 text-sm leading-5 text-gray-900 bg-transparent focus:ring-0 outline-none" displayValue={(p: Proposal) => p?.client_name || ''} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente..."/>
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2"><ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" /></Combobox.Button>
                </div>
                <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                  {pendingProposals.length === 0 && query !== '' ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">No encontrado.</div>
                  ) : (
                    pendingProposals.map((proposal) => (
                      <Combobox.Option key={proposal.id} className={({ active }) => `relative cursor-default select-none py-3 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`} value={proposal}>
                        {({ selected, active }) => (
                          <>
                            <div className="flex flex-col">
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{proposal.client_name}</span>
                                <span className={`block text-xs ${active ? 'text-blue-200' : 'text-gray-500'}`}>{proposal.event_type} • S/ {proposal.total_price}</span>
                            </div>
                            {selected ? <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-blue-600'}`}><Check className="h-5 w-5" aria-hidden="true" /></span> : null}
                          </>
                        )}
                      </Combobox.Option>
                    ))
                  )}
                </Combobox.Options>
              </div>
            </Combobox>
        </div>

        {selectedProposal && (
          <div className="animate-in fade-in space-y-8">
            
            {/* CONFIGURACIÓN OPERATIVA */}
            <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 space-y-6">
               <h3 className="font-bold text-gray-800 flex items-center gap-2"><Settings size={18}/> 2. Variables del Contrato</h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Costo Hora Extra (S/)</label>
                    <input type="number" value={contractConfig.extraHourCost} onChange={e => setContractConfig({...contractConfig, extraHourCost: Number(e.target.value)})} className="w-full p-2 border rounded-lg"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Depósito de Garantía (S/)</label>
                    <input type="number" value={contractConfig.guaranteeDeposit} onChange={e => setContractConfig({...contractConfig, guaranteeDeposit: Number(e.target.value)})} className="w-full p-2 border rounded-lg"/>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Horas de Montaje Previas</label>
                    <input type="number" value={contractConfig.setupHours} onChange={e => setContractConfig({...contractConfig, setupHours: Number(e.target.value)})} className="w-full p-2 border rounded-lg"/>
                  </div>
                  
                  {/* ✅ INPUT ACTUALIZADO: AHORA ES NUMÉRICO */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Duración Servicio (Horas)</label>
                    <input 
                      type="number"
                      min="1"
                      value={contractConfig.serviceHours} 
                      onChange={e => setContractConfig({...contractConfig, serviceHours: Number(e.target.value)})} 
                      className="w-full p-2 border rounded-lg"
                    />
                  </div>
               </div>
            </div>

            {/* CONFIGURACIÓN DE SUMINISTROS (Sin cambios) */}
            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
               <h3 className="font-bold text-blue-900">3. Suministro de Licores e Insumos</h3>
               
               <RadioGroup value={supplyType} onChange={setSupplyType} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <RadioGroup.Option value="provider" className={({ checked }) => `cursor-pointer rounded-lg px-4 py-3 border shadow-sm flex items-center justify-center text-sm font-medium transition-all ${checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    La Reserva pone todo
                  </RadioGroup.Option>
                  <RadioGroup.Option value="client_all" className={({ checked }) => `cursor-pointer rounded-lg px-4 py-3 border shadow-sm flex items-center justify-center text-sm font-medium transition-all ${checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    Cliente pone todo
                  </RadioGroup.Option>
                  <RadioGroup.Option value="client_partial" className={({ checked }) => `cursor-pointer rounded-lg px-4 py-3 border shadow-sm flex items-center justify-center text-sm font-medium transition-all ${checked ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
                    Cliente pone parcial
                  </RadioGroup.Option>
               </RadioGroup>

               {/* LISTA DINÁMICA SI ES PARCIAL */}
               {supplyType === 'client_partial' && (
                 <div className="mt-4 p-4 bg-white rounded-lg border border-blue-100 animate-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-gray-500 mb-2">Lista de insumos del cliente:</label>
                    <div className="flex gap-2 mb-2">
                       <input type="number" min="1" className="w-20 p-2 border rounded-lg text-sm" placeholder="Cant." value={newItem.qty} onChange={e => setNewItem({...newItem, qty: Number(e.target.value)})}/>
                       <input type="text" className="flex-1 p-2 border rounded-lg text-sm" placeholder="Descripción (ej. Botellas de Whisky)" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})}/>
                       <button onClick={addClientItem} className="p-2 bg-blue-600 text-white rounded-lg"><Plus size={16}/></button>
                    </div>
                    <ul className="space-y-1">
                       {clientItems.map((item, idx) => (
                         <li key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                            <span><b>{item.qty}</b> - {item.description}</span>
                            <button onClick={() => removeClientItem(idx)} className="text-red-500"><Trash2 size={14}/></button>
                         </li>
                       ))}
                       {clientItems.length === 0 && <p className="text-xs text-gray-400 italic">Agrega los items que el cliente traerá.</p>}
                    </ul>
                 </div>
               )}
            </div>

            <button onClick={handleGenerateContract} disabled={isProcessing} className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-3 text-lg">
               {isProcessing ? <Loader2 className="animate-spin"/> : <CheckCircle/>} Generar Documento Final
            </button>
          </div>
        )}
      </div>

      {/* MODAL UNIFICADO */}
      <Transition appear show={modalState.isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
                 <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 mx-auto ${modalState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {modalState.type === 'success' ? <CheckCircle size={30} /> : <XCircle size={30} />}
                 </div>
                 <Dialog.Title className="text-lg font-bold">{modalState.title}</Dialog.Title>
                 <p className="text-sm text-gray-500 mt-2">{modalState.message}</p>
                 <button onClick={closeModal} className="mt-6 w-full bg-gray-900 text-white py-2 rounded-lg">Cerrar</button>
              </Dialog.Panel>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}