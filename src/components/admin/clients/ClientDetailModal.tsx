import { useState, useEffect } from 'react';
import { 
  X, Save, User, Phone, Mail, Building, MapPin, 
  CreditCard, Instagram, FileText, Loader2, Plus,
  CalendarPlus, CheckCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import { useUserRole } from '@/hooks/useUserRole'; 
// Asegúrate de que la ruta a tu componente de crear evento sea correcta:
import { CreateManualEventModal } from '../events/CreateManualEventModal'; 

// ==========================================
// COMPONENTE: MODAL DE ÉXITO (Interno)
// ==========================================
interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
}

function SuccessModal({ isOpen, onClose, title = "¡Operación Exitosa!", message }: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    // Z-INDEX 100 asegura que este modal se muestre encima de todo
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Fondo oscuro con desenfoque */}
      <div 
        className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Contenido del Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 text-center border border-secondary-100">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4 animate-bounce">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-secondary-900 mb-2">
          {title}
        </h3>
        <p className="text-secondary-500 mb-6 text-sm">
          {message}
        </p>
        <button
          onClick={onClose}
          className="w-full inline-flex justify-center rounded-xl shadow-lg shadow-green-200 px-4 py-3 bg-green-600 text-base font-bold text-white hover:bg-green-700 focus:outline-none transition-all transform hover:scale-[1.02]"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENTE PRINCIPAL: DETALLE CLIENTE
// ==========================================

interface ClientDetailModalProps {
  client: Client | null; // Si es null, estamos CREANDO
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (client: Client) => void; 
}

