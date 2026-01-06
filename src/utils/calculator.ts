import type { Event, RecipeItem, Ingredient } from '@/types';
// CORRECCIÓN: Uso de alias absoluto como solicitaste
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
  };
}

export function generateShoppingList({
  event,
  recipes,
  ingredients,
  settings
}: CalculationParams): CalculationResult[] {
  
  if (!event.cocktails_selected || event.cocktails_selected.length === 0) return [];

  const totalDrinksEstimated = event.guest_count * settings.hours * settings.consumptionRate;
  const numberOfCocktails = event.cocktails_selected.length;
  const drinksPerCocktail = totalDrinksEstimated / numberOfCocktails;

  const totalsMap = new Map<string, number>();

  event.cocktails_selected.forEach(cocktailId => {
    const cocktailRecipeItems = recipes.filter(r => r.cocktail_id === cocktailId);

    cocktailRecipeItems.forEach(item => {
      const ingredient = ingredients.find(i => i.id === item.ingredient_id);
      if (!ingredient) return;

      const quantityNeeded = calculatePurchaseRequirement(
        item.quantity,
        item.unit,
        drinksPerCocktail,
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

  const results: CalculationResult[] = [];
  
  totalsMap.forEach((qty, ingredientId) => {
    const ingredient = ingredients.find(i => i.id === ingredientId);
    if (!ingredient) return;

    const finalQty = qty * settings.safetyMargin;

    results.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      category: ingredient.category,
      totalQuantity: Number(finalQty.toFixed(2)),
      purchaseUnit: ingredient.purchase_unit,
      details: `${finalQty.toFixed(1)} ${ingredient.purchase_unit}(s)`
    });
  });

  return results.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}