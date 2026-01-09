import { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { Star, Trash2, Calendar, User, Quote, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Testimonial } from '@/types';
import { cn } from '@/utils/utils';

export function TestimonialsList() {
  const [reviews, setReviews] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setReviews(data as any);
    setLoading(false);
  };

  const toggleApproval = async (id: string, currentStatus: boolean) => {
    // Optimistic UI update
    setReviews(prev => prev.map(r => r.id === id ? { ...r, approved: !currentStatus } : r));

    const { error } = await supabase
      .from('testimonials')
      .update({ approved: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar estado');
      fetchReviews(); // Revert
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este testimonio?')) return;
    
    setReviews(prev => prev.filter(r => r.id !== id));
    await supabase.from('testimonials').delete().eq('id', id);
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'pending') return !r.approved;
    if (filter === 'approved') return r.approved;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
        <h2 className="text-lg font-bold text-secondary-900">Testimonios Recibidos</h2>
        
        <div className="flex gap-2 p-1 bg-secondary-100 rounded-lg">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                filter === f 
                  ? "bg-white text-secondary-900 shadow-sm" 
                  : "text-secondary-500 hover:text-secondary-700"
              )}
            >
              {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendientes' : 'Aprobados'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Tarjetas */}
      {loading ? (
        <div className="p-12 text-center text-secondary-400">Cargando testimonios...</div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-secondary-200 border-dashed">
          <p className="text-secondary-500">No hay testimonios en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-secondary-200 shadow-sm flex flex-col h-full group hover:border-secondary-300 transition-all">
              
              {/* Card Header */}
              <div className="p-5 border-b border-secondary-100 flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-secondary-400" />
                    <span className="font-bold text-secondary-900">{review.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-secondary-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(review.created_at).toLocaleDateString()}
                    {review.event_type && <span className="px-1.5 py-0.5 bg-secondary-100 rounded text-secondary-600 capitalize">{review.event_type}</span>}
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={cn("w-3.5 h-3.5", i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-secondary-200")} 
                    />
                  ))}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-grow">
                <Quote className="w-6 h-6 text-secondary-200 mb-2 opacity-50" />
                <p className="text-secondary-600 text-sm leading-relaxed italic">
                  "{review.comment}"
                </p>
              </div>

              {/* Card Footer / Actions */}
              <div className="p-4 bg-secondary-50 rounded-b-xl flex items-center justify-between border-t border-secondary-100">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={review.approved}
                    onChange={() => toggleApproval(review.id, review.approved)}
                    className={cn(
                      review.approved ? 'bg-green-600' : 'bg-secondary-200',
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75'
                    )}
                  >
                    <span className="sr-only">Aprobar testimonio</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        review.approved ? 'translate-x-5' : 'translate-x-0',
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out'
                      )}
                    />
                  </Switch>
                  <span className={cn("text-xs font-bold uppercase tracking-wide", review.approved ? "text-green-700" : "text-secondary-400")}>
                    {review.approved ? 'Visible' : 'Oculto'}
                  </span>
                </div>

                <button 
                  onClick={() => handleDelete(review.id)}
                  className="p-2 text-secondary-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar permanentemente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}