const ROLES = ['unassigned', 'starter', 'combo_a', 'combo_b', 'extender', 'handtrap', 'garnet'];
const ROLE_LABELS = {
  unassigned: 'Unassigned',
  starter: 'Starter',
  combo_a: 'Combo A',
  combo_b: 'Combo B',
  extender: 'Extender',
  handtrap: 'Handtrap',
  garnet: 'Garnet'
};
const ROLE_MAP = { unassigned: 0, starter: 1, combo_a: 2, combo_b: 3, extender: 4, handtrap: 5, garnet: 6 };

const FALLBACK_IMG = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="421" height="614" viewBox="0 0 421 614">
    <rect width="100%" height="100%" fill="#00212b"/>
    <rect x="18" y="18" width="385" height="578" fill="none" stroke="#2aa198" stroke-width="6"/>
    <ellipse cx="210" cy="307" rx="110" ry="165" fill="#073642" stroke="#b58900" stroke-width="5"/>
  </svg>`
);

let mainDeckCards = [];
let extraDeckCards = [];
let sideDeckCards = [];

// Siding state: tracks card UIDs moved from Main to Side or Side to Main
let sidedOutUids = new Set();
let sidedInUids = new Set();

let combos = [];
let searchTimeout = null;

// Switch Views / Tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

  if (tabName === 'grid') {
    document.querySelector('.nav-tabs button:nth-child(1)').classList.add('active');
    document.getElementById('tabGrid').style.display = 'block';
  } else if (tabName === 'table') {
    document.querySelector('.nav-tabs button:nth-child(2)').classList.add('active');
    document.getElementById('tabTable').style.display = 'block';
    renderRoleTable();
  } else if (tabName === 'siding') {
    document.querySelector('.nav-tabs button:nth-child(3)').classList.add('active');
    document.getElementById('tabSiding').style.display = 'block';
    renderSidingLists();
  }
}

// 1. .YDK Parser (Handles #main, #extra, !side)
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
  const extraIds = [];
  const sideIds = [];
  let section = 'main';

  for (let raw of lines) {
    const line = raw.trim();
    if (line === '#main') { section = 'main'; continue; }
    if (line === '#extra') { section = 'extra'; continue; }
    if (line === '!side') { section = 'side'; continue; }
    if (line.startsWith('#') || line.startsWith('!')) { section = null; continue; }
    if (/^\d+$/.test(line)) {
      const numId = Number(line);
      if (section === 'main') mainIds.push(numId);
      else if (section === 'extra') extraIds.push(numId);
      else if (section === 'side') sideIds.push(numId);
      else mainIds.push(numId);
    }
  }

  fetchDeckCards(mainIds, extraIds, sideIds);
}

// 2. Robust Chunked API Fetching (Prevents URI Too Long & Network Failures)
async function fetchDeckCards(mainIds, extraIds, sideIds) {
  const grid = document.getElementById('mainDeckGrid');
  grid.innerHTML = `<div class="empty-state">Fetching card data from API...</div>`;

  const allIds = [...new Set([...mainIds, ...extraIds, ...sideIds])];
  const apiMap = new Map();

  // Chunk IDs in batches of 50 to avoid API URL length limits
  const chunkSize = 50;
  for (let i = 0; i < allIds.length; i += chunkSize) {
    const chunk = allIds.slice(i, i + chunkSize);
    try {
      const res = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?id=${chunk.join(',')}`);
      if (res.ok) {
        const json = await res.json();
        (json.data || []).forEach(c => {
          const defaultImg = (c.card_images && c.card_images[0])
            ? (c.card_images[0].image_url_small || c.card_images[0].image_url)
            : `https://images.ygoprodeck.com/images/cards_small/${c.id}.jpg`;

          const entry = { id: Number(c.id), name: c.name, img: defaultImg };
          apiMap.set(Number(c.id), entry);

          if (c.card_images) {
            c.card_images.forEach(imgObj => {
              apiMap.set(Number(imgObj.id), {
                id: Number(c.id),
                name: c.name,
                img: imgObj.image_url_small || imgObj.image_url || defaultImg
              });
            });
          }
        });
      }
    } catch (err) {
      console.warn("Chunk fetch warning:", err);
    }
  }

  const buildCardObj = (numId, idx) => {
    const info = apiMap.get(numId);
    const name = info ? info.name : `Card #${numId}`;
    const img = info ? info.img : `https://images.ygoprodeck.com/images/cards_small/${numId}.jpg`;
    return {
      uid: Date.now() + idx + Math.random(),
      id: info ? info.id : numId,
      name,
      img,
      role: 'unassigned',
      hopt: true
    };
  };

  mainDeckCards = mainIds.map((id, idx) => buildCardObj(id, idx));
  extraDeckCards = extraIds.map((id, idx) => buildCardObj(id, idx + 1000));
  sideDeckCards = sideIds.map((id, idx) => buildCardObj(id, idx + 2000));

  sortDecks();
  resetSiding();
  refreshAll();
}

