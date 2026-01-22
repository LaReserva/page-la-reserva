import React, { useState, useEffect } from 'react';
import { 
  Loader2, Package, Trash2, CheckCircle2, AlertCircle, 
  XCircle, ChevronDown, HelpCircle, Save, ScrollText, Upload, Image as ImageIcon 
} from 'lucide-react';
import type { Ingredient, Cocktail, RecipeItem } from '@/types';
import { BaseModal } from '@/components/admin/ui/BaseModal';

// 1. FEEDBACK MODAL (Sin cambios)
interface FeedbackModalProps {
  isOpen: boolean; 
  type: 'success' | 'error' | 'warning'; 
  title: string; 
  message: string; 
  onClose: () => void;
}
export function FeedbackModal({ isOpen, type, title, message, onClose }: FeedbackModalProps) {
  const config = {
    success: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    warning: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' }
  };
  const Style = config[type];
  const Icon = Style.icon;
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-8 flex flex-col items-center text-center">
        <div className={`w-16 h-16 rounded-full ${Style.bg} flex items-center justify-center mb-5 ring-8 ring-white shadow-sm`}>
          <Icon className={`w-8 h-8 ${Style.color}`} />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm mb-6 leading-relaxed">{message}</p>
        <button onClick={onClose} className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-black'}`}>
          Entendido
        </button>
      </div>
    </BaseModal>
  );
}

