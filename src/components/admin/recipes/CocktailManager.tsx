import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import type { Ingredient, RecipeItem } from '@/types';
import type { CocktailWithTags } from '@/types/index';

import { CocktailList } from './CocktailList';
import { RecipeTable } from './RecipeTable';
import { 
  CocktailFormModal, 
  IngredientManagerModal, 
  CocktailInstructionsModal, 
  FeedbackModal, 
  ConfirmationModal 
} from './RecipeModals';

// ✅ 1. Definimos la interfaz del estado de Modales para evitar errores de tipo
interface ModalsState {
  ingredients: boolean;
  instructions: boolean;
  feedback: {
    isOpen: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
  };
  confirm: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  };
}

export function CocktailManager() {
  // --- ESTADOS DE DATOS ---
  const [cocktails, setCocktails] = useState<CocktailWithTags[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedCocktailId, setSelectedCocktailId] = useState<string | null>(null);
  const [currentRecipe, setCurrentRecipe] = useState<RecipeItem[]>([]);
  
  // --- ESTADOS DE UI ---
  const [loading, setLoading] = useState(true);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // --- FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLiquor, setFilterLiquor] = useState('Todos');

  // --- MODAL DE FORMULARIO (CREAR/EDITAR) ---
  const [formModal, setFormModal] = useState<{isOpen: boolean; data: CocktailWithTags | null}>({ 
    isOpen: false, 
    data: null 
  });
  const [savingCocktail, setSavingCocktail] = useState(false);
  
  // --- OTROS MODALES (Usando la interfaz ModalsState) ---
  const [modals, setModals] = useState<ModalsState>({
    ingredients: false,
    instructions: false,
    feedback: { isOpen: false, type: 'success', title: '', message: '' },
    confirm: { isOpen: false, title: '', message: '', onConfirm: () => {}, isDangerous: false }
  });

  // --- CALCULO ---
  const [testQuantity, setTestQuantity] = useState<number>(1);

  // --- EFECTOS ---
  useEffect(() => { 
    checkUserRole(); 
    fetchInitialData(); 
  }, []);

  useEffect(() => { 
    if (selectedCocktailId) {
        fetchRecipe(selectedCocktailId); 
    } else {
        setCurrentRecipe([]); 
    }
  }, [selectedCocktailId]);

  // --- CARGAS DE DATOS ---
  async function checkUserRole() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('admin_users').select('role').eq('id', user.id).single();
      if (data?.role === 'super_admin') setIsSuperAdmin(true);
    }
  }

  async function fetchInitialData() {
    try {
      setLoading(true);
      // 1. Cargar Ingredientes
      const { data: ingData } = await supabase.from('catalog_ingredients').select('*').order('name');
      if (ingData) setIngredients(ingData);

      // 2. Cargar Cocteles con JOIN a ingredientes para el buscador
      const { data: rawCocktails, error } = await supabase
        .from('catalog_cocktails')
        .select(`*, cocktail_recipes ( ingredient:catalog_ingredients ( name, category ) )`)
        .order('name');

      if (error) throw error;

      // 3. Procesar datos para tags y licor principal
      const processed: CocktailWithTags[] = (rawCocktails || []).map((c: any) => {
        const tags = new Set<string>();
        let mainLiquor = 'Otro';
        
        c.cocktail_recipes?.forEach((r: any) => {
          if (r.ingredient) {
            tags.add(r.ingredient.name.toLowerCase());
            if (r.ingredient.category === 'licor') {
                mainLiquor = r.ingredient.name;
            }
          }
        });

        return { 
          ...c, 
          search_tags: Array.from(tags), 
          main_liquor: mainLiquor 
        };
      });

      setCocktails(processed);
    } catch (e) { 
        console.error(e); 
    } finally { 
        setLoading(false); 
    }
  }

  async function fetchRecipe(cocktailId: string) {
    setLoadingRecipe(true);
    const { data } = await supabase
        .from('cocktail_recipes')
        .select('*, ingredient:catalog_ingredients(*)')
        .eq('cocktail_id', cocktailId);
        
    const formatted = (data || []).map(item => ({ 
        ...item, 
        ingredient: item.ingredient as unknown as Ingredient 
    }));
    
    setCurrentRecipe(formatted);
    setLoadingRecipe(false);
  }

  // --- LOGICA DE SUBIDA DE IMAGEN ---
  const uploadImage = async (file: File, cocktailName: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${cocktailName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('cocktails')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('cocktails')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  // --- GUARDAR COCTEL (CREAR O EDITAR) ---
  const handleSaveCocktail = async (e: React.FormEvent, formData: any, file: File | null) => {
    e.preventDefault();
    setSavingCocktail(true);
    
    try {
      let imageUrl = formData.image_url;
      const slug = formData.name.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

      if (file) {
          imageUrl = await uploadImage(file, formData.name);
      }

      const payload = { 
          name: formData.name, 
          slug, 
          description: formData.description, 
          image_url: imageUrl, 
          active: true 
      };

      if (formModal.data) {
        // MODO EDICIÓN
        const { data, error } = await supabase
            .from('catalog_cocktails')
            .update(payload)
            .eq('id', formModal.data.id)
            .select()
            .single();

        if (error) throw error;
        
        // Actualizar estado local preservando tags
        setCocktails(prev => prev.map(c => 
            c.id === formModal.data?.id 
            ? { ...c, ...data, search_tags: c.search_tags, main_liquor: c.main_liquor } 
            : c
        ));
        
        setModals(m => ({ 
            ...m, 
            feedback: { isOpen: true, type: 'success', title: 'Actualizado', message: 'Coctel actualizado correctamente.' } 
        }));

      } else {
        // MODO CREACIÓN
        const { data, error } = await supabase
            .from('catalog_cocktails')
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        // Añadir manual search_tags para evitar error de tipos
        const newCocktail: CocktailWithTags = { 
            ...data, 
            search_tags: [], 
            main_liquor: 'Otro' 
        };
        
        setCocktails(prev => [...prev, newCocktail].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedCocktailId(data.id);
        
        setModals(m => ({ 
            ...m, 
            feedback: { isOpen: true, type: 'success', title: 'Creado', message: 'Coctel creado correctamente.' } 
        }));
      }

      setFormModal({ isOpen: false, data: null });

    } catch (err: any) {
      setModals(m => ({ 
          ...m, 
          feedback: { isOpen: true, type: 'error', title: 'Error', message: err.message || 'Error al guardar.' } 
      }));
    } finally { 
        setSavingCocktail(false); 
    }
  };

  const handleDeleteCocktail = (id: string) => {
      setModals(m => ({
          ...m, 
          confirm: { 
              isOpen: true, 
              title: '¿Eliminar Coctel?', 
              message: 'Esta acción borrará el coctel y su receta permanentemente.', 
              isDangerous: true, 
              onConfirm: async () => {
                  const { error } = await supabase.from('catalog_cocktails').delete().eq('id', id);
                  if (!error) { 
                      setCocktails(prev => prev.filter(c => c.id !== id)); 
                      if(selectedCocktailId === id) setSelectedCocktailId(null); 
                  }
              }
          }
      }));
  };

  // --- HANDLERS INGREDIENTES ---
  const handleCreateIngredient = async (e: React.FormEvent, d: any) => { 
      const { data } = await supabase.from('catalog_ingredients').insert({...d, unit: d.measurement_unit}).select().single(); 
      if(data) setIngredients(p => [...p, data]); 
  };
  const handleEditIngredient = async (e: React.FormEvent, d: any, id: string) => { 
      const { data } = await supabase.from('catalog_ingredients').update({...d, unit: d.measurement_unit}).eq('id', id).select().single(); 
      if(data) setIngredients(p => p.map(i => i.id === id ? data : i)); 
  };
  const handleDeleteIngredient = async (id: string) => { 
      const { error } = await supabase.from('catalog_ingredients').delete().eq('id', id); 
      if(!error) setIngredients(p => p.filter(i => i.id !== id)); 
  };

  // --- HANDLERS RECETA ---
  const handleAddToRecipe = async (ingId: string) => {
      if(!selectedCocktailId) return;
      const { data } = await supabase
        .from('cocktail_recipes')
        .insert({ cocktail_id: selectedCocktailId, ingredient_id: ingId, quantity: 1, is_garnish: false, unit: 'oz' })
        .select('*, ingredient:catalog_ingredients(*)')
        .single();
      
      if(data) setCurrentRecipe(p => [...p, { ...data, ingredient: data.ingredient as unknown as Ingredient }]);
  };

  const handleUpdateRecipeQty = async (id: string, qty: number) => { 
      setCurrentRecipe(p => p.map(i => i.id === id ? { ...i, quantity: qty } : i)); 
      await supabase.from('cocktail_recipes').update({ quantity: qty }).eq('id', id); 
  };
  const handleUpdateRecipeUnit = async (id: string, unit: string) => { 
      setCurrentRecipe(p => p.map(i => i.id === id ? { ...i, unit: unit } : i)); 
      await supabase.from('cocktail_recipes').update({ unit: unit }).eq('id', id); 
  };
  const handleDeleteRecipeItem = async (id: string) => { 
      setCurrentRecipe(p => p.filter(i => i.id !== id)); 
      await supabase.from('cocktail_recipes').delete().eq('id', id); 
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>;

  return (
    <div className="relative animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-auto lg:h-[85vh]">
        
        {/* LISTA IZQUIERDA */}
        <CocktailList 
          cocktails={cocktails} 
          selectedId={selectedCocktailId} 
          onSelect={setSelectedCocktailId} 
          searchTerm={searchTerm} 
          onSearchChange={setSearchTerm} 
          filterLiquor={filterLiquor} 
          onFilterLiquorChange={setFilterLiquor}
          isAdmin={isSuperAdmin} 
          onNewClick={() => setFormModal({ isOpen: true, data: null })} 
        />

        {/* TABLA DERECHA */}
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
          onOpenCatalog={() => setModals(m => ({ ...m, ingredients: true }))} 
          onOpenInstructions={() => setModals(m => ({ ...m, instructions: true }))}
          // Esta prop es necesaria (asegúrate que RecipeTable la acepte en su interface)
          onEditCocktail={() => setFormModal({ 
            isOpen: true, 
            data: cocktails.find(c => c.id === selectedCocktailId) || null 
          })}
        />
      </div>

      {/* MODALES UNIFICADOS */}
      <CocktailFormModal 
        isOpen={formModal.isOpen} 
        onClose={() => setFormModal({ ...formModal, isOpen: false })} 
        onSave={handleSaveCocktail} 
        isSaving={savingCocktail} 
        initialData={formModal.data} 
      />
      
      <IngredientManagerModal 
        isOpen={modals.ingredients} 
        onClose={() => setModals(m => ({...m, ingredients: false}))} 
        ingredients={ingredients} 
        onAdd={handleCreateIngredient} 
        onEdit={handleEditIngredient} 
        onDelete={handleDeleteIngredient} 
      />
      
      <CocktailInstructionsModal 
        isOpen={modals.instructions} 
        onClose={() => setModals(m => ({...m, instructions: false}))} 
        cocktail={cocktails.find(c => c.id === selectedCocktailId) || null} 
        recipe={currentRecipe} 
        isAdmin={isSuperAdmin} 
        onSaveInstructions={async (inst) => { 
            await supabase.from('catalog_cocktails').update({ instructions: inst }).eq('id', selectedCocktailId); 
            setCocktails(p => p.map(c => c.id === selectedCocktailId ? { ...c, instructions: inst } : c)); 
        }} 
      />
      
      <FeedbackModal 
        {...modals.feedback} 
        onClose={() => setModals(m => ({ ...m, feedback: { ...m.feedback, isOpen: false } }))} 
      />
      
      <ConfirmationModal 
        {...modals.confirm} 
        onClose={() => setModals(m => ({ ...m, confirm: { ...m.confirm, isOpen: false } }))} 
      />
    </div>
  );
}