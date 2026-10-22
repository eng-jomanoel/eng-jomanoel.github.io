const ROLES = ['unassigned', 'starter', 'combo_piece', 'extender', 'handtrap', 'garnet'];
const ROLE_LABELS = {
  unassigned: 'Unassigned',
  starter: 'Starter',
  combo_piece: 'Combo Piece',
  extender: 'Extender',
  handtrap: 'Handtrap',
  garnet: 'Garnet'
};
const ROLE_MAP = { unassigned: 0, starter: 1, combo_piece: 2, extender: 3, handtrap: 4, garnet: 5 };

// Card back SVG fallback so broken image icons never happen
const FALLBACK_IMG = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="421" height="614" viewBox="0 0 421 614">
    <rect width="100%" height="100%" fill="#00212b"/>
    <rect x="18" y="18" width="385" height="578" fill="none" stroke="#2aa198" stroke-width="6"/>
    <ellipse cx="210" cy="307" rx="110" ry="165" fill="#073642" stroke="#b58900" stroke-width="5"/>
  </svg>`
);

// deckCards holds every individual card copy unstacked: { uid, id, name, img, role, hopt }
let deckCards = [];
let combos = [];
let searchTimeout = null;

// 1. .YDK File Import
document.getElementById('ydkInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => parseYDK(ev.target.result);
  reader.readAsText(file);
  e.target.value = '';
});

function parseYDK(text) {
  const lines = text.split(/\r?\n/);
  const mainIds = [];
  let inMain = false;

  for (let raw of lines) {
    const line = raw.trim();
    if (line === '#main') { inMain = true; continue; }
    if (line === '#extra' || line === '!side') { inMain = false; break; }
    if (inMain && /^\d+$/.test(line)) {
      // Normalize passcodes using Number() to fix leading zero mismatches
      mainIds.push(Number(line));
    }
  }

  if (mainIds.length === 0) {
    alert("No Main Deck cards found in this .ydk file.");
    return;
  }
  fetchCardsByIds(mainIds);
}

// 2. Fetch Cards by IDs
async function fetchCardsByIds(idList) {
  const grid = document.getElementById('deckGrid');
  grid.innerHTML = `<div class="empty-state">Fetching card data & images from YGOPRODeck API...</div>`;

  const distinctIds = [...new Set(idList)];

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${distinctIds.join(',')}`);
    const json = await res.json();
    const apiMap = {};

    if (json.data) {
      json.data.forEach(c => {
        apiMap[Number(c.id)] = c;
        if (c.card_images) {
          c.card_images.forEach(imgObj => {
            apiMap[Number(imgObj.id)] = {
              ...c,
              preferred_img: imgObj.image_url_small || imgObj.image_url
            };
          });
        }
      });
    }

    deckCards = idList.map((numId, idx) => {
      const info = apiMap[numId];
      const name = info ? info.name : `Card #${numId}`;
      const img = info
        ? (info.preferred_img || info.card_images[0].image_url_small || info.card_images[0].image_url)
        : FALLBACK_IMG;

      return {
        uid: Date.now() + idx + Math.random(),
        id: numId,
        name,
        img,
        role: 'unassigned',
        hopt: true
      };
    });

    sortDeckByName();
    refreshAll();
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="color:var(--garnet);">Error loading cards from API. Check your internet connection.</div>`;
  }
}

// 3. In-App Deck Builder Search
function debounceSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(runCardSearch, 260);
}

async function runCardSearch() {
  const query = document.getElementById('searchInput').value.trim();
  const container = document.getElementById('searchResults');

  if (query.length < 2) {
    container.innerHTML = '';
    return;
  }

  try {
    const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?fname=${encodeURIComponent(query)}&num=24&offset=0`);
    if (!res.ok) {
      container.innerHTML = `<div style="grid-column:1/-1; font-size:0.8rem; color:var(--text-muted);">No matching cards found.</div>`;
      return;
    }
    const json = await res.json();
    container.innerHTML = '';

    (json.data || []).forEach(card => {
      const type = (card.type || '').toLowerCase();
      if (type.includes('fusion') || type.includes('synchro') || type.includes('xyz') || type.includes('link') || type.includes('token')) {
        return;
      }

      const img = (card.card_images && card.card_images[0])
        ? (card.card_images[0].image_url_small || card.card_images[0].image_url)
        : FALLBACK_IMG;

      const item = document.createElement('div');
      item.className = 'search-item';
      item.title = `Click to add ${card.name} to Main Deck`;
      item.onclick = () => addCardToDeck({
        id: Number(card.id),
        name: card.name,
        img
      });

      item.innerHTML = `
        <img src="${img}" alt="${card.name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
        <div class="search-item-name">${card.name}</div>
      `;
      container.appendChild(item);
    });
  } catch (e) {
    container.innerHTML = '';
  }
}

