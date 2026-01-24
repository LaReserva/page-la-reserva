import { useEffect, useState, Fragment } from 'react';
import type { ElementType } from 'react';
import { Transition } from '@headlessui/react';
import { 
  LayoutDashboard, MessageSquare, CalendarDays, Users, 
  Settings, LogOut, Image as ImageIcon, DollarSign, 
  Loader2, UserCog, PenTool, FileText, X, Martini, Mail, AlertCircle,
  type LucideIcon 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { AdminUser } from '@/types';
import { cn } from '@/utils/utils';

// --- CONFIGURACIÓN DEL MENÚ ---
interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon | ElementType;
  roles: Array<AdminUser['role']>;
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard, roles: ['super_admin', 'sales', 'operations'] },
  { name: 'Cotizaciones', href: '/admin/cotizaciones', icon: MessageSquare, roles: ['super_admin', 'sales'] },
  { name: 'Correo', href: '/admin/correo', icon: Mail, roles: ['super_admin', 'sales'] },
  { name: 'Eventos', href: '/admin/eventos', icon: CalendarDays, roles: ['super_admin', 'sales', 'operations'] },
  { name: 'Clientes', href: '/admin/clientes', icon: Users, roles: ['super_admin', 'sales'] },
  { name: 'Finanzas', href: '/admin/finanzas', icon: DollarSign, roles: ['super_admin'] },
  { name: 'Blog', href: '/admin/blog', icon: PenTool, roles: ['super_admin'] },
  { name: 'Documentos', href: '/admin/documentos', icon: FileText, roles: ['super_admin', 'sales', 'operations'] },
  { name: 'Cocteles', href: '/admin/cocteles', icon: Martini, roles: ['super_admin', 'operations', 'sales'] },
  { name: 'Portafolio', href: '/admin/contenido', icon: ImageIcon, roles: ['super_admin', 'operations'] },
  { name: 'Testimonios', href: '/admin/testimonios', icon: MessageSquare, roles: ['super_admin', 'operations', 'sales'] },
  { name: 'Usuarios', href: '/admin/usuarios', icon: UserCog, roles: ['super_admin'] },
  { name: 'Configuración', href: '/admin/configuracion', icon: Settings, roles: ['super_admin'] },
];

// --- SUB-COMPONENTE: SidebarItem ---
interface SidebarItemProps {
  item: MenuItem;
  currentPath: string;
  onClick: () => void;
}

function SidebarItem({ item, currentPath, onClick }: SidebarItemProps) {
  const isActive = item.href === '/admin' 
    ? currentPath === '/admin' || currentPath === '/admin/'
    : currentPath.startsWith(item.href) && (currentPath.length === item.href.length || currentPath[item.href.length] === '/');

  return (
    <li>
      <a 
        href={item.href}
        onClick={onClick}
        /* ✅ MEJORA CRÍTICA DE RENDIMIENTO:
           data-astro-prefetch="hover" hace que Astro descargue la página destino
           cuando el usuario pasa el mouse por encima. 
           Esto elimina el tiempo de espera del servidor al hacer clic. */
        data-astro-prefetch="hover"
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative overflow-hidden",
          isActive 
            ? "bg-primary-500 text-secondary-900 font-bold shadow-md" 
            : "text-secondary-300 hover:bg-secondary-800 hover:text-white"
        )}
      >
        <item.icon 
          className={cn(
            "w-5 h-5 transition-colors",
            isActive ? "text-secondary-900" : "text-secondary-400 group-hover:text-white"
          )} 
        />
        <span className="relative z-10">{item.name}</span>
        
        {!isActive && (
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        )}
      </a>
    </li>
  );
}

// --- COMPONENTE PRINCIPAL (Sin cambios lógicos, solo integración) ---
export function AdminSidebar() {
  const [role, setRole] = useState<AdminUser['role'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    // 1. Gestión de Rutas (Compatible con View Transitions)
    const updatePath = () => typeof window !== 'undefined' && setCurrentPath(window.location.pathname);
    
    // Ejecutar al montar y en cada navegación de Astro
    updatePath(); 
    document.addEventListener('astro:page-load', updatePath);

    // 2. Gestión de Toggle Móvil
    const handleToggle = () => setIsMobileOpen(prev => !prev);
    document.addEventListener('toggle-sidebar', handleToggle);

    // 3. Auth & Roles
    const fetchRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
            
          if (data) {
             setRole(data.role as AdminUser['role']);
          }
        }
      } catch (e) {
        console.error("Auth error", e);
      } finally {
        setLoading(false);
      }
    };
    
    if (!role) {
        fetchRole();
    } else {
        setLoading(false);
    }

    return () => {
      document.removeEventListener('astro:page-load', updatePath);
      document.removeEventListener('toggle-sidebar', handleToggle);
    };
  }, []); 

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Usamos window.location para forzar una recarga completa al salir, limpiando estados
    window.location.href = '/admin/login';
  };

  const filteredItems = MENU_ITEMS.filter(item => role && item.roles.includes(role));

  if (loading) return (
    <aside className="w-64 bg-secondary-900 border-r border-secondary-800 hidden lg:flex flex-col h-screen sticky top-0 items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
    </aside>
  );

  return (
    <>
      {/* 1. Backdrop Móvil */}
      <Transition
        show={isMobileOpen}
        as={Fragment}
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div 
          className="fixed inset-0 bg-secondary-950/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      </Transition>

      {/* 2. Sidebar Container */}
      <aside 
        className={cn(
          "bg-secondary-900 text-white flex-col h-screen border-r border-secondary-800 shadow-2xl lg:shadow-none",
          "fixed top-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          "w-64",
          "lg:sticky lg:top-0 lg:flex lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header Logo */}
        <div className="p-6 flex items-center justify-between border-b border-secondary-800 shrink-0">
          <a 
            href="/" 
            className="block hover:opacity-80 transition-opacity focus:outline-none"
            aria-label="Volver al inicio público"
            data-astro-prefetch="false" // No precargamos el home público innecesariamente
          >
            <img 
              src="/logo.svg" 
              alt="La Reserva Admin" 
              className="h-8 w-auto brightness-0 invert opacity-90" 
            />
          </a>

          <button 
            onClick={() => setIsMobileOpen(false)} 
            className="lg:hidden text-secondary-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {role ? (
            <ul className="space-y-1.5">
              {filteredItems.map((item) => (
                <SidebarItem 
                  key={item.href} 
                  item={item} 
                  currentPath={currentPath}
                  onClick={() => setIsMobileOpen(false)}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-secondary-500 gap-2">
              <AlertCircle size={24} />
              <p className="text-sm">Sin permisos asignados.</p>
            </div>
          )}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-secondary-800 bg-secondary-900 shrink-0">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all duration-200 group border border-transparent hover:border-red-900/50"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}