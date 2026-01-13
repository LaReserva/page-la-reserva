import { useState, useEffect, Fragment } from 'react';
import { Combobox, Dialog, Transition } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { FileSignature, Search, Check, ChevronsUpDown, Loader2, CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { Proposal } from '@/types';

export function ContractGenerator({ userRole, onSuccess }: { userRole: string, onSuccess: () => void }) {
  const [query, setQuery] = useState('');
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estado para el Modal de Confirmación (Pregunta antes de generar)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Estado para el Modal de Feedback (Éxito/Error al final)
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    if (query.length > 0) {
       searchProposals(query);
    } else {
       searchProposals('');
    }
  }, [query]);

  async function searchProposals(search: string) {
    let q = supabase
      .from('proposals')
      .select('*')
      .in('status', ['pending', 'accepted']) 
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (search) q = q.ilike('client_name', `%${search}%`);
    
    const { data } = await q;
    setPendingProposals((data || []) as Proposal[]);
  }

  // Paso 1: Abrir Modal de Confirmación
  const handleOpenConfirmation = () => {
    if (!selectedProposal) return;
    setShowConfirmDialog(true);
  };

  // Paso 2: Ejecutar la generación (Al confirmar en el modal)
  const executeGeneration = async () => {
    setShowConfirmDialog(false); // Cerramos el de confirmación
    setIsProcessing(true);

    try {
      const { generateContractWord } = await import('@/utils/ContractGenerator');
      const FileSaver = (await import('file-saver')).default;
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        proposal_id: selectedProposal!.id,
        client_name: selectedProposal!.client_name,
        client_email: selectedProposal!.client_email,
        client_phone: selectedProposal!.client_phone,
        event_date: selectedProposal!.event_date,
        event_type: selectedProposal!.event_type,
        total_amount: selectedProposal!.total_price,
        items: selectedProposal!.items,
        contract_status: 'created',
        user_id: user?.id
      };
      
      const { data: contract, error } = await supabase.from('contracts').insert(payload).select().single();
      if (error) throw error;

      if (selectedProposal!.status !== 'accepted') {
        await supabase.from('proposals').update({ status: 'accepted' }).eq('id', selectedProposal!.id);
      }

      const blob = await generateContractWord(selectedProposal!);
      const folio = contract.id.slice(0, 8).toUpperCase();
      const fileName = `Contrato_${selectedProposal!.client_name.replace(/\s+/g, '_')}_${folio}.docx`;
      
      FileSaver.saveAs(blob, fileName);

      // Mostrar Modal de Éxito
      setModalState({
        isOpen: true,
        type: 'success',
        title: '¡Contrato Generado!',
        message: `El contrato para ${selectedProposal!.client_name} ha sido creado y descargado.`
      });

    } catch (e: any) {
      // Mostrar Modal de Error
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Error',
        message: e.message
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeFeedbackModal = () => {
    setModalState({ ...modalState, isOpen: false });
    if (modalState.type === 'success') {
      onSuccess();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pt-10">
      
      {/* --- MODAL DE CONFIRMACIÓN (PREGUNTA) --- */}
      <Transition appear show={showConfirmDialog} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowConfirmDialog(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-blue-100 text-blue-600">
                      <HelpCircle size={30} />
                    </div>
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">¿Generar Contrato?</Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Se generará el documento oficial para <strong>{selectedProposal?.client_name}</strong> y la propuesta pasará a estado "Aceptada".
                      </p>
                    </div>
                    <div className="mt-6 flex gap-3 w-full">
                      <button type="button" className="flex-1 justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none" onClick={() => setShowConfirmDialog(false)}>
                        Cancelar
                      </button>
                      <button type="button" className="flex-1 justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none" onClick={executeGeneration}>
                        Sí, Generar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* --- MODAL DE FEEDBACK (ÉXITO/ERROR) --- */}
      <Transition appear show={modalState.isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeFeedbackModal}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${modalState.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {modalState.type === 'success' ? <CheckCircle size={30} /> : <XCircle size={30} />}
                    </div>
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">{modalState.title}</Dialog.Title>
                    <div className="mt-2"><p className="text-sm text-gray-500">{modalState.message}</p></div>
                    <div className="mt-6 w-full">
                      <button type="button" className={`w-full inline-flex justify-center rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none ${modalState.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`} onClick={closeFeedbackModal}>
                        {modalState.type === 'success' ? 'Ir al Archivo' : 'Cerrar'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* HEADER */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileSignature size={32}/>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Generar Nuevo Contrato</h2>
        <p className="text-gray-500">Selecciona una propuesta para formalizar el acuerdo.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xl">
        {!selectedProposal ? (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Buscar Propuesta</label>
            <Combobox value={selectedProposal} onChange={setSelectedProposal}>
              <div className="relative mt-1">
                <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-gray-50 text-left border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 sm:text-sm">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400"><Search size={20}/></div>
                  <Combobox.Input
                    className="w-full border-none py-4 pl-10 pr-10 text-sm leading-5 text-gray-900 bg-transparent focus:ring-0 outline-none"
                    displayValue={(proposal: Proposal) => proposal?.client_name || ''}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Escribe nombre del cliente..."
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  </Combobox.Button>
                </div>
                <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-50">
                  {pendingProposals.length === 0 && query !== '' ? (
                    <div className="relative cursor-default select-none py-2 px-4 text-gray-700">No se encontraron propuestas.</div>
                  ) : (
                    pendingProposals.map((proposal) => (
                      <Combobox.Option key={proposal.id} className={({ active }) => `relative cursor-default select-none py-3 pl-10 pr-4 ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`} value={proposal}>
                        {({ selected, active }) => (
                          <>
                            <div className="flex flex-col">
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>{proposal.client_name}</span>
                                <span className={`block text-xs ${active ? 'text-blue-200' : 'text-gray-500'}`}>{proposal.event_type} • S/ {proposal.total_price} • {new Date(proposal.created_at).toLocaleDateString()}</span>
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
        ) : (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-bold text-lg text-blue-900">{selectedProposal.client_name}</h3>
                      <p className="text-blue-600 text-sm">{selectedProposal.event_type}</p>
                   </div>
                   <button onClick={() => setSelectedProposal(null)} className="text-xs text-blue-400 hover:text-blue-700 font-medium underline">Cambiar</button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-blue-800">
                   <div><span className="block opacity-60 text-xs">Fecha del Evento</span><span className="font-bold">{selectedProposal.event_date || 'Por definir'}</span></div>
                   <div><span className="block opacity-60 text-xs">Monto Total</span><span className="font-bold">S/ {Number(selectedProposal.total_price).toFixed(2)}</span></div>
                </div>
             </div>
             {/* ✅ LLAMAMOS A handleOpenConfirmation EN LUGAR DE LA FUNCIÓN DIRECTA */}
             <button onClick={handleOpenConfirmation} disabled={isProcessing} className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-3">
               {isProcessing ? <Loader2 className="animate-spin"/> : <CheckCircle/>} Confirmar y Descargar Word
             </button>
          </div>
        )}
      </div>
    </div>
  );
}