export function ClientDetailModal({ client, isOpen, onClose, onUpdate }: ClientDetailModalProps) {
  const { isSuperAdmin } = useUserRole();
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  
  // Estado para el modal de Crear Evento
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  
  // Estado para el modal de Éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Estado para errores de validación
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isCreating = !client;

  useEffect(() => {
    if (isOpen) {
      setErrors({}); // Limpiar errores al abrir
      if (client) {
        setFormData(client);
      } else {
        setFormData({
          name: '',
          email: '',
          phone: '',
          second_phone: '',
          document_id: '',
          company: '',
          address: '',
          instagram: '',
          notes: '',
          total_events: 0,
          total_spent: 0
        });
      }
    }
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Client, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo específico cuando el usuario escribe
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // --- LÓGICA DE VALIDACIÓN ---
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // 1. Validar Nombre
    if (!formData.name?.trim()) {
      newErrors.name = "El nombre es obligatorio.";
    }

    // 2. Validar Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Ingresa un correo electrónico válido.";
    }

    // 3. Validar Celular (9 dígitos numéricos)
    const phoneRegex = /^\d{9}$/; 
    if (!formData.phone) {
      newErrors.phone = "El teléfono es obligatorio.";
    } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      // .replace(/\s/g, '') elimina espacios en blanco por si el usuario escribe "999 999 999"
      newErrors.phone = "El celular debe contener 9 dígitos numéricos.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Retorna true si NO hay errores
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    // Ejecutar validación antes de enviar a Supabase
    if (!validateForm()) {
      return; 
    }

    try {
      setSaving(true);
      let resultData;
      
      if (isCreating) {
        // INSERT
        const { data, error } = await supabase
          .from('clients')
          .insert({
            name: formData.name || '',
            email: formData.email || '',
            phone: formData.phone || '',
            second_phone: formData.second_phone || '', 
            document_id: formData.document_id || '',
            address: formData.address || '',
            instagram: formData.instagram || '',
            company: formData.company || '',
            notes: formData.notes || '',
            total_events: 0,
            total_spent: 0
          })
          .select()
          .single();
          
        if (error) throw error;
        resultData = data;

      } else {
        // UPDATE
        const { data, error } = await supabase
          .from('clients')
          .update({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            second_phone: formData.second_phone,
            document_id: formData.document_id,
            address: formData.address,
            instagram: formData.instagram,
            company: formData.company,
            notes: formData.notes
          })
          .eq('id', client!.id) 
          .select()
          .single();

        if (error) throw error;
        resultData = data;
      }
      
      onUpdate(resultData as Client);
      onClose();
    } catch (error: any) {
      console.error('Error saving client:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const title = isCreating ? 'Nuevo Cliente' : (isSuperAdmin ? 'Editar Cliente' : 'Detalles del Cliente');
  const isEditable = isCreating || isSuperAdmin;

  return (
    <>
      {/* Modal Principal (Detalle Cliente) - Z-Index 50 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div className="absolute inset-0 bg-secondary-900/60 backdrop-blur-sm" onClick={onClose} />
        
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-display font-bold text-secondary-900 flex items-center gap-2">
                {isCreating && <Plus className="w-5 h-5 text-primary-600" />}
                {title}
              </h2>
              <p className="text-sm text-secondary-500">
                {isCreating ? 'Registrar un nuevo cliente manualmente' : `ID: ${client?.id.slice(0, 8)}`}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-secondary-200 rounded-full transition-colors">
              <X className="w-5 h-5 text-secondary-500" />
            </button>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 bg-white">
            <div className="space-y-6">
              
              {/* Sección Personal */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider border-b pb-2">Información Personal</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CAMPO NOMBRE */}
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Nombre Completo *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        required 
                        type="text" 
                        value={formData.name || ''}
                        onChange={e => handleChange('name', e.target.value)}
                        disabled={!isEditable}
                        className={`w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50 ${
                          errors.name ? 'border-red-500 focus:ring-red-200' : 'border-secondary-200'
                        }`}
                      />
                    </div>
                    {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">{errors.name}</p>}
                  </div>
                  
                  {/* CAMPO DNI */}
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">DNI / RUC</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="text" 
                        value={formData.document_id || ''}
                        onChange={e => handleChange('document_id', e.target.value)}
                        disabled={!isEditable}
                        className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50"
                        placeholder="00000000"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CAMPO EMAIL */}
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="email" 
                        value={formData.email || ''}
                        onChange={e => handleChange('email', e.target.value)}
                        disabled={!isEditable}
                        className={`w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50 ${
                          errors.email ? 'border-red-500 focus:ring-red-200' : 'border-secondary-200'
                        }`}
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
                  </div>

                  {/* CAMPO EMPRESA */}
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Empresa</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="text" 
                        value={formData.company || ''}
                        onChange={e => handleChange('company', e.target.value)}
                        disabled={!isEditable}
                        className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección Contacto */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider border-b pb-2">Contacto & Redes</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* CAMPO CELULAR PRINCIPAL */}
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Teléfono Principal *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        required 
                        type="tel" 
                        value={formData.phone || ''}
                        onChange={e => handleChange('phone', e.target.value)}
                        disabled={!isEditable}
                        className={`w-full pl-9 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50 ${
                          errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-secondary-200'
                        }`}
                      />
                    </div>
                    {errors.phone && <p className="text-red-500 text-xs mt-1 font-medium">{errors.phone}</p>}
                  </div>
                  
                  {/* CAMPO CELULAR SECUNDARIO */}
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Teléfono Secundario</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="tel" 
                        value={formData.second_phone || ''}
                        onChange={e => handleChange('second_phone', e.target.value)}
                        disabled={!isEditable}
                        placeholder="(Opcional)"
                        className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Dirección</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="text" 
                        value={formData.address || ''}
                        onChange={e => handleChange('address', e.target.value)}
                        disabled={!isEditable}
                        className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-secondary-500 font-medium block mb-1">Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-2.5 w-4 h-4 text-secondary-400" />
                      <input 
                        type="text" 
                        value={formData.instagram || ''}
                        onChange={e => handleChange('instagram', e.target.value)}
                        disabled={!isEditable}
                        placeholder="@usuario"
                        className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-secondary-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-secondary-400 uppercase tracking-wider border-b pb-2">Notas Internas</h3>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-secondary-400" />
                  <textarea 
                    value={formData.notes || ''}
                    onChange={e => handleChange('notes', e.target.value)}
                    disabled={!isEditable}
                    rows={3}
                    className="w-full pl-9 p-2 border border-secondary-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none disabled:bg-secondary-50"
                    placeholder="Información adicional relevante..."
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-secondary-100 bg-secondary-50 flex justify-between items-center">
            
            {!isCreating ? (
              <button 
                type="button"
                onClick={() => setIsCreateEventOpen(true)}
                className="px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium text-sm rounded-lg flex items-center gap-2 transition-colors border border-purple-200"
              >
                <CalendarPlus className="w-4 h-4" />
                Agendar Evento
              </button>
            ) : (
              <div /> 
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-secondary-600 hover:bg-white rounded-lg transition-colors">
                Cerrar
              </button>
              
              {isEditable && (
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-lg shadow-md flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isCreating ? 'Crear Cliente' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE CREAR EVENTO */}
      {client && (
        <CreateManualEventModal
          isOpen={isCreateEventOpen}
          onClose={() => setIsCreateEventOpen(false)}
          onCreated={() => {
            // Cerrar el modal de evento y abrir el de éxito
            setIsCreateEventOpen(false);
            setShowSuccessModal(true);
          }}
          initialClient={client}
        />
      )}

      {/* MODAL DE ÉXITO */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="¡Evento Agendado!"
        message="El evento se ha creado exitosamente para este cliente."
      />
    </>
  );
}