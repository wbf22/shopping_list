function exportToMarkdown() {
  const data = loadAll();
  let md = '# Shopping List Data\n\n';

  const sorted = [...data.recipes].sort((a, b) => a.name.localeCompare(b.name));
  for (const r of sorted) {
    md += `## Recipe: ${r.name}\n`;
    md += `- Difficulty: ${r.difficulty}\n`;
    md += `- Time: ${r.time} min\n`;
    md += `- Price: ${r.price}\n\n`;

    if (r.ingredients.length > 0) {
      md += '### Ingredients\n';
      for (const ing of r.ingredients) {
        if (ing.name) md += `- ${ing.quantity} ${ing.unit} ${ing.name}\n`;
      }
      md += '\n';
    }

    if (r.instructions.trim()) {
      md += '### Instructions\n';
      r.instructions
        .split('\n')
        .filter(l => l.trim())
        .forEach((line, i) => {
          md += `${i + 1}. ${line.trim()}\n`;
        });
      md += '\n';
    }
  }

  const sortedStores = [...data.stores].sort((a, b) => a.name.localeCompare(b.name));
  for (const s of sortedStores) {
    md += `## Store: ${s.name}\n`;
    const prices = data.storePrices.filter(sp => sp.storeId === s.id);
    if (prices.length > 0) {
      md += '### Prices\n';
      for (const p of prices) {
        md += `- ${p.ingredientName} (${p.unit}): $${p.price.toFixed(2)}\n`;
      }
    }
    md += '\n';
  }

  const list = data.shoppingLists[data.shoppingLists.length - 1];
  if (list && list.items.length > 0) {
    md += `## Shopping List: ${list.name}\n`;
    const sortedItems = [...list.items].sort((a, b) => a.order - b.order);
    for (const item of sortedItems) {
      const check = item.checked ? 'x' : ' ';
      const src = item.recipeName ? ` (${item.recipeName})` : '';
      md += `- [${check}] ${item.ingredientName} ${item.quantity}${item.unit}${src}\n`;
    }
    md += '\n';
  }

  return md;
}

