// src/components/admin/NotificationBell.tsx
import { useState, useEffect, Fragment, useRef } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { 
  Bell, FileText, Calendar, Loader2, CheckCheck, Trash2, 
  ClipboardList, Mail, Star 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { cn } from '@/utils/utils';

// ... (MANTENEMOS TUS DEFINICIONES DE TIPOS IGUALES PARA NO ROMPER NADA) ...
type TaskPayload = { id: string; content: string; assigned_to: string | null; created_by: string; created_at: string; };
type MessagePayload = { id: string; name: string; subject: string; created_at: string; status: string; };
type TestimonialPayload = { id: string; client_name: string; rating: number; created_at: string; };
type QuotePayload = { id: string; client_name: string; event_type: string; created_at: string; status: string; };
type EventPayload = { id: string; event_type: string; client_id: string; created_at: string; };

type NotificationType = 'quote' | 'event' | 'task' | 'message' | 'testimonial';

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  link: string;
  date: string;
  isNew: boolean;
};

const NOTIF_CONFIG = {
  quote: { icon: FileText, color: 'text-blue-600 bg-blue-50', hover: 'group-hover:bg-blue-50' },
  event: { icon: Calendar, color: 'text-purple-600 bg-purple-50', hover: 'group-hover:bg-purple-50' },
  task: { icon: ClipboardList, color: 'text-orange-600 bg-orange-50', hover: 'group-hover:bg-orange-50' },
  message: { icon: Mail, color: 'text-pink-600 bg-pink-50', hover: 'group-hover:bg-pink-50' },
  testimonial: { icon: Star, color: 'text-yellow-600 bg-yellow-50', hover: 'group-hover:bg-yellow-50' },
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlocked = useRef(false); // Ref para controlar si ya desbloqueamos el audio

  // Helper: IDs leídos individualmente
  const getReadIds = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        return JSON.parse(localStorage.getItem('la_reserva_read_ids') || '[]');
    } catch { return []; }
  };

  const getLastCleared = () => {
    if (typeof window === 'undefined') return new Date(0);
    const stored = localStorage.getItem('la_reserva_notifs_cleared');
    return stored ? new Date(stored) : new Date(0);
  };

  // --- NUEVA LÓGICA DE CLICK ---
  const handleNotificationClick = (id: string, closePopover: () => void) => {
    // 1. Actualizar estado visual inmediatamente
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // 2. Persistir en localStorage para que no vuelva a aparecer al recargar
    const currentReadIds = getReadIds();
    if (!currentReadIds.includes(id)) {
        localStorage.setItem('la_reserva_read_ids', JSON.stringify([...currentReadIds, id]));
    }

    // 3. Cerrar popover (opcional, si quieres que se cierre al clickear)
    closePopover();
  };

  useEffect(() => {
    let mounted = true;

    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        if (mounted) setUserId(user.id);

        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = adminData?.role || 'staff';
        if (mounted) setUserRole(role);

        await fetchInitialNotifications(user.id, role);

      } catch (error) {
        console.error("Error init notificaciones:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initData();
    audioRef.current = new Audio('/sounds/notification.mp3'); 

    // --- AUDIO FIX: UNLOCKER ---
    // Los navegadores bloquean el audio automático si no ha habido interacción previa.
    // Esto detecta el primer click en cualquier parte para "armar" el audio.
    const unlockAudio = () => {
        if (!audioUnlocked.current && audioRef.current) {
            audioRef.current.play().then(() => {
                audioRef.current?.pause();
                audioRef.current!.currentTime = 0;
                audioUnlocked.current = true;
            }).catch(() => {}); // Ignorar error si falla, reintentará luego
            document.removeEventListener('click', unlockAudio);
        }
    };
    document.addEventListener('click', unlockAudio);

    return () => { 
        mounted = false; 
        document.removeEventListener('click', unlockAudio);
    };
  }, []);

  const fetchInitialNotifications = async (uid: string, role: string) => {
    const lastCleared = getLastCleared();
    const readIds = getReadIds(); // Obtenemos IDs ya leídos
    const isSalesOrSuper = role === 'sales' || role === 'super_admin';
    let allNotifs: NotificationItem[] = [];

    const promises = [];

    if (isSalesOrSuper) {
      promises.push(
        supabase.from('quotes').select('id, client_name, event_type, created_at')
          .eq('status', 'new').order('created_at', { ascending: false }).limit(5)
          .then(({ data }) => data?.map(q => ({
            id: q.id, type: 'quote', title: `Nueva Cotización`, subtitle: `${q.client_name}`,
            link: '/admin/cotizaciones', date: q.created_at
          })))
      );

      promises.push(
        supabase.from('contact_messages').select('id, name, subject, created_at')
          .eq('status', 'new').order('created_at', { ascending: false }).limit(5)
          .then(({ data }) => data?.map(m => ({
            id: m.id, type: 'message', title: `Nuevo Mensaje`, subtitle: `${m.name}: ${m.subject}`,
            link: '/admin/mensajes', date: m.created_at
          })))
      );
    }

    promises.push(
      supabase.from('team_tasks').select('id, content, created_at')
        .eq('assigned_to', uid).eq('status', 'pending').order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => data?.map(t => ({
          id: t.id, type: 'task', title: `Tarea Asignada`, subtitle: t.content,
          link: '/admin', date: t.created_at
        })))
    );

    promises.push(
      supabase.from('testimonials').select('id, client_name, rating, created_at')
        .order('created_at', { ascending: false }).limit(3)
        .then(({ data }) => data?.map(t => ({
          id: t.id, type: 'testimonial', title: `Nuevo Testimonio ⭐ ${t.rating}`, subtitle: `De: ${t.client_name}`,
          link: '/admin/testimonios', date: t.created_at
        })))
    );

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    promises.push(
      supabase.from('events').select('id, event_type, created_at, client:clients(name)')
        .gte('created_at', threeDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => {
          const events = data as unknown as (EventPayload & { client: { name: string } })[];
          return events?.map(e => ({
            id: e.id, type: 'event', title: 'Evento Confirmado', subtitle: `${e.client?.name || 'Cliente'} - ${e.event_type}`,
            link: '/admin/eventos', date: e.created_at
          }));
        })
    );

    const results = await Promise.all(promises);
    results.forEach(group => { if (group) allNotifs = [...allNotifs, ...group as any[]]; });

    // FILTRADO MEJORADO: Fecha de limpieza general Y IDs específicos leídos
    const processed = allNotifs
      .filter(n => new Date(n.date) > lastCleared && !readIds.includes(n.id))
      .map(n => ({ ...n, isNew: true, type: n.type as NotificationType }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setNotifications(processed);
    setUnreadCount(processed.length);
  };

  // ... (MANTENEMOS LOGICA REALTIME IGUAL) ...
  useEffect(() => {
    if (!userRole || !userId) return;
    const channel = supabase.channel('admin-dashboard-notifications');

    const handleRealtime = (payload: any, type: NotificationType, title: string, subtitle: string, link: string) => {
        addNotification({
            id: payload.new.id, type, title, subtitle, link, date: payload.new.created_at, isNew: true
        });
    };

    if (userRole === 'sales' || userRole === 'super_admin') {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes' }, 
        (p) => handleRealtime(p, 'quote', 'Nueva Cotización', p.new.client_name, '/admin/cotizaciones'));
      
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        (p) => handleRealtime(p, 'message', 'Nuevo Mensaje', `${p.new.name}: ${p.new.subject}`, '/admin/mensajes'));
    }

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_tasks' },
      (p: RealtimePostgresInsertPayload<TaskPayload>) => {
        if (p.new.assigned_to === userId) 
            handleRealtime(p, 'task', 'Nueva Tarea Asignada', p.new.content, '/admin/tareas');
      });

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'testimonials' },
      (p) => handleRealtime(p, 'testimonial', 'Nuevo Testimonio', `${p.new.client_name} (${p.new.rating}⭐)`, '/admin/testimonios'));

    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' },
      async (p: RealtimePostgresInsertPayload<EventPayload>) => {
        const { data: client } = await supabase.from('clients').select('name').eq('id', p.new.client_id).single();
        addNotification({
          id: p.new.id, type: 'event', title: 'Evento Confirmado', 
          subtitle: `${client?.name || 'Cliente'} - ${p.new.event_type}`, link: '/admin/eventos', date: p.new.created_at, isNew: true
        });
      });

    channel.subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userRole, userId]);

  const addNotification = (item: NotificationItem) => {
    // Check rápido si ya fue leída localmente (por si acaso recarga rápida)
    const readIds = getReadIds();
    if (readIds.includes(item.id)) return;

    setNotifications(prev => [item, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Intento de reproducción robusto
    if (audioRef.current) {
        audioRef.current.volume = 0.5;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Audio autoplay prevented by browser policy:', error);
            });
        }
    }
  };

  const handleClearAll = (closePopover: () => void) => {
    const now = new Date().toISOString();
    localStorage.setItem('la_reserva_notifs_cleared', now);
    localStorage.removeItem('la_reserva_read_ids'); // Limpiamos los IDs individuales para ahorrar espacio, ya que la fecha manda
    setNotifications([]);
    setUnreadCount(0);
    closePopover();
  };

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button className={cn("p-2 rounded-lg transition-all relative outline-none focus:ring-2 focus:ring-primary-500/20", open ? 'bg-secondary-100 text-primary-600' : 'text-secondary-400 hover:text-primary-600 hover:bg-secondary-50')}>
            <Bell className={cn("w-6 h-6", unreadCount > 0 && !open && "animate-swing")} />
            <Transition show={!loading && unreadCount > 0} enter="transition-transform duration-200" enterFrom="scale-0" enterTo="scale-100" leave="transition-transform duration-200" leaveFrom="scale-100" leaveTo="scale-0" as={Fragment}>
               <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                 <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
               </span>
            </Transition>
          </Popover.Button>

          <Transition as={Fragment} show={open} enter="transition-opacity duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="transition-opacity duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <Popover.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />
          </Transition>

          <Transition as={Fragment} enter="transition ease-out duration-200" enterFrom="opacity-0 translate-y-2 scale-95" enterTo="opacity-100 translate-y-0 scale-100" leave="transition ease-in duration-150" leaveFrom="opacity-100 translate-y-0 scale-100" leaveTo="opacity-0 translate-y-2 scale-95">
            <Popover.Panel className="fixed inset-x-4 top-24 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:mt-3 w-auto md:w-96 origin-top md:origin-top-right">
              <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[70vh] md:max-h-[500px] overflow-hidden border border-secondary-100">
                <div className="px-5 py-4 border-b border-secondary-100 bg-white flex justify-between items-center sticky top-0 z-10">
                  <h3 className="text-base font-bold text-secondary-900">Notificaciones</h3>
                  {unreadCount > 0 && <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary-100">{unreadCount} NUEVAS</span>}
                </div>

                <div className="overflow-y-auto custom-scrollbar bg-secondary-50/30">
                  {loading ? (
                    <div className="p-12 flex justify-center text-secondary-400"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
                  ) : notifications.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-full shadow-sm ring-1 ring-secondary-100"><CheckCheck className="w-8 h-8 text-green-500" /></div>
                      <div><p className="font-semibold text-secondary-900">Estás al día</p><p className="text-sm text-secondary-500 mt-1">No hay notificaciones recientes.</p></div>
                    </div>
                  ) : (
                    <div className="divide-y divide-secondary-100">
                      {notifications.map((item) => {
                        const style = NOTIF_CONFIG[item.type] || NOTIF_CONFIG.event;
                        const Icon = style.icon;
                        return (
                          <a 
                            key={`${item.type}-${item.id}`}
                            href={item.link} 
                            onClick={() => handleNotificationClick(item.id, close)} // AQUÍ ESTÁ EL CAMBIO CLAVE
                            className={cn("relative block px-5 py-4 transition-all group active:scale-[0.99]", item.isNew ? "bg-white" : "bg-secondary-50/50 hover:bg-white", style.hover)}
                          >
                            {item.isNew && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"></div>}
                            <div className="flex gap-4 items-start">
                              <div className={cn("mt-1 p-2.5 rounded-xl shrink-0 transition-colors shadow-sm", item.isNew ? style.color : "bg-secondary-200/50 text-secondary-500")}>
                                <Icon size={20} strokeWidth={2} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className={cn("text-sm font-semibold truncate pr-2", item.isNew ? "text-secondary-900" : "text-secondary-600")}>{item.title}</p>
                                  <span className="text-[10px] text-secondary-400 font-medium whitespace-nowrap bg-white/50 px-1.5 py-0.5 rounded border border-secondary-100">
                                    {formatDistanceToNow(new Date(item.date), { locale: es, addSuffix: false }).replace('alrededor de ', '')}
                                  </span>
                                </div>
                                <p className="text-xs text-secondary-500 mt-1 line-clamp-2 leading-relaxed">{item.subtitle}</p>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 bg-white border-t border-secondary-100 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <button onClick={() => handleClearAll(close)} className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-secondary-600 hover:text-red-600 hover:bg-red-50 border border-secondary-200 hover:border-red-100 transition-all rounded-xl active:scale-95">
                      <Trash2 size={14} /> MARCAR TODO COMO LEÍDO
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