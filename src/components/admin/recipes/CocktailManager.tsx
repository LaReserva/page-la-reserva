import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Cocktail, Ingredient, RecipeItem } from '@/types';

// Componentes Hijos
import { CocktailList } from './CocktailList';
import { RecipeTable } from './RecipeTable';
import { 
  CreateCocktailModal, 
  IngredientManagerModal, 
  FeedbackModal, 
  ConfirmationModal,
  CocktailInstructionsModal 
} from './RecipeModals';

export function CocktailManager() {
  // Estados de Datos
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCocktailId, setSelectedCocktailId] = useState<string | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>([]);
  
  // Estados UI
  const [loading, setLoading] = useState(true);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Estados Modals
  const [showCocktailModal, setShowCocktailModal] = useState(false);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [savingCocktail, setSavingCocktail] = useState(false);
  
  // Estado Cálculo
  const [testQuantity, setTestQuantity] = useState<number>(1);

  // Feedback & Confirmation
  const [feedback, setFeedback] = useState<{
    isOpen: boolean; type: 'success' | 'error' | 'warning'; title: string; message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; title: string; message: string; onConfirm: () => void; isDangerous?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // 1. Inicialización
  useEffect(() => { checkUserRole(); fetchInitialData(); }, []);
  useEffect(() => { if (selectedCocktailId) fetchRecipe(selectedCocktailId); }, [selectedCocktailId]);

  // 2. Cargas
  async function checkUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('admin_users').select('role').eq('id', user.id).single();
      if (data?.role === 'super_admin') setIsSuperAdmin(true);
    }
  }

  async function fetchInitialData() {
    try {
      const [cRes, iRes] = await Promise.all([
        supabase.from('catalog_cocktails').select('*').order('name'),
        supabase.from('catalog_ingredients').select('*').order('name')
      ]);
      if (cRes.data) setCocktails(cRes.data);
      if (iRes.data) setIngredients(iRes.data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  }

  async function fetchRecipe(cocktailId: string) {
    setLoadingRecipe(true);
    const { data } = await supabase.from('cocktail_recipes').select('*, ingredient:catalog_ingredients(*)').eq('cocktail_id', cocktailId);
    const formatted = (data || []).map(item => ({ ...item, ingredient: item.ingredient as unknown as Ingredient }));
    setCurrentRecipe(formatted);
    setLoadingRecipe(false);
  }

  // 3. Handlers

  // --- COCTEL ---
  const handleCreateCocktail = async (e: React.FormEvent, formData: any) => {
    e.preventDefault();
    setSavingCocktail(true);
    const slug = formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    try {
      const { data, error } = await supabase.from('catalog_cocktails').insert({
        name: formData.name, slug, description: formData.description, image_url: formData.image_url || null, active: true
      }).select().single();
      if (error) throw error;
      if (data) {
        setCocktails(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedCocktailId(data.id);
        setShowCocktailModal(false);
        setFeedback({ isOpen: true, type: 'success', title: 'Coctel Creado', message: `"${data.name}" se agregó correctamente.` });
      }
    } catch (err: any) { setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message }); } finally { setSavingCocktail(false); }
  };

  const handleDeleteCocktail = (id: string) => {
    setConfirmModal({
      isOpen: true, title: '¿Eliminar Coctel?', message: 'Esta acción borrará el coctel y su receta.', isDangerous: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('catalog_cocktails').delete().eq('id', id);
          if (error) throw error;
          setCocktails(prev => prev.filter(c => c.id !== id));
          if (selectedCocktailId === id) { setSelectedCocktailId(null); setCurrentRecipe([]); }
          setFeedback({ isOpen: true, type: 'success', title: 'Eliminado', message: 'Coctel eliminado correctamente.' });
        } catch (err) { setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo eliminar.' }); }
      }
    });
  };

  // --- INSUMOS: CREAR Y EDITAR ---
  const handleCreateIngredient = async (e: React.FormEvent, formData: any) => {
    try {
      const payload = { ...formData, unit: formData.measurement_unit };
      const { data, error } = await supabase.from('catalog_ingredients').insert(payload).select().single();
      if (error) throw error;
      if (data) {
        setIngredients(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
        setFeedback({ isOpen: true, type: 'success', title: 'Insumo Guardado', message: `${data.name} añadido correctamente.` });
      }
    } catch (err: any) { setFeedback({ isOpen: true, type: 'error', title: 'Error al guardar', message: err.message }); }
  };

  const handleEditIngredient = async (e: React.FormEvent, formData: any, id: string) => {
    try {
      const payload = { ...formData, unit: formData.measurement_unit };
      const { data, error } = await supabase.from('catalog_ingredients').update(payload).eq('id', id).select().single();
      if (error) throw error;
      if (data) {
        setIngredients(prev => prev.map(ing => ing.id === id ? data : ing).sort((a,b) => a.name.localeCompare(b.name)));
        setFeedback({ isOpen: true, type: 'success', title: 'Insumo Actualizado', message: `${data.name} actualizado correctamente.` });
        if (selectedCocktailId && currentRecipe.some(r => r.ingredient_id === id)) { fetchRecipe(selectedCocktailId); }
      }
    } catch (err: any) { setFeedback({ isOpen: true, type: 'error', title: 'Error al actualizar', message: err.message }); }
  };

  const handleDeleteIngredient = (id: string) => {
    setConfirmModal({
      isOpen: true, title: '¿Eliminar Insumo?', message: 'Si este insumo está en alguna receta, no se podrá eliminar.', isDangerous: true,
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('catalog_ingredients').delete().eq('id', id);
          if (error) throw error;
          setIngredients(prev => prev.filter(i => i.id !== id));
          setFeedback({ isOpen: true, type: 'success', title: 'Eliminado', message: 'Insumo eliminado del catálogo.' });
        } catch (err) { setFeedback({ isOpen: true, type: 'error', title: 'No se puede eliminar', message: 'Este insumo está en uso.' }); }
      }
    });
  };

  // --- RECETA ---
  const handleAddToRecipe = async (ingredientId: string) => {
    if (!selectedCocktailId || currentRecipe.find(r => r.ingredient_id === ingredientId)) {
        setFeedback({ isOpen: true, type: 'warning', title: 'Ya existe', message: 'Este insumo ya está en la receta.' });
        return;
    }
    try {
        const { data, error } = await supabase.from('cocktail_recipes').insert({
          cocktail_id: selectedCocktailId, ingredient_id: ingredientId, quantity: 1, is_garnish: false, unit: 'oz'
        }).select('*, ingredient:catalog_ingredients(*)').single();
        if (error) throw error;
        if (data) setCurrentRecipe([...currentRecipe, { ...data, ingredient: data.ingredient as unknown as Ingredient }]);
    } catch (err) { setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo agregar.' }); }
  };

  const handleUpdateRecipeQty = async (id: string, qty: number) => {
    setCurrentRecipe(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    await supabase.from('cocktail_recipes').update({ quantity: qty }).eq('id', id);
  };
  const handleUpdateRecipeUnit = async (id: string, unit: string) => {
    setCurrentRecipe(prev => prev.map(i => i.id === id ? { ...i, unit: unit } : i));
    await supabase.from('cocktail_recipes').update({ unit: unit }).eq('id', id);
  };
  const handleDeleteRecipeItem = (id: string) => {
    setConfirmModal({
      isOpen: true, title: '¿Quitar Ingrediente?', message: 'Se eliminará de esta receta.',
      onConfirm: async () => {
        setCurrentRecipe(prev => prev.filter(i => i.id !== id));
        await supabase.from('cocktail_recipes').delete().eq('id', id);
      }
    });
  };
  const handleSaveInstructions = async (newInstructions: string) => {
    if (!selectedCocktailId) return;
    try {
      const { error } = await supabase.from('catalog_cocktails').update({ instructions: newInstructions }).eq('id', selectedCocktailId);
      if (error) throw error;
      setCocktails(prev => prev.map(c => c.id === selectedCocktailId ? { ...c, instructions: newInstructions } : c));
      setFeedback({ isOpen: true, type: 'success', title: 'Guardado', message: 'La receta se actualizó.' });
      setShowInstructionsModal(false);
    } catch (err) { setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'No se guardó.' }); }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[85vh]">
        <CocktailList cocktails={cocktails} selectedId={selectedCocktailId} onSelect={setSelectedCocktailId} searchTerm={searchTerm} onSearchChange={setSearchTerm} isAdmin={isSuperAdmin} onNewClick={() => setShowCocktailModal(true)} onDelete={handleDeleteCocktail} />
        <RecipeTable cocktail={cocktails.find(c => c.id === selectedCocktailId)} recipe={currentRecipe} loadingRecipe={loadingRecipe} isAdmin={isSuperAdmin} ingredients={ingredients} testQty={testQuantity} onTestQtyChange={setTestQuantity} onUpdateQty={handleUpdateRecipeQty} onUpdateUnit={handleUpdateRecipeUnit} onDeleteFromRecipe={handleDeleteRecipeItem} onAddToRecipe={handleAddToRecipe} onOpenCatalog={() => setShowIngredientModal(true)} onOpenInstructions={() => setShowInstructionsModal(true)} />
      </div>

      <CreateCocktailModal isOpen={showCocktailModal} onClose={() => setShowCocktailModal(false)} onSave={handleCreateCocktail} isSaving={savingCocktail} />
      
      <IngredientManagerModal 
        isOpen={showIngredientModal} 
        onClose={() => setShowIngredientModal(false)} 
        ingredients={ingredients} 
        onAdd={handleCreateIngredient} 
        onEdit={handleEditIngredient} 
        onDelete={handleDeleteIngredient} 
      />
      
      <FeedbackModal isOpen={feedback.isOpen} type={feedback.type} title={feedback.title} message={feedback.message} onClose={() => setFeedback({ ...feedback, isOpen: false })} />
      <ConfirmationModal isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} isDangerous={confirmModal.isDangerous} />
      <CocktailInstructionsModal isOpen={showInstructionsModal} onClose={() => setShowInstructionsModal(false)} cocktail={cocktails.find(c => c.id === selectedCocktailId) || null} recipe={currentRecipe} isAdmin={isSuperAdmin} onSaveInstructions={handleSaveInstructions} />
    </div>
  );
}