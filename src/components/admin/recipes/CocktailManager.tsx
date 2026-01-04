import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Cocktail, Ingredient, RecipeItem } from '@/types';

// Componentes Hijos
import { CocktailList } from './CocktailList';
import { RecipeTable } from './RecipeTable';
import { CreateCocktailModal, IngredientManagerModal, FeedbackModal } from './RecipeModals';

export function CocktailManager() {
  // Estados de Datos
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  // Estados de Selección
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
  const [savingCocktail, setSavingCocktail] = useState(false);
  
  // Estado Cálculo
  const [testQuantity, setTestQuantity] = useState<number>(1);

  // ✅ NUEVO: Estado para el Modal de Alertas (Feedback)
  const [feedback, setFeedback] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  }>({ isOpen: false, type: 'success', title: '', message: '' });

  // 1. Inicialización
  useEffect(() => {
    checkUserRole();
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedCocktailId) fetchRecipe(selectedCocktailId);
  }, [selectedCocktailId]);

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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRecipe(cocktailId: string) {
    setLoadingRecipe(true);
    const { data } = await supabase.from('cocktail_recipes').select('*, ingredient:catalog_ingredients(*)').eq('cocktail_id', cocktailId);
    const formatted = (data || []).map(item => ({ ...item, ingredient: item.ingredient as unknown as Ingredient }));
    setCurrentRecipe(formatted);
    setLoadingRecipe(false);
  }

  // 3. Manejadores (Handlers)

  // --- CREAR COCTEL ---
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
    } catch (err: any) {
      setFeedback({ isOpen: true, type: 'error', title: 'Error', message: err.message || 'No se pudo crear el coctel.' });
    } finally {
      setSavingCocktail(false);
    }
  };

  // --- CREAR INSUMO (Corrección aquí) ---
  const handleCreateIngredient = async (e: React.FormEvent, formData: any) => {
    // e.preventDefault() ya se maneja en el modal, pero por seguridad lo dejamos
    try {
      // ✅ SOLUCIÓN: La base de datos exige la columna antigua 'unit'.
      // Hacemos que 'unit' sea igual a 'measurement_unit' (ml, gr, und) para satisfacer la base de datos.
      const payload = {
        ...formData,
        unit: formData.measurement_unit 
      };

      const { data, error } = await supabase.from('catalog_ingredients').insert(payload).select().single();
      
      if (error) throw error;

      if (data) {
        setIngredients(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name)));
        // Usamos tu nuevo componente de Feedback
        setFeedback({ isOpen: true, type: 'success', title: 'Insumo Guardado', message: `${data.name} añadido correctamente.` });
        
        // Cerramos el modal solo si fue exitoso
        setShowIngredientModal(false); 
      }
    } catch (err: any) {
      console.error("Error creating ingredient:", err);
      setFeedback({ isOpen: true, type: 'error', title: 'Error al guardar', message: err.message || 'Verifica los datos.' });
    }
  };
  const handleDeleteIngredient = async (id: string) => {
    // Usamos el modal de confirmación nativo del navegador por simplicidad antes de borrar
    // Podrías crear otro modal de confirmación si quisieras, pero el FeedbackModal es informativo post-acción.
    if (!confirm("¿Estás seguro de eliminar este insumo?")) return;
    
    try {
      const { error } = await supabase.from('catalog_ingredients').delete().eq('id', id);
      if (error) throw error;
      
      setIngredients(prev => prev.filter(i => i.id !== id));
      setFeedback({ isOpen: true, type: 'success', title: 'Eliminado', message: 'El insumo fue eliminado correctamente.' });
    } catch (err) {
      setFeedback({ isOpen: true, type: 'error', title: 'No se puede eliminar', message: 'Este insumo está siendo usado en una o más recetas. Retíralo de las recetas primero.' });
    }
  };

  // --- RECETA ---
  const handleAddToRecipe = async (ingredientId: string) => {
    if (!selectedCocktailId || currentRecipe.find(r => r.ingredient_id === ingredientId)) {
        setFeedback({ isOpen: true, type: 'warning', title: 'Ya existe', message: 'Este insumo ya está en la receta actual.' });
        return;
    }
    
    try {
        const { data, error } = await supabase.from('cocktail_recipes').insert({
        cocktail_id: selectedCocktailId, ingredient_id: ingredientId, quantity: 1, is_garnish: false, unit: 'oz'
        }).select('*, ingredient:catalog_ingredients(*)').single();
        
        if (error) throw error;
        
        if (data) setCurrentRecipe([...currentRecipe, { ...data, ingredient: data.ingredient as unknown as Ingredient }]);
    } catch (err) {
        setFeedback({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo agregar el insumo a la receta.' });
    }
  };

  const handleUpdateRecipeQty = async (id: string, qty: number) => {
    setCurrentRecipe(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    await supabase.from('cocktail_recipes').update({ quantity: qty }).eq('id', id);
  };

  const handleUpdateRecipeUnit = async (id: string, unit: string) => {
    setCurrentRecipe(prev => prev.map(i => i.id === id ? { ...i, unit: unit } : i));
    await supabase.from('cocktail_recipes').update({ unit: unit }).eq('id', id);
  };

  const handleDeleteRecipeItem = async (id: string) => {
    if (!confirm("¿Quitar de la receta?")) return;
    setCurrentRecipe(prev => prev.filter(i => i.id !== id));
    await supabase.from('cocktail_recipes').delete().eq('id', id);
  };

  // 4. Render
  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
        
        <CocktailList 
          cocktails={cocktails}
          selectedId={selectedCocktailId}
          onSelect={setSelectedCocktailId}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          isAdmin={isSuperAdmin}
          onNewClick={() => setShowCocktailModal(true)}
        />

        <RecipeTable 
          cocktail={cocktails.find(c => c.id === selectedCocktailId)}
          recipe={currentRecipe}
          loadingRecipe={loadingRecipe}
          isAdmin={isSuperAdmin}
          ingredients={ingredients}
          testQty={testQuantity}
          onTestQtyChange={setTestQuantity}
          onUpdateQty={handleUpdateRecipeQty}
          onUpdateUnit={handleUpdateRecipeUnit}
          onDeleteFromRecipe={handleDeleteRecipeItem}
          onAddToRecipe={handleAddToRecipe}
          onOpenCatalog={() => setShowIngredientModal(true)}
        />
      </div>

      {/* MODALES */}
      <CreateCocktailModal 
        isOpen={showCocktailModal} 
        onClose={() => setShowCocktailModal(false)}
        onSave={handleCreateCocktail}
        isSaving={savingCocktail}
      />

      <IngredientManagerModal 
        isOpen={showIngredientModal}
        onClose={() => setShowIngredientModal(false)}
        ingredients={ingredients}
        onAdd={handleCreateIngredient}
        onDelete={handleDeleteIngredient}
      />

      {/* ✅ FEEDBACK MODAL (Alertas) */}
      <FeedbackModal 
        isOpen={feedback.isOpen}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback({ ...feedback, isOpen: false })}
      />
    </div>
  );
}