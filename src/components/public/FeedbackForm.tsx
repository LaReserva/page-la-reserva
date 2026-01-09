// src/components/public/FeedbackForm.tsx
import { useState } from 'react';
import { Star, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/utils/utils';

interface FeedbackFormProps {
  eventId: string;
  clientName: string;
  eventType: string;
}

export function FeedbackForm({ eventId, clientName, eventType }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setLoading(true);
    setErrorMessage(null); // Limpiar errores previos

    try {
      const { error } = await supabase.from('testimonials').insert({
        event_id: eventId,
        client_name: clientName,
        rating: rating,
        comment: comment,
        event_type: eventType,
        approved: false // Por defecto entra como pendiente de moderación
      });

      if (error) {
        // Código PostgreSQL 23505 = Unique Violation (Ya existe un registro con este event_id)
        if (error.code === '23505') {
          setErrorMessage('Ya existe una reseña registrada para este evento.');
        } else {
          throw error; // Lanzar otros errores para que los capture el catch genérico
        }
        return; // Detener aquí si hubo error
      }

      setSuccess(true);
      
    } catch (error) {
      console.error(error);
      setErrorMessage('Hubo un problema técnico al enviar. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white w-full max-w-md mx-auto rounded-2xl shadow-xl p-8 border border-secondary-100 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-secondary-900 mb-2">¡Gracias por tu opinión!</h2>
        <p className="text-secondary-500 leading-relaxed">
          Tu feedback ha sido recibido correctamente. Nos ayuda mucho a seguir mejorando la experiencia de La Reserva.
        </p>
        <a 
          href="/" 
          className="inline-block mt-8 text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors"
        >
          Volver al Inicio
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white w-full max-w-md mx-auto rounded-2xl shadow-xl overflow-hidden border border-secondary-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header del Formulario */}
      <div className="bg-secondary-900 p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-400 to-primary-600"></div>
        <h1 className="text-white font-display font-bold text-2xl mb-1">Tu Experiencia</h1>
        <p className="text-secondary-400 text-sm">
          {eventType} • <span className="text-white font-medium">{clientName}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        
        {/* Selector de Estrellas */}
        <div className="text-center space-y-3">
          <label className="block text-sm font-bold text-secondary-700 uppercase tracking-wide">
            Califica nuestro servicio
          </label>
          <div 
            className="flex justify-center gap-2 py-2" 
            onMouseLeave={() => setHoverRating(0)}
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                className="focus:outline-none transition-all duration-200 hover:scale-110 active:scale-95"
                title={`${star} Estrellas`}
              >
                <Star 
                  className={cn(
                    "w-10 h-10 transition-colors duration-200", 
                    (hoverRating || rating) >= star 
                      ? "fill-yellow-400 text-yellow-400 drop-shadow-sm" 
                      : "text-secondary-200"
                  )} 
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-secondary-500 h-5 transition-all">
            {rating === 5 ? "¡Excelente!" : 
             rating === 4 ? "Muy bueno" : 
             rating === 3 ? "Regular" : 
             rating === 2 ? "Malo" : 
             rating === 1 ? "Muy malo" : ""}
          </p>
        </div>

        {/* Campo de Comentario */}
        <div className="space-y-2">
          <label htmlFor="comment" className="block text-sm font-bold text-secondary-700 uppercase tracking-wide">
            ¿Algún comentario adicional? <span className="text-secondary-400 font-normal normal-case">(Opcional)</span>
          </label>
          <textarea
            id="comment"
            rows={4}
            className="w-full rounded-xl border border-secondary-200 p-3 text-secondary-900 placeholder:text-secondary-400 focus:border-secondary-900 focus:ring-1 focus:ring-secondary-900 outline-none transition-all text-sm resize-none bg-secondary-50/30"
            placeholder="Los cócteles estuvieron deliciosos, el servicio fue..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {/* Mensaje de Error */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 text-red-700 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-tight">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Botón de Envío */}
        <button
          type="submit"
          disabled={loading || rating === 0}
          className={cn(
            "w-full py-3.5 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg",
            loading || rating === 0 
              ? "bg-secondary-300 cursor-not-allowed shadow-none" 
              : "bg-secondary-900 hover:bg-black hover:-translate-y-0.5 shadow-secondary-900/20"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin"/>
              Enviando...
            </>
          ) : (
            "Enviar Reseña"
          )}
        </button>
      </form>
    </div>
  );
}