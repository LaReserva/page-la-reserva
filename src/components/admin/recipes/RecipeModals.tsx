import React, { useState } from 'react';
import { 
  X, Loader2, Package, Trash2, Info, 
  CheckCircle2, AlertCircle, XCircle 
} from 'lucide-react';
import type { Ingredient } from '@/types';

// ==========================================
// NUEVO COMPONENTE: FEEDBACK MODAL (Alertas bonitas)
// ==========================================
interface FeedbackModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, type, title, message, onClose }: FeedbackModalProps) {
  if (!isOpen) return null;

  const config = {
    success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-200' },
    error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
    warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' }
  };

  const Style = config[type];
  const Icon = Style.icon;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full overflow-hidden scale-100 transform transition-all">
        <div className={`p-6 flex flex-col items-center text-center`}>
          <div className={`w-16 h-16 rounded-full ${Style.bg} flex items-center justify-center mb-4 ring-4 ring-white shadow-sm`}>
            <Icon className={`w-8 h-8 ${Style.color}`} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {message}
          </p>
          <button 
            onClick={onClose}
            className={`w-full py-2.5 rounded-lg font-semibold text-white transition-transform active:scale-95 ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-black'}`}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MODAL 1: CREAR NUEVO COCTEL
// ==========================================
interface CreateCocktailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent, data: any) => void;
  isSaving: boolean;
}

