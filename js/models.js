const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];
const PRICES = ['$', '$$', '$$$'];

function uid() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return ts + rand;
}

function createRecipe(data = {}) {
  return {
    id: data.id || uid(),
    name: data.name || '',
    difficulty: DIFFICULTIES.includes(data.difficulty) ? data.difficulty : 'Easy',
    time: Math.max(0, parseInt(data.time) || 0),
    price: PRICES.includes(data.price) ? data.price : '$',
    instructions: data.instructions || '',
    ingredients: (data.ingredients || []).map(i => ({
      id: i.id || uid(),
      name: i.name || '',
      quantity: Math.max(0, parseFloat(i.quantity) || 0),
      unit: i.unit || ''
    }))
  };
}

function createStore(data = {}) {
  return {
    id: data.id || uid(),
    name: (data.name || '').trim()
  };
}

function createStorePrice(data = {}) {
  return {
    id: data.id || uid(),
    storeId: data.storeId || '',
    ingredientName: (data.ingredientName || '').trim().toLowerCase(),
    unit: data.unit || '',
    price: Math.max(0, parseFloat(data.price) || 0)
  };
}

function createShoppingItem(data = {}) {
  return {
    id: data.id || uid(),
    ingredientName: (data.ingredientName || '').trim(),
    quantity: Math.max(0, parseFloat(data.quantity) || 0),
    unit: data.unit || '',
    recipeId: data.recipeId || null,
    recipeName: data.recipeName || null,
    checked: !!data.checked,
    order: parseInt(data.order) || 0,
    storeId: data.storeId || null,
    storeName: data.storeName || null,
    storePrice: data.storePrice != null ? parseFloat(data.storePrice) : null
  };
}

function createShoppingList(data = {}) {
  return {
    id: data.id || uid(),
    name: (data.name || 'Shopping List').trim(),
    createdAt: data.createdAt || new Date().toISOString(),
    items: (data.items || []).map(i => createShoppingItem(i))
  };
}

function validateRecipe(recipe) {
  const errors = [];
  if (!recipe.name.trim()) errors.push('Recipe name is required');
  if (recipe.ingredients.length === 0) errors.push('At least one ingredient is required');
  recipe.ingredients.forEach((ing, i) => {
    if (!ing.name.trim()) errors.push(`Ingredient ${i + 1} name is required`);
    if (ing.quantity <= 0) errors.push(`Ingredient ${i + 1} quantity must be positive`);
  });
  return errors;
}

function validateStore(store) {
  const errors = [];
  if (!store.name.trim()) errors.push('Store name is required');
  return errors;
}
