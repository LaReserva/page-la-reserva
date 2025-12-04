import { useState, useEffect } from 'react';
import { 
  Search, 
  Users, 
  Mail, 
  Phone, 
  Building, 
  Calendar,
  DollarSign,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types';
import { formatCurrency } from '@/utils/formatters';

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        // Ordenamos por fecha de creación (los más recientes primero)
        // o podrías ordenar por total_spent para ver a los clientes VIP
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as Client[]) || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filtrado
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      (client.company && client.company.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-xl border border-secondary-200">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* --- Toolbar --- */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-secondary-200">
        <div className="flex items-center gap-2 text-secondary-500">
          <Users className="w-5 h-5" />
          <span className="font-medium">{clients.length} Clientes registrados</span>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-secondary-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
          />
        </div>
      </div>

      {/* --- Tabla de Clientes --- */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-secondary-300" />
            </div>
            <h3 className="text-secondary-900 font-medium mb-1">No se encontraron clientes</h3>
            <p className="text-secondary-500 text-sm">Intenta con otro término de búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-secondary-50/50 text-secondary-500 font-medium border-b border-secondary-200">
                <tr>
                  <th className="px-6 py-4">Cliente / Empresa</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4 text-center">Historial</th>
                  <th className="px-6 py-4 text-right">Inversión Total</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-secondary-50/30 transition-colors group">
                    
                    {/* Nombre y Empresa */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs border border-primary-200">
                          {client.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-secondary-900">{client.name}</div>
                          {client.company && (
                            <div className="flex items-center gap-1 text-xs text-secondary-500 mt-0.5">
                              <Building className="w-3 h-3" />
                              {client.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Datos de Contacto */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-secondary-600">
                          <Mail className="w-3.5 h-3.5 text-secondary-400" />
                          <span className="text-xs truncate max-w-[180px]">{client.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-secondary-600">
                          <Phone className="w-3.5 h-3.5 text-secondary-400" />
                          <span className="text-xs">{client.phone}</span>
                        </div>
                      </div>
                    </td>

                    {/* Estadísticas de Eventos */}
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          client.total_events > 0 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-secondary-50 text-secondary-500 border-secondary-200'
                        }`}>
                          <Calendar className="w-3 h-3" />
                          {client.total_events} Eventos
                        </span>
                      </div>
                    </td>

                    {/* Dinero Gastado (LTV) */}
                    <td className="px-6 py-4 text-right">
                      <div className="font-bold text-secondary-900">
                        {formatCurrency(client.total_spent)}
                      </div>
                      <div className="text-xs text-secondary-400 mt-0.5">LTV</div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <a 
                          href={`mailto:${client.email}`}
                          className="p-1.5 text-secondary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Enviar Email"
                        >
                          <Mail className="w-4 h-4" />
                        </a>
                        <a 
                          href={`https://wa.me/${client.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-secondary-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Contactar por WhatsApp"
                        >
                          <MessageCircleIcon className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Icono auxiliar si no existe en la importación principal
function MessageCircleIcon({ className }: { className?: string }) {
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
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}