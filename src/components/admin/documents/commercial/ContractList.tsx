import { useState, useEffect, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Trash2, FileSignature, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
// ✅ IMPORTANTE: Agregamos ContractMetadata para el tipado fuerte
import type { Contract, ContractMetadata } from '@/types';

export function ContractList({ userRole }: { userRole: string }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Estado para Modal de Eliminación
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchContracts();
  }, [searchTerm]);

  async function fetchContracts() {
    setLoading(true);
    try {
      let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.ilike('client_name', `%${searchTerm}%`);
      
      const { data, error } = await query;
      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (error) {
      console.error("Error cargando contratos:", error);
    } finally {
      setLoading(false);
    }
  }

  // ✅ LÓGICA CORREGIDA (Sin tocar diseño)
  const handleDownloadPdf = async (contract: Contract) => {
    setIsGenerating(contract.id);
    try {
      const FileSaver = (await import('file-saver')).default;
      const { generateContractWord } = await import('@/utils/ContractGenerator');

      // 1. Reconstruimos el objeto 'proposal' para asegurar que 'items' no sea undefined
      const mockProposal = {
        id: contract.proposal_id,
        client_name: contract.client_name,
        client_email: contract.client_email || '',
        client_phone: contract.client_phone || '',
        event_date: contract.event_date,
        event_type: contract.event_type,
        total_price: contract.total_amount,
        items: contract.items || [], // <--- ESTO EVITA EL ERROR CRÍTICO
        guest_count: 0, 
        status: 'accepted'
      };

      // 2. Extraemos metadata con tipado fuerte (Partial<ContractMetadata>)
      const meta = (contract.metadata || {}) as Partial<ContractMetadata>;

      const config = {
        guaranteeDeposit: meta.guaranteeDeposit || 0,
        extraHourCost: meta.extraHourCost || 0,
        setupHours: meta.setupHours || 0,
        serviceHours: meta.serviceHours || 5,
      };

      const supplies = {
        type: meta.supplyType || 'provider',
        items: meta.clientItems || []
      };

      // 3. Generamos el documento pasando la estructura correcta
      const blob = await generateContractWord({
        proposal: mockProposal as any,
        config: config,
        supplies: supplies as any
      });

      const folio = contract.id.slice(0, 8).toUpperCase();
      FileSaver.saveAs(blob, `Contrato_${contract.client_name.replace(/\s+/g, '_')}_${folio}.docx`);

    } catch (e) {
      console.error(e);
      alert("Error al descargar el contrato");
    } finally {
      setIsGenerating(null);
    }
  };

  // Paso 1: Abrir Modal
  const requestDelete = (id: string) => {
    setContractToDelete(id);
  };

  // Paso 2: Ejecutar Borrado
  const executeDelete = async () => {
    if (!contractToDelete) return;
    
    const { error } = await supabase.from('contracts').delete().eq('id', contractToDelete);
    if (!error) {
      setContracts(prev => prev.filter(c => c.id !== contractToDelete));
    }
    setContractToDelete(null); // Cerrar modal
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full animate-in fade-in relative">
      
      {/* --- MODAL DE ELIMINACIÓN (DESTRUCTIVO) --- */}
      <Transition appear show={!!contractToDelete} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setContractToDelete(null)}>
          <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-red-100 text-red-600">
                      <AlertTriangle size={30} />
                    </div>
                    <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">¿Eliminar Contrato?</Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Esta acción borrará el registro del historial permanentemente. ¿Estás seguro?
                      </p>
                    </div>

                    <div className="mt-6 flex gap-3 w-full">
                      <button type="button" className="flex-1 justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none" onClick={() => setContractToDelete(null)}>
                        Cancelar
                      </button>
                      <button type="button" className="flex-1 justify-center rounded-xl border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none" onClick={executeDelete}>
                        Sí, Eliminar
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Toolbar */}
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <FileSignature className="text-blue-600" size={20}/> Archivo de Contratos
        </h3>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
          <input 
            type="text" 
            placeholder="Buscar por cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-gray-300"/></div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm">
            <FileSignature size={32} className="mb-2 opacity-20"/> No hay contratos generados.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3">Folio</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Evento</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Descargar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.map((c) => (
                <tr key={c.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {c.id.slice(0, 8).toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-800">{c.client_name}</div>
                    <div className="text-xs text-gray-400">{c.client_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-700">{c.event_type}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={10}/> {c.event_date}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-green-100 text-green-800 border-green-200">
                      {c.contract_status === 'created' ? 'Generado' : c.contract_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleDownloadPdf(c)} 
                        disabled={isGenerating === c.id}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1" 
                        title="Descargar Word"
                      >
                        {isGenerating === c.id ? <Loader2 size={16} className="animate-spin"/> : <><FileSignature size={16}/> <span className="text-xs">Word</span></>}
                      </button>
                      
                      {['super_admin'].includes(userRole) && (
                        <button onClick={() => requestDelete(c.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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