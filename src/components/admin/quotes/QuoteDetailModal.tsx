import { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  User, 
  Calendar, 
  DollarSign, 
  FileText,
  Clock,
  Package // Nuevo icono para el paquete
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Quote } from '@/types';
import { formatCurrency } from '@/utils/formatters';

interface QuoteDetailModalProps {
  quote: Quote | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedQuote: Quote) => void;
}

export function QuoteDetailModal({ quote, isOpen, onClose, onUpdate }: QuoteDetailModalProps) {
  const [notes, setNotes] = useState('');
  const [price, setPrice] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Sincronizar estado local
  useEffect(() => {
    if (quote) {
      setNotes(quote.admin_notes || '');
      setPrice(quote.estimated_price?.toString() || '');
    }
  }, [quote]);

  if (!isOpen || !quote) return null;

  // ✅ VALIDADOR DE PRECIO
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Permitir vacío para borrar
    if (val === '') {
      setPrice('');
      return;
    }

    // Validar que sea número y no sea negativo
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setPrice(val);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      const updates = {
        admin_notes: notes,
        estimated_price: price ? parseFloat(price) : null,
      };

      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', quote.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Casting seguro si es necesario, dependiendo de tu setup de TS
        onUpdate(data as Quote);
        onClose();
      }
    } catch (error) {
      console.error('Error updating quote:', error);
      alert('Error al guardar cambios');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-100 bg-secondary-50/50">
          <div>
            <h2 className="text-xl font-display font-bold text-secondary-900">
              Detalles de Cotización
            </h2>
            <p className="text-sm text-secondary-500 flex items-center gap-2 mt-1">
              ID: <span className="font-mono text-xs bg-secondary-200 px-1.5 py-0.5 rounded">{quote.id.slice(0, 8)}</span>
              <span className="text-secondary-300">•</span>
              <span className="capitalize px-2 py-0.5 rounded-full bg-white border border-secondary-200 text-xs font-medium">
                {quote.status}
              </span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Columna Izquierda: Información Estática */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Info Cliente */}
              <section>
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-primary-500" />
                  Información del Cliente
                </h3>
                <div className="bg-secondary-50 p-4 rounded-xl space-y-4 border border-secondary-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Nombre</label>
                      <p className="font-bold text-secondary-900 text-lg">{quote.client_name}</p>
                    </div>
                    <div>
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Teléfono</label>
                      <p className="font-medium text-secondary-900 font-mono">{quote.client_phone}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Email</label>
                      <p className="font-medium text-secondary-900">{quote.client_email}</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Info Evento */}
              <section>
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  Detalles del Evento
                </h3>
                <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm">
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Fecha</label>
                      <p className="font-bold text-secondary-900">
                        {new Date(quote.event_date + 'T00:00:00').toLocaleDateString('es-PE', { 
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm">
                      <label className="text-xs text-secondary-400 block mb-1 font-medium">Invitados</label>
                      <p className="font-bold text-secondary-900">{quote.guest_count} personas</p>
                    </div>
                  </div>

                  {/* ✅ NUEVO: VISUALIZACIÓN DEL PAQUETE */}
                  <div className="bg-white p-3 rounded-lg border border-secondary-100 shadow-sm flex items-start gap-3">
                    <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <label className="text-xs text-secondary-400 block mb-0.5 font-medium">Paquete de Interés</label>
                      <p className="font-bold text-secondary-900 capitalize text-lg">
                        {quote.interested_package 
                          ? quote.interested_package.replace(/-/g, ' ') 
                          : <span className="text-secondary-400 font-normal italic">No especificado / Personalizado</span>}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-secondary-400 block mb-1 font-medium">Mensaje del Cliente</label>
                    <div className="bg-white p-4 rounded-lg border border-secondary-100 text-secondary-700 text-sm leading-relaxed italic relative">
                      <span className="absolute top-2 left-2 text-secondary-200 text-4xl leading-none">"</span>
                      <p className="relative z-10 px-2">{quote.message || 'Sin mensaje adicional.'}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Columna Derecha: Gestión (Editable) */}
            <div className="space-y-6">
              
              <div className="bg-white rounded-xl border-2 border-secondary-100 p-5 space-y-6 shadow-sm">
                
                {/* Notas Internas */}
                <div>
                  <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary-500" />
                    Notas Administrativas
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full min-h-[120px] p-3 text-sm bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all resize-none placeholder:text-secondary-400"
                    placeholder="Escribe notas internas aquí (ej: 'Cliente pide cambio de gin', 'Contactar el lunes')..."
                  />
                </div>

                {/* Precio Estimado con Validación */}
                <div>
                  <label className="text-sm font-bold text-secondary-900 mb-2 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary-500" />
                    Presupuesto Estimado
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 font-semibold">S/</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={handlePriceChange}
                      className="w-full pl-8 pr-4 py-2.5 bg-secondary-50 border border-secondary-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono font-medium text-lg"
                      placeholder="0.00"
                    />
                  </div>
                  {price && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                      <div className="flex justify-between text-xs text-green-700 mb-1">
                        <span>Adelanto (50%):</span>
                        <span className="font-bold">{formatCurrency(parseFloat(price) / 2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-green-700">
                        <span>Saldo:</span>
                        <span className="font-bold">{formatCurrency(parseFloat(price) / 2)}</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Meta Info */}
              <div className="bg-secondary-50 rounded-lg p-4 text-xs text-secondary-400 space-y-2 border border-secondary-100">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Creado: {new Date(quote.created_at).toLocaleString()}</span>
                </div>
                {quote.updated_at && (
                  <div className="flex items-center gap-2">
                    <Save className="w-3 h-3" />
                    <span>Actualizado: {new Date(quote.updated_at).toLocaleString()}</span>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-secondary-600 hover:text-secondary-900 hover:bg-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 text-sm font-bold text-white bg-secondary-900 hover:bg-secondary-800 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Cambios
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

// Icono Loader2 no estaba importado en el bloque original de imports, lo agregamos para el botón de guardado
function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}