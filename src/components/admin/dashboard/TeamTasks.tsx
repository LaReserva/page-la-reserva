import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase as supabaseClient } from '@/lib/supabase';
import { Listbox, Transition } from '@headlessui/react';
import { 
  CheckCircle2, Circle, Plus, Trash2, Loader2, 
  ArrowUpCircle, MinusCircle, ArrowDownCircle, 
  Calendar, User as UserIcon, Check, ChevronDown, X
} from 'lucide-react';
import { cn } from '@/utils/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TeamTask, AdminUser } from '@/types';

const supabase = supabaseClient as SupabaseClient<Database>;

// --- CONFIGURACIÓN ---
const PRIORITIES = {
  high: { id: 'high', label: 'Alta', color: 'text-red-600 bg-red-50 border-red-100', icon: ArrowUpCircle },
  normal: { id: 'normal', label: 'Normal', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: MinusCircle },
  low: { id: 'low', label: 'Baja', color: 'text-secondary-500 bg-secondary-50 border-secondary-200', icon: ArrowDownCircle },
} as const;

type PriorityKey = keyof typeof PRIORITIES;

// --- HELPERS ---
const formatDate = (dateString: string | null) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-PE', { 
    day: 'numeric', month: 'short'
  }).format(date);
};

const UserAvatar = ({ user, size = 'sm', className }: { user?: AdminUser | null, size?: 'sm' | 'md', className?: string }) => {
  if (!user) return <div className={cn("rounded-full bg-secondary-100 flex items-center justify-center text-secondary-400 border border-secondary-200", size === 'sm' ? "w-5 h-5" : "w-8 h-8", className)}><UserIcon className="w-3 h-3"/></div>;
  
  const initials = user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : 'w-8 h-8 text-xs';

  return (
    <div className={cn("rounded-full flex items-center justify-center font-bold text-secondary-700 bg-white border border-secondary-200 shadow-sm shrink-0 overflow-hidden select-none", sizeClass, className)} title={user.full_name}>
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
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  useEffect(() => {
    initData();
  }, []);

  async function initData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('admin_users').select('*').eq('id', user.id).single();
        if (data) setCurrentUser(data as AdminUser);
      }

      const { data: members } = await supabase.from('admin_users').select('*').order('full_name');
      if (members) setTeamMembers(members as AdminUser[]);

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
      .select(`*, creator:admin_users!created_by(id, full_name, avatar_url), assignee:admin_users!assigned_to(id, full_name, avatar_url)`)
      .order('created_at', { ascending: false })
      .limit(50);
    
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
    setAssignedTo(null);

    try {
      const { data, error } = await supabase
        .from('team_tasks')
        .insert({
          content: optimisticTask.content,
          priority: optimisticTask.priority,
          status: 'pending',
          created_by: currentUser.id,
          assigned_to: assignedTo
        })
        .select(`*, creator:admin_users!created_by(id, full_name, avatar_url), assignee:admin_users!assigned_to(id, full_name, avatar_url)`)
        .single();

      if (error) throw error;
      if (data) setTasks(prev => prev.map(t => t.id === optimisticId ? (data as unknown as TeamTask) : t));
    } catch (error) {
      console.error(error);
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
    if (error) setTasks(backup);
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

  const assignedMember = teamMembers.find(m => m.id === assignedTo);
  const PriorityIcon = PRIORITIES[newPriority].icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 flex flex-col w-full overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 border-b border-secondary-100 flex justify-between items-center bg-white shrink-0">
        <div>
          <h3 className="font-bold text-lg text-secondary-900">Tareas</h3>
          <p className="text-xs text-secondary-500 font-medium">
            {currentUser ? `Hola, ${currentUser.full_name.split(' ')[0]}` : 'Cargando...'}
          </p>
        </div>
        <div className="flex bg-secondary-50 p-1 rounded-lg border border-secondary-100">
          <button onClick={() => setFilter('all')} className={cn("px-3 py-1 text-xs rounded-md transition-all font-medium", filter === 'all' ? "bg-white shadow text-secondary-900" : "text-secondary-500")}>Todas</button>
          <button onClick={() => setFilter('pending')} className={cn("px-3 py-1 text-xs rounded-md transition-all font-medium", filter === 'pending' ? "bg-white shadow text-secondary-900" : "text-secondary-500")}>Pendientes</button>
        </div>
      </div>

      <div className="h-[560px] overflow-y-auto p-4 space-y-3 bg-secondary-50/30">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-secondary-400 w-6 h-6" /></div>
        ) : processedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-secondary-400 opacity-60">
            <CheckCircle2 className="w-12 h-12 mb-2 stroke-1" />
            <p className="text-sm">Todo al día</p>
          </div>
        ) : (
          processedTasks.map(task => {
            const priorityInfo = PRIORITIES[task.priority as PriorityKey] || PRIORITIES.normal;
            const PIcon = priorityInfo.icon;
            
            return (
              <div key={task.id} className={cn("group relative flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 bg-white", task.status === 'done' ? "opacity-60 bg-gray-50 border-transparent" : "border-secondary-200 hover:shadow-md")}>
                <button onClick={() => toggleTask(task.id, task.status)} className={cn("mt-1 flex-shrink-0 transition-colors", task.status === 'done' ? "text-green-500" : "text-secondary-300 hover:text-green-600")}>
                  {task.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <p className={cn("text-sm font-medium leading-snug break-words", task.status === 'done' && "line-through text-secondary-500")}>{task.content}</p>
                    <span className={cn("shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase", priorityInfo.color)}>
                      <PIcon className="w-3 h-3 mr-1" />{priorityInfo.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs">
                    {task.assignee && (
                      <div className="flex items-center gap-1.5 bg-secondary-100 pl-0.5 pr-2 py-0.5 rounded-full border border-secondary-200">
                        <UserAvatar user={task.assignee} size="sm" />
                        <span className="font-medium text-secondary-600 truncate max-w-[80px]">{task.assignee.full_name.split(' ')[0]}</span>
                      </div>
                    )}
                    <span className="flex items-center gap-1 text-secondary-400">
                      <Calendar className="w-3 h-3" /> {formatDate(task.created_at)}
                    </span>
                  </div>
                </div>

                {currentUser?.role === 'super_admin' && (
                  <button onClick={() => deleteTask(task.id)} className="absolute -top-2 -right-2 bg-white border border-red-100 shadow-sm text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 scale-90 hover:scale-100">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* INPUT FORM (Fijo al fondo) */}
      <form onSubmit={addTask} className="p-3 border-t border-secondary-100 bg-white shrink-0 z-10">
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nueva tarea..."
            className="w-full bg-secondary-50 border border-secondary-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 resize-none focus:ring-primary-500 focus:border-primary-500"
          />
          
          <div className="flex justify-between items-center gap-2">
            <div className="flex gap-2 items-center">
              
              {/* LISTBOX: PRIORIDAD */}
              <Listbox value={newPriority} onChange={setNewPriority}>
                <div className="relative">
                  <Listbox.Button className={cn("h-8 px-2 flex items-center gap-1.5 rounded-md border text-xs font-bold uppercase transition-all shadow-sm focus:outline-none resize-none focus:ring-primary-500 focus:border-primary-500", PRIORITIES[newPriority].color, "bg-white")}>
                    <PriorityIcon className="w-3.5 h-3.5" />
                    <span>{PRIORITIES[newPriority].label}</span>
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute bottom-full left-0 mb-2 max-h-60 w-32 overflow-auto rounded-xl bg-white p-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                      {Object.values(PRIORITIES).map((priority) => (
                        <Listbox.Option key={priority.id} value={priority.id} className={({ active }) => cn("relative cursor-pointer select-none py-2 pl-2 pr-4 rounded-lg flex items-center gap-2 transition-colors", active ? "bg-secondary-50" : "")}>
                          {({ selected }) => (
                            <>
                              <priority.icon className={cn("w-4 h-4", selected ? "text-secondary-900" : "text-secondary-400")} />
                              <span className={cn("block truncate text-xs font-medium", selected ? "text-secondary-900" : "text-secondary-600")}>{priority.label}</span>
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>

              {/* LISTBOX: ASIGNACIÓN */}
              <Listbox value={assignedTo} onChange={setAssignedTo}>
                <div className="relative">
                  <Listbox.Button className="h-8 pl-1.5 pr-2 bg-white border border-secondary-200 rounded-md text-xs text-secondary-600 hover:border-secondary-300 focus:outline-none resize-none focus:ring-primary-500 focus:border-primary-500 shadow-sm flex items-center gap-2 min-w-[110px]">
                    {assignedMember ? (
                      <>
                        <UserAvatar user={assignedMember} size="sm" className="w-5 h-5 text-[8px]" />
                        <span className="font-medium truncate max-w-[70px]">{assignedMember.full_name.split(' ')[0]}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full border border-dashed border-secondary-300 flex items-center justify-center"><UserIcon className="w-3 h-3 text-secondary-400"/></div>
                        <span className="text-secondary-400">Sin asignar</span>
                      </>
                    )}
                    <ChevronDown className="w-3 h-3 ml-auto text-secondary-400" />
                  </Listbox.Button>
                  <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute bottom-full left-0 mb-2 max-h-60 w-48 overflow-auto rounded-xl bg-white p-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
                      <Listbox.Option value={null} className={({ active }) => cn("relative cursor-pointer select-none py-2 pl-2 pr-4 rounded-lg flex items-center gap-2 transition-colors", active ? "bg-red-50 text-red-600" : "text-secondary-500")}>
                        <X className="w-4 h-4" />
                        <span className="block truncate text-xs font-medium">Sin asignar</span>
                      </Listbox.Option>
                      {teamMembers.map((member) => (
                        <Listbox.Option key={member.id} value={member.id} className={({ active }) => cn("relative cursor-pointer select-none py-2 pl-2 pr-4 rounded-lg flex items-center gap-2 transition-colors", active ? "bg-secondary-50" : "")}>
                          {({ selected }) => (
                            <>
                              <UserAvatar user={member} size="sm" />
                              <span className={cn("block truncate text-xs font-medium", selected ? "text-secondary-900" : "text-secondary-600")}>
                                {member.full_name}
                              </span>
                              {selected && <Check className="ml-auto w-3 h-3 text-primary-600" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>

            </div>

            <button disabled={!newTask.trim()} type="submit" className="bg-secondary-900 text-white h-8 w-8 flex items-center justify-center rounded-lg hover:bg-secondary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}