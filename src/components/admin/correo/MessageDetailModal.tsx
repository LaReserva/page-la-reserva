import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, Mail, User, Calendar, Loader2, CheckCircle2 } from 'lucide-react';
import type { ContactMessage } from '@/types';
import { cn } from '@/utils/utils';

interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ContactMessage | null;
  onReplySuccess: () => void;
}

export function MessageDetailModal({ isOpen, onClose, message, onReplySuccess }: MessageDetailModalProps) {
  const [replyText, setReplyText] = useState('');
  // Estados para manejar la UI: 'idle' (escribiendo) | 'sending' (enviando) | 'success' (éxito)
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Limpiar formulario al cerrar o cambiar de mensaje
  if (!message) return null;

  // Resetear estados cuando se abre el modal con un nuevo mensaje
  const handleClose = () => {
    if (status === 'success') {
      // Si cerramos después de éxito, reseteamos todo
      setStatus('idle');
      setReplyText('');
    }
    onClose();
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    try {
      setStatus('sending');
      setErrorMessage('');
      
      const response = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: message.id,
          toEmail: message.email,
          clientName: message.name,
          subject: message.subject,
          replyMessage: replyText
        }),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Error enviando correo');

      // ✅ ÉXITO: Cambiamos al estado visual de éxito en lugar de alert()
      setStatus('success');
      
      // Notificamos al padre para que recargue la tabla
      onReplySuccess();

      // Opcional: Cerrar automáticamente después de 2 segundos
      // setTimeout(handleClose, 2000); 

    } catch (error) {
      console.error(error);
      setStatus('idle'); // Volvemos a permitir intentar
      setErrorMessage('Hubo un error al enviar el correo. Por favor intenta de nuevo.');
    }
  };

  const isReplied = message.status === 'replied';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all border border-secondary-200">
                
                {/* ✅ VISTA DE ÉXITO 
                    Si status es 'success', mostramos esto en lugar del formulario
                */}
                {status === 'success' ? (
                  <div className="p-12 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary-900 mb-2">¡Respuesta Enviada!</h3>
                    <p className="text-secondary-500 mb-8 max-w-sm">
                      El correo ha sido enviado correctamente a {message.name} y el estado se ha actualizado.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-secondary-900 text-white rounded-lg hover:bg-secondary-800 transition-colors font-medium"
                    >
                      Cerrar ventana
                    </button>
                  </div>
                ) : (
                  /* ✅ VISTA NORMAL (Formulario) */
                  <>
                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-secondary-100 bg-secondary-50/50">
                      <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900 leading-6">
                        Detalles del Mensaje
                      </Dialog.Title>
                      <button onClick={handleClose} className="text-secondary-400 hover:text-secondary-600 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6">
                      
                      {/* Info Remitente */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-secondary-500 uppercase tracking-wider">De</div>
                          <div className="flex items-center gap-2 text-secondary-900 font-medium">
                            <User className="w-4 h-4 text-secondary-400" />
                            {message.name}
                          </div>
                          <div className="text-sm text-secondary-500 pl-6">{message.phone || 'Sin teléfono'}</div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Email</div>
                          <div className="flex items-center gap-2 text-secondary-900 font-medium">
                            <Mail className="w-4 h-4 text-secondary-400" />
                            <a href={`mailto:${message.email}`} className="hover:text-primary-600 underline decoration-dotted">
                              {message.email}
                            </a>
                          </div>
                        </div>
                      </div>

                      <hr className="border-secondary-100" />

                      {/* Mensaje Original */}
                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <h4 className="font-bold text-secondary-900">{message.subject}</h4>
                          <span className="flex items-center gap-1.5 text-xs text-secondary-400">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(message.created_at).toLocaleDateString('es-PE', {
                              day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100 text-secondary-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {message.message}
                        </div>
                      </div>

                      {/* Área de Respuesta */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label htmlFor="reply" className="block text-sm font-medium text-secondary-900">
                            Responder al cliente
                          </label>
                          {isReplied && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                              Ya respondido
                            </span>
                          )}
                        </div>
                        
                        <textarea
                          id="reply"
                          rows={5}
                          className="w-full rounded-xl border-secondary-200 focus:border-primary-500 focus:ring-primary-500 text-sm shadow-sm placeholder:text-secondary-400"
                          placeholder={isReplied ? "Este mensaje ya fue respondido, pero puedes enviar otro correo..." : "Escribe tu respuesta aquí..."}
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        
                        {/* Mensaje de error si falla */}
                        {errorMessage && (
                          <div className="text-red-600 text-sm bg-red-50 p-2 rounded-lg border border-red-100">
                            {errorMessage}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-secondary-50 p-6 flex justify-end gap-3 border-t border-secondary-100">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-secondary-700 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={handleSendReply}
                        disabled={status === 'sending' || !replyText.trim()}
                        className={cn(
                          "inline-flex justify-center items-center gap-2 px-4 py-2 text-sm font-medium text-white border border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all",
                          status === 'sending' || !replyText.trim() 
                            ? "bg-secondary-300 cursor-not-allowed" 
                            : "bg-primary-600 hover:bg-primary-700 shadow-sm"
                        )}
                      >
                        {status === 'sending' ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Enviar Respuesta
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}