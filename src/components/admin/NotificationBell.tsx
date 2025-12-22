// src/components/admin/NotificationBell.tsx
import { useState, useEffect, useRef } from 'react';
import { Bell, FileText, Calendar, Loader2, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type NotificationItem = {
  id: string;
  type: 'quote' | 'event';
  title: string;
  subtitle: string;
  link: string;
  date: string;
  isNew: boolean;
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Referencia para guardar el ID del usuario actual y usarlo en la clave de localStorage
  const userIdRef = useRef<string | null>(null);

  // Cerrar dropdown si se hace click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // A. Obtener usuario y rol
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userIdRef.current = user.id; // Guardamos ID para usarlo al limpiar

      const { data: userData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role || 'staff';
      const isSalesOrSuper = role === 'sales' || role === 'super_admin';

      // RECUPERAR TIMESTAMP DE ÚLTIMA LIMPIEZA
      const lastClearedKey = `notifs_last_cleared_${user.id}`;
      const lastClearedStr = localStorage.getItem(lastClearedKey);
      const lastClearedDate = lastClearedStr ? new Date(lastClearedStr) : new Date(0); // Fecha 0 si nunca se limpió

      let allNotifs: NotificationItem[] = [];

      // B. BUSCAR COTIZACIONES NUEVAS
      if (isSalesOrSuper) {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id, client_name, event_type, created_at')
          .eq('status', 'new')
          .order('created_at', { ascending: false });

        if (quotes) {
          const quoteNotifs: NotificationItem[] = quotes.map((q) => ({
            id: q.id,
            type: 'quote',
            title: `Nueva Cotización: ${q.client_name || 'Cliente'}`,
            subtitle: q.event_type || 'Evento General',
            link: '/admin/cotizaciones',
            date: q.created_at || new Date().toISOString(),
            isNew: true
          }));
          allNotifs = [...allNotifs, ...quoteNotifs];
        }
      }

      // C. BUSCAR EVENTOS RECIENTES
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data: events } = await supabase
        .from('events')
        .select(`id, event_type, created_at, client:clients(name)`)
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (events) {
        const eventNotifs: NotificationItem[] = events.map((e: any) => ({
          id: e.id,
          type: 'event',
          title: `Nuevo Evento Creado`,
          subtitle: `${e.client?.name || 'Cliente'} - ${e.event_type || 'Evento'}`,
          link: '/admin/eventos',
          date: e.created_at || new Date().toISOString(),
          isNew: true
        }));
        allNotifs = [...allNotifs, ...eventNotifs];
      }

      // D. FILTRAR: Solo mostramos las que sean POSTERIORES a la fecha de limpieza
      const visibleNotifs = allNotifs.filter(n => new Date(n.date) > lastClearedDate);

      // E. ORDENAR
      visibleNotifs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setNotifications(visibleNotifs);
      setUnreadCount(visibleNotifs.length);

    } catch (error) {
      console.error("Error cargando notificaciones", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // --- NUEVA FUNCIÓN: LIMPIAR NOTIFICACIONES ---
  const handleClearAll = () => {
    if (!userIdRef.current) return;

    // 1. Guardamos la fecha/hora actual como "última vez limpiado"
    const now = new Date().toISOString();
    localStorage.setItem(`notifs_last_cleared_${userIdRef.current}`, now);

    // 2. Limpiamos el estado visualmente
    setNotifications([]);
    setUnreadCount(0);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón Campana */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-secondary-400 hover:text-primary-600 transition-colors relative outline-none"
      >
        <Bell className="w-5 h-5" />
        {!loading && unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
        )}
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-secondary-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header del Dropdown */}
          <div className="px-4 py-3 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-secondary-900">Notificaciones</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                {unreadCount} nuevas
              </span>
            )}
          </div>

          {/* Lista de Notificaciones */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="p-8 flex justify-center text-secondary-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-secondary-400 text-sm flex flex-col items-center gap-2">
                <CheckCheck className="w-8 h-8 text-green-500 opacity-50" />
                <p>Estás al día.</p>
                <p className="text-xs text-secondary-300">No hay notificaciones nuevas.</p>
              </div>
            ) : (
              <ul className="divide-y divide-secondary-50">
                {notifications.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <a 
                      href={item.link} 
                      className="block px-4 py-3 hover:bg-secondary-50 transition-colors group"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 p-2 rounded-lg h-fit ${item.type === 'quote' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                          {item.type === 'quote' ? <FileText size={16} /> : <Calendar size={16} />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-secondary-800 group-hover:text-primary-600 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-xs text-secondary-500 line-clamp-1">
                            {item.subtitle}
                          </p>
                          <p className="text-[10px] text-secondary-400 mt-1 font-medium">
                            {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        {item.isNew && (
                          <div className="mt-2 w-1.5 h-1.5 bg-primary-500 rounded-full shrink-0"></div>
                        )}
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {/* Footer con Botón Limpiar */}
          {notifications.length > 0 && (
             <div className="px-4 py-2 bg-secondary-50 border-t border-secondary-100 text-center">
               <button 
                 onClick={handleClearAll}
                 className="flex items-center justify-center gap-2 w-full py-1 text-xs font-bold text-secondary-500 hover:text-red-600 transition-colors"
               >
                 <Trash2 size={12} />
                 Marcar todo como leído
               </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}