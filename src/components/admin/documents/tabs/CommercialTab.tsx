// src/components/admin/documents/tabs/CommercialTab.tsx
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  FileText, Plus, User, Calendar, ListPlus, Search, 
  FileStack, ChevronDown, Loader2, Link, Globe, UserPlus, 
  Save, Eye, Trash2, AlertTriangle, X, FileSignature, CheckCircle
} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import FileSaver from 'file-saver';
import { ProposalPdf } from '../templates/ProposalPdf';
import { generateContractWord } from '@/utils/ContractGenerator'; // ✅ IMPORTANTE: Importar el generador
import { QUOTE_DOC_STATUSES } from '@/utils/constants';
import type { Proposal, Contract } from '@/types';

// --- COMPONENTES AUXILIARES ---

const StatusSelector = ({ currentStatus, onChange, loading }: { currentStatus: string, onChange: (val: string) => void, loading: boolean }) => {
  const config = QUOTE_DOC_STATUSES[currentStatus as keyof typeof QUOTE_DOC_STATUSES] || QUOTE_DOC_STATUSES.pending;
  const colorClasses: Record<string, string> = {
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    green: "bg-green-100 text-green-800 border-green-200",
    red: "bg-red-100 text-red-800 border-red-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200"
  };
  const safeColor = config?.color || 'gray';

  return (
    <div className="relative group min-w-[110px]">
      {loading ? <div className="flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-gray-400"/></div> : (
        <>
          <select 
            value={currentStatus}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full appearance-none pl-3 pr-7 py-1 rounded-full text-[10px] font-bold uppercase border cursor-pointer outline-none focus:ring-2 focus:ring-primary-300 transition-all text-center ${colorClasses[safeColor]}`}
          >
            <option value="pending">Pendiente</option>
            <option value="accepted">Aceptada</option>
            <option value="rejected">Rechazada</option>
            <option value="expired">Vencida</option>
          </select>
          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"/>
        </>
      )}
    </div>
  );
};

// DATOS POR DEFECTO
const DEFAULT_EVENT_TYPES = ["Boda", "Corporativo", "Cumpleaños", "Privado", "15 Años", "Graduación", "Aniversario", "Baby Shower", "Cocktail"];

const DEFAULT_INCLUDES = [
  "2 Bartenders profesionales correctamente uniformados",
  "4 Horas de servicio continuo de Open Bar",
  "1 Barra Capitone de color blanco (2 metros)",
  "Hielo ilimitado durante el servicio",
  "Insumos de primera calidad (Jarabes, Frutas, Decoraciones)",
  "Cristalería completa para todos los cocteles"
];

export function CommercialTab({ userRole }: { userRole: string }) {
  // --- NAVEGACIÓN ---
  const [viewMode, setViewMode] = useState<string>('new_proposal'); 
  
  // --- MODO DE CREACIÓN ---
  const [creationSource, setCreationSource] = useState<'web' | 'free'>('free'); 
  const [linkedQuoteId, setLinkedQuoteId] = useState<string | null>(null);

  // --- DATOS FORMULARIO (PROPUESTA) ---
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventType, setEventType] = useState('Boda');
  const [eventDate, setEventDate] = useState('');
  const [guestCount, setGuestCount] = useState<number>(50);
  const [quoteAmount, setQuoteAmount] = useState<string>('');
  
  // Inicializamos con la lista por defecto
  const [includesList, setIncludesList] = useState<string[]>(DEFAULT_INCLUDES);
  const [newInclude, setNewInclude] = useState('');

  // --- DATOS GENERACIÓN CONTRATO ---
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [contractPreview, setContractPreview] = useState<boolean>(false);

  // --- UI STATES ---
  const [searchTerm, setSearchTerm] = useState(''); 
  const [webLeads, setWebLeads] = useState<any[]>([]); 
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [isSearchingLead, setIsSearchingLead] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [proposalsList, setProposalsList] = useState<Proposal[]>([]);
  const [contractsList, setContractsList] = useState<Contract[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  
  const [suggestionEventTypes, setSuggestionEventTypes] = useState<string[]>(DEFAULT_EVENT_TYPES);
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);

  // --- MODALES ---
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'proposal' | 'contract'} | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);

  // --- EFECTOS ---
  useEffect(() => {
    if (viewMode === 'list_proposals') fetchProposals();
    if (viewMode === 'list_contracts') fetchContracts();
    
    // Limpieza inteligente al cambiar de vista
    if (viewMode === 'new_proposal') clearForm();
    if (viewMode === 'new_contract') { clearForm(); setSelectedProposal(null); setContractPreview(false); }
    
    fetchEventTypes();
  }, [viewMode, searchTerm]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setShowSuggestions(false);
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) setShowTypeSuggestions(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const clearForm = () => {
    setClientName(''); setClientPhone(''); setClientEmail(''); 
    setEventType('Boda'); setEventDate(''); setGuestCount(50); setQuoteAmount(''); 
    setIncludesList(DEFAULT_INCLUDES); 
    setLinkedQuoteId(null);
  };

  // --- API CALLS ---
  async function fetchEventTypes() {
    const { data } = await supabase.from('events').select('event_type');
    const dbTypes = data ? data.map(e => e.event_type).filter(Boolean) : [];
    setSuggestionEventTypes(Array.from(new Set([...DEFAULT_EVENT_TYPES, ...dbTypes])).sort());
  }

  // 1. Buscar Leads Web
  const handleSearchWebLeads = async (val: string) => {
    setClientName(val);
    if (creationSource === 'free') return;
    if (val.trim().length < 1) { setWebLeads([]); setShowSuggestions(false); return; }

    setIsSearchingLead(true);
    setShowSuggestions(true);
    try {
      const { data, error } = await supabase.from('quotes').select('*').neq('status', 'quoted').ilike('client_name', `%${val}%`).limit(5);
      if (error) throw error;
      setWebLeads(data || []);
    } catch (error) { console.error(error); } finally { setIsSearchingLead(false); }
  };

  // 2. Buscar Propuestas Pendientes
  const handleSearchPendingProposals = async (val: string) => {
    setClientName(val);
    if (val.trim().length < 1) { setPendingProposals([]); setShowSuggestions(false); return; }
    setIsSearchingLead(true);
    setShowSuggestions(true);
    try {
      const { data, error } = await supabase.from('proposals').select('*').eq('status', 'pending').ilike('client_name', `%${val}%`).limit(5);
      if (error) throw error;
      setPendingProposals((data || []) as Proposal[]);
    } catch (error) { console.error(error); } finally { setIsSearchingLead(false); }
  };

  // Selectores
  const selectWebLead = (lead: any) => {
    setLinkedQuoteId(lead.id);
    setClientName(lead.client_name || ''); setClientPhone(lead.client_phone || ''); setClientEmail(lead.client_email || '');
    setEventType(lead.event_type || 'Boda'); setEventDate(lead.event_date || ''); setGuestCount(lead.guest_count || 50);
    setShowSuggestions(false);
  };

  const selectPendingProposal = (prop: Proposal) => {
    setSelectedProposal(prop);
    setClientName(prop.client_name);
    setContractPreview(true);
    setShowSuggestions(false);
  };

  // Fetch Lists
  async function fetchProposals() {
    setLoadingList(true);
    try {
      let query = supabase.from('proposals').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.ilike('client_name', `%${searchTerm}%`);
      const { data } = await query;
      setProposalsList((data || []) as Proposal[]);
    } catch (error) { console.error(error); } finally { setLoadingList(false); }
  }

  async function fetchContracts() {
    setLoadingList(true);
    try {
      let query = supabase.from('contracts').select('*').order('created_at', { ascending: false });
      if (searchTerm) query = query.ilike('client_name', `%${searchTerm}%`);
      const { data } = await query;
      setContractsList((data || []) as Contract[]);
    } catch (error) { console.error(error); } finally { setLoadingList(false); }
  }

  // --- GUARDADO PROPUESTA ---
  async function saveProposalToDb() {
    if (!clientName) return null;
    setIsSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const payload = {
        client_name: clientName, client_email: clientEmail, client_phone: clientPhone,
        event_type: eventType, event_date: eventDate || null, guest_count: guestCount,
        total_price: Number(quoteAmount) || 0, items: includesList, status: 'pending',
        source_quote_id: linkedQuoteId, user_id: userData.user?.id
      };
      const { data: proposalData, error } = await supabase.from('proposals').insert(payload).select().single();
      if (error) throw error;

      if (creationSource === 'web' && linkedQuoteId) {
        await supabase.from('quotes').update({ status: 'quoted' }).eq('id', linkedQuoteId);
      }
      setLinkedQuoteId(null); 
      if (viewMode === 'list_proposals') fetchProposals();
      return proposalData;
    } catch (error: any) { alert(`Error: ${error.message}`); return null; } finally { setIsSaving(false); }
  }

  // --- GENERACIÓN CONTRATO (WORD) ---
  async function generateContract() {
    if (!selectedProposal) return;
    if (!confirm("¿Generar contrato? Esto marcará la propuesta como ACEPTADA.")) return;
    
    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const payload = {
        proposal_id: selectedProposal.id,
        client_name: selectedProposal.client_name, client_email: selectedProposal.client_email,
        client_phone: selectedProposal.client_phone, event_date: selectedProposal.event_date,
        event_type: selectedProposal.event_type, total_amount: selectedProposal.total_price,
        items: selectedProposal.items, contract_status: 'created', user_id: user.user?.id
      };
      
      const { data: contract, error } = await supabase.from('contracts').insert(payload).select().single();
      if (error) throw error;

      await supabase.from('proposals').update({ status: 'accepted' }).eq('id', selectedProposal.id);

      // GENERAR WORD
      const blob = await generateContractWord(selectedProposal);
      const folio = contract.id.slice(0, 8).toUpperCase();
      const fileName = `Contrato_${selectedProposal.client_name.replace(/\s+/g, '_')}_${folio}.docx`;
      
      FileSaver.saveAs(blob, fileName);

      alert(`Contrato generado y descargado (WORD).\nFolio: ${folio}`);
      setViewMode('list_contracts');
      
    } catch (e: any) { alert(e.message); } finally { setIsSaving(false); }
  }

  // --- PDF LOGIC ---
  const initiatePdfGeneration = () => { if (!clientName.trim()) { alert("Falta nombre"); return; } setShowSaveConfirmModal(true); };

  const executeGeneration = async (shouldSave: boolean) => {
    setShowSaveConfirmModal(false);
    if (shouldSave) { const saved = await saveProposalToDb(); if (!saved) return; }
    try {
      setIsGenerating(true);
      const blob = await pdf(<ProposalPdf clientName={clientName} clientPhone={clientPhone} clientEmail={clientEmail} eventType={eventType} eventDate={eventDate} guestCount={guestCount} items={includesList} totalCost={Number(quoteAmount) || 0}/>).toBlob();
      FileSaver.saveAs(blob, `Propuesta_${clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) { alert("Error PDF"); } finally { setIsGenerating(false); }
  };

  const handleViewPdf = async (doc: any, type: 'proposal' | 'contract') => {
    try {
      setIsGenerating(true);
      // Para visualización rápida, usamos el PDF (incluso para contratos)
      const itemsArray = typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items || [];
      const isContract = type === 'contract';
      const blob = await pdf(
        <ProposalPdf 
          clientName={doc.client_name} clientPhone={doc.client_phone} clientEmail={doc.client_email}
          eventType={doc.event_type} eventDate={doc.event_date} guestCount={doc.guest_count || 0}
          items={itemsArray} totalCost={Number(isContract ? doc.total_amount : doc.total_price) || 0}
        />
      ).toBlob();
      const prefix = isContract ? `Contrato_${doc.id.slice(0,8)}` : `Cotizacion`;
      FileSaver.saveAs(blob, `${prefix}_${doc.client_name}.pdf`);
    } catch(e) { alert("Error visualizando"); } finally { setIsGenerating(false); }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStatusId(id);
    try {
      await supabase.from('proposals').update({ status: newStatus }).eq('id', id);
      setProposalsList(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p));
    } catch(e) { console.error(e); } finally { setUpdatingStatusId(null); }
  };

  // --- BORRAR ---
  const confirmDelete = (id: string, type: 'proposal' | 'contract') => { setItemToDelete({ id, type }); setShowDeleteModal(true); };
  const executeDelete = async () => {
    if (!itemToDelete) return;
    try {
      const table = itemToDelete.type === 'proposal' ? 'proposals' : 'contracts';
      const { error } = await supabase.from(table).delete().eq('id', itemToDelete.id);
      if (error) throw error;
      if (itemToDelete.type === 'proposal') setProposalsList(prev => prev.filter(p => p.id !== itemToDelete.id));
      else setContractsList(prev => prev.filter(c => c.id !== itemToDelete.id));
      setShowDeleteModal(false); setItemToDelete(null);
    } catch (e) { alert("Error al eliminar"); }
  };

  // UI Handlers
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { setClientPhone(e.target.value.replace(/[^0-9]/g, '')); };
  const handleAddInclude = () => { if (newInclude.trim()) { setIncludesList([...includesList, newInclude]); setNewInclude(''); }};
  const handleRemoveInclude = (idx: number) => { const l = [...includesList]; l.splice(idx, 1); setIncludesList(l); };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleAddInclude(); };
  const handleDirectSave = async () => { const result = await saveProposalToDb(); if (result) alert("Guardado correctamente."); };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 bg-gray-50 min-h-screen items-start relative">
      
      {/* === MODALES === */}
      {showSaveConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full animate-in zoom-in">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto"><FileText size={24}/></div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Generar Propuesta PDF</h3>
              <p className="text-sm text-gray-500 mb-6">¿Guardar copia en historial?</p>
              <div className="space-y-3">
                <button onClick={() => executeGeneration(true)} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2"><Save size={18}/> Sí, Guardar y Descargar</button>
                <button onClick={() => executeGeneration(false)} className="w-full py-3 bg-white border hover:bg-gray-50 text-gray-700 font-bold rounded-xl">No, solo Descargar</button>
              </div>
              <button onClick={() => setShowSaveConfirmModal(false)} className="mt-4 text-xs text-gray-400 hover:underline">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto"><AlertTriangle size={24}/></div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar Documento?</h3>
              <p className="text-sm text-gray-500 mb-6">Esta acción es irreversible.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2 bg-gray-100 rounded-lg font-medium">Cancelar</button>
                <button onClick={executeDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium shadow">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <div className="lg:col-span-3 border-r border-gray-200 bg-white lg:sticky lg:top-0 lg:h-screen flex flex-col h-auto shadow-sm z-10">
        <div className="p-5 border-b border-gray-100 space-y-2">
           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Cotizaciones</div>
           <button onClick={() => setViewMode('new_proposal')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'new_proposal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
             <Plus size={18}/> Nueva Propuesta
           </button>
           <button onClick={() => setViewMode('list_proposals')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'list_proposals' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
             <FileStack size={18}/> Archivo Propuestas
           </button>

           <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Contratos</div>
           <button onClick={() => setViewMode('new_contract')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'new_contract' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
             <FileSignature size={18}/> Generar Contrato
           </button>
           <button onClick={() => setViewMode('list_contracts')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${viewMode === 'list_contracts' ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
             <ListPlus size={18}/> Archivo Contratos
           </button>
        </div>
      </div>

      {/* AREA PRINCIPAL */}
      <div className="lg:col-span-9 p-6 lg:p-10 min-h-screen flex flex-col">
        
        {/* --- 1. VISTA: NUEVA PROPUESTA --- */}
        {viewMode === 'new_proposal' && (
          <div className="max-w-6xl mx-auto w-full space-y-6 animate-in fade-in">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-4 z-30">
               <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileText className="text-primary-600"/> Generador de Propuestas</h2>
               <div className="flex gap-3">
                 <button onClick={handleDirectSave} disabled={isSaving} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-bold hover:bg-gray-200 flex items-center gap-2 text-sm">
                   {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Guardar
                 </button>
                 <button onClick={initiatePdfGeneration} disabled={isGenerating} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-red-700 flex items-center gap-2 text-sm">
                   {isGenerating ? 'Generando...' : <><FileText size={16}/> PDF</>}
                 </button>
               </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {/* ORIGEN */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative z-20">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                           <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2"><Link size={16}/> Origen</h3>
                           <div className="flex bg-gray-100 p-1 rounded-lg">
                              <button onClick={() => { setCreationSource('web'); setClientName(''); }} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${creationSource === 'web' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}><Globe size={14}/> Solicitud Web</button>
                              <button onClick={() => { setCreationSource('free'); setClientName(''); setLinkedQuoteId(null); }} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${creationSource === 'free' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}><UserPlus size={14}/> Libre</button>
                           </div>
                        </div>
                        <div className="space-y-4">
                            <div className="relative" ref={searchRef}>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">{creationSource === 'web' ? 'Buscar Solicitud' : 'Nombre Cliente'}</label>
                                <div className={`flex items-center border rounded-lg transition-all ${creationSource === 'web' ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-300'} focus-within:ring-2`}>
                                    {isSearchingLead ? <Loader2 size={16} className="text-primary-500 ml-3 animate-spin"/> : <Search size={16} className="ml-3 text-gray-400"/>}
                                    <input type="text" value={clientName} onChange={(e) => creationSource === 'web' ? handleSearchWebLeads(e.target.value) : setClientName(e.target.value)} placeholder="Escribe nombre..." className="w-full p-2.5 bg-transparent border-none focus:ring-0 text-sm" autoComplete="off"/>
                                    {linkedQuoteId && creationSource === 'web' && <span className="mr-3 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">VINCULADO</span>}
                                </div>
                                {creationSource === 'web' && showSuggestions && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                                        {webLeads.length > 0 ? webLeads.map(lead => (
                                            <div key={lead.id} onClick={() => selectWebLead(lead)} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b flex justify-between group">
                                                <div><span className="font-bold block text-sm">{lead.client_name}</span><span className="text-xs text-gray-500">{lead.event_type}</span></div>
                                            </div>
                                        )) : (!isSearchingLead && clientName.length > 0 && <div className="p-4 text-center text-xs text-gray-400">Sin resultados.</div>)}
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Celular</label><input type="tel" value={clientPhone} onChange={handlePhoneChange} className="w-full p-2.5 border rounded-lg text-sm outline-none" placeholder="Solo números"/></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Correo</label><input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm outline-none" placeholder="mail@ejemplo.com"/></div>
                            </div>
                        </div>
                    </div>

                    {/* EVENTO Y COSTOS */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative z-10">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Calendar size={16}/> Evento</h3>
                        <div className="space-y-4">
                            <div className="relative" ref={typeRef}>
                                <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo</label>
                                <div className="relative">
                                  <input type="text" value={eventType} onChange={e => { setEventType(e.target.value); setShowTypeSuggestions(true); }} onFocus={() => setShowTypeSuggestions(true)} className="w-full p-2.5 border rounded-lg text-sm outline-none" placeholder="Ej. Boda"/>
                                  <button onClick={() => setShowTypeSuggestions(!showTypeSuggestions)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><ChevronDown size={16}/></button>
                                </div>
                                {showTypeSuggestions && (
                                   <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto z-50">
                                      {suggestionEventTypes.filter(t => t.toLowerCase().includes(eventType.toLowerCase())).map(t => (
                                         <div key={t} onClick={() => { setEventType(t); setShowTypeSuggestions(false); }} className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm">{t}</div>
                                      ))}
                                   </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Fecha</label><input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm outline-none"/></div>
                                <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Invitados</label><input type="number" value={guestCount} onChange={e => setGuestCount(Number(e.target.value))} className="w-full p-2.5 border rounded-lg text-sm outline-none"/></div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm border-l-4 border-l-green-500">
                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Precio Total (S/)</label>
                        <input type="number" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)} placeholder="0.00" className="w-full p-3 border rounded-lg text-xl font-bold text-gray-800 outline-none"/>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col h-auto min-h-[600px]">
                   <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 flex-none">
                     <div className="p-2 bg-primary-50 rounded-lg text-primary-600"><ListPlus size={20}/></div>
                     <div><h3 className="text-lg font-bold text-gray-800">Detalles del Servicio</h3><p className="text-xs text-gray-400">Items incluidos en la propuesta</p></div>
                   </div>
                   <div className="flex gap-2 mb-4 flex-none">
                     <input type="text" value={newInclude} onChange={(e) => setNewInclude(e.target.value)} onKeyDown={handleKeyDown} placeholder="Ej: Barra Capitone..." className="flex-1 p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 outline-none"/>
                     <button onClick={handleAddInclude} className="bg-gray-800 text-white px-4 rounded-lg text-sm font-medium hover:bg-gray-900 flex items-center gap-2"><Plus size={16}/> Agregar</button>
                   </div>
                   <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[400px] custom-scrollbar border border-gray-100 rounded-lg p-2 bg-gray-50/50">
                     {includesList.map((item, index) => (
                       <div key={index} className="flex items-start justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm hover:border-blue-200 transition-all">
                          <div className="flex gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-none"></div>
                            <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                          </div>
                          <button onClick={() => handleRemoveInclude(index)} className="text-gray-300 hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors flex-none"><Trash2 size={16}/></button>
                       </div>
                     ))}
                   </div>
                   <p className="text-[10px] text-gray-400 text-center mt-3 pt-3 border-t border-gray-100 flex-none">{includesList.length} items</p>
                </div>
            </div>
          </div>
        )}

        {/* --- 2. VISTA: LISTA PROPUESTAS --- */}
        {viewMode === 'list_proposals' && (
          <div className="w-full space-y-6 animate-in fade-in">
             <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm min-h-[600px]">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                   <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><FileStack className="text-blue-600"/> Archivo de Propuestas</h2>
                   <div className="relative w-full md:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                      <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar cliente..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"/>
                   </div>
                </div>

                {loadingList ? <div className="p-20 text-center text-gray-400">Cargando...</div> : proposalsList.length === 0 ? (
                  <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-xl"><p className="text-gray-500">No hay propuestas guardadas.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-blue-50 text-blue-900 font-semibold uppercase text-xs border-b border-blue-100">
                        <tr><th className="px-6 py-4">Fecha</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Monto</th><th className="px-6 py-4">Estado</th><th className="px-6 py-4 text-right">Acción</th></tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {proposalsList.map((proposal) => (
                          <tr key={proposal.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-gray-400 text-xs">{new Date(proposal.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-bold text-gray-800">{proposal.client_name}{proposal.source_quote_id && <span className="ml-2 text-[9px] bg-blue-50 text-blue-500 px-1 rounded">WEB</span>}</td>
                            <td className="px-6 py-4 font-mono font-medium text-gray-900">S/ {Number(proposal.total_price).toFixed(2)}</td>
                            <td className="px-6 py-4"><StatusSelector currentStatus={proposal.status} onChange={(v)=>handleStatusChange(proposal.id, v)} loading={updatingStatusId===proposal.id}/></td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                               <button onClick={() => handleViewPdf(proposal, 'proposal')} className="text-gray-400 hover:text-blue-600 p-2"><Eye size={16}/></button>
                               {userRole === 'super_admin' && <button onClick={() => confirmDelete(proposal.id, 'proposal')} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* --- 3. VISTA: GENERAR CONTRATO --- */}
        {viewMode === 'new_contract' && (
           <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl border border-gray-200 shadow-lg animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center mb-8">
                 <div className="w-16 h-16 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-4"><FileSignature size={32}/></div>
                 <h2 className="text-2xl font-bold text-gray-900">Generar Nuevo Contrato</h2>
                 <p className="text-gray-500 mt-2">Busca una propuesta aprobada o pendiente para formalizarla.</p>
              </div>

              {!contractPreview ? (
                 <div className="relative max-w-md mx-auto" ref={searchRef}>
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block text-center">Buscar Propuesta Pendiente</label>
                    <div className="relative">
                       <Search className="absolute left-3 top-3 text-gray-400" size={18}/>
                       <input 
                          type="text" autoFocus
                          placeholder="Escribe el nombre del cliente..." 
                          className="w-full pl-10 p-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl outline-none transition-all"
                          onChange={(e) => handleSearchPendingProposals(e.target.value)}
                       />
                    </div>
                    {showSuggestions && (
                       <div className="absolute top-full w-full bg-white border shadow-xl rounded-xl mt-2 overflow-hidden z-50">
                          {pendingProposals.length === 0 ? <div className="p-4 text-center text-gray-400 text-sm">No hay propuestas pendientes.</div> : 
                             pendingProposals.map(p => (
                                <div key={p.id} onClick={() => selectPendingProposal(p)} className="p-4 hover:bg-gray-50 cursor-pointer border-b flex justify-between items-center group">
                                   <div><div className="font-bold text-gray-800">{p.client_name}</div><div className="text-xs text-gray-500">{p.event_type} • S/ {p.total_price}</div></div>
                                   <div className="text-blue-600 opacity-0 group-hover:opacity-100 font-bold text-xs">Seleccionar →</div>
                                </div>
                             ))
                          }
                       </div>
                    )}
                 </div>
              ) : (
                 <div className="bg-gray-50/50 rounded-xl p-6 border border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                       <div>
                          <h3 className="font-bold text-lg text-gray-800">{clientName}</h3>
                          <p className="text-sm text-gray-500">{eventType} • {eventDate}</p>
                       </div>
                       <button onClick={() => {setContractPreview(false); setSelectedProposal(null)}} className="text-xs text-red-500 hover:underline">Cambiar</button>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6 shadow-sm">
                       <div className="flex justify-between text-sm mb-2 text-gray-600"><span>Monto Total:</span> <span className="font-bold text-gray-900">S/ {selectedProposal?.total_price}</span></div>
                       <div className="flex justify-between text-sm text-gray-600"><span>Items:</span> <span className="font-bold text-gray-900">{selectedProposal?.items.length || 0} servicios</span></div>
                    </div>

                    <button 
                       onClick={generateContract} 
                       disabled={isSaving}
                       className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                       {isSaving ? <Loader2 className="animate-spin"/> : <CheckCircle/>} Confirmar y Generar Contrato
                    </button>
                 </div>
              )}
           </div>
        )}

        {/* --- 4. VISTA: LISTA CONTRATOS --- */}
        {viewMode === 'list_contracts' && (
           <div className="w-full space-y-6 animate-in fade-in">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 min-h-[600px]">
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold flex gap-2 text-gray-800"><ListPlus/> Archivo de Contratos</h2>
                     <div className="relative w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar contrato..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2"/>
                     </div>
                  </div>
                  
                  {loadingList ? <div className="p-20 text-center text-gray-400">Cargando...</div> : contractsList.length === 0 ? <div className="p-20 text-center border-2 border-dashed border-gray-100 rounded-xl">No hay contratos.</div> : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-gray-50 text-gray-600 font-bold text-xs uppercase">
                            <tr><th className="p-3">Folio</th><th className="p-3">Cliente</th><th className="p-3">Evento</th><th className="p-3">Estado</th><th className="p-3 text-right">PDF</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-100">
                            {contractsList.map(c => (
                               <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-3"><span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">{c.id.slice(0,8).toUpperCase()}</span></td>
                                  <td className="p-3 font-bold text-gray-800">{c.client_name}</td>
                                  <td className="p-3 text-gray-600">{c.event_type}</td>
                                  <td className="p-3"><span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold uppercase">{c.contract_status}</span></td>
                                  <td className="p-3 text-right flex justify-end gap-2">
                                     <button onClick={() => handleViewPdf(c, 'contract')} className="text-gray-400 hover:text-blue-600 p-2"><Eye size={16}/></button>
                                     {userRole === 'super_admin' && <button onClick={() => confirmDelete(c.id, 'contract')} className="text-gray-400 hover:text-red-600 p-2"><Trash2 size={16}/></button>}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                    </div>
                  )}
              </div>
           </div>
        )}

      </div>
    </div>
  );
}