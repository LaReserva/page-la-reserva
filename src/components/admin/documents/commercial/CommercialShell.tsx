import { useState } from 'react';
import { Plus, FileStack, FileSignature, ListPlus, Menu, X } from 'lucide-react';

import { ProposalEditor } from './ProposalEditor';
import { ProposalList } from './ProposalList';
import { ContractGenerator } from './ContractGenerator';
import { ContractList } from './ContractList';

type ViewMode = 'new_proposal' | 'list_proposals' | 'new_contract' | 'list_contracts';

export function CommercialShell({ userRole }: { userRole: string }) {
  const [view, setView] = useState<ViewMode>('new_proposal');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'new_proposal', label: 'Nueva Propuesta', icon: Plus, group: 'Cotizaciones' },
    { id: 'list_proposals', label: 'Historial', icon: FileStack, group: 'Cotizaciones' },
    { id: 'new_contract', label: 'Generar Contrato', icon: FileSignature, group: 'Contratos' },
    { id: 'list_contracts', label: 'Archivo', icon: ListPlus, group: 'Contratos' },
  ];

  const handleNavClick = (id: string) => {
    setView(id as ViewMode);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex flex-col md:flex-row h-full relative">
      {/* Botón Hamburguesa */}
      <div className="md:hidden p-4 border-b border-gray-200 bg-white flex justify-between items-center">
        <span className="font-bold text-gray-700">Menú Comercial</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-gray-100 rounded-lg">
          {isMobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`absolute inset-0 z-20 bg-white md:static md:w-64 border-r border-gray-200 flex-col overflow-y-auto transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full md:flex hidden'}`}>
        <div className="p-5">
          <div className="md:hidden flex justify-end mb-4"><button onClick={() => setIsMobileMenuOpen(false)}><X className="text-gray-400"/></button></div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Gestión Comercial</h3>
          <div className="space-y-6">
            {['Cotizaciones', 'Contratos'].map(group => (
              <div key={group}>
                <div className="text-[10px] font-bold text-gray-400 uppercase mb-2 pl-2">{group}</div>
                <div className="space-y-1">
                  {navItems.filter(i => i.group === group).map(item => (
                    <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${view === item.id ? 'bg-blue-50 text-primary-700 shadow-sm border border-blue-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
                      <item.icon size={18} className={view === item.id ? 'text-primary-500' : 'text-gray-400'} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 overflow-y-auto bg-gray-50/50 p-4 md:p-6 relative w-full">
        {view === 'new_proposal' && <ProposalEditor userRole={userRole} onSuccess={() => setView('list_proposals')} />}
        {view === 'list_proposals' && <ProposalList userRole={userRole} onViewPdf={() => {}} />}
        {view === 'new_contract' && <ContractGenerator userRole={userRole} onSuccess={() => setView('list_contracts')} />}
        
        {/* ✅ AHORA MUESTRA LA LISTA REAL */}
        {view === 'list_contracts' && <ContractList userRole={userRole} />}
      </main>
    </div>
  );
}