export function CreateCocktailModal({ isOpen, onClose, onSave, isSaving }: CreateCocktailModalProps) {
  if (!isOpen) return null;
  const [data, setData] = useState({ name: '', description: '', image_url: '' });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
          <h3 className="font-bold text-lg text-secondary-900">Nuevo Coctel</h3>
          <button onClick={onClose} className="text-secondary-400 hover:text-secondary-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => onSave(e, data)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Nombre *</label>
            <input required type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Ej: Mojito" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">Descripción</label>
            <input type="text" value={data.description} onChange={e => setData({...data, description: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Ej: Con ron y menta" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-1">URL Imagen</label>
            <input type="url" value={data.image_url} onChange={e => setData({...data, image_url: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="https://..." />
          </div>
          <div className="pt-4 flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex justify-center">
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear'}
              </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ==========================================
// MODAL 2: GESTOR DE INSUMOS
// ==========================================
interface IngredientManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  onAdd: (e: React.FormEvent, data: any) => void;
  onDelete: (id: string) => void;
}

export function IngredientManagerModal({ isOpen, onClose, ingredients, onAdd, onDelete }: IngredientManagerModalProps) {
  if (!isOpen) return null;
  
  const [newData, setNewData] = useState({ 
    name: '', category: 'licor', estimated_price: 0,
    purchase_unit: 'botella', package_volume: 750, measurement_unit: 'ml', yield_pieces: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validamos datos básicos antes de enviar
    if(!newData.name) return;
    
    // Enviamos al padre
    onAdd(e, newData);

    // Reseteamos (opcional, el padre podría manejar éxito primero)
    setNewData({ 
        name: '', category: 'licor', estimated_price: 0, 
        purchase_unit: 'botella', package_volume: 750, measurement_unit: 'ml', yield_pieces: 0 
    });
  };
  
  const isGarnish = newData.category === 'garnish' || newData.category === 'fruta';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center bg-secondary-50">
          <h3 className="font-bold text-lg text-secondary-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-600" /> Catálogo de Insumos
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-secondary-400 hover:text-secondary-600" /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* FORMULARIO */}
            <div className="p-6 md:w-5/12 border-r border-secondary-100 bg-secondary-50/30 overflow-y-auto custom-scrollbar">
                <h4 className="text-sm font-bold text-secondary-900 mb-4 uppercase flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span> Nuevo Insumo
                </h4>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-secondary-500 uppercase">Nombre</label>
                            <input required value={newData.name} onChange={e => setNewData({...newData, name: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none" placeholder="Ej: Ron Blanco" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-secondary-500 uppercase">Categoría</label>
                            <select value={newData.category} onChange={e => setNewData({...newData, category: e.target.value})} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg bg-white outline-none">
                                {['licor', 'mixer', 'fruta', 'garnish', 'otro'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-secondary-500 uppercase">Costo (S/)</label>
                            <input type="number" step="0.1" min="0" value={newData.estimated_price} onChange={e => setNewData({...newData, estimated_price: parseFloat(e.target.value)})} className="w-full mt-1 px-3 py-2 text-sm border rounded-lg outline-none" />
                        </div>
                    </div>
                    <div className="border-t border-secondary-200 my-4"></div>
                    <div className="bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                        <h5 className="text-xs font-bold text-primary-700 mb-3 uppercase flex items-center gap-1.5"><Package className="w-3 h-3" /> Presentación de Compra</h5>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-secondary-400 uppercase">Tipo Envase</label>
                                <input list="unit-suggestions" placeholder="Ej: botella" value={newData.purchase_unit} onChange={e => setNewData({...newData, purchase_unit: e.target.value})} className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg outline-none" />
                                <datalist id="unit-suggestions"><option value="botella" /><option value="kg" /><option value="paquete" /><option value="lata" /></datalist>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-secondary-400 uppercase">Contenido</label>
                                <div className="flex mt-1">
                                    <input type="number" min="0" value={newData.package_volume} onChange={e => setNewData({...newData, package_volume: parseFloat(e.target.value)})} className="w-full px-2 py-1.5 text-sm border border-r-0 rounded-l-lg outline-none" />
                                    <select value={newData.measurement_unit} onChange={e => setNewData({...newData, measurement_unit: e.target.value})} className="bg-secondary-50 border rounded-r-lg text-xs px-2 outline-none">
                                        <option value="ml">ml</option><option value="gr">gr</option><option value="und">und</option><option value="l">l</option><option value="kg">kg</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    {isGarnish && (
                        <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm animate-in fade-in">
                            <h5 className="text-xs font-bold text-green-800 mb-2 uppercase">Rendimiento (Garnish)</h5>
                            <label className="text-[10px] font-bold text-green-700 uppercase">Piezas útiles por {newData.purchase_unit}</label>
                            <input type="number" min="0" value={newData.yield_pieces} onChange={e => setNewData({...newData, yield_pieces: parseFloat(e.target.value)})} className="w-full mt-1 px-2 py-1.5 text-sm border border-green-300 rounded-lg outline-none" placeholder="Ej: 30" />
                        </div>
                    )}
                    <button type="submit" className="w-full py-3 bg-secondary-900 text-white font-bold rounded-xl hover:bg-black shadow-lg mt-4 flex justify-center gap-2">
                        <Package className="w-4 h-4" /> Guardar Insumo
                    </button>
                </form>
            </div>

            {/* LISTA */}
            <div className="flex-1 overflow-y-auto bg-white p-0 custom-scrollbar">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-white border-b border-secondary-200 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-5 py-3 text-xs font-bold text-secondary-500 uppercase">Insumo</th>
                            <th className="px-5 py-3 text-xs font-bold text-secondary-500 uppercase">Presentación</th>
                            <th className="px-5 py-3 text-xs font-bold text-secondary-500 uppercase text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {ingredients.map(ing => (
                            <tr key={ing.id} className="hover:bg-secondary-50 transition-colors">
                                <td className="px-5 py-3">
                                    <div className="font-bold text-secondary-900">{ing.name}</div>
                                    <div className="flex gap-2 mt-1">
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary-100 text-secondary-600 uppercase font-bold">{ing.category}</span>
                                        {ing.estimated_price > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">S/ {ing.estimated_price}</span>}
                                    </div>
                                </td>
                                <td className="px-5 py-3 text-xs text-secondary-700">
                                    1 {ing.purchase_unit} = {ing.package_volume} {ing.measurement_unit}
                                    {ing.yield_pieces ? <div className="mt-1 text-[10px] text-green-700 font-bold bg-green-50 inline-block px-1.5 py-0.5 rounded">Rinde: {ing.yield_pieces} pzs</div> : null}
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <button onClick={() => onDelete(ing.id)} className="text-secondary-300 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                        {ingredients.length === 0 && (
                            <tr><td colSpan={3} className="px-6 py-10 text-center text-secondary-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-20" /><p>No hay insumos</p></td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}