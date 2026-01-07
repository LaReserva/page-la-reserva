import type { Event, RecipeItem, Ingredient } from '@/types';
import { calculatePurchaseRequirement } from '@/utils/conversions';

export interface CalculationResult {
  ingredientId: string;
  ingredientName: string;
  category: string;
  totalQuantity: number;
  purchaseUnit: string;
  details: string;
  price: number;
  totalCost: number;
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
  
  const results: CalculationResult[] = [];
  const totalsMap = new Map<string, number>();

  // --- 1. CALCULAR CANTIDADES TOTALES ---
  if (event.cocktails_selected && event.cocktails_selected.length > 0) {
    const totalDrinksEstimated = event.guest_count * settings.hours * settings.consumptionRate;
    
    event.cocktails_selected.forEach(cocktailId => {
      let drinksForThisCocktail = 0;

      if (settings.distribution && typeof settings.distribution[cocktailId] === 'number') {
        const percent = settings.distribution[cocktailId];
        drinksForThisCocktail = totalDrinksEstimated * (percent / 100);
      } else {
        drinksForThisCocktail = totalDrinksEstimated / event.cocktails_selected!.length;
      }

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

    // --- 2. PROCESAR Y CALCULAR COSTOS ---
    totalsMap.forEach((qty, ingredientId) => {
      const ingredient = ingredients.find(i => i.id === ingredientId);
      if (!ingredient) return;

      const rawQty = qty * settings.safetyMargin;
      const isWeight = ingredient.purchase_unit.toLowerCase().includes('kg');
      
      let finalQty = 0;
      let displayQty = '';

      if (isWeight) {
        finalQty = Number(rawQty.toFixed(2));
        displayQty = finalQty.toString(); 
      } else {
        finalQty = Math.ceil(rawQty);
        displayQty = finalQty.toString();
      }

      // --- CORRECCIÓN FINAL AQUÍ ---
      // Leemos explícitamente 'estimated_price'.
      // Usamos (ingredient as any) por si acaso no has actualizado el types.ts todavía,
      // pero idealmente TypeScript ya sabrá que existe.
      const dbPrice = (ingredient as any).estimated_price || 0;
      
      // Cálculo del costo total por línea
      const totalCost = Number((finalQty * dbPrice).toFixed(2));

      if (dbPrice === 0) {
        // Warning útil para desarrollo
        console.warn(`Aviso: El insumo "${ingredient.name}" tiene precio 0 (estimated_price).`);
      }

      results.push({
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        category: ingredient.category,
        totalQuantity: finalQty,
        purchaseUnit: ingredient.purchase_unit,
        details: `${displayQty} ${ingredient.purchase_unit}(s)`,
        price: dbPrice,      // Aquí guardamos el precio unitario
        totalCost: totalCost // Aquí el total
      });
    });
  }

  // --- 3. LÓGICA DE HIELO ---
  if (event.guest_count > 0) {
    const baseIceBags = Math.ceil(event.guest_count / 4);
    const totalIceBags = baseIceBags + (settings.extraIceBags || 0);
    
    // Precio FIJO del hielo
    const icePrice = 5.00; 
    const iceTotalCost = totalIceBags * icePrice;

    results.push({
      ingredientId: 'ice-auto-generated',
      ingredientName: 'Hielo (Bolsa 3kg)',
      category: 'hielo',
      totalQuantity: totalIceBags,
      purchaseUnit: 'bolsa 3kg',
      details: `${totalIceBags} bolsa(s)`,
      price: icePrice,
      totalCost: iceTotalCost
    });
  }

  return results.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}