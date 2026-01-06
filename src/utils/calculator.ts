import type { Event, RecipeItem, Ingredient } from '@/types';
import { calculatePurchaseRequirement } from '@/utils/conversions';

export interface CalculationResult {
  ingredientId: string;
  ingredientName: string;
  category: string;
  totalQuantity: number;
  purchaseUnit: string;
  details: string;
}

export interface CalculationParams {
  event: Event;
  recipes: RecipeItem[];
  ingredients: Ingredient[];
  settings: {
    hours: number;
    consumptionRate: number;
    safetyMargin: number;
    distribution?: Record<string, number>;
    extraIceBags?: number; 
  };
}

export function generateShoppingList({
  event,
  recipes,
  ingredients,
  settings
}: CalculationParams): CalculationResult[] {
  
  // Array de resultados
  const results: CalculationResult[] = [];
  const totalsMap = new Map<string, number>();

  // --- LÓGICA DE COCTELES ---
  if (event.cocktails_selected && event.cocktails_selected.length > 0) {
    const totalDrinksEstimated = event.guest_count * settings.hours * settings.consumptionRate;
    
    event.cocktails_selected.forEach(cocktailId => {
      let drinksForThisCocktail = 0;

      // Calculamos tragos por coctel según distribución
      if (settings.distribution && typeof settings.distribution[cocktailId] === 'number') {
        const percent = settings.distribution[cocktailId];
        drinksForThisCocktail = totalDrinksEstimated * (percent / 100);
      } else {
        drinksForThisCocktail = totalDrinksEstimated / event.cocktails_selected!.length;
      }

      // Buscamos las recetas
      const cocktailRecipeItems = recipes.filter(r => r.cocktail_id === cocktailId);

      cocktailRecipeItems.forEach(item => {
        const ingredient = ingredients.find(i => i.id === item.ingredient_id);
        if (!ingredient) return;

        const quantityNeeded = calculatePurchaseRequirement(
          item.quantity,
          item.unit,
          drinksForThisCocktail,
          {
            package_volume: ingredient.package_volume,
            measurement_unit: ingredient.measurement_unit,
            yield_pieces: ingredient.yield_pieces
          }
        );

        const currentTotal = totalsMap.get(item.ingredient_id) || 0;
        totalsMap.set(item.ingredient_id, currentTotal + quantityNeeded);
      });
    });

    // --- PROCESAR RESULTADOS Y APLICAR REDONDEO ---
    totalsMap.forEach((qty, ingredientId) => {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (!ingredient) return;

      const rawQty = qty * settings.safetyMargin;
      
      // LOGICA DE REDONDEO SOLICITADA:
      // Si la unidad es 'kg' (o contiene 'kg'), mantenemos decimales.
      // Si no (botellas, paquetes, etc.), redondeamos al entero superior (techo).
      const isWeight = ingredient.purchase_unit.toLowerCase().includes('kg');
      
      let finalQty = 0;
      let displayQty = '';

      if (isWeight) {
        // Kilos: Mantenemos hasta 2 decimales para precisión
        finalQty = Number(rawQty.toFixed(2));
        displayQty = finalQty.toString(); 
      } else {
        // Otros: Redondeo hacia arriba (Math.ceil) para asegurar que no falte insumo
        // Ej: 3.1 botellas -> Compras 4 botellas
        finalQty = Math.ceil(rawQty);
        displayQty = finalQty.toString();
      }

      results.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        totalQuantity: finalQty,
        purchaseUnit: ingredient.purchase_unit,
        details: `${displayQty} ${ingredient.purchase_unit}(s)`
      });
    });
  }

  // --- LÓGICA DE HIELO (SIEMPRE SE CALCULA SI HAY INVITADOS) ---
  if (event.guest_count > 0) {
    const baseIceBags = Math.ceil(event.guest_count / 4);
    const totalIceBags = baseIceBags + (settings.extraIceBags || 0);

    results.push({
      ingredientId: 'ice-auto-generated',
      ingredientName: 'Hielo (Bolsa 3kg)',
      category: 'hielo',
      totalQuantity: totalIceBags,
      purchaseUnit: 'bolsa 3kg',
      details: `${totalIceBags} bolsa(s)`
    });
  }

  return results.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}