function addCardToDeck(cardObj) {
  const existingCopies = deckCards.filter(c => c.name === cardObj.name);
  if (existingCopies.length >= 3) {
    return; // Max 3 copies rule
  }

  // Only inherit if a copy is already in the current active deck; otherwise default to unassigned
  const role = existingCopies.length > 0 ? existingCopies[0].role : 'unassigned';
  const hopt = existingCopies.length > 0 ? existingCopies[0].hopt : true;

  deckCards.push({
    uid: Date.now() + Math.random(),
    id: cardObj.id,
    name: cardObj.name,
    img: cardObj.img,
    role,
    hopt
  });

  sortDeckByName();
  refreshAll();
}

function removeCardCopy(uid) {
  deckCards = deckCards.filter(c => c.uid !== uid);
  refreshAll();
}

function clearDeck() {
  deckCards = [];
  combos = [];
  document.getElementById('comboList').innerHTML = '';
  refreshAll();
}

function exportYDK() {
  if (deckCards.length === 0) {
    alert("Add cards to your deck before exporting.");
    return;
  }
  const lines = ['#created by YGO Probability Calculator', '#main'];
  deckCards.forEach(c => lines.push(String(c.id)));
  lines.push('#extra', '!side', '');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'deck.ydk';
  a.click();
}

function sortDeckByName() {
  deckCards.sort((a, b) => a.name.localeCompare(b.name));
}

// 4. Render Unstacked Deck Grid
function renderDeck() {
  const grid = document.getElementById('deckGrid');
  document.getElementById('deckCount').textContent = deckCards.length;

  if (deckCards.length === 0) {
    grid.innerHTML = `<div class="empty-state">Your deck is empty. Use the search bar above to add cards or import a .YDK file.</div>`;
    return;
  }

  grid.innerHTML = '';
  deckCards.forEach(card => {
    const tile = document.createElement('div');
    tile.className = 'card-tile';
    tile.dataset.role = card.role;
    tile.dataset.name = card.name;

    // Left-click cycles role for all copies of this card in the current deck
    tile.onclick = () => cycleRoleByName(card.name);

    // Right-click removes this single copy
    tile.oncontextmenu = (e) => {
      e.preventDefault();
      removeCardCopy(card.uid);
    };

    tile.innerHTML = `
      <div class="hopt-toggle ${card.hopt ? 'active' : ''}" onclick="toggleHoptByName(event, '${escapeQuotes(card.name)}')" title="Toggle Hard Once Per Turn">HOPT</div>
      <img src="${card.img}" alt="${card.name}" loading="lazy" onerror="this.onerror=null;this.src='${FALLBACK_IMG}';">
      <div class="role-banner">${ROLE_LABELS[card.role]}</div>
      <div class="card-name" title="${card.name}">${card.name}</div>
    `;
    grid.appendChild(tile);
  });
}

