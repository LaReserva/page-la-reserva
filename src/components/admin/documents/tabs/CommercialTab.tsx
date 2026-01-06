import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, FileText, Download, Calendar, DollarSign, FileType } from 'lucide-react';
import type { Quote } from '@/types';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ProposalPdf } from '../templates/ProposalPdf';
// Importamos el generador de Word
import { generateContract } from '../templates/ContractGenerator';

export function CommercialTab({ userRole }: { userRole: string }) {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  async function fetchQuotes() {
    const { data, error } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setQuotes(data);
    setLoading(false);
  }

  const filteredQuotes = quotes.filter(q => 
    q.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.event_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 h-full">
      
      {/* LEFT COLUMN: LISTA */}
      <div className="lg:col-span-4 border-r border-gray-200 flex flex-col h-full bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredQuotes.map(quote => (
            <div
              key={quote.id}
              onClick={() => setSelectedQuote(quote)}
              className={`p-3 rounded-lg cursor-pointer transition-all border ${
                selectedQuote?.id === quote.id
                  ? 'bg-white border-primary-500 shadow-md ring-1 ring-primary-500'
                  : 'bg-white border-gray-200 hover:border-primary-300'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800 text-sm truncate">{quote.client_name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  quote.status === 'converted' 
                    ? 'bg-green-100 text-green-800' 
                    : quote.status === 'declined' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {quote.status === 'converted' ? 'APROBADO' : quote.status.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                <Calendar size={12} /> 
                <span>{new Date(quote.event_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <DollarSign size={12} /> 
                <span>{quote.estimated_price ? `S/ ${quote.estimated_price}` : 'Por cotizar'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: PREVIEW Y ACCIONES */}
      <div className="lg:col-span-8 flex flex-col h-full bg-white overflow-hidden">
        {selectedQuote ? (
          <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Generar Documentos</h3>
                <p className="text-sm text-gray-500">Cliente: {selectedQuote.client_name}</p>
              </div>
              
              <div className="flex gap-2">
                {/* BOTÓN 1: Generar PDF (Propuesta Visual) */}
                <PDFDownloadLink
                  document={<ProposalPdf quote={selectedQuote} />}
                  fileName={`Propuesta_${selectedQuote.client_name.replace(/\s+/g, '_')}.pdf`}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium shadow-sm transition-colors"
                >
                  {({ loading }) => (
                    <>
                      <FileText size={16} />
                      {loading ? 'Generando...' : 'PDF Propuesta'}
                    </>
                  )}
                </PDFDownloadLink>

                {/* BOTÓN 2: Generar Word (Contrato Editable) */}
                <button
                  onClick={() => generateContract(selectedQuote)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition-colors"
                >
                  <FileType size={16} />
                  Word Contrato
                </button>
              </div>
            </div>

            {/* Preview Visual (HTML simple) */}
            <div className="flex-1 overflow-auto p-8 bg-gray-100 flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-lg p-10 min-h-[600px] border border-gray-200 relative">
                
                {/* Header Simulado */}
                <div className="border-b pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">LA RESERVA</h1>
                        <p className="text-sm text-gray-500">Bartending & Cocktails</p>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                        <p>Fecha: {new Date().toLocaleDateString()}</p>
                    </div>
                </div>

                {/* Body Simulado */}
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded border border-blue-100 mb-6">
                      <p className="text-sm text-blue-800 font-medium text-center">
                        ℹ️ Selecciona una opción arriba para descargar el documento oficial.
                      </p>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Cliente</h4>
                        <div className="bg-gray-50 p-4 rounded text-sm">
                            <p className="font-bold text-gray-800">{selectedQuote.client_name}</p>
                            <p className="text-gray-600">{selectedQuote.client_email}</p>
                            <p className="text-gray-600">{selectedQuote.client_phone}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Evento</h4>
                            <p className="text-sm text-gray-800">{selectedQuote.event_type}</p>
                            <p className="text-xs text-gray-500">{new Date(selectedQuote.event_date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-primary-600 uppercase tracking-wider mb-2">Invitados</h4>
                            <p className="text-sm text-gray-800">{selectedQuote.guest_count} personas</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t">
                         <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                            <span className="font-bold text-gray-700">Total Estimado</span>
                            <span className="text-2xl font-bold text-primary-600">
                                {selectedQuote.estimated_price 
                                    ? `S/ ${selectedQuote.estimated_price.toLocaleString()}` 
                                    : 'N/A'}
                            </span>
                         </div>
                    </div>
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-300">
                    Vista previa de datos - No es el documento final
                </div>

              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>Selecciona una cotización para generar su documento.</p>
          </div>
        )}
      </div>
    </div>
  );
}