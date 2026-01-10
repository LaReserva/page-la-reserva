// src/components/admin/NotificationBell.tsx
import { useState, useEffect, Fragment, useRef } from 'react';
import { Popover, Transition } from '@headlessui/react';
import { 
  Bell, FileText, Calendar, Loader2, CheckCheck, Trash2, 
  ClipboardList, Mail, Star, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import type { RealtimePostgresInsertPayload } from '@supabase/supabase-js';
import { cn } from '@/utils/utils';

// --- 1. DEFINICIÓN DE TIPOS LOCALES (Payloads Reales de DB) ---
// Definimos esto aquí porque database.ts está desactualizado
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

// Configuración Visual (Iconos y Colores)
const NOTIF_CONFIG = {
  quote: { icon: FileText, color: 'text-blue-600 bg-blue-50', hover: 'group-hover:bg-blue-50' },
  event: { icon: Calendar, color: 'text-purple-600 bg-purple-50', hover: 'group-hover:bg-purple-50' },
  task: { icon: ClipboardList, color: 'text-orange-600 bg-orange-50', hover: 'group-hover:bg-orange-50' },
  message: { icon: Mail, color: 'text-pink-600 bg-pink-50', hover: 'group-hover:bg-pink-50' },
  testimonial: { icon: Star, color: 'text-yellow-600 bg-yellow-50', hover: 'group-hover:bg-yellow-50' },
};

export function NotificationBell() {
  // Estado
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Contexto de Usuario
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper: Obtener fecha de última limpieza
  const getLastCleared = () => {
    if (typeof window === 'undefined') return new Date(0);
    const stored = localStorage.getItem('la_reserva_notifs_cleared');
    return stored ? new Date(stored) : new Date(0);
  };

  // --- 2. INICIALIZACIÓN (Carga de Datos) ---
  useEffect(() => {
    let mounted = true;

    const initData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        if (mounted) setUserId(user.id);

        // Obtener Rol
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single();

        const role = adminData?.role || 'staff';
        if (mounted) setUserRole(role);

        // Cargar Notificaciones Iniciales (Snapshot)
        await fetchInitialNotifications(user.id, role);

      } catch (error) {
        console.error("Error init notificaciones:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initData();
    // Pre-cargar sonido (opcional, asegúrate de tener el archivo en public/sounds)
    audioRef.current = new Audio('/sounds/notification.mp3'); 

    return () => { mounted = false; };
  }, []);

  // --- 3. LOGICA DE FETCHING (Snapshot Inicial) ---
  const fetchInitialNotifications = async (uid: string, role: string) => {
    const lastCleared = getLastCleared();
    const isSalesOrSuper = role === 'sales' || role === 'super_admin';
    let allNotifs: NotificationItem[] = [];

    // Usamos Promise.all para hacer todas las consultas en paralelo (Performance 🚀)
    const promises = [];

    // A. Cotizaciones (Solo Ventas/Admin)
    if (isSalesOrSuper) {
      promises.push(
        supabase.from('quotes')
          .select('id, client_name, event_type, created_at')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => data?.map(q => ({
            id: q.id, type: 'quote', title: `Nueva Cotización`, subtitle: `${q.client_name}`,
            link: '/admin/cotizaciones', date: q.created_at
          })))
      );

      // B. Mensajes (Solo Ventas/Admin)
      promises.push(
        supabase.from('contact_messages')
          .select('id, name, subject, created_at')
          .eq('status', 'new') // Asumiendo que 'new' es el estado inicial
          .order('created_at', { ascending: false })
          .limit(5)
          .then(({ data }) => data?.map(m => ({
            id: m.id, type: 'message', title: `Nuevo Mensaje`, subtitle: `${m.name}: ${m.subject}`,
            link: '/admin/mensajes', date: m.created_at
          })))
      );
    }

    // C. Tareas (Asignadas a mí)
    promises.push(
      supabase.from('team_tasks')
        .select('id, content, created_at')
        .eq('assigned_to', uid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data }) => data?.map(t => ({
          id: t.id, type: 'task', title: `Tarea Asignada`, subtitle: t.content,
          link: '/admin/tareas', date: t.created_at
        })))
    );

    // D. Testimonios (Todos)
    promises.push(
      supabase.from('testimonials')
        .select('id, client_name, rating, created_at')
        .order('created_at', { ascending: false })
        .limit(3)
        .then(({ data }) => data?.map(t => ({
          id: t.id, type: 'testimonial', title: `Nuevo Testimonio ⭐ ${t.rating}`, subtitle: `De: ${t.client_name}`,
          link: '/admin/testimonios', date: t.created_at
        })))
    );

    // E. Eventos Recientes (Todos)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    promises.push(
      supabase.from('events')
        .select('id, event_type, created_at, client:clients(name)')
        .gte('created_at', threeDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data }) => {
          const events = data as unknown as (EventPayload & { client: { name: string } })[];
          return events?.map(e => ({
            id: e.id, type: 'event', title: 'Evento Confirmado', subtitle: `${e.client?.name || 'Cliente'} - ${e.event_type}`,
            link: '/admin/eventos', date: e.created_at
          }));
        })
    );

    // Ejecutar promesas
    const results = await Promise.all(promises);
    
    // Unificar resultados
    results.forEach(group => {
      if (group) allNotifs = [...allNotifs, ...group as any[]];
    });

    // Procesar y ordenar
    const processed = allNotifs
      .filter(n => new Date(n.date) > lastCleared)
      .map(n => ({ ...n, isNew: true, type: n.type as NotificationType }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setNotifications(processed);
    setUnreadCount(processed.length);
  };

  // --- 4. REALTIME SUSCRIPCIONES (El corazón del sistema) ---
  useEffect(() => {
    if (!userRole || !userId) return;

    // Canal único para todo el dashboard
    const channel = supabase.channel('admin-dashboard-notifications');

    // 4.1 Cotizaciones
    if (userRole === 'sales' || userRole === 'super_admin') {
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'quotes' }, 
        (payload: RealtimePostgresInsertPayload<QuotePayload>) => {
          addNotification({
            id: payload.new.id, type: 'quote', title: 'Nueva Cotización', 
            subtitle: payload.new.client_name, link: '/admin/cotizaciones', date: payload.new.created_at, isNew: true
          });
        }
      );

      // 4.2 Mensajes
      channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'contact_messages' },
        (payload: RealtimePostgresInsertPayload<MessagePayload>) => {
          addNotification({
            id: payload.new.id, type: 'message', title: 'Nuevo Mensaje', 
            subtitle: `${payload.new.name}: ${payload.new.subject}`, link: '/admin/mensajes', date: payload.new.created_at, isNew: true
          });
        }
      );
    }

    // 4.3 Tareas (Filtrado Crítico: assigned_to === userId)
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_tasks' },
      (payload: RealtimePostgresInsertPayload<TaskPayload>) => {
        if (payload.new.assigned_to === userId) {
          addNotification({
            id: payload.new.id, type: 'task', title: 'Nueva Tarea Asignada', 
            subtitle: payload.new.content, link: '/admin/tareas', date: payload.new.created_at || new Date().toISOString(), isNew: true
          });
        }
      }
    );

    // 4.4 Testimonios
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'testimonials' },
      (payload: RealtimePostgresInsertPayload<TestimonialPayload>) => {
        addNotification({
          id: payload.new.id, type: 'testimonial', title: 'Nuevo Testimonio', 
          subtitle: `${payload.new.client_name} (${payload.new.rating}⭐)`, link: '/admin/testimonios', date: payload.new.created_at, isNew: true
        });
      }
    );

    // 4.5 Eventos
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' },
      async (payload: RealtimePostgresInsertPayload<EventPayload>) => {
        // Fetch rápido del nombre del cliente para mostrar info útil
        const { data: client } = await supabase.from('clients').select('name').eq('id', payload.new.client_id).single();
        
        addNotification({
          id: payload.new.id, type: 'event', title: 'Evento Confirmado', 
          subtitle: `${client?.name || 'Cliente'} - ${payload.new.event_type}`, link: '/admin/eventos', date: payload.new.created_at, isNew: true
        });
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRole, userId]);

  // Helper para añadir notificaciones en tiempo real
  const addNotification = (item: NotificationItem) => {
    setNotifications(prev => [item, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Reproducir sonido (si el navegador lo permite)
    try {
      audioRef.current?.play().catch(() => {});
    } catch (e) {
      console.log('Audio autoplay blocked');
    }
  };

  const handleClearAll = (closePopover: () => void) => {
    const now = new Date().toISOString();
    localStorage.setItem('la_reserva_notifs_cleared', now);
    setNotifications([]);
    setUnreadCount(0);
    closePopover();
  };
  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          {/* BOTÓN CAMPANA */}
          <Popover.Button 
            className={cn(
              "p-2 rounded-lg transition-all duration-200 relative outline-none focus:ring-2 focus:ring-primary-500/20",
              open ? 'bg-secondary-100 text-primary-600' : 'text-secondary-400 hover:text-primary-600 hover:bg-secondary-50'
            )}
          >
            <Bell className={cn("w-6 h-6", unreadCount > 0 && !open && "animate-swing")} />
            
            {/* Badge contador pequeño y elegante */}
            <Transition
              show={!loading && unreadCount > 0}
              enter="transition-transform duration-200"
              enterFrom="scale-0"
              enterTo="scale-100"
              leave="transition-transform duration-200"
              leaveFrom="scale-100"
              leaveTo="scale-0"
              as={Fragment}
            >
               <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                </span>
            </Transition>
          </Popover.Button>

          {/* OVERLAY OSCURO (Solo móvil, para enfocar la atención) */}
          <Transition
            as={Fragment}
            show={open}
            enter="transition-opacity duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Popover.Overlay className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden" />
          </Transition>

          {/* PANEL DE NOTIFICACIONES */}
          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-2 scale-95"
            enterTo="opacity-100 translate-y-0 scale-100"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 scale-100"
            leaveTo="opacity-0 translate-y-2 scale-95"
          >
            {/* CLASES CLAVE AQUÍ: 
                - Mobile: fixed inset-x-4 top-20 (Centrado y ancho completo con márgenes)
                - Desktop (md): absolute right-0 (Comportamiento dropdown normal)
            */}
            <Popover.Panel className="fixed inset-x-4 top-24 z-50 md:absolute md:inset-auto md:right-0 md:top-full md:mt-3 w-auto md:w-96 origin-top md:origin-top-right">
              <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[70vh] md:max-h-[500px] overflow-hidden border border-secondary-100">
                
                {/* HEADER */}
                <div className="px-5 py-4 border-b border-secondary-100 bg-white flex justify-between items-center sticky top-0 z-10">
                  <h3 className="text-base font-bold text-secondary-900">Notificaciones</h3>
                  
                  {unreadCount > 0 && (
                    <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2.5 py-1 rounded-full border border-primary-100">
                      {unreadCount} NUEVAS
                    </span>
                  )}
                </div>

                {/* LISTA DE ITEMS */}
                <div className="overflow-y-auto custom-scrollbar bg-secondary-50/30">
                  {loading ? (
                    <div className="p-12 flex justify-center text-secondary-400">
                      <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-4">
                      <div className="p-4 bg-white rounded-full shadow-sm ring-1 ring-secondary-100">
                         <CheckCheck className="w-8 h-8 text-green-500" />
                      </div>
                      <div>
                        <p className="font-semibold text-secondary-900">Estás al día</p>
                        <p className="text-sm text-secondary-500 mt-1">No hay notificaciones recientes.</p>
                      </div>
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
                            className={cn(
                              "relative block px-5 py-4 transition-all group active:scale-[0.99]",
                              // Fondo sutil si es nuevo
                              item.isNew ? "bg-white" : "bg-secondary-50/50 hover:bg-white",
                              style.hover
                            )}
                            onClick={() => close()}
                          >
                            {/* Indicador de "Nuevo" (Barra lateral izquierda) */}
                            {item.isNew && (
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full"></div>
                            )}

                            <div className="flex gap-4 items-start">
                              {/* Icono con fondo de color */}
                              <div className={cn(
                                "mt-1 p-2.5 rounded-xl shrink-0 transition-colors shadow-sm",
                                item.isNew ? style.color : "bg-secondary-200/50 text-secondary-500"
                              )}>
                                <Icon size={20} strokeWidth={2} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                  <p className={cn(
                                    "text-sm font-semibold truncate pr-2",
                                    item.isNew ? "text-secondary-900" : "text-secondary-600"
                                  )}>
                                    {item.title}
                                  </p>
                                  <span className="text-[10px] text-secondary-400 font-medium whitespace-nowrap bg-white/50 px-1.5 py-0.5 rounded border border-secondary-100">
                                    {formatDistanceToNow(new Date(item.date), { locale: es, addSuffix: false }).replace('alrededor de ', '')}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-secondary-500 mt-1 line-clamp-2 leading-relaxed">
                                  {item.subtitle}
                                </p>
                              </div>
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                {/* FOOTER (Sticky en la parte inferior) */}
                {notifications.length > 0 && (
                  <div className="p-3 bg-white border-t border-secondary-100 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                    <button 
                      onClick={() => handleClearAll(close)}
                      className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-bold text-secondary-600 hover:text-red-600 hover:bg-red-50 border border-secondary-200 hover:border-red-100 transition-all rounded-xl active:scale-95"
                    >
                      <Trash2 size={14} />
                      MARCAR TODO COMO LEÍDO
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