function sortDecks() {
  mainDeckCards.sort((a, b) => a.name.localeCompare(b.name));
  extraDeckCards.sort((a, b) => a.name.localeCompare(b.name));
  sideDeckCards.sort((a, b) => a.name.localeCompare(b.name));
}

// 3. In-App Search Bar
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
      const isExtra = type.includes('fusion') || type.includes('synchro') || type.includes('xyz') || type.includes('link');
      const img = (card.card_images && card.card_images[0])
        ? (card.card_images[0].image_url_small || card.card_images[0].image_url)
        : `https://images.ygoprodeck.com/images/cards_small/${card.id}.jpg`;

      const item = document.createElement('div');
      item.className = 'search-item';
      item.title = `Click to add ${card.name}`;
      item.onclick = () => addCardToDeck({
        id: Number(card.id),
        name: card.name,
        img
      }, isExtra ? 'extra' : 'main');

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

function addCardToDeck(cardObj, targetDeck = 'main') {
  const targetArray = targetDeck === 'extra' ? extraDeckCards : mainDeckCards;
  const existing = targetArray.filter(c => c.name === cardObj.name);
  if (existing.length >= 3) return;

  const role = existing.length > 0 ? existing.role : 'unassigned';
  const hopt = existing.length > 0 ? existing.hopt : true;

  targetArray.push({
    uid: Date.now() + Math.random(),
    id: cardObj.id,
    name: cardObj.name,
    img: cardObj.img,
    role,
    hopt
  });

  sortDecks();
  resetSiding();
  refreshAll();
}

function removeCardCopy(uid, deckType = 'main') {
  if (deckType === 'main') mainDeckCards = mainDeckCards.filter(c => c.uid !== uid);
  else if (deckType === 'extra') extraDeckCards = extraDeckCards.filter(c => c.uid !== uid);
  else if (deckType === 'side') sideDeckCards = sideDeckCards.filter(c => c.uid !== uid);

  resetSiding();
  refreshAll();
}

function clearDeck() {
  mainDeckCards = [];
  extraDeckCards = [];
  sideDeckCards = [];
  combos = [];
  document.getElementById('comboList').innerHTML = '';
  resetSiding();
  refreshAll();
}

function exportYDK() {
  if (mainDeckCards.length === 0 && extraDeckCards.length === 0 && sideDeckCards.length === 0) {
    alert("Deck is empty.");
    return;
  }
  const lines = ['#created by YGO Probability Calculator', '#main'];
  mainDeckCards.forEach(c => lines.push(String(c.id)));
  lines.push('#extra');
  extraDeckCards.forEach(c => lines.push(String(c.id)));
  lines.push('!side');
  sideDeckCards.forEach(c => lines.push(String(c.id)));
  lines.push('');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'deck.ydk';
  a.click();
}

// 4. Render Grid View
function renderDeckGrids() {
  document.getElementById('mainCount').textContent = mainDeckCards.length;
  document.getElementById('extraCount').textContent = extraDeckCards.length;
  document.getElementById('sideCount').textContent = sideDeckCards.length;

  renderGridSection('mainDeckGrid', mainDeckCards, 'main');
  renderGridSection('extraDeckGrid', extraDeckCards, 'extra');
  renderGridSection('sideDeckGrid', sideDeckCards, 'side');
}

