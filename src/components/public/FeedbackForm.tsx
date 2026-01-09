import { useState } from 'react';
import { Star, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Por favor selecciona una calificación de estrellas.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('testimonials').insert({
        event_id: eventId,
        client_name: clientName, // Viene pre-cargado del evento
        event_type: eventType,   // Viene pre-cargado del evento
        rating,
        comment,
        approved: false, // Requiere moderación
        featured: false,
        created_at: new Date().toISOString()
      });

      if (insertError) throw insertError;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Hubo un error al guardar tu opinión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 px-4 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-display font-bold text-secondary-900 mb-2">¡Gracias por tu Feedback!</h2>
        <p className="text-secondary-500 max-w-md mx-auto">
          Tu opinión es muy valiosa para nosotros. Nos ayuda a seguir mejorando la experiencia de La Reserva.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-secondary-100 overflow-hidden">
      <div className="bg-secondary-900 p-6 text-white text-center">
        <h1 className="font-display text-xl font-bold">Encuesta de Satisfacción</h1>
        <p className="text-secondary-400 text-sm mt-1">Evento: {eventType} - {clientName}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Rating Estrellas */}
        <div className="space-y-2 text-center">
          <label className="block text-sm font-medium text-secondary-700">
            ¿Cómo calificarías tu experiencia?
          </label>
          <div className="flex justify-center gap-2" onMouseLeave={() => setHoverRating(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={cn(
                    "w-8 h-8 transition-colors",
                    (hoverRating || rating) >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-secondary-300"
                  )}
                />
              </button>
            ))}
          </div>
          <p className="text-xs font-medium text-secondary-500 h-4">
            {rating === 5 ? "¡Excelente!" : rating === 4 ? "Muy bueno" : rating === 3 ? "Regular" : rating > 0 ? "Podría mejorar" : ""}
          </p>
        </div>

        {/* Comentario */}
        <div className="space-y-2">
          <label htmlFor="comment" className="block text-sm font-medium text-secondary-700">
            Cuéntanos un poco más (Opcional)
          </label>
          <textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full rounded-xl border-secondary-200 focus:border-secondary-900 focus:ring-secondary-900 transition-all text-sm placeholder:text-secondary-300"
            placeholder="¿Qué fue lo que más te gustó del servicio de bar?"
          />
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Botón Submit */}
        <button
          type="submit"
          disabled={loading || rating === 0}
          className={cn(
            "w-full py-3 px-4 rounded-xl font-bold text-white transition-all flex justify-center items-center gap-2",
            loading || rating === 0
              ? "bg-secondary-300 cursor-not-allowed"
              : "bg-secondary-900 hover:bg-black shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Enviando...
            </>
          ) : (
            "Enviar Valoración"
          )}
        </button>
      </form>
    </div>
  );
}