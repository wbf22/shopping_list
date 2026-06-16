const STORAGE_KEY = 'shoplist_data';

function defaultData() {
  return { recipes: [], stores: [], storePrices: [], shoppingLists: [] };
}

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultData();
  } catch {
    return defaultData();
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getRecipes() {
  return loadAll().recipes;
}

function getRecipe(id) {
  return getRecipes().find(r => r.id === id);
}

function saveRecipe(recipe) {
  const data = loadAll();
  const idx = data.recipes.findIndex(r => r.id === recipe.id);
  if (idx >= 0) data.recipes[idx] = recipe;
  else data.recipes.push(recipe);
  saveAll(data);
}

function deleteRecipe(id) {
  const data = loadAll();
  data.recipes = data.recipes.filter(r => r.id !== id);
  data.storePrices = data.storePrices.filter(sp => {
    const recipe = data.recipes.find(r =>
      r.ingredients.some(i => i.name.toLowerCase() === sp.ingredientName.toLowerCase())
    );
    return recipe || true;
  });
  saveAll(data);
}

function getStores() {
  return loadAll().stores;
}

function getStore(id) {
  return getStores().find(s => s.id === id);
}

function saveStore(store) {
  const data = loadAll();
  const idx = data.stores.findIndex(s => s.id === store.id);
  if (idx >= 0) data.stores[idx] = store;
  else data.stores.push(store);
  saveAll(data);
}

function deleteStore(id) {
  const data = loadAll();
  data.stores = data.stores.filter(s => s.id !== id);
  data.storePrices = data.storePrices.filter(sp => sp.storeId !== id);
  saveAll(data);
}

function getStorePrices() {
  return loadAll().storePrices;
}

function getStorePricesForStore(storeId) {
  return getStorePrices().filter(sp => sp.storeId === storeId);
}

function saveStorePrice(price) {
  const data = loadAll();
  const idx = data.storePrices.findIndex(sp => sp.id === price.id);
  if (idx >= 0) data.storePrices[idx] = price;
  else data.storePrices.push(price);
  saveAll(data);
}

function deleteStorePrice(id) {
  const data = loadAll();
  data.storePrices = data.storePrices.filter(sp => sp.id !== id);
  saveAll(data);
}

function getActiveShoppingList() {
  const lists = loadAll().shoppingLists;
  return lists.length > 0 ? lists[lists.length - 1] : null;
}

function saveShoppingList(list) {
  const data = loadAll();
  const idx = data.shoppingLists.findIndex(l => l.id === list.id);
  if (idx >= 0) data.shoppingLists[idx] = list;
  else data.shoppingLists.push(list);
  saveAll(data);
}

function deleteShoppingList(id) {
  const data = loadAll();
  data.shoppingLists = data.shoppingLists.filter(l => l.id !== id);
  saveAll(data);
}

function getAllIngredientNames() {
  const names = new Set();
  getRecipes().forEach(r =>
    r.ingredients.forEach(i => {
      if (i.name) names.add(i.name.toLowerCase());
    })
  );
  getStorePrices().forEach(sp => {
    if (sp.ingredientName) names.add(sp.ingredientName.toLowerCase());
  });
  return [...names].sort();
}

function getStoreRecommendation(ingredientName) {
  const prices = getStorePrices().filter(sp =>
    sp.ingredientName.toLowerCase() === ingredientName.toLowerCase()
  );
  if (prices.length === 0) return null;
  prices.sort((a, b) => a.price - b.price);
  const best = prices[0];
  const store = getStore(best.storeId);
  return {
    storeId: best.storeId,
    storeName: store ? store.name : 'Unknown',
    price: best.price,
    unit: best.unit,
    options: prices.map(p => ({
      storeId: p.storeId,
      storeName: (getStore(p.storeId) || {}).name || 'Unknown',
      price: p.price,
      unit: p.unit,
      priceId: p.id
    }))
  };
}