// 2. CONFIRMATION MODAL (Sin cambios)
interface ConfirmationModalProps {
  isOpen: boolean; title: string; message: string; onConfirm: () => void; onClose: () => void; confirmText?: string; isDangerous?: boolean;
}
export function ConfirmationModal({ isOpen, title, message, onConfirm, onClose, confirmText = "Confirmar", isDangerous = false }: ConfirmationModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <div className="p-6 text-center">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${isDangerous ? 'bg-red-50 text-red-600' : 'bg-secondary-50 text-secondary-600'}`}>
          {isDangerous ? <Trash2 className="w-7 h-7" /> : <HelpCircle className="w-7 h-7" />}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button 
            autoFocus 
            onClick={onClose} 
            className="flex-1 py-2.5 border border-secondary-200 text-secondary-600 rounded-xl font-bold hover:bg-secondary-50 transition-colors outline-none focus:ring-2 focus:ring-secondary-200"
          >
            Cancelar
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-2.5 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 ${isDangerous ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/20'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}

// 3. COCKTAIL FORM MODAL (Estilos de focus actualizados)
interface CocktailFormModalProps {
  isOpen: boolean; onClose: () => void; onSave: (e: React.FormEvent, data: any, file: File | null) => Promise<void>; isSaving: boolean; initialData?: Cocktail | null;
}
export function CocktailFormModal({ isOpen, onClose, onSave, isSaving, initialData }: CocktailFormModalProps) {
  const [data, setData] = useState({ name: '', description: '', image_url: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setData({ name: initialData.name, description: initialData.description || '', image_url: initialData.image_url || '' });
        setPreview(initialData.image_url || null);
      } else {
        setData({ name: '', description: '', image_url: '' });
        setPreview(null);
      }
      setFile(null);
    }
  }, [isOpen, initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(e, data, file);
  };
  const isEdit = !!initialData;

  // Clase común para inputs
  const inputClass = "w-full px-4 py-2.5 border border-secondary-200 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 outline-none transition-all";

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={isEdit ? "Editar Coctel" : "Nuevo Coctel"} maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div className="flex justify-center mb-6">
          <div className="relative group w-32 h-32 rounded-2xl overflow-hidden border-2 border-dashed border-secondary-300 hover:border-primary-500 transition-colors bg-secondary-50">
             {preview ? (
               <img src={preview} alt="Preview" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-secondary-400">
                 <ImageIcon className="w-8 h-8 mb-1" />
                 <span className="text-[10px] uppercase font-bold">Sin Imagen</span>
               </div>
             )}
             <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity">
                <Upload className="w-8 h-8 text-white" />
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
             </label>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Nombre del Coctel *</label>
          <input required type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} className={`${inputClass} font-medium`} />
        </div>
        <div>
          <label className="block text-xs font-bold text-secondary-500 uppercase mb-1.5">Descripción</label>
          <textarea rows={3} value={data.description} onChange={e => setData({...data, description: e.target.value})} className={inputClass} />
        </div>
        <div className="pt-2 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-secondary-200 text-secondary-600 rounded-xl hover:bg-secondary-50 font-bold transition-colors">Cancelar</button>
            <button type="submit" disabled={isSaving} className="flex-1 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold flex justify-center items-center shadow-lg shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-70">
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEdit ? 'Guardar Cambios' : 'Crear Coctel')}
            </button>
        </div>
      </form>
    </BaseModal>
  );
}

// 4. INGREDIENT MANAGER MODAL (Estilos de focus actualizados)
interface IngredientManagerModalProps {
  isOpen: boolean; onClose: () => void; ingredients: Ingredient[]; onAdd: (e: React.FormEvent, data: any) => void; onEdit: (e: React.FormEvent, data: any, id: string) => void; onDelete: (id: string) => void;
}
export function IngredientManagerModal({ isOpen, onClose, ingredients, onAdd, onEdit, onDelete }: IngredientManagerModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newData, setNewData] = useState({ name: '', category: 'licor', estimated_price: 0, purchase_unit: 'botella', package_volume: 750, measurement_unit: 'ml', yield_pieces: 0 });
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleStartEdit = (ing: Ingredient) => {
    setNewData({ name: ing.name, category: ing.category, estimated_price: ing.estimated_price, purchase_unit: ing.purchase_unit, package_volume: ing.package_volume, measurement_unit: ing.measurement_unit, yield_pieces: ing.yield_pieces || 0 });
    setEditingId(ing.id);
  };
  
  const handleCancelEdit = () => { setEditingId(null); setNewData({ name: '', category: 'licor', estimated_price: 0, purchase_unit: 'botella', package_volume: 750, measurement_unit: 'ml', yield_pieces: 0 }); };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!newData.name) return;
    if (editingId) { onEdit(e, newData, editingId); handleCancelEdit(); } else { onAdd(e, newData); setNewData({ name: '', category: 'licor', estimated_price: 0, purchase_unit: 'botella', package_volume: 750, measurement_unit: 'ml', yield_pieces: 0 }); }
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      onDelete(itemToDelete);
      setItemToDelete(null);
    }
  };

  const isGarnish = newData.category === 'garnish' || newData.category === 'fruta';
  
  // Clase base actualizada
  const baseInputClass = "w-full px-3 py-2.5 text-sm border border-secondary-300 rounded-xl resize-none focus:ring-primary-500 focus:border-primary-500 outline-none transition-all shadow-sm";

  return (
    <>
      <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-5xl">
         <div className="flex flex-col h-[80vh] md:h-[85vh]">
            <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center bg-gradient-to-r from-white to-secondary-50/50">
               <h3 className="font-bold text-xl text-secondary-900 flex items-center gap-2.5"><div className="p-2 bg-primary-50 rounded-lg text-primary-600"><Package className="w-5 h-5" /></div>Catálogo de Insumos</h3>
               <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary-100 text-secondary-400 hover:text-red-500 transition-all"><XCircle className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className={`p-6 md:w-5/12 border-r border-secondary-100 overflow-y-auto custom-scrollbar transition-colors duration-300 ${editingId ? 'bg-primary-50/30' : 'bg-secondary-50/50'}`}>
                   <div className="flex justify-between items-center mb-5">
                    <h4 className="text-xs font-bold text-secondary-500 uppercase tracking-wider flex items-center gap-2"><span className={`w-2 h-2 rounded-full shadow-sm ${editingId ? 'bg-primary-600' : 'bg-green-500'}`}></span> {editingId ? 'Editando Insumo' : 'Agregar Nuevo Item'}</h4>
                    {editingId && <button onClick={handleCancelEdit} type="button" className="text-[10px] bg-white border border-secondary-200 px-2 py-1 rounded shadow-sm hover:bg-secondary-50 text-secondary-600 font-medium transition-all">Cancelar</button>}
                   </div>
                   <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="col-span-2">
                        <label className="text-[11px] font-bold text-secondary-500 uppercase mb-1.5 block">Nombre</label>
                        <input required value={newData.name} onChange={e => setNewData({...newData, name: e.target.value})} className={`${baseInputClass} bg-white`} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-secondary-500 uppercase mb-1.5 block">Categoría</label>
                            <div className="relative">
                                <select value={newData.category} onChange={e => setNewData({...newData, category: e.target.value})} className={`${baseInputClass} bg-white appearance-none pr-8 cursor-pointer`}>{['licor', 'mixer', 'fruta', 'garnish', 'otro'].map(c => <option key={c} value={c}>{c}</option>)}</select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-secondary-500 uppercase mb-1.5 block">Costo (S/)</label>
                            <input type="number" step="0.1" min="0" value={newData.estimated_price} onChange={e => setNewData({...newData, estimated_price: parseFloat(e.target.value)})} className={`${baseInputClass} bg-white`} />
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-xl border border-secondary-200 shadow-sm relative group hover:border-primary-200 transition-colors">
                        <h5 className="text-xs font-bold text-secondary-800 mb-4 uppercase flex items-center gap-2"><Package className="w-4 h-4" /> Presentación</h5>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Envase</label>
                                <input list="unit-suggestions" value={newData.purchase_unit} onChange={e => setNewData({...newData, purchase_unit: e.target.value})} className="w-full px-3 py-2 text-sm border border-secondary-200 rounded-lg resize-none focus:ring-primary-500 focus:border-primary-500 outline-none bg-secondary-50/30" />
                                <datalist id="unit-suggestions"><option value="botella" /><option value="kg" /><option value="paquete" /><option value="lata" /></datalist>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-secondary-400 uppercase mb-1 block">Contenido</label>
                                <div className="flex relative shadow-sm rounded-lg">
                                    <input type="number" min="0" value={newData.package_volume} onChange={e => setNewData({...newData, package_volume: parseFloat(e.target.value)})} className="w-full px-3 py-2 text-sm border border-secondary-200 border-r-0 rounded-l-lg resize-none focus:ring-primary-500 focus:border-primary-500 outline-none z-10" />
                                    <select value={newData.measurement_unit} onChange={e => setNewData({...newData, measurement_unit: e.target.value})} className="bg-secondary-50 border border-secondary-200 rounded-r-lg text-xs pl-2 pr-1 font-bold outline-none focus:ring-primary-500 focus:border-primary-500"><option value="ml">ml</option><option value="gr">gr</option><option value="und">und</option></select>
                                </div>
                            </div>
                        </div>
                      </div>
                      {isGarnish && (<div className="bg-green-50/50 p-4 rounded-xl border border-green-200 shadow-sm"><label className="text-[10px] font-bold text-green-700 uppercase mb-1 block">Piezas por {newData.purchase_unit}</label><input type="number" min="0" value={newData.yield_pieces} onChange={e => setNewData({...newData, yield_pieces: parseFloat(e.target.value)})} className="w-full px-3 py-2 text-sm border border-green-300 rounded-lg resize-none focus:ring-primary-500 focus:border-primary-500 outline-none bg-white/80" /></div>)}
                      <button type="submit" className={`w-full py-3.5 text-white font-bold rounded-xl hover:shadow-lg transition-all transform active:scale-[0.98] mt-4 flex justify-center gap-2 items-center ${editingId ? 'bg-primary-600 hover:bg-primary-700' : 'bg-secondary-900 hover:bg-black'}`}>
                          {editingId ? <Save className="w-4 h-4" /> : <Package className="w-4 h-4" />} {editingId ? 'Actualizar Insumo' : 'Guardar Insumo'}
                      </button>
                   </form>
                </div>
                <div className="flex-1 overflow-y-auto bg-white p-0 custom-scrollbar relative">
                      <table className="w-full text-sm text-left">
                       <thead className="bg-white/95 backdrop-blur-sm border-b border-secondary-200 sticky top-0 z-20 shadow-sm">
                           <tr><th className="px-6 py-4 text-xs font-bold text-secondary-400 uppercase tracking-wider">Insumo</th><th className="px-6 py-4 text-xs font-bold text-secondary-400 uppercase tracking-wider">Presentación</th><th className="px-6 py-4 text-xs font-bold text-secondary-400 uppercase tracking-wider text-right">Acción</th></tr>
                       </thead>
                       <tbody className="divide-y divide-secondary-50">
                           {[...ingredients].sort((a, b) => a.name.localeCompare(b.name)).map(ing => (
                               <tr key={ing.id} className={`transition-colors group ${editingId === ing.id ? 'bg-primary-50 border-l-4 border-primary-500' : 'hover:bg-secondary-50/80'}`}>
                                   <td className="px-6 py-4"><div className={`font-bold text-sm ${editingId === ing.id ? 'text-primary-900' : 'text-secondary-900'}`}>{ing.name}</div><div className="flex gap-2 mt-1.5"><span className="text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wide border bg-white border-secondary-200 text-secondary-500">{ing.category}</span>{ing.estimated_price > 0 && <span className="text-[10px] px-2 py-0.5 rounded-md bg-secondary-100 text-secondary-600 font-medium border border-secondary-200">S/ {ing.estimated_price}</span>}</div></td>
                                   <td className="px-6 py-4"><div className="text-secondary-600 text-xs font-medium">1 {ing.purchase_unit} = {ing.package_volume} {ing.measurement_unit}</div>{ing.yield_pieces ? <div className="mt-1 text-[10px] text-green-700 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Rinde: {ing.yield_pieces}</div> : null}</td>
                                   <td className="px-6 py-4 text-right">
                                     <div className="flex items-center justify-end gap-1">
                                       <button onClick={() => handleStartEdit(ing)} className="text-secondary-400 hover:text-primary-600 p-2 hover:bg-primary-50 rounded-lg transition-all"><Pencil className="w-4 h-4" /></button>
                                       <button 
                                         onClick={(e) => {
                                           e.currentTarget.blur();
                                           setItemToDelete(ing.id);
                                         }} 
                                         className="text-secondary-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-all"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                     </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
                </div>
            </div>
         </div>
      </BaseModal>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Eliminar Insumo"
        message="¿Estás seguro de que deseas eliminar este insumo? Esta acción podría afectar a las recetas que lo utilizan."
        confirmText="Sí, Eliminar"
        isDangerous={true}
      />
    </>
  );
}

// 5. INSTRUCTIONS MODAL (Sin cambios)
interface CocktailInstructionsModalProps {
  isOpen: boolean; onClose: () => void; cocktail: Cocktail; recipe: RecipeItem[]; isAdmin: boolean; onSaveInstructions: (instructions: string) => Promise<void>;
}
export function CocktailInstructionsModal({ isOpen, onClose, cocktail, recipe, isAdmin, onSaveInstructions }: CocktailInstructionsModalProps) {
  const [instructions, setInstructions] = useState(cocktail.instructions || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { setInstructions(cocktail.instructions || ''); }, [cocktail, isOpen]);

  const handleSave = async () => { setIsSaving(true); await onSaveInstructions(instructions); setIsSaving(false); };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl">
        <div className="px-6 py-4 border-b border-secondary-100 flex justify-between items-center bg-gray-50">
          <div><h3 className="font-bold text-xl text-secondary-900 flex items-center gap-2"><ScrollText className="w-5 h-5 text-secondary-600" /> Ficha Técnica: {cocktail.name}</h3><p className="text-xs text-secondary-500 mt-0.5">Receta base para 1 coctel</p></div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-secondary-200 text-secondary-400 hover:text-secondary-600 transition-all"><XCircle className="w-6 h-6" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 max-h-[70vh] custom-scrollbar">
           <div className="mb-8"><h4 className="text-xs font-bold text-secondary-500 uppercase mb-3 border-b border-secondary-100 pb-1">Ingredientes</h4><div className="bg-secondary-50/50 rounded-xl border border-secondary-200 overflow-hidden"><table className="w-full text-sm"><thead className="bg-secondary-100 text-secondary-600"><tr><th className="px-4 py-2 text-left text-xs font-bold uppercase">Insumo</th><th className="px-4 py-2 text-right text-xs font-bold uppercase">Cantidad</th></tr></thead><tbody className="divide-y divide-secondary-100">{recipe.map(item => (<tr key={item.id} className="hover:bg-white transition-colors"><td className="px-4 py-2 text-secondary-900 font-medium">{item.ingredient?.name}</td><td className="px-4 py-2 text-right font-mono text-secondary-700">{item.quantity} <span className="text-xs text-secondary-500 ml-0.5">{item.unit}</span></td></tr>))}</tbody></table></div></div>
          <div><div className="flex justify-between items-end mb-2"><h4 className="text-xs font-bold text-secondary-500 uppercase border-b border-secondary-100 pb-1 flex-1">Método de Preparación</h4>{isAdmin && <span className="text-[10px] text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full">Editable</span>}</div><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} disabled={!isAdmin} placeholder={isAdmin ? "Escribe aquí los pasos de la receta..." : "Sin notas."} className={`w-full h-40 p-4 text-sm rounded-xl border transition-all resize-none outline-none ${isAdmin ? 'bg-white border-secondary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 text-secondary-900' : 'bg-secondary-50 border-transparent text-secondary-600 cursor-not-allowed'}`} /></div>
        </div>
        {isAdmin && (<div className="px-6 py-4 border-t border-secondary-100 bg-gray-50 flex justify-end"><button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold shadow-lg shadow-primary-600/20 transition-all active:scale-95 disabled:opacity-70">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Cambios</button></div>)}
    </BaseModal>
  );
}

function Pencil({ className }: { className?: string }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
}