function escapeQuotes(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function cycleRoleByName(cardName) {
  const first = deckCards.find(c => c.name === cardName);
  if (!first) return;
  const nextRole = ROLES[(ROLES.indexOf(first.role) + 1) % ROLES.length];

  deckCards.forEach(c => {
    if (c.name === cardName) c.role = nextRole;
  });

  document.querySelectorAll('.card-tile').forEach(tile => {
    if (tile.dataset.name === cardName) {
      tile.dataset.role = nextRole;
      tile.querySelector('.role-banner').textContent = ROLE_LABELS[nextRole];
    }
  });

  runSimulation();
}

function toggleHoptByName(e, cardName) {
  e.stopPropagation();
  const first = deckCards.find(c => c.name === cardName);
  if (!first) return;
  const nextHopt = !first.hopt;

  deckCards.forEach(c => {
    if (c.name === cardName) c.hopt = nextHopt;
  });

  document.querySelectorAll('.card-tile').forEach(tile => {
    if (tile.dataset.name === cardName) {
      tile.querySelector('.hopt-toggle').classList.toggle('active', nextHopt);
    }
  });

  runSimulation();
}

// 5. Unique Card Helpers for Dropdowns & Combo Builder
function getUniqueCardsList() {
  const map = new Map();
  deckCards.forEach(c => {
    if (!map.has(c.name)) {
      map.set(c.name, { name: c.name, role: c.role, hopt: c.hopt, qty: 1 });
    } else {
      map.get(c.name).qty++;
    }
  });
  return Array.from(map.values());
}

function populateDropdowns() {
  const uniqueList = getUniqueCardsList();
  const sel = document.getElementById('reqSpecificCard');
  const prevVal = sel.value;

  sel.innerHTML = `<option value="">-- Any --</option>`;
  uniqueList.forEach(c => {
    sel.innerHTML += `<option value="${c.name}">${c.name} (x${c.qty})</option>`;
  });
  if (uniqueList.some(c => c.name === prevVal)) sel.value = prevVal;

  document.querySelectorAll('.combo-row').forEach(row => {
    const id = Number(row.dataset.id);
    const comboObj = combos.find(c => c.id === id);
    if (!comboObj) return;
    const selects = row.querySelectorAll('select');
    selects[0].innerHTML = getComboOptionsHTML(false, uniqueList);
    selects[1].innerHTML = getComboOptionsHTML(false, uniqueList);
    selects[2].innerHTML = getComboOptionsHTML(true, uniqueList);
    selects[0].value = comboObj.slots[0];
    selects[1].value = comboObj.slots[1];
    selects[2].value = comboObj.slots[2];
  });
}

function getComboOptionsHTML(includeEmpty, uniqueList) {
  let html = includeEmpty ? `<option value="">-- Optional 3rd --</option>` : '';
  html += `
    <optgroup label="Generic Roles">
      <option value="ROLE:combo_piece">[Any Combo Piece]</option>
      <option value="ROLE:starter">[Any Starter]</option>
      <option value="ROLE:extender">[Any Extender]</option>
      <option value="ROLE:handtrap">[Any Handtrap]</option>
    </optgroup>
    <optgroup label="Specific Cards">
  `;
  uniqueList.forEach(c => {
    html += `<option value="CARD:${c.name}">${c.name}</option>`;
  });
  html += `</optgroup>`;
  return html;
}

function addComboRow() {
  const uniqueList = getUniqueCardsList();
  if (uniqueList.length === 0) return;

  const id = Date.now() + Math.random();
  const comboObj = { id, slots: ['ROLE:combo_piece', 'ROLE:combo_piece', ''] };
  combos.push(comboObj);

  const container = document.getElementById('comboList');
  const div = document.createElement('div');
  div.className = 'combo-row';
  div.dataset.id = id;

  div.innerHTML = `
    <div class="combo-header">
      <span>Combo Line</span>
      <button class="btn-danger" onclick="removeComboRow(${id})">✕</button>
    </div>
    <div class="combo-selects">
      <select onchange="updateCombo(${id}, 0, this.value)">${getComboOptionsHTML(false, uniqueList)}</select>
      <select onchange="updateCombo(${id}, 1, this.value)">${getComboOptionsHTML(false, uniqueList)}</select>
      <select onchange="updateCombo(${id}, 2, this.value)">${getComboOptionsHTML(true, uniqueList)}</select>
    </div>
  `;
  container.appendChild(div);

  const selects = div.querySelectorAll('select');
  selects[0].value = comboObj.slots[0];
  selects[1].value = comboObj.slots[1];
  selects[2].value = comboObj.slots[2];

  runSimulation();
}

function updateCombo(id, slotIdx, val) {
  const target = combos.find(c => c.id === id);
  if (target) {
    target.slots[slotIdx] = val;
    runSimulation();
  }
}

function removeComboRow(id) {
  combos = combos.filter(c => c.id !== id);
  const el = document.querySelector(`.combo-row[data-id="${id}"]`);
  if (el) el.remove();
  runSimulation();
}

function refreshAll() {
  renderDeck();
  populateDropdowns();
  runSimulation();
}

// 6. Fast Monte Carlo Simulation Engine (100,000 Trials)
function runSimulation() {
  const handSize = parseInt(document.getElementById('handSizeSelect').value) || 5;
  if (deckCards.length < handSize) {
    document.getElementById('playableRate').textContent = '0.0%';
    document.getElementById('brickRate').textContent = '0.0%';
    document.getElementById('targetRate').textContent = '0.0%';
    document.getElementById('avgStarter').textContent = '0.00';
    document.getElementById('avgComboPiece').textContent = '0.00';
    document.getElementById('avgExtender').textContent = '0.00';
    document.getElementById('avgHandtrap').textContent = '0.00';
    document.getElementById('avgGarnet').textContent = '0.00';
    document.getElementById('avgHoptDup').textContent = '0.00';
    document.getElementById('bestHandScore').textContent = 'Score: 0';
    document.getElementById('bestHandCards').innerHTML = `<li>Add at least ${handSize} cards to simulate hands.</li>`;
    return;
  }

  const t0 = performance.now();
  const uniqueList = getUniqueCardsList();
  const nameToIdx = {};
  uniqueList.forEach((u, i) => nameToIdx[u.name] = i);

  const deck = deckCards.map(c => nameToIdx[c.name]);
  const deckLen = deck.length;

  const compiledCombos = combos.map(c => {
    return c.slots.filter(s => s !== '').map(slot => {
      if (slot.startsWith('CARD:')) {
        return { type: 1, val: nameToIdx[slot.slice(5)] };
      } else {
        return { type: 2, val: ROLE_MAP[slot.slice(5)] };
      }
    });
  }).filter(arr => arr.length > 0);

  const reqS = parseInt(document.getElementById('reqStarters').value) || 0;
  const reqC = parseInt(document.getElementById('reqComboPieces').value) || 0;
  const reqE = parseInt(document.getElementById('reqExtenders').value) || 0;
  const reqH = parseInt(document.getElementById('reqHandtraps').value) || 0;
  const reqMaxG = parseInt(document.getElementById('reqMaxGarnets').value);
  const reqSpecName = document.getElementById('reqSpecificCard').value;
  const reqSpecIdx = reqSpecName !== "" ? nameToIdx[reqSpecName] : -1;
  const reqSpecQty = parseInt(document.getElementById('reqSpecificQty').value) || 1;

  const TRIALS = 100000;
  let playableCount = 0, brickCount = 0, targetMatchCount = 0;
  let sumS = 0, sumC = 0, sumE = 0, sumH = 0, sumG = 0, sumDups = 0;
  let bestScore = -9999;
  let bestHandSnapshot = [];

  const uLen = uniqueList.length;
  const roleArr = new Int8Array(uLen);
  const hoptArr = new Uint8Array(uLen);
  uniqueList.forEach((u, i) => {
    roleArr[i] = ROLE_MAP[u.role];
    hoptArr[i] = u.hopt ? 1 : 0;
  });

  const seenStamp = new Int32Array(uLen);
  const drawnCounts = new Int32Array(uLen);
  const handIndices = new Int32Array(handSize);

  for (let t = 1; t <= TRIALS; t++) {
    for (let i = 0; i < handSize; i++) {
      const r = i + ((Math.random() * (deckLen - i)) | 0);
      const tmp = deck[i];
      deck[i] = deck[r];
      deck[r] = tmp;
      handIndices[i] = tmp;
    }

    let uS = 0, uC = 0, uE = 0, uH = 0, garnets = 0, hoptDups = 0, score = 0;

    for (let i = 0; i < handSize; i++) {
      const uIdx = handIndices[i];
      if (seenStamp[uIdx] !== t) {
        seenStamp[uIdx] = t;
        drawnCounts[uIdx] = 1;
      } else {
        drawnCounts[uIdx]++;
      }

      if (drawnCounts[uIdx] > 1 && hoptArr[uIdx] === 1) {
        hoptDups++;
        score -= 3;
        continue;
      }

      const rCode = roleArr[uIdx];
      if (rCode === 1) { uS++; score += 12; }
      else if (rCode === 2) { uC++; score += 4; }
      else if (rCode === 3) { uE++; score += 6; }
      else if (rCode === 4) { uH++; score += 7; }
      else if (rCode === 5) { garnets++; score -= 12; }
    }

    let hasCombo = false;
    for (let c = 0; c < compiledCombos.length; c++) {
      const slots = compiledCombos[c];
      let usedMask = 0;
      let allMatched = true;

      for (let s = 0; s < slots.length; s++) {
        const req = slots[s];
        let matchedSlot = false;
        for (let pos = 0; pos < handSize; pos++) {
          if ((usedMask & (1 << pos)) !== 0) continue;
          const cardIdx = handIndices[pos];
          if ((req.type === 1 && cardIdx === req.val) || (req.type === 2 && roleArr[cardIdx] === req.val)) {
            usedMask |= (1 << pos);
            matchedSlot = true;
            break;
          }
        }
        if (!matchedSlot) {
          allMatched = false;
          break;
        }
      }
      if (allMatched) {
        hasCombo = true;
        score += 18;
      }
    }

    if ((uS >= 1 || hasCombo) && uE >= 1) score += 8;
    if ((uS >= 1 || hasCombo) && uH >= 1) score += 8;

    const isPlayable = (uS >= 1) || hasCombo;
    const isBrick = !isPlayable || (garnets >= 2);

    if (isPlayable) playableCount++;
    if (isBrick) brickCount++;

    let meetsTarget = (uS >= reqS) && (uC >= reqC) && (uE >= reqE) && (uH >= reqH) && (garnets <= reqMaxG);
    if (meetsTarget && reqSpecIdx >= 0) {
      const cInHand = (seenStamp[reqSpecIdx] === t) ? drawnCounts[reqSpecIdx] : 0;
      if (cInHand < reqSpecQty) meetsTarget = false;
    }
    if (meetsTarget) targetMatchCount++;

    sumS += uS;
    sumC += uC;
    sumE += uE;
    sumH += uH;
    sumG += garnets;
    sumDups += hoptDups;

    if (score > bestScore) {
      bestScore = score;
      bestHandSnapshot = Array.from(handIndices);
    }
  }

  const elapsed = (performance.now() - t0).toFixed(1);

  document.getElementById('simSpeed').textContent = `${elapsed} ms`;
  document.getElementById('playableRate').textContent = `${((playableCount / TRIALS) * 100).toFixed(1)}%`;
  document.getElementById('brickRate').textContent = `${((brickCount / TRIALS) * 100).toFixed(1)}%`;
  document.getElementById('targetRate').textContent = `${((targetMatchCount / TRIALS) * 100).toFixed(1)}%`;

  document.getElementById('avgStarter').textContent = (sumS / TRIALS).toFixed(2);
  document.getElementById('avgComboPiece').textContent = (sumC / TRIALS).toFixed(2);
  document.getElementById('avgExtender').textContent = (sumE / TRIALS).toFixed(2);
  document.getElementById('avgHandtrap').textContent = (sumH / TRIALS).toFixed(2);
  document.getElementById('avgGarnet').textContent = (sumG / TRIALS).toFixed(2);
  document.getElementById('avgHoptDup').textContent = (sumDups / TRIALS).toFixed(2);

  document.getElementById('bestHandScore').textContent = `Score: ${bestScore}`;
  document.getElementById('bestHandCards').innerHTML = bestHandSnapshot
    .map(idx => `<li><strong>${uniqueList[idx].name}</strong> <span style="color:var(--text-main)">(${ROLE_LABELS[uniqueList[idx].role]})</span></li>`)
    .join('');
}