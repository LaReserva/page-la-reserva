// src/utils/conversions.ts

export const UNIT_OPTIONS = [
  { value: 'ml', label: 'ml', toBase: 1 },
  { value: 'oz', label: 'oz', toBase: 29.5735 },
  { value: 'cl', label: 'cl', toBase: 10 },
  { value: 'dash', label: 'dash', toBase: 0.8 }, // Aproximado
  { value: 'gr', label: 'gr', toBase: 1 },
  { value: 'kg', label: 'kg', toBase: 1000 },
  { value: 'pieza', label: 'pieza/u', toBase: 1 }, // Especial para garnish
];

export function convertToBase(qty: number, unit: string): number {
  const factor = UNIT_OPTIONS.find(u => u.value === unit)?.toBase || 1;
  return qty * factor;
}

// Calcula cuántas unidades de compra (botellas/kgs) necesitas
export function calculatePurchaseRequirement(
  recipeQty: number, // Cantidad en receta (ej: 2)
  recipeUnit: string, // Unidad receta (ej: 'oz')
  totalCocktails: number,
  ingredient: {
    package_volume: number; // ej: 750
    measurement_unit: string; // ej: 'ml'
    yield_pieces?: number; // ej: 30
  }
) {
  // CASO 1: Garnish con rendimiento especial (ej: Naranja)
  if (ingredient.yield_pieces && ingredient.yield_pieces > 0 && recipeUnit === 'pieza') {
    // Total piezas necesarias / Piezas que trae el kilo
    const totalPieces = recipeQty * totalCocktails;
    return totalPieces / ingredient.yield_pieces; 
  }

  // CASO 2: Líquidos/Sólidos estándar (Ron, Azucar)
  const qtyPerCocktailBase = convertToBase(recipeQty, recipeUnit); // 2oz -> 59.14ml
  const totalVolumeNeeded = qtyPerCocktailBase * totalCocktails;
  
  // Si la botella es de 750ml: 5914ml / 750ml = 7.8 botellas
  return totalVolumeNeeded / (ingredient.package_volume || 1);
}