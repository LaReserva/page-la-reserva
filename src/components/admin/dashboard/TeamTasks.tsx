// src/components/admin/dashboard/TeamTasks.tsx
import { useState, useEffect } from 'react';
import { supabase as supabaseClient } from '@/lib/supabase'; 
import { CheckCircle2, Circle, Plus, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/utils/utils';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, TeamTask } from '@/types';

// Cast del cliente para que TypeScript reconozca todas las tablas
const supabase = supabaseClient as SupabaseClient<Database>;

// Tipos locales para las operaciones de BD
type TeamTaskInsert = {
  content: string;
  status: string;
  priority: string;
};

type TeamTaskUpdate = {
  status: string;
};

export function TeamTasks() {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [newTask, setNewTask] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    // Ahora TypeScript ya sabe que 'team_tasks' existe gracias al cast de arriba
    const { data } = await supabase
      .from('team_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setTasks(data);
    setLoading(false);
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;

    const { data } = await supabase
      .from('team_tasks')
      .insert({ 
        content: newTask, 
        status: 'pending', 
        // TypeScript infiere que 'normal' es del tipo correcto
        priority: 'normal'
       
      })
      .select()
      .single();

    if (data) setTasks([data, ...tasks]);
    setNewTask('');
  }

  async function toggleTask(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pending' ? 'done' : 'pending';
    
    // Actualización visual inmediata (Optimistic UI)
    setTasks(tasks.map(t => t.id === id ? { ...t, status: newStatus } : t));

    await supabase
      .from('team_tasks')
      .update({ status: newStatus })
      .eq('id', id);
  }

  async function deleteTask(id: string) {
    // Actualización visual inmediata
    setTasks(tasks.filter(t => t.id !== id));
    
    await supabase
      .from('team_tasks')
      .delete()
      .eq('id', id);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 flex flex-col h-full">
      <div className="p-6 border-b border-secondary-100">
        <h3 className="font-bold text-lg text-secondary-900">Tareas del Equipo</h3>
        <p className="text-sm text-secondary-500">Notas y pendientes compartidos</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[300px] max-h-[400px]">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-center text-secondary-400 text-sm py-10">
            No hay tareas pendientes. ¡Buen trabajo!
          </p>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all group",
                task.status === 'done' ? "bg-secondary-50 border-transparent opacity-60" : "bg-white border-secondary-100 hover:border-primary-200"
              )}
            >
              <div className="flex items-center gap-3 flex-1">
                <button 
                  onClick={() => toggleTask(task.id, task.status)}
                  className={cn(
                    "transition-colors",
                    task.status === 'done' ? "text-green-500" : "text-secondary-300 hover:text-primary-500"
                  )}
                >
                  {task.status === 'done' ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                <span className={cn("text-sm", task.status === 'done' && "line-through text-secondary-400")}>
                  {task.content}
                </span>
              </div>
              <button 
                onClick={() => deleteTask(task.id)}
                className="text-secondary-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <form onSubmit={addTask} className="p-4 border-t border-secondary-100 bg-secondary-50/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Nueva tarea..."
            className="flex-1 bg-white border border-secondary-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button 
            type="submit"
            disabled={!newTask.trim()}
            className="bg-secondary-900 text-white p-2 rounded-lg hover:bg-secondary-800 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}