import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Asumo que tienes este alias, si no usa el que tengas
import { FileText, Truck, Loader2 } from 'lucide-react';

// CORRECCIÓN: Nombres de archivos consistentes con la propuesta original
import { CommercialTab } from './tabs/CommercialTab';
import { OperationsTab } from './tabs/OperationsTab';

export function DocumentsManager() {
  const [activeTab, setActiveTab] = useState<'commercial' | 'operations'>('operations');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('admin_users').select('role').eq('id', user.id).single();
      if (data) setUserRole(data.role);
    }
    setLoading(false);
  }

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="flex flex-col h-[85vh] gap-6">
      
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Generación de Documentos</h2>
          <p className="text-sm text-gray-500">Crea propuestas, contratos y listas de compras.</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('commercial')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'commercial' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} />
            Comercial
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'operations' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Truck size={16} />
            Operaciones
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm relative">
        {activeTab === 'commercial' ? (
          <CommercialTab userRole={userRole} />
        ) : (
          <OperationsTab userRole={userRole} />
        )}
      </div>
    </div>
  );
}