function renderGridSection(elementId, cardsArray, deckType) {
  const grid = document.getElementById(elementId);
  if (cardsArray.length === 0) {
    grid.innerHTML = `<div class="empty-state">No cards in this section.</div>`;
    return;
  }

  grid.innerHTML = '';
  cardsArray.forEach(card => {
    const tile = document.createElement('div');
    tile.className = 'card-tile';
    tile.dataset.role = card.role;
    tile.dataset.name = card.name;

    tile.onclick = () => cycleRoleByName(card.name);
    tile.oncontextmenu = (e) => {
      e.preventDefault();
      removeCardCopy(card.uid, deckType);
    };

    tile.innerHTML = `
      <div class="hopt-toggle ${card.hopt ? 'active' : ''}" onclick="toggleHoptByName(event, '${escapeQuotes(card.name)}')" title="Toggle HOPT">HOPT</div>
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
  const allCards = [...mainDeckCards, ...extraDeckCards, ...sideDeckCards];
  const first = allCards.find(c => c.name === cardName);
  if (!first) return;
  const nextRole = ROLES[(ROLES.indexOf(first.role) + 1) % ROLES.length];

  [mainDeckCards, extraDeckCards, sideDeckCards].forEach(deck => {
    deck.forEach(c => { if (c.name === cardName) c.role = nextRole; });
  });

  refreshAll();
}

function toggleHoptByName(e, cardName) {
  e.stopPropagation();
  const allCards = [...mainDeckCards, ...extraDeckCards, ...sideDeckCards];
  const first = allCards.find(c => c.name === cardName);
  if (!first) return;
  const nextHopt = !first.hopt;

  [mainDeckCards, extraDeckCards, sideDeckCards].forEach(deck => {
    deck.forEach(c => { if (c.name === cardName) c.hopt = nextHopt; });
  });

  refreshAll();
}

// 5. Table Role Manager View
function renderRoleTable() {
  const tbody = document.getElementById('roleTableBody');
  const map = new Map();

  [...mainDeckCards, ...extraDeckCards, ...sideDeckCards].forEach(c => {
    if (!map.has(c.name)) {
      map.set(c.name, { name: c.name, role: c.role, hopt: c.hopt, qty: 1 });
    } else {
      map.get(c.name).qty++;
    }
  });

  const uniqueList = Array.from(map.values());
  if (uniqueList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No cards loaded.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  uniqueList.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${item.name}</strong></td>
      <td>x${item.qty}</td>
      <td>
        <select onchange="tableUpdateRole('${escapeQuotes(item.name)}', this.value)">
          ${ROLES.map(r => `<option value="${r}" ${item.role === r ? 'selected' : ''}>${ROLE_LABELS[r]}</option>`).join('')}
        </select>
      </td>
      <td>
        <input type="checkbox" ${item.hopt ? 'checked' : ''} onchange="tableUpdateHopt('${escapeQuotes(item.name)}', this.checked)">
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function tableUpdateRole(cardName, newRole) {
  [mainDeckCards, extraDeckCards, sideDeckCards].forEach(deck => {
    deck.forEach(c => { if (c.name === cardName) c.role = newRole; });
  });
  runSimulation();
}

function tableUpdateHopt(cardName, newHopt) {
  [mainDeckCards, extraDeckCards, sideDeckCards].forEach(deck => {
    deck.forEach(c => { if (c.name === cardName) c.hopt = newHopt; });
  });
  runSimulation();
}

// 6. Siding Simulator View
function resetSiding() {
  sidedOutUids.clear();
  sidedInUids.clear();
  renderSidingLists();
}

function renderSidingLists() {
  const mainList = document.getElementById('sidingMainList');
  const sideList = document.getElementById('sidingSideList');

  const activeMain = mainDeckCards.filter(c => !sidedOutUids.has(c.uid));
  const activeSide = [...sideDeckCards, ...Array.from(sidedOutUids).map(uid => mainDeckCards.find(c => c.uid === uid)).filter(Boolean)];

  document.getElementById('sideMainCount').textContent = activeMain.length + Array.from(sidedInUids).length;
  document.getElementById('sideSideCount').textContent = activeSide.length - Array.from(sidedInUids).length;

  mainList.innerHTML = '';
  [...activeMain, ...Array.from(sidedInUids).map(uid => sideDeckCards.find(c => c.uid === uid)).filter(Boolean)].forEach(card => {
    const isFromSide = sidedInUids.has(card.uid);
    const div = document.createElement('div');
    div.className = 'siding-item';
    div.style.borderColor = isFromSide ? 'var(--starter)' : 'var(--border)';
    div.innerHTML = `<span>${card.name}</span> <span style="font-size:0.7rem; color:${isFromSide?'var(--starter)':'var(--text-muted)'}">${isFromSide ? '[Sided In]' : 'Click to Side Out ➔'}</span>`;
    div.onclick = () => toggleSideCard(card.uid, isFromSide ? 'in' : 'main');
    mainList.appendChild(div);
  });

  sideList.innerHTML = '';
  activeSide.forEach(card => {
    const isFromMain = sidedOutUids.has(card.uid);
    const div = document.createElement('div');
    div.className = 'siding-item';
    div.style.borderColor = isFromMain ? 'var(--garnet)' : 'var(--border)';
    div.innerHTML = `<span>${card.name}</span> <span style="font-size:0.7rem; color:${isFromMain?'var(--garnet)':'var(--text-muted)'}">${isFromMain ? '[Sided Out]' : '← Click to Side In'}</span>`;
    div.onclick = () => toggleSideCard(card.uid, isFromMain ? 'out' : 'side');
    sideList.appendChild(div);
  });
}

function toggleSideCard(uid, origin) {
  if (origin === 'main') {
    sidedOutUids.add(uid);
  } else if (origin === 'out') {
    sidedOutUids.delete(uid);
  } else if (origin === 'side') {
    sidedInUids.add(uid);
  } else if (origin === 'in') {
    sidedInUids.delete(uid);
  }
  renderSidingLists();
  runSimulation();
}

// 7. Unique Card Helpers & Dropdowns
function getUniqueCardsList() {
  const map = new Map();
  [...mainDeckCards, ...extraDeckCards, ...sideDeckCards].forEach(c => {
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
      <option value="ROLE:combo_a">[Any Combo Piece A]</option>
      <option value="ROLE:combo_b">[Any Combo Piece B]</option>
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
  const comboObj = { id, slots: ['ROLE:combo_a', 'ROLE:combo_b', ''] };
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
  renderDeckGrids();
  renderRoleTable();
  renderSidingLists();
  populateDropdowns();
  runSimulation();
}

// 8. Fast Monte Carlo Simulation Engine (100,000 Trials with Siding Support)
function runSimulation() {
  // Get active main deck factoring in siding simulator swaps
  const activeMainCards = mainDeckCards
    .filter(c => !sidedOutUids.has(c.uid))
    .concat(Array.from(sidedInUids).map(uid => sideDeckCards.find(c => c.uid === uid)).filter(Boolean));

  const handSize = parseInt(document.getElementById('handSizeSelect').value) || 5;
  if (activeMainCards.length < handSize) {
    document.getElementById('playableRate').textContent = '0.0%';
    document.getElementById('brickRate').textContent = '0.0%';
    document.getElementById('targetRate').textContent = '0.0%';
    document.getElementById('bestHandCards').innerHTML = `<li>Active Main Deck needs at least ${handSize} cards.</li>`;
    return;
  }

  const t0 = performance.now();
  const uniqueList = getUniqueCardsList();
  const nameToIdx = {};
  uniqueList.forEach((u, i) => nameToIdx[u.name] = i);

  const deck = activeMainCards.map(c => nameToIdx[c.name]);
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
  const reqCA = parseInt(document.getElementById('reqComboA').value) || 0;
  const reqCB = parseInt(document.getElementById('reqComboB').value) || 0;
  const reqE = parseInt(document.getElementById('reqExtenders').value) || 0;
  const reqH = parseInt(document.getElementById('reqHandtraps').value) || 0;
  const reqMaxG = parseInt(document.getElementById('reqMaxGarnets').value);
  const reqSpecName = document.getElementById('reqSpecificCard').value;
  const reqSpecIdx = reqSpecName !== "" ? nameToIdx[reqSpecName] : -1;
  const reqSpecQty = parseInt(document.getElementById('reqSpecificQty').value) || 1;

  const TRIALS = 100000;
  let playableCount = 0, brickCount = 0, targetMatchCount = 0;
  let sumS = 0, sumCA = 0, sumCB = 0, sumE = 0, sumH = 0, sumG = 0, sumDups = 0;
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

    let uS = 0, uCA = 0, uCB = 0, uE = 0, uH = 0, garnets = 0, hoptDups = 0, score = 0;

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
      else if (rCode === 2) { uCA++; score += 4; }
      else if (rCode === 3) { uCB++; score += 4; }
      else if (rCode === 4) { uE++; score += 6; }
      else if (rCode === 5) { uH++; score += 7; }
      else if (rCode === 6) { garnets++; score -= 12; }
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

    let meetsTarget = (uS >= reqS) && (uCA >= reqCA) && (uCB >= reqCB) && (uE >= reqE) && (uH >= reqH) && (garnets <= reqMaxG);
    if (meetsTarget && reqSpecIdx >= 0) {
      const cInHand = (seenStamp[reqSpecIdx] === t) ? drawnCounts[reqSpecIdx] : 0;
      if (cInHand < reqSpecQty) meetsTarget = false;
    }
    if (meetsTarget) targetMatchCount++;

    sumS += uS;
    sumCA += uCA;
    sumCB += uCB;
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
  document.getElementById('avgComboA').textContent = (sumCA / TRIALS).toFixed(2);
  document.getElementById('avgComboB').textContent = (sumCB / TRIALS).toFixed(2);
  document.getElementById('avgExtender').textContent = (sumE / TRIALS).toFixed(2);
  document.getElementById('avgHandtrap').textContent = (sumH / TRIALS).toFixed(2);
  document.getElementById('avgGarnet').textContent = (sumG / TRIALS).toFixed(2);
  document.getElementById('avgHoptDup').textContent = (sumDups / TRIALS).toFixed(2);

  document.getElementById('bestHandScore').textContent = `Score: ${bestScore}`;
  document.getElementById('bestHandCards').innerHTML = bestHandSnapshot
    .map(idx => `<li><strong>${uniqueList[idx].name}</strong> <span style="color:var(--text-main)">(${ROLE_LABELS[uniqueList[idx].role]})</span></li>`)
    .join('');
}