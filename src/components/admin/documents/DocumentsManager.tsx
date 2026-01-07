import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// CORRECCIÓN: Separamos los iconos (valores) del tipo (LucideIcon)
import { FileText, Truck, Loader2, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react'; 

import { CommercialTab } from './tabs/CommercialTab';
import { OperationsTab } from './tabs/OperationsTab';

// 1. INTERFAZ PARA TIPADO FUERTE (Soluciona el error del .includes)
interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<{ userRole: string }>;
  allowedRoles: string[]; // Definimos explícitamente como array de strings
}

// 2. CONFIGURACIÓN TIPADA
const TABS_CONFIG: TabItem[] = [
  {
    id: 'commercial',
    label: 'Comercial',
    icon: FileText,
    component: CommercialTab,
    allowedRoles: ['sales', 'superadmin', 'super_admin']
  },
  {
    id: 'operations',
    label: 'Operaciones',
    icon: Truck,
    component: OperationsTab,
    allowedRoles: ['operations', 'superadmin', 'super_admin']
  }
];

export function DocumentsManager() {
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data } = await supabase.from('admin_users').select('role').eq('id', user.id).single();
        const role = data?.role || '';
        setUserRole(role);

        const allowed = TABS_CONFIG.filter(tab => tab.allowedRoles.includes(role));
        
        if (allowed.length > 0) {
          setActiveTab(allowed[0].id);
        }
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
    } finally {
      setLoading(false);
    }
  }

  const allowedTabs = TABS_CONFIG.filter(tab => tab.allowedRoles.includes(userRole));
  const ActiveComponent = TABS_CONFIG.find(t => t.id === activeTab)?.component;

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  if (allowedTabs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Lock size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-gray-600">Acceso Restringido</h3>
        <p className="text-sm">Tu usuario ({userRole || 'sin rol'}) no tiene permisos para ver documentos.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[130vh] gap-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Generación de Documentos</h2>
          <p className="text-sm text-gray-500">Crea propuestas, contratos y listas de compras.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {allowedTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm relative">
        {ActiveComponent && <ActiveComponent userRole={userRole} />}
      </div>
    </div>
  );
}