function parseMarkdown(md) {
  const data = { recipes: [], stores: [], storePrices: [], shoppingLists: [] };
  const lines = md.split('\n');
  let section = null;
  let subsection = null;
  let currentRecipe = null;
  let currentStore = null;
  let currentList = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    const recipeMatch = line.match(/^## Recipe:\s*(.+)$/i);
    const storeMatch = line.match(/^## Store:\s*(.+)$/i);
    const listMatch = line.match(/^## Shopping List:\s*(.+)$/i);
    const subIngMatch = line.match(/^### Ingredients$/i);
    const subInstMatch = line.match(/^### Instructions$/i);
    const subPriceMatch = line.match(/^### Prices$/i);

    if (recipeMatch) {
      if (currentRecipe && currentRecipe.name) {
        data.recipes.push(currentRecipe);
      }
      currentRecipe = createRecipe({ name: recipeMatch[1].trim() });
      section = 'recipe';
      subsection = null;
      continue;
    }

    if (storeMatch) {
      if (currentStore && currentStore.name) {
        data.stores.push(currentStore);
        currentStore = null;
      }
      currentStore = { name: storeMatch[1].trim(), id: uid() };
      section = 'store';
      subsection = null;
      continue;
    }

    if (listMatch) {
      currentList = createShoppingList({ name: listMatch[1].trim() });
      section = 'list';
      subsection = null;
      continue;
    }

    if (subIngMatch) { subsection = 'ingredients'; continue; }
    if (subInstMatch) { subsection = 'instructions'; continue; }
    if (subPriceMatch) { subsection = 'prices'; continue; }

    if (section === 'recipe') {
      if (!currentRecipe) continue;

      const diffMatch = line.match(/^-\s*Difficulty:\s*(.+)$/i);
      const timeMatch = line.match(/^-\s*Time:\s*(\d+)/i);
      const priceMatch = line.match(/^-\s*Price:\s*(.+)$/i);

      if (diffMatch) {
        const val = diffMatch[1].trim();
        if (DIFFICULTIES.includes(val)) currentRecipe.difficulty = val;
      } else if (timeMatch) {
        currentRecipe.time = parseInt(timeMatch[1]);
      } else if (priceMatch) {
        const val = priceMatch[1].trim();
        if (PRICES.includes(val)) currentRecipe.price = val;
      } else if (subsection === 'ingredients') {
        const ingMatch = line.match(/^- (\d+(?:\.\d+)?)\s+(\S+)\s+(.+)$/);
        if (ingMatch) {
          currentRecipe.ingredients.push({
            id: uid(),
            quantity: parseFloat(ingMatch[1]),
            unit: ingMatch[2],
            name: ingMatch[3].trim()
          });
        }
      } else if (subsection === 'instructions') {
        const instMatch = line.match(/^\d+\.\s+(.+)$/);
        if (instMatch) {
          currentRecipe.instructions += (currentRecipe.instructions ? '\n' : '') + instMatch[1].trim();
        }
      }
    } else if (section === 'store') {
      if (!currentStore) continue;

      if (subsection === 'prices') {
        const priceMatch = line.match(/^- (.+?)\s+\((.+?)\):\s*\$?(\d+\.?\d*)$/);
        if (priceMatch) {
          const sp = createStorePrice({
            storeId: currentStore.id,
            ingredientName: priceMatch[1].trim(),
            unit: priceMatch[2].trim(),
            price: parseFloat(priceMatch[3])
          });
          data.storePrices.push(sp);
        }
      }
    } else if (section === 'list') {
      if (!currentList) continue;

      const itemMatch = line.match(/^- \[([ x])\]\s+(.+?)\s+(\d+(?:\.\d+)?)(\S*)\s*(?:\((.+?)\))?$/);
      if (itemMatch) {
        const item = createShoppingItem({
          ingredientName: itemMatch[2].trim(),
          quantity: parseFloat(itemMatch[3]),
          unit: itemMatch[4],
          checked: itemMatch[1] === 'x',
          recipeName: itemMatch[5] ? itemMatch[5].trim() : null,
          order: currentList.items.length
        });
        currentList.items.push(item);
      }
    }
  }

  if (currentRecipe && currentRecipe.name) data.recipes.push(currentRecipe);
  if (currentStore && currentStore.name) data.stores.push(currentStore);
  if (currentList && currentList.items.length > 0) data.shoppingLists.push(currentList);

  return data;
}

function downloadMarkdown() {
  const md = exportToMarkdown();
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shoplist-export.md';
  a.click();
  URL.revokeObjectURL(url);
}

async function streamToBuffer(readable) {
  const reader = readable.getReader();
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { buf.set(chunk, offset); offset += chunk.length; }
  return buf;
}

function bufToB64(buf) {
  let bin = '';
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function b64urlEncode(b64) {
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return b64;
}

function encodeShareLink() {
  const md = exportToMarkdown();
  const bytes = new TextEncoder().encode(md);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64url = b64urlEncode(btoa(bin));
  return location.origin + location.pathname.replace(/\/$/, '') + '/#/import/u' + b64url;
}

async function decodeShareData(encoded) {
  const prefix = encoded[0];
  const buf = b64ToBuf(b64urlDecode(encoded.slice(1)));

  if (prefix === 'c' && typeof DecompressionStream !== 'undefined') {
    try {
      const ds = new DecompressionStream('gzip');
      ds.writable.getWriter().write(buf).then(w => w.close());
      const decompressed = await streamToBuffer(ds.readable);
      return new TextDecoder().decode(decompressed);
    } catch {}
  }

  return new TextDecoder().decode(buf);
}

function fallbackCopy(url) {
  const ta = document.createElement('textarea');
  ta.value = url;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
}

function copyShareLink() {
  const url = encodeShareLink();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(url).then(function () {
      return url;
    }).catch(function () {
      fallbackCopy(url);
      return url;
    });
  }
  fallbackCopy(url);
  return Promise.resolve(url);
}

function shareMarkdown() {
  const url = encodeShareLink();
  if (navigator.share) {
    try {
      return navigator.share({ text: url, title: 'ShopList Data' }).catch(function () {
        return copyShareLink();
      });
    } catch {
      return copyShareLink();
    }
  }
  return copyShareLink();
}

function readMarkdownFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = parseMarkdown(e.target.result);
        resolve(data);
      } catch (err) {
        reject(new Error('Failed to parse markdown file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
