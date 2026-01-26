import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Send, Mail, User, Calendar, Loader2, CheckCircle2, MessageSquare } from 'lucide-react';
import type { ContactMessage, ContactReply } from '@/types';
import { cn } from '@/utils/utils';
import { supabase } from '@/lib/supabase';

interface MessageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: ContactMessage | null;
  onReplySuccess: () => void;
}

export function MessageDetailModal({ isOpen, onClose, message, onReplySuccess }: MessageDetailModalProps) {
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<ContactReply[]>([]);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && message?.id) {
      fetchHistory();
    }
  }, [isOpen, message]);

  async function fetchHistory() {
    setLoadingHistory(true);
    const { data } = await supabase
      .from('contact_replies')
      .select('*, admin:admin_users(full_name)')
      .eq('message_id', message?.id)
      .order('created_at', { ascending: true });
    setReplies((data as any) || []);
    setLoadingHistory(false);
  }

  const handleClose = () => {
    if (status === 'success') {
      setStatus('idle');
      setReplyText('');
    }
    onClose();
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !message) return;

    try {
      setStatus('sending');
      setErrorMessage('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Sesión expirada');
      
      const response = await fetch('/api/send-reply', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
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

      setStatus('success');
      onReplySuccess();
      fetchHistory(); // Recargar historial local

    } catch (error: any) {
      console.error(error);
      setStatus('idle');
      setErrorMessage(error.message || 'Error al enviar respuesta.');
    }
  };

  if (!message) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all border border-secondary-200">
                
                {status === 'success' ? (
                  <div className="p-12 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-secondary-900 mb-2">¡Respuesta Enviada!</h3>
                    <p className="text-secondary-500 mb-6">El correo se agrupará en el hilo de Gmail del cliente.</p>
                    <button onClick={handleClose} className="px-6 py-2 bg-secondary-900 text-white rounded-lg font-medium">Cerrar</button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center p-6 border-b border-secondary-100 bg-secondary-50/50">
                      <Dialog.Title as="h3" className="text-lg font-bold text-secondary-900">Detalles del Mensaje</Dialog.Title>
                      <button onClick={handleClose} className="text-secondary-400 hover:text-secondary-600"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                      {/* Remitente */}
                      <div className="flex flex-wrap gap-6 text-sm">
                        <div><span className="text-secondary-500 uppercase text-[10px] font-bold block mb-1">Cliente</span><div className="flex items-center gap-2 font-medium"><User className="w-4 h-4 text-secondary-400" />{message.name}</div></div>
                        <div><span className="text-secondary-500 uppercase text-[10px] font-bold block mb-1">Email</span><div className="flex items-center gap-2 font-medium"><Mail className="w-4 h-4 text-secondary-400" />{message.email}</div></div>
                      </div>

                      {/* Mensaje Original */}
                      <div className="bg-secondary-50 p-4 rounded-xl border border-secondary-100">
                        <div className="flex justify-between mb-2 italic text-secondary-500 text-xs">
                          <span>Recibido el {new Date(message.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-secondary-700 whitespace-pre-wrap">{message.message}</p>
                      </div>

                      {/* Historial de Respuestas */}
                      {replies.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-primary-600 uppercase">
                            <MessageSquare className="w-3 h-3" /> Historial de respuestas
                          </div>
                          {replies.map(r => (
                            <div key={r.id} className="bg-primary-50/30 p-3 rounded-lg border border-primary-100">
                              <div className="flex justify-between text-[10px] mb-1">
                                <span className="font-bold text-primary-700">{r.admin?.full_name}</span>
                                <span className="text-secondary-400">{new Date(r.created_at).toLocaleString()}</span>
                              </div>
                              <p className="text-xs text-secondary-700">{r.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Editor de Respuesta */}
                      <div className="space-y-3 pt-4 border-t border-secondary-100">
                        <label className="text-sm font-bold text-secondary-900">Escribir nueva respuesta</label>
                        <textarea
                          rows={4}
                          className="w-full rounded-xl border-secondary-200 text-sm focus:ring-primary-500"
                          placeholder="Tu respuesta se enviará como un hilo en Gmail..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />
                        {errorMessage && <div className="text-red-500 text-xs">{errorMessage}</div>}
                      </div>
                    </div>

                    <div className="bg-secondary-50 p-6 flex justify-end gap-3 border-t">
                      <button onClick={handleClose} className="px-4 py-2 text-sm text-secondary-600 font-medium">Cancelar</button>
                      <button 
                        onClick={handleSendReply}
                        disabled={status === 'sending' || !replyText.trim()}
                        className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50"
                      >
                        {status === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar Respuesta
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