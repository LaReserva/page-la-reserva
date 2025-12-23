import { useState, useEffect, useMemo } from 'react';
import { supabase as supabaseClient } from '@/lib/supabase';
import { 
  CheckCircle2, Circle, Plus, Trash2, Loader2, 
  ArrowUpCircle, MinusCircle, ArrowDownCircle, 
  Calendar, User as UserIcon
} from 'lucide-react';
import { cn } from '@/utils/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TeamTask, AdminUser } from '@/types';

const supabase = supabaseClient as SupabaseClient<Database>;

// Configuración de Prioridades
const PRIORITIES = {
  high: { label: 'Alta', color: 'text-red-600 bg-red-50 border-red-100', icon: ArrowUpCircle },
  normal: { label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: MinusCircle },
  low: { label: 'Baja', color: 'text-gray-500 bg-gray-50 border-gray-100', icon: ArrowDownCircle },
} as const;

type PriorityKey = keyof typeof PRIORITIES;

// Helper para formatear fecha
const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-PE', { 
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
  }).format(date);
};

// Componente Avatar Pequeño
const UserAvatar = ({ user, size = 'sm' }: { user?: AdminUser, size?: 'sm' | 'md' }) => {
  if (!user) return <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center"><UserIcon className="w-3 h-3 text-gray-400"/></div>;
  
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-8 h-8 text-xs';

  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-secondary-700 bg-secondary-200 border border-white shadow-sm shrink-0 overflow-hidden", sizeClass)} title={user.full_name}>
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
};

