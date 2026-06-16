(function () {
  'use strict';

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  /* ============ ROUTER ============ */

  const content = document.getElementById('app-content');
  const titleEl = document.getElementById('app-title');

  function navigate(hash) {
    location.hash = hash;
  }

  function getRoute() {
    const hash = location.hash.slice(1) || '/recipes';
    const parts = hash.split('/').filter(Boolean);
    return { name: parts[0] || 'recipes', params: { id: parts[1] } };
  }

  function handleRoute() {
    const { name, params } = getRoute();
    titleEl.textContent = getTitle(name);

    $$('.nav-link').forEach(el => {
      el.classList.toggle('active', el.dataset.route === name);
    });

    const fn = views[name];
    if (fn) {
      content.innerHTML = fn(params);
    } else {
      navigate('#/recipes');
    }
  }

  function getTitle(name) {
    const map = {
      recipes: 'Recipes',
      'recipe-new': 'New Recipe',
      'recipe-edit': 'Edit Recipe',
      'recipe-view': 'Recipe',
      search: 'Search',
      shopping: 'Shopping List',
      'shopping-new': 'New List',
      stores: 'Stores',
      'store-new': 'New Store',
      'store-edit': 'Edit Store',
      'store-prices': 'Store Prices',
      export: 'Data',
      import: 'Import Data'
    };
    return map[name] || 'ShopList';
  }

  window.addEventListener('hashchange', handleRoute);
  window.addEventListener('load', handleRoute);

  /* ============ VIEWS ============ */

  const views = {};

  /* ----- RECIPES LIST ----- */

  views.recipes = function () {
    const recipes = getRecipes();
    if (recipes.length === 0) {
      return (
        '<div class="empty-state">' +
        '<p>No recipes yet. Add your first recipe!</p>' +
        '<button class="btn btn-primary" data-action="new-recipe">Add Recipe</button>' +
        '</div>' +
        '<button class="fab" data-action="new-recipe">+</button>'
      );
    }
    return (
      '<div class="recipes-grid">' +
      recipes.map(r => {
        const badgeClass = 'badge badge-' + r.difficulty.toLowerCase();
        return (
          '<div class="recipe-card" data-action="view-recipe" data-id="' + r.id + '">' +
          '<h3>' + esc(r.name) + '</h3>' +
          '<div class="recipe-meta">' +
          '<span class="' + badgeClass + '">' + r.difficulty + '</span>' +
          '<span>' + r.time + ' min</span>' +
          '<span class="badge badge-price">' + r.price + '</span>' +
          '</div>' +
          '<div class="recipe-ingredients-count">' +
          r.ingredients.length + ' ingredient' + (r.ingredients.length !== 1 ? 's' : '') +
          '</div>' +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<button class="fab" data-action="new-recipe">+</button>'
    );
  };

  /* ----- RECIPE FORM ----- */

  views['recipe-new'] = function () {
    return renderRecipeForm(null);
  };

  views['recipe-edit'] = function (params) {
    const recipe = getRecipe(params.id);
    return recipe ? renderRecipeForm(recipe) : views.recipes();
  };

  function renderRecipeForm(recipe) {
    const r = recipe || createRecipe({});
    const diffOpts = DIFFICULTIES.map(d =>
      '<option value="' + d + '"' + (r.difficulty === d ? ' selected' : '') + '>' + d + '</option>'
    ).join('');
    const priceOpts = PRICES.map(p =>
      '<option value="' + p + '"' + (r.price === p ? ' selected' : '') + '>' + p + '</option>'
    ).join('');

    const ingRows = r.ingredients.map((ing, i) =>
      '<div class="ingredient-row" data-idx="' + i + '">' +
      '<input type="number" name="ing-qty-' + i + '" value="' + ing.quantity + '" placeholder="Qty" step="any" min="0">' +
      '<input type="text" name="ing-unit-' + i + '" value="' + esc(ing.unit) + '" placeholder="Unit">' +
      '<input type="text" name="ing-name-' + i + '" value="' + esc(ing.name) + '" placeholder="Ingredient">' +
      '<button type="button" class="btn-remove" data-action="remove-ingredient" data-idx="' + i + '">&times;</button>' +
      '</div>'
    ).join('');

    return (
      '<div class="form-view">' +
      '<form data-action="save-recipe" data-id="' + (recipe ? r.id : '') + '">' +
      '<div class="form-group">' +
      '<label for="r-name">Name</label>' +
      '<input type="text" id="r-name" name="name" value="' + esc(r.name) + '" required>' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label for="r-diff">Difficulty</label>' +
      '<select id="r-diff" name="difficulty">' + diffOpts + '</select>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="r-time">Time (min)</label>' +
      '<input type="number" id="r-time" name="time" value="' + r.time + '" min="0">' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="r-price">Price</label>' +
      '<select id="r-price" name="price">' + priceOpts + '</select>' +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label for="r-instructions">Instructions</label>' +
      '<textarea id="r-instructions" name="instructions">' + esc(r.instructions) + '</textarea>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Ingredients</label>' +
      '<div class="ingredients-list" id="ingredients-list">' +
      (ingRows || '<p style="color:var(--text-muted);font-size:.85rem">No ingredients yet</p>') +
      '</div>' +
      '<button type="button" class="btn-add-row" data-action="add-ingredient-row">+ Add Ingredient</button>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-block">Save Recipe</button>' +
      '</form>' +
      '</div>'
    );
  }

  /* ----- RECIPE DETAIL ----- */

  views['recipe-view'] = function (params) {
    const r = getRecipe(params.id);
    if (!r) return views.recipes();

    const badgeClass = 'badge badge-' + r.difficulty.toLowerCase();

    const ingList = r.ingredients.length > 0
      ? '<ul class="detail-ingredients">' +
        r.ingredients.map(i =>
          '<li><span>' + esc(i.name) + '</span><span>' + i.quantity + ' ' + esc(i.unit) + '</span></li>'
        ).join('') +
        '</ul>'
      : '';

    const instList = r.instructions.trim()
      ? '<ol class="detail-instructions">' +
        r.instructions.split('\n').filter(l => l.trim()).map(line =>
          '<li>' + esc(line.trim()) + '</li>'
        ).join('') +
        '</ol>'
      : '';

    return (
      '<div class="recipe-detail">' +
      '<h2>' + esc(r.name) + '</h2>' +
      '<div class="detail-meta">' +
      '<span class="' + badgeClass + '">' + r.difficulty + '</span>' +
      '<span class="badge badge-price">' + r.price + '</span>' +
      '<span style="font-size:.85rem;color:var(--text-secondary)">' + r.time + ' min</span>' +
      '</div>' +
      (ingList
        ? '<div class="detail-section"><h3>Ingredients</h3>' + ingList + '</div>'
        : '') +
      (instList
        ? '<div class="detail-section"><h3>Instructions</h3>' + instList + '</div>'
        : '') +
      '<div class="detail-actions">' +
      '<button class="btn btn-secondary" data-action="edit-recipe" data-id="' + r.id + '">Edit</button>' +
      '<button class="btn btn-danger" data-action="delete-recipe" data-id="' + r.id + '">Delete</button>' +
      '</div>' +
      '</div>'
    );
  };

  /* ----- SEARCH ----- */

  views.search = function () {
    return (
      '<div class="search-filters">' +
      '<div class="form-group">' +
      '<input type="text" id="search-input" placeholder="Search recipes by name..." data-action="search-recipes">' +
      '</div>' +
      '<div class="form-row">' +
      '<div class="form-group">' +
      '<label>Difficulty</label>' +
      '<div class="filter-group" data-filter="difficulty">' +
      DIFFICULTIES.map(d =>
        '<span class="filter-chip" data-value="' + d + '">' + d + '</span>'
      ).join('') +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Price</label>' +
      '<div class="filter-group" data-filter="price">' +
      PRICES.map(p =>
        '<span class="filter-chip" data-value="' + p + '">' + p + '</span>'
      ).join('') +
      '</div>' +
      '</div>' +
      '<div class="form-group">' +
      '<label>Max Time</label>' +
      '<input type="number" id="search-time" placeholder="Minutes" min="0" data-action="search-recipes">' +
      '</div>' +
      '</div>' +
      '</div>' +
      '<div class="search-results" id="search-results">' +
      '<p style="color:var(--text-muted);text-align:center;padding:40px 0">Enter a search term or select filters</p>' +
      '</div>'
    );
  };

  function performSearch() {
    const query = ($('#search-input') || {}).value || '';
    const maxTime = parseInt(($('#search-time') || {}).value) || 0;
    const diffChips = $$('.filter-group[data-filter="difficulty"] .filter-chip.active').map(el => el.dataset.value);
    const priceChips = $$('.filter-group[data-filter="price"] .filter-chip.active').map(el => el.dataset.value);

    let results = getRecipes();

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      results = results.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.ingredients.some(i => i.name.toLowerCase().includes(q)) ||
        r.instructions.toLowerCase().includes(q)
      );
    }

    if (diffChips.length > 0) {
      results = results.filter(r => diffChips.includes(r.difficulty));
    }

    if (priceChips.length > 0) {
      results = results.filter(r => priceChips.includes(r.price));
    }

    if (maxTime > 0) {
      results = results.filter(r => r.time <= maxTime);
    }

    const container = document.getElementById('search-results');
    if (!container) return;

    if (results.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0">No recipes match your filters</p>';
      return;
    }

    container.innerHTML = (
      '<p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">' +
      results.length + ' result' + (results.length !== 1 ? 's' : '') + '</p>' +
      '<div class="recipes-grid" style="padding:0">' +
      results.map(r => {
        const badgeClass = 'badge badge-' + r.difficulty.toLowerCase();
        return (
          '<div class="recipe-card" data-action="view-recipe" data-id="' + r.id + '">' +
          '<h3>' + esc(r.name) + '</h3>' +
          '<div class="recipe-meta">' +
          '<span class="' + badgeClass + '">' + r.difficulty + '</span>' +
          '<span>' + r.time + ' min</span>' +
          '<span class="badge badge-price">' + r.price + '</span>' +
          '</div>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  /* ----- SHOPPING LIST ----- */

  views.shopping = function () {
    const list = getActiveShoppingList();

    if (!list || list.items.length === 0) {
      return (
        '<div class="empty-state">' +
        '<p>No shopping list yet</p>' +
        '<button class="btn btn-primary" data-action="new-shopping-list">Create Shopping List</button>' +
        '</div>'
      );
    }

    const sorted = [...list.items].sort((a, b) => a.order - b.order);

    return (
      '<div class="view-padded">' +
      '<div class="list-header">' +
      '<h2>' + esc(list.name) + '</h2>' +
      '<button class="btn btn-sm btn-secondary" data-action="new-shopping-list">New List</button>' +
      '</div>' +
      '<div class="shopping-items" id="shopping-items">' +
      sorted.map(item => {
        const rec = getStoreRecommendation(item.ingredientName);
        const storeTag = rec
          ? '<span class="item-store">' + esc(rec.storeName) + ' $' + rec.price.toFixed(2) + '</span>'
          : '';
        return (
          '<div class="shopping-item' + (item.checked ? ' checked' : '') + '" draggable="true" data-item-id="' + item.id + '">' +
          '<span class="drag-handle">&#x22EF;&#x22EF;</span>' +
          '<input type="checkbox" data-action="toggle-item" data-id="' + item.id + '" ' + (item.checked ? 'checked' : '') + '>' +
          '<span class="item-name">' + esc(item.ingredientName) + '</span>' +
          '<span class="item-qty">' + item.quantity + esc(item.unit) + '</span>' +
          storeTag +
          '<button class="item-delete" data-action="delete-item" data-id="' + item.id + '" aria-label="Remove item">&times;</button>' +
          '</div>'
        );
      }).join('') +
      '</div>' +
      '<form class="add-item-form" data-action="add-item">' +
      '<input type="text" name="item-name" placeholder="Item name" required>' +
      '<input type="number" name="item-qty" placeholder="Qty" step="any" min="0">' +
      '<input type="text" name="item-unit" placeholder="Unit">' +
      '<button type="submit" class="btn btn-primary btn-sm">Add</button>' +
      '</form>' +
      '</div>'
    );
  };

  /* ----- NEW SHOPPING LIST (select recipes) ----- */

  views['shopping-new'] = function () {
    const recipes = getRecipes();
    if (recipes.length === 0) {
      return (
        '<div class="empty-state">' +
        '<p>Add some recipes first, then create a shopping list.</p>' +
        '<button class="btn btn-primary" data-action="new-recipe">Add Recipe</button>' +
        '</div>'
      );
    }

    return (
      '<div class="view-padded">' +
      '<p style="font-size:.9rem;color:var(--text-secondary);margin-bottom:16px">Select recipes to include in your shopping list:</p>' +
      '<div class="recipe-select-list" id="recipe-select-list">' +
      recipes.map(r =>
        '<label class="recipe-select-item">' +
        '<input type="checkbox" data-recipe-id="' + r.id + '">' +
        '<div class="recipe-info">' +
        '<h4>' + esc(r.name) + '</h4>' +
        '<span>' + r.ingredients.length + ' ingredient' + (r.ingredients.length !== 1 ? 's' : '') + '</span>' +
        '</div>' +
        '</label>'
      ).join('') +
      '</div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:16px" data-action="generate-list">Generate Shopping List</button>' +
      '</div>'
    );
  };

  function generateShoppingList() {
    const checked = $$('#recipe-select-list input[type="checkbox"]:checked');
    if (checked.length === 0) {
      alert('Select at least one recipe.');
      return;
    }

    const allItems = [];
    const ingredientMap = {};

    checked.forEach(cb => {
      const recipe = getRecipe(cb.dataset.recipeId);
      if (!recipe) return;
      recipe.ingredients.forEach(ing => {
        if (!ing.name) return;
        const key = ing.name.toLowerCase() + '|' + ing.unit;
        if (ingredientMap[key]) {
          ingredientMap[key].quantity += ing.quantity;
        } else {
          ingredientMap[key] = {
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            recipeId: recipe.id,
            recipeName: recipe.name,
            order: allItems.length
          };
          allItems.push(ingredientMap[key]);
        }
      });
    });

    const list = createShoppingList({
      name: 'Shopping List',
      items: allItems.map((item, idx) => ({
        ...item,
        order: idx
      }))
    });

    saveShoppingList(list);
    navigate('#/shopping');
  }

  /* ----- STORES LIST ----- */

  views.stores = function () {
    const stores = getStores();
    return (
      '<div class="view-padded">' +
      (stores.length === 0
        ? '<div class="empty-state"><p>No stores yet</p></div>'
        : '<div class="store-list">' +
          stores.map(s => {
            const count = getStorePricesForStore(s.id).length;
            return (
              '<div class="store-card" data-action="view-store-prices" data-id="' + s.id + '">' +
              '<span class="store-name">' + esc(s.name) + '</span>' +
              '<span class="store-count">' + count + ' price' + (count !== 1 ? 's' : '') + '</span>' +
              '</div>'
            );
          }).join('') +
          '</div>'
      ) +
      '<button class="fab" data-action="new-store">+</button>' +
      '</div>'
    );
  };

  /* ----- STORE FORM ----- */

  views['store-new'] = function () {
    return renderStoreForm(null);
  };

  views['store-edit'] = function (params) {
    const store = getStore(params.id);
    return store ? renderStoreForm(store) : views.stores();
  };

  function renderStoreForm(store) {
    return (
      '<div class="form-view">' +
      '<form data-action="save-store" data-id="' + (store ? store.id : '') + '">' +
      '<div class="form-group">' +
      '<label for="s-name">Store Name</label>' +
      '<input type="text" id="s-name" name="name" value="' + (store ? esc(store.name) : '') + '" required>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-block">Save Store</button>' +
      '</form>' +
      (store
        ? '<button class="btn btn-danger btn-block" style="margin-top:12px" data-action="delete-store" data-id="' + store.id + '">Delete Store</button>'
        : '') +
      '</div>'
    );
  }

  /* ----- STORE PRICES ----- */

  views['store-prices'] = function (params) {
    const store = getStore(params.id);
    if (!store) return views.stores();

    const prices = getStorePricesForStore(store.id);
    const ingredientNames = getAllIngredientNames();
    const datalistId = 'ingredients-datalist';
    const datalistOpts = ingredientNames.map(n =>
      '<option value="' + esc(n) + '">'
    ).join('');

    return (
      '<div class="view-padded">' +
      '<div class="list-header">' +
      '<h2>' + esc(store.name) + '</h2>' +
      '<button class="btn btn-sm btn-secondary" data-action="edit-store" data-id="' + store.id + '">Edit</button>' +
      '</div>' +
      (prices.length > 0
        ? '<div class="price-list">' +
          prices.map(p =>
            '<div class="price-row">' +
            '<span class="price-ingredient">' + esc(p.ingredientName) + '</span>' +
            '<span class="price-value">' + esc(p.unit) + ' &ndash; $' + p.price.toFixed(2) + '</span>' +
            '<button class="btn-remove" data-action="delete-price" data-id="' + p.id + '">&times;</button>' +
            '</div>'
          ).join('') +
          '</div>'
        : '<p style="color:var(--text-muted);font-size:.9rem;margin-bottom:16px">No prices set yet</p>'
      ) +
      '<form class="price-form" data-action="save-price" data-store-id="' + store.id + '">' +
      '<input type="text" name="ingredient" placeholder="Ingredient" list="' + datalistId + '" required>' +
      '<datalist id="' + datalistId + '">' + datalistOpts + '</datalist>' +
      '<input type="text" name="unit" placeholder="Unit (e.g. 500g)">' +
      '<input type="number" name="price" placeholder="Price $" step="0.01" min="0" required>' +
      '<button type="submit" class="btn btn-primary btn-sm">Add</button>' +
      '</form>' +
      '</div>'
    );
  };

  /* ----- EXPORT / IMPORT ----- */

  views.export = function () {
    return (
      '<div class="export-section">' +
      '<h2>Export</h2>' +
      '<p>Download or share your data as a single markdown file.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-primary" data-action="export-data">Download</button>' +
      '<button class="btn btn-secondary" data-action="share-data">Share Link</button>' +
      '<button class="btn btn-secondary" data-action="copy-link">Copy Link</button>' +
      '</div>' +
      '<h2>Import</h2>' +
      '<p>Import data from a previously exported markdown file. This will replace all current data.</p>' +
      '<input type="file" accept=".md,.markdown,.txt" id="import-file" style="margin-bottom:12px">' +
      '<div id="import-preview"></div>' +
      '</div>'
    );
  };

  /* ----- IMPORT FROM LINK ----- */

  views.import = function (params) {
    if (!params.id) {
      navigate('#/export');
      return '';
    }
    setTimeout(function () {
      processImportLink(params.id);
    }, 50);
    return '<div class="empty-state"><p>Processing share link...</p></div>';
  };

  function processImportLink(data) {
    decodeShareData(data).then(function (md) {
      const parsed = parseMarkdown(md);
      showImportPreview(parsed);
    }).catch(function (err) {
      content.innerHTML = '<div class="empty-state"><p>Failed to import: ' + esc(err.message) + '</p></div>';
    });
  }

  function showImportPreview(data) {
    const recipeCount = data.recipes.length;
    const storeCount = data.stores.length;
    const priceCount = data.storePrices.length;
    const listCount = data.shoppingLists.length;

    content.innerHTML =
      '<div class="export-section">' +
      '<h2>Import Preview</h2>' +
      '<div class="import-preview" id="import-preview">' +
      '<ul>' +
      '<li>' + recipeCount + ' recipe' + (recipeCount !== 1 ? 's' : '') + '</li>' +
      '<li>' + storeCount + ' store' + (storeCount !== 1 ? 's' : '') + '</li>' +
      '<li>' + priceCount + ' store price' + (priceCount !== 1 ? 's' : '') + '</li>' +
      '<li>' + listCount + ' shopping list' + (listCount !== 1 ? 's' : '') + '</li>' +
      '</ul>' +
      '<button class="btn btn-primary btn-block" data-action="confirm-import" style="margin-top:12px">Confirm Import</button>' +
      '</div>' +
      '</div>';

    const preview = document.getElementById('import-preview');
    if (preview) preview._importData = data;
  }

  /* ============ EVENT DELEGATION ============ */

  content.addEventListener('click', function (e) {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    const value = target.dataset.value;
    const idx = target.dataset.idx;

    switch (action) {
      case 'new-recipe':
        navigate('#/recipe-new');
        break;

      case 'view-recipe':
        navigate('#/recipe-view/' + id);
        break;

      case 'edit-recipe':
        navigate('#/recipe-edit/' + id);
        break;

      case 'delete-recipe':
        if (confirm('Delete this recipe?')) {
          deleteRecipe(id);
          navigate('#/recipes');
        }
        break;

      case 'remove-ingredient':
        if (idx !== undefined) {
          const list = document.getElementById('ingredients-list');
          const row = list.querySelector('[data-idx="' + idx + '"]');
          if (row) row.remove();
          reindexIngredients();
        }
        break;

      case 'add-ingredient-row':
        addIngredientRow();
        break;

      case 'new-shopping-list':
        navigate('#/shopping-new');
        break;

      case 'generate-list':
        generateShoppingList();
        break;

      case 'toggle-item': {
        const list = getActiveShoppingList();
        if (!list) return;
        const item = list.items.find(i => i.id === id);
        if (item && target.tagName === 'INPUT') {
          item.checked = target.checked;
          saveShoppingList(list);
          handleRoute();
        }
        break;
      }

      case 'delete-item': {
        const list = getActiveShoppingList();
        if (!list) return;
        list.items = list.items.filter(i => i.id !== id);
        saveShoppingList(list);
        handleRoute();
        break;
      }

      case 'new-store':
        navigate('#/store-new');
        break;

      case 'edit-store':
        navigate('#/store-edit/' + id);
        break;

      case 'delete-store':
        if (confirm('Delete this store and all its prices?')) {
          deleteStore(id);
          navigate('#/stores');
        }
        break;

      case 'view-store-prices':
        navigate('#/store-prices/' + id);
        break;

      case 'delete-price':
        if (confirm('Delete this price?')) {
          deleteStorePrice(id);
          handleRoute();
        }
        break;

      case 'export-data':
        downloadMarkdown();
        break;

      case 'share-data':
        shareMarkdown().catch(function () {
          alert('Could not share. Try Copy Link instead.');
        });
        break;

      case 'copy-link':
        copyShareLink().then(function () {
          const btn = document.querySelector('[data-action="copy-link"]');
          if (btn) {
            const orig = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(function () { btn.textContent = orig; }, 2000);
          }
        }).catch(function () {
          alert('Could not copy link.');
        });
        break;

      case 'confirm-import':
        confirmImport();
        break;

      case 'search-recipes':
        performSearch();
        break;
    }
  });

  /* Filter chips */
  content.addEventListener('click', function (e) {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    chip.classList.toggle('active');
    performSearch();
  });

  /* Form submissions */
  content.addEventListener('submit', function (e) {
    e.preventDefault();
    const form = e.target.closest('[data-action]');
    if (!form) return;
    const action = form.dataset.action;

    switch (action) {
      case 'save-recipe':
        handleSaveRecipe(form);
        break;

      case 'save-store':
        handleSaveStore(form);
        break;

      case 'save-price':
        handleSavePrice(form);
        break;

      case 'add-item':
        handleAddItem(form);
        break;
    }
  });

  /* Live search input */
  content.addEventListener('input', function (e) {
    if (e.target.dataset.action === 'search-recipes') {
      performSearch();
    }
  });

  /* File import change */
  content.addEventListener('change', function (e) {
    if (e.target.id === 'import-file') {
      handleImportFile();
    }
  });

  /* ============ HANDLERS ============ */

  function handleSaveRecipe(form) {
    const id = form.dataset.id;
    const fd = new FormData(form);

    const ingredients = [];
    const ingRows = $$('.ingredient-row', form);
    ingRows.forEach(row => {
      const i = parseInt(row.dataset.idx);
      const qty = parseFloat(fd.get('ing-qty-' + i)) || 0;
      const unit = (fd.get('ing-unit-' + i) || '').trim();
      const name = (fd.get('ing-name-' + i) || '').trim();
      if (name && qty > 0) {
        ingredients.push({ name, quantity: qty, unit });
      }
    });

    const recipeData = {
      name: fd.get('name').trim(),
      difficulty: fd.get('difficulty'),
      time: parseInt(fd.get('time')) || 0,
      price: fd.get('price'),
      instructions: fd.get('instructions').trim(),
      ingredients
    };

    const recipe = createRecipe(recipeData);
    if (id) recipe.id = id;

    const errors = validateRecipe(recipe);
    if (errors.length > 0) {
      alert('Please fix:\n- ' + errors.join('\n- '));
      return;
    }

    saveRecipe(recipe);
    navigate('#/recipes');
  }

  function handleSaveStore(form) {
    const id = form.dataset.id;
    const fd = new FormData(form);
    const name = fd.get('name').trim();

    if (!name) { alert('Store name is required.'); return; }

    const store = createStore({ name });
    if (id) store.id = id;

    saveStore(store);
    navigate('#/stores');
  }

  function handleSavePrice(form) {
    const storeId = form.dataset.storeId;
    const fd = new FormData(form);
    const ingredient = fd.get('ingredient').trim();
    const unit = fd.get('unit').trim();
    const price = parseFloat(fd.get('price'));

    if (!ingredient || isNaN(price) || price <= 0) {
      alert('Enter ingredient name and valid price.');
      return;
    }

    const sp = createStorePrice({ storeId, ingredientName: ingredient, unit, price });
    saveStorePrice(sp);
    form.reset();
    handleRoute();
  }

  function handleAddItem(form) {
    const list = getActiveShoppingList();
    if (!list) return;

    const fd = new FormData(form);
    const name = fd.get('item-name').trim();
    const qty = parseFloat(fd.get('item-qty')) || 0;
    const unit = fd.get('item-unit').trim();

    if (!name) return;

    const item = createShoppingItem({
      ingredientName: name,
      quantity: qty,
      unit,
      order: list.items.length,
      checked: false
    });

    list.items.push(item);
    saveShoppingList(list);
    form.reset();
    handleRoute();
  }

  function handleImportFile() {
    const input = document.getElementById('import-file');
    const file = input && input.files[0];
    if (!file) return;

    readMarkdownFile(file).then(data => {
      showImportPreview(data);
    }).catch(err => {
      alert(err.message);
    });
  }

  function confirmImport() {
    const preview = document.getElementById('import-preview');
    if (!preview || !preview._importData) return;

    if (!confirm('This will replace ALL current data. Are you sure?')) return;

    const data = preview._importData;
    saveAll(data);
    preview._importData = null;
    preview.innerHTML = '<p style="color:var(--success);font-weight:600">Import successful! Redirecting...</p>';
    setTimeout(function () { navigate('#/recipes'); }, 1200);
  }

  /* ============ HELPERS ============ */

  function esc(str) {
    if (typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function addIngredientRow() {
    const list = document.getElementById('ingredients-list');
    if (!list) return;
    const idx = list.querySelectorAll('.ingredient-row').length;
    const row = document.createElement('div');
    row.className = 'ingredient-row';
    row.dataset.idx = idx;
    row.innerHTML =
      '<input type="number" name="ing-qty-' + idx + '" placeholder="Qty" step="any" min="0">' +
      '<input type="text" name="ing-unit-' + idx + '" placeholder="Unit">' +
      '<input type="text" name="ing-name-' + idx + '" placeholder="Ingredient">' +
      '<button type="button" class="btn-remove" data-action="remove-ingredient" data-idx="' + idx + '">&times;</button>';

    const placeholder = list.querySelector('p');
    if (placeholder) placeholder.remove();

    list.appendChild(row);
  }

  function reindexIngredients() {
    const rows = $$('.ingredient-row');
    rows.forEach((row, i) => {
      row.dataset.idx = i;
      const inputs = row.querySelectorAll('input');
      inputs.forEach(inp => {
        const name = inp.name;
        inp.name = name.replace(/-\d+$/, '-' + i);
      });
      const btn = row.querySelector('[data-action="remove-ingredient"]');
      if (btn) btn.dataset.idx = i;
    });
  }

  /* ============ DRAG & DROP ============ */

  let dragSrc = null;

  document.addEventListener('dragstart', function (e) {
    const item = e.target.closest('[draggable]');
    if (!item) return;
    dragSrc = item;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  document.addEventListener('dragend', function (e) {
    const item = e.target.closest('[draggable]');
    if (item) item.classList.remove('dragging');
    $$('.shopping-item.dragging').forEach(el => el.classList.remove('dragging'));
    dragSrc = null;
  });

  document.addEventListener('dragover', function (e) {
    const item = e.target.closest('.shopping-item');
    if (!item || !dragSrc || item === dragSrc) return;
    e.preventDefault();
    const container = document.getElementById('shopping-items');
    if (!container) return;
    const rect = item.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (e.clientY < mid) {
      container.insertBefore(dragSrc, item);
    } else {
      container.insertBefore(dragSrc, item.nextSibling);
    }
  });

  document.addEventListener('drop', function (e) {
    e.preventDefault();
    saveItemOrder();
  });

  /* Touch DnD */
  let touchSrc = null;
  let touchStartY = 0;

  document.addEventListener('touchstart', function (e) {
    const item = e.target.closest('[draggable]');
    if (!item) return;
    touchSrc = item;
    touchStartY = e.touches[0].clientY;
    item.classList.add('dragging');
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!touchSrc) return;
    e.preventDefault();
    const touch = e.touches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const item = target && target.closest('.shopping-item');
    if (!item || item === touchSrc) return;
    const container = document.getElementById('shopping-items');
    if (!container) return;
    const rect = item.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (touch.clientY < mid) {
      container.insertBefore(touchSrc, item);
    } else {
      container.insertBefore(touchSrc, item.nextSibling);
    }
  }, { passive: false });

  document.addEventListener('touchend', function () {
    if (touchSrc) {
      touchSrc.classList.remove('dragging');
      saveItemOrder();
      touchSrc = null;
    }
  });

  function saveItemOrder() {
    const list = getActiveShoppingList();
    if (!list) return;
    const items = $$('#shopping-items .shopping-item');
    items.forEach((el, idx) => {
      const item = list.items.find(i => i.id === el.dataset.itemId);
      if (item) item.order = idx;
    });
    saveShoppingList(list);
  }

})();
