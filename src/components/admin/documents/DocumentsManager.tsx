// src/components/admin/documents/DocumentsManager.tsx
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react'; // ✅ Headless UI
import { supabase } from '@/lib/supabase';
import { FileText, Truck, Lock, Loader2 } from 'lucide-react';

// Importamos los nuevos Shells sectorizados (que crearemos a continuación)
import { CommercialShell } from './commercial/CommercialShell';
import { OperationsShell } from './operations/OperationsShell';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function DocumentsManager() {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    checkPermissions();
  }, []);

  async function checkPermissions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('admin_users').select('role').eq('id', user.id).single();
      const role = data?.role || '';
      setUserRole(role);
      setHasAccess(['super_admin', 'sales', 'operations'].includes(role));
    }
    setIsLoading(false);
  }

  if (isLoading) return <div className="h-96 flex justify-center items-center"><Loader2 className="animate-spin text-primary-600" size={32}/></div>;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Lock size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-gray-600">Acceso Restringido</h3>
      </div>
    );
  }

  // Definición de Tabs según permisos
  const tabs = [
    {
      key: 'commercial',
      name: 'Gestión Comercial',
      icon: FileText,
      component: <CommercialShell userRole={userRole} />,
      show: ['super_admin', 'sales'].includes(userRole)
    },
    {
      key: 'operations',
      name: 'Operaciones y Logística',
      icon: Truck,
      component: <OperationsShell userRole={userRole} />, // ✅ Uso del nuevo componente
      show: ['super_admin', 'operations'].includes(userRole)
    }
  ].filter(t => t.show);

  return (
    // ✅ LAYOUT FIX: Altura calculada para ocupar pantalla menos el header del layout principal
    // Asumimos que el AdminLayout tiene un header de unos 64px o similar. Ajustar si es necesario.
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4">
      
      <Tab.Group>
        {/* HEADER DE PESTAÑAS */}
        <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex-none">
          <Tab.List className="flex space-x-1 rounded-lg bg-gray-100/80 p-1">
            {tabs.map((tab) => (
              <Tab
                key={tab.key}
                className={({ selected }) =>
                  classNames(
                    'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200',
                    'ring-white ring-opacity-60 ring-offset-2 resize-none',
                    selected
                      ? 'bg-white text-primary-700 shadow shadow-gray-200 scale-[1.02]'
                      : 'text-gray-500 hover:bg-white/[0.12] hover:text-gray-700'
                  )
                }
              >
                <div className="flex items-center justify-center gap-2">
                  <tab.icon size={18} />
                  {tab.name}
                </div>
              </Tab>
            ))}
          </Tab.List>
        </div>

        {/* PANELES DE CONTENIDO (Scrollable area) */}
        <Tab.Panels className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm relative">
          {tabs.map((tab) => (
            <Tab.Panel
              key={tab.key}
              className={classNames(
                'h-full w-full overflow-hidden', // Importante: overflow hidden aquí, los hijos manejarán el scroll
                'ring-white ring-opacity-60 ring-offset-2 resize-none'
              )}
            >
              {tab.component}
            </Tab.Panel>
          ))}
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}