export function TeamTasks() {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [teamMembers, setTeamMembers] = useState<AdminUser[]>([]);
  
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState<PriorityKey>('normal');
  const [assignedTo, setAssignedTo] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  useEffect(() => {
    initData();
  }, []);

  async function initData() {
    try {
      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: adminData } = await supabase
          .from('admin_users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        // ✅ CORRECCIÓN TYPESCRIPT: Forzamos el tipo
        if (adminData) setCurrentUser(adminData as AdminUser);
      }

      // 2. Cargar Miembros
      const { data: members } = await supabase
        .from('admin_users')
        .select('*')
        .order('full_name');
        
      // ✅ CORRECCIÓN TYPESCRIPT: Forzamos el tipo array
      if (members) setTeamMembers(members as AdminUser[]);

      // 3. Cargar Tareas
      await fetchTasks();

    } catch (error) {
      console.error('Error inicializando:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTasks() {
    const { data, error } = await supabase
      .from('team_tasks')
      .select(`
        *,
        creator:admin_users!created_by(id, full_name, avatar_url),
        assignee:admin_users!assigned_to(id, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50); // Aumenté el límite para probar el scroll
    
    if (!error && data) setTasks(data as unknown as TeamTask[]);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim() || !currentUser) return;

    const optimisticId = crypto.randomUUID();
    const assigneeUser = teamMembers.find(m => m.id === assignedTo);

    const optimisticTask: TeamTask = {
      id: optimisticId,
      content: newTask,
      status: 'pending',
      priority: newPriority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: currentUser.id,
      assigned_to: assignedTo || undefined,
      creator: currentUser,
      assignee: assigneeUser
    };

    setTasks([optimisticTask, ...tasks]);
    setNewTask('');
    setNewPriority('normal');
    setAssignedTo('');

    try {
      const { data, error } = await supabase
        .from('team_tasks')
        .insert({
          content: optimisticTask.content,
          priority: optimisticTask.priority,
          status: 'pending',
          created_by: currentUser.id,
          assigned_to: assignedTo || null
        })
        .select(`
          *,
          creator:admin_users!created_by(id, full_name, avatar_url),
          assignee:admin_users!assigned_to(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      if (data) setTasks(prev => prev.map(t => t.id === optimisticId ? (data as unknown as TeamTask) : t));
    } catch (error) {
      console.error('Error adding task:', error);
      setTasks(prev => prev.filter(t => t.id !== optimisticId));
    }
  }

  async function toggleTask(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    await supabase.from('team_tasks').update({ status: newStatus }).eq('id', id);
  }

  async function deleteTask(id: string) {
    const backup = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));
    
    const { error } = await supabase.from('team_tasks').delete().eq('id', id);
    if (error) {
      setTasks(backup);
      alert("Error al eliminar.");
    }
  }

  const processedTasks = useMemo(() => {
    let result = [...tasks];
    if (filter === 'pending') result = result.filter(t => t.status === 'pending');
    
    return result.sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      
      const pWeight = { high: 3, normal: 2, low: 1 };
      const pA = pWeight[a.priority as PriorityKey] || 2;
      const pB = pWeight[b.priority as PriorityKey] || 2;
      if (pA !== pB) return pB - pA;

      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [tasks, filter]);

  const PriorityIcon = PRIORITIES[newPriority].icon;

  return (
    // Quitamos h-full del contenedor principal para que se ajuste al contenido definido
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 flex flex-col w-full">
      {/* HEADER */}
      <div className="p-4 border-b border-secondary-100 flex justify-between items-center bg-white rounded-t-xl">
        <div>
          <h3 className="font-bold text-lg text-secondary-900">Tareas</h3>
          <p className="text-xs text-secondary-500">
            {currentUser ? `Hola, ${currentUser.full_name.split(' ')[0]}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex bg-secondary-50 p-1 rounded-lg border border-secondary-100">
          <button onClick={() => setFilter('all')} className={cn("px-3 py-1 text-xs rounded-md transition-all font-medium", filter === 'all' ? "bg-white shadow text-secondary-900" : "text-secondary-500")}>Todas</button>
          <button onClick={() => setFilter('pending')} className={cn("px-3 py-1 text-xs rounded-md transition-all font-medium", filter === 'pending' ? "bg-white shadow text-secondary-900" : "text-secondary-500")}>Pendientes</button>
        </div>
      </div>

      {/* ✅ LISTA CON ALTURA FIJA Y SCROLL 
         - h-[450px]: Altura fija (cámbialo si quieres más o menos)
         - overflow-y-auto: Habilita el scroll vertical cuando el contenido excede la altura
      */}
      <div className="h-[520px] overflow-y-auto p-4 space-y-3 bg-secondary-50/30">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-500" /></div>
        ) : processedTasks.length === 0 ? (
          <div className="text-center py-10 text-secondary-400 text-sm">No hay tareas pendientes.</div>
        ) : (
          processedTasks.map(task => {
            const priorityInfo = PRIORITIES[task.priority as PriorityKey] || PRIORITIES.normal;
            const PIcon = priorityInfo.icon;
            
            return (
              <div key={task.id} className={cn("group relative flex items-start gap-3 p-3 rounded-xl border bg-white transition-all hover:shadow-md", task.status === 'done' && "opacity-60 bg-gray-50")}>
                <button onClick={() => toggleTask(task.id, task.status)} className={cn("mt-1 flex-shrink-0", task.status === 'done' ? "text-green-500" : "text-secondary-300 hover:text-primary-500")}>
                  {task.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className={cn("text-sm font-medium leading-snug break-words", task.status === 'done' && "line-through text-secondary-500")}>{task.content}</p>
                    <span className={cn("shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", priorityInfo.color)}>
                      <PIcon className="w-3 h-3 mr-1" />{priorityInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-secondary-400">
                    {task.assignee && (
                      <div className="flex items-center gap-1.5 bg-secondary-100 px-1.5 py-0.5 rounded-full pr-2">
                        <UserAvatar user={task.assignee} size="sm" />
                        <span className="font-medium text-secondary-600 truncate max-w-[80px]">{task.assignee.full_name.split(' ')[0]}</span>
                      </div>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(task.created_at)}
                    </span>
                    <span className="text-secondary-300 ml-auto flex items-center gap-1" title={`Creado por: ${task.creator?.full_name}`}>
                       Por: {task.creator?.full_name?.split(' ')[0] || 'Sistema'}
                    </span>
                  </div>
                </div>

                {currentUser?.role === 'super_admin' && (
                  <button onClick={() => deleteTask(task.id)} className="absolute -top-2 -right-2 bg-white border border-red-100 shadow-sm text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* INPUT FORM (Fijo al fondo) */}
      <form onSubmit={addTask} className="p-3 border-t border-secondary-100 bg-white rounded-b-xl z-10">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nueva tarea..."
            className="w-full bg-secondary-50 border border-secondary-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const keys: PriorityKey[] = ['low', 'normal', 'high'];
                  setNewPriority(keys[(keys.indexOf(newPriority) + 1) % keys.length]);
                }}
                className={cn("h-8 px-2 flex items-center gap-1.5 rounded-md border text-xs font-medium transition-all", PRIORITIES[newPriority].color)}
                title="Cambiar prioridad"
              >
                <PriorityIcon className="w-3.5 h-3.5" />
                {PRIORITIES[newPriority].label}
              </button>

              <div className="relative">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="h-8 pl-2 pr-7 bg-white border border-secondary-200 rounded-md text-xs text-secondary-600 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 appearance-none cursor-pointer outline-none max-w-[120px]"
                >
                  <option value="">Sin asignar</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
                <UserIcon className="w-3 h-3 text-secondary-400 absolute right-6 top-2.5 pointer-events-none" />
              </div>
            </div>

            <button disabled={!newTask.trim()} type="submit" className="bg-secondary-900 text-white h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary-800 disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}