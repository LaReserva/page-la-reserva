// src/components/admin/NotificationBell.tsx
import { useState, useEffect, useRef, Fragment } from 'react';
import { Popover, Transition } from '@headlessui/react';
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const userIdRef = useRef<string | null>(null);

  // --- LÓGICA DE FETCH (INTACTA) ---
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      userIdRef.current = user.id;

      const { data: userData } = await supabase
        .from('admin_users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role || 'staff';
      const isSalesOrSuper = role === 'sales' || role === 'super_admin';
      
      const lastClearedKey = `notifs_last_cleared_${user.id}`;
      const lastClearedStr = localStorage.getItem(lastClearedKey);
      const lastClearedDate = lastClearedStr ? new Date(lastClearedStr) : new Date(0);

      let allNotifs: NotificationItem[] = [];

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

      const visibleNotifs = allNotifs.filter(n => new Date(n.date) > lastClearedDate);
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

  const handleClearAll = (close: () => void) => {
    if (!userIdRef.current) return;
    const now = new Date().toISOString();
    localStorage.setItem(`notifs_last_cleared_${userIdRef.current}`, now);
    setNotifications([]);
    setUnreadCount(0);
    close(); 
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button className={`p-2 rounded-lg transition-colors relative outline-none focus:ring-2 focus:ring-primary-500/20 ${open ? 'bg-secondary-100 text-primary-600' : 'text-secondary-400 hover:text-primary-600 hover:bg-secondary-50'}`}>
            <Bell className="w-5 h-5" />
            {!loading && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute right-0 z-50 mt-2 w-80 md:w-96 transform">
              <div className="overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5 bg-white border border-secondary-100">
                
                {/* Header */}
                <div className="px-4 py-3 border-b border-secondary-100 bg-secondary-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-secondary-900">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} nuevas
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <div className="p-8 flex justify-center text-secondary-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-10 text-center text-secondary-400 text-sm flex flex-col items-center gap-3">
                      <div className="p-3 bg-secondary-50 rounded-full">
                         <CheckCheck className="w-6 h-6 text-green-500 opacity-60" />
                      </div>
                      <div>
                        <p className="font-medium text-secondary-600">Estás al día</p>
                        <p className="text-xs text-secondary-400 mt-1">No hay notificaciones nuevas por ahora.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary-50">
                      {notifications.map((item) => (
                        <a 
                          key={`${item.type}-${item.id}`}
                          href={item.link} 
                          className="block px-4 py-3.5 hover:bg-secondary-50 transition-colors group relative"
                          onClick={() => close()}
                        >
                          <div className="flex gap-3 items-start">
                            <div className={`mt-0.5 p-2 rounded-lg h-fit shrink-0 ${item.type === 'quote' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                              {item.type === 'quote' ? <FileText size={18} /> : <Calendar size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-secondary-800 group-hover:text-primary-700 transition-colors truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-secondary-500 truncate mt-0.5">
                                {item.subtitle}
                              </p>
                              <p className="text-[10px] text-secondary-400 mt-1.5 font-medium flex items-center gap-1">
                                {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: es })}
                              </p>
                            </div>
                            {item.isNew && (
                              <div className="mt-2 w-2 h-2 bg-primary-500 rounded-full shrink-0 animate-pulse"></div>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Footer */}
                {notifications.length > 0 && (
                    <div className="px-4 py-2 bg-secondary-50 border-t border-secondary-100 text-center">
                      <button 
                        onClick={() => handleClearAll(close)}
                        className="flex items-center justify-center gap-2 w-full py-1.5 text-xs font-bold text-secondary-500 hover:text-red-600 transition-colors rounded-lg hover:bg-secondary-100/50"
                      >
                        <Trash2 size={12} />
                        Marcar todo como leído
                      </button>
                    </div>
                )}
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}