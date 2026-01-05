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
  Loader2,
  UserCog,
  PenTool,
  FileText,
  X,
  Martini, 
  Mail     
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/types';
import { cn } from '@/utils/utils';

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  roles: Array<AdminUser['role']>;
}

export function AdminSidebar() {
  const [role, setRole] = useState<AdminUser['role'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // 1. Definimos la función para actualizar la ruta
    const updatePath = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
      }
    };

    // 2. Ejecutamos al inicio
    updatePath();

    // 3. Escuchamos el evento de navegación de Astro
    document.addEventListener('astro:page-load', updatePath);

    const handleToggle = () => setIsMobileOpen(prev => !prev);
    document.addEventListener('toggle-sidebar', handleToggle);

    async function getRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data, error } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          
          if (error) console.error('Error loading role:', error.message);
          
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

    // Limpieza de eventos
    return () => {
      document.removeEventListener('astro:page-load', updatePath);
      document.removeEventListener('toggle-sidebar', handleToggle);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/admin/login';
  };

  const handleLinkClick = () => {
    setIsMobileOpen(false);
  };

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
      name: 'Correo', 
      href: '/admin/correo', 
      icon: Mail, 
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
      name: 'Blog', 
      href: '/admin/blog', 
      icon: PenTool, 
      roles: ['super_admin', 'sales'] 
    },
    { 
      name: 'Documentos', 
      href: '/admin/documentos', 
      icon: FileText, 
      roles: ['super_admin', 'sales', 'operations'] 
    },
    { 
      name: 'Cocteles', 
      href: '/admin/cocteles', 
      icon: Martini, 
      roles: ['super_admin', 'operations', 'sales'] 
    },
    { 
      name: 'Portafolio', 
      href: '/admin/contenido', 
      icon: ImageIcon, 
      roles: ['super_admin', 'operations'] 
    },
    { 
      name: 'Usuarios', 
      href: '/admin/usuarios', 
      icon: UserCog, 
      roles: ['super_admin'] 
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
    if (href === '/admin') return currentPath === '/admin' || currentPath === '/admin/';
    return currentPath.startsWith(href);
  };

  if (loading) return (
    <aside className="w-64 bg-secondary-900 border-r border-secondary-800 hidden lg:flex flex-col h-screen sticky top-0 items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
    </aside>
  );

  return (
    <>
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "bg-secondary-900 text-white flex-col h-screen border-r border-secondary-800 transition-transform duration-300 ease-in-out",
          "w-64 lg:sticky lg:top-0 lg:flex lg:translate-x-0",
          "fixed top-0 left-0 z-50",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        
        <div className="p-6 flex items-center justify-between border-b border-secondary-800">
          <img src="/logo.svg" alt="La Reserva Admin" className="h-8 w-auto brightness-0 invert" />
          
          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="lg:hidden text-secondary-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* ✅ MEJORA VISUAL: Ocultar Scrollbar 
           - [scrollbar-width:none]: Para Firefox
           - [-ms-overflow-style:none]: Para IE/Edge antiguo
           - [&::-webkit-scrollbar]:hidden: Para Chrome/Safari/Edge moderno
        */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {role ? (
            <ul className="space-y-2">
              {filteredItems.map((item) => (
                <li key={item.href}>
                  <a 
                    href={item.href}
                    onClick={handleLinkClick}
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
    </>
  );
}