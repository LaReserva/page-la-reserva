// src/components/admin/layout/AdminSidebar.tsx
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  CalendarDays, 
  Users, 
  Settings, 
  LogOut,
  Image as ImageIcon,
  DollarSign,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/types';
import { cn } from '@/utils/utils';

// 1. Definimos la interfaz para los items del menú para asegurar el tipado de roles
interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles: Array<AdminUser['role']>; // Tipado fuerte: Solo permite roles válidos
}

export function AdminSidebar() {
  const [role, setRole] = useState<AdminUser['role'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }

    async function getRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle(); // 2. Usamos maybeSingle para evitar errores de consola si no existe
          
          if (error) {
            console.error('Error loading role:', error.message);
          }
          
          // Casting seguro
          const userData = data as { role: AdminUser['role'] } | null;
          setRole(userData?.role || null);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setLoading(false);
      }
    }
    getRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  // 3. Definición del menú con tipado
  const menuItems: MenuItem[] = [
    { 
      name: 'Dashboard', 
      href: '/admin', 
      icon: LayoutDashboard,
      roles: ['super_admin', 'sales', 'operations'] 
    },
    { 
      name: 'Cotizaciones', 
      href: '/admin/cotizaciones', 
      icon: MessageSquare,
      roles: ['super_admin', 'sales'] 
    },
    { 
      name: 'Eventos', 
      href: '/admin/eventos', 
      icon: CalendarDays,
      roles: ['super_admin', 'sales', 'operations'] 
    },
    { 
      name: 'Clientes', 
      href: '/admin/clientes', 
      icon: Users,
      roles: ['super_admin', 'sales'] 
    },
    { 
      name: 'Finanzas', 
      href: '/admin/finanzas', 
      icon: DollarSign,
      roles: ['super_admin'] 
    },
    { 
      name: 'Portafolio', 
      href: '/admin/contenido', 
      icon: ImageIcon,
      roles: ['super_admin', 'operations'] 
    },
    { 
      name: 'Configuración', 
      href: '/admin/configuracion', 
      icon: Settings,
      roles: ['super_admin'] 
    },
  ];

  const filteredItems = menuItems.filter(item => 
    role && item.roles.includes(role)
  );

  const isActive = (href: string) => {
    if (href === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(href);
  };

  // Estado de carga elegante
  if (loading) return (
    <aside className="w-64 bg-secondary-900 border-r border-secondary-800 hidden lg:flex flex-col h-screen sticky top-0 items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
    </aside>
  );

  return (
    <aside className="w-64 bg-secondary-900 text-white hidden lg:flex flex-col h-screen sticky top-0 border-r border-secondary-800">
      
      <div className="p-6 flex items-center justify-center border-b border-secondary-800">
        <img src="/logo.svg" alt="La Reserva Admin" className="h-8 w-auto brightness-0 invert" />
      </div>

      <nav className="flex-1 overflow-y-auto py-6 px-4">
        {role ? (
          <ul className="space-y-2">
            {filteredItems.map((item) => (
              <li key={item.href}>
                <a 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
                    isActive(item.href) 
                      ? "bg-primary-500 text-secondary-900 font-bold shadow-md" 
                      : "text-secondary-300 hover:bg-secondary-800 hover:text-white"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "w-5 h-5",
                      isActive(item.href) ? "text-secondary-900" : "text-secondary-400 group-hover:text-white"
                    )}
                  />
                  <span>{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4 text-center text-sm text-secondary-500">
            <p>No se encontraron permisos.</p>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-secondary-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}