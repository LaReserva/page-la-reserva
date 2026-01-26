// src/components/admin/documents/DocumentsManager.tsx
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { supabase } from '@/lib/supabase';
import { FileText, Truck, Lock } from 'lucide-react';

import { CommercialShell } from './commercial/CommercialShell';
import { OperationsShell } from './operations/OperationsShell';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

// 1. SKELETON COMPONENT (Nuevo)
function DocumentsSkeleton() {
  return (
    <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-pulse">
      {/* Header Tabs Skeleton */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm flex-none">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg h-12">
           <div className="flex-1 bg-gray-200 rounded-md m-1"></div>
           <div className="flex-1 bg-gray-200 rounded-md m-1"></div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
         <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
         <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-gray-100 rounded-lg col-span-2"></div>
            <div className="h-32 bg-gray-100 rounded-lg col-span-1"></div>
         </div>
         <div className="h-64 bg-gray-100 rounded-lg mt-4"></div>
      </div>
    </div>
  );
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

  // ✅ CAMBIO CLAVE: Usamos el Skeleton en lugar del Loader simple
  if (isLoading) {
     return <DocumentsSkeleton />;
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400">
        <Lock size={48} className="mb-4 opacity-20" />
        <h3 className="text-lg font-medium text-gray-600">Acceso Restringido</h3>
      </div>
    );
  }

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
      component: <OperationsShell userRole={userRole} />,
      show: ['super_admin', 'operations'].includes(userRole)
    }
  ].filter(t => t.show);

  return (
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
                    'ring-white ring-opacity-60 ring-offset-2 resize-none focus:outline-none focus:ring-2',
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

        {/* PANELES DE CONTENIDO */}
        <Tab.Panels className="flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm relative">
          {tabs.map((tab) => (
            <Tab.Panel
              key={tab.key}
              className={classNames(
                'h-full w-full overflow-hidden',
                'ring-white ring-opacity-60 ring-offset-2 resize-none focus:outline-none'
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