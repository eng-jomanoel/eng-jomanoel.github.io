'use strict';

/* ===================================================================
   YGO Deck Builder & Probability Calculator
   =================================================================== */

/* ---------- Constants ---------- */
const API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const IMG_SMALL = id => `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`;
const IMG_FULL = id => `https://images.ygoprodeck.com/images/cards/${id}.jpg`;

const ROLES = ['unassigned', 'starter', 'combo_a', 'combo_b', 'extender', 'handtrap', 'garnet'];
const ROLE_LABELS = {
  unassigned: 'Unassigned', starter: 'Starter', combo_a: 'Combo A', combo_b: 'Combo B',
  extender: 'Extender', handtrap: 'Handtrap', garnet: 'Garnet'
};
const ROLE_IDX = Object.fromEntries(ROLES.map((r, i) => [r, i]));
const EXTRA_RE = /fusion|synchro|xyz|link/i;
const MAX_COPIES = 3;

const LS = {
  state: 'ygocalc.state.v2',
  cards: 'ygocalc.cards.v1',
  roles: 'ygocalc.roles.v1',
  saved: 'ygocalc.saved.v1'
};

/* ---------- Tiny utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s).replace(/[&<>"']/g, ch => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
));
const byName = (a, b) => a.name.localeCompare(b.name);

function lsGet(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

const b64e = s => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4));

/* ---------- State ---------- */
const state = {
  cards: new Map(),            // canonical card id -> card record
  combos: [],                  // { id, slots: ['R:combo_a' | 'C:12345' | '', x3] }
  crit: {
    starters: 0, comboA: 0, comboB: 0, extenders: 0, handtraps: 0,
    maxGarnets: 6, brickGarnets: 2, specific: '', specificQty: 1
  },
  handSize: 5,
  trials: 100000,
  seed: 0xC0FFEE,
  siding: { out: new Map(), in: new Map() },
  brush: null,
  addTo: 'auto',
  busy: ''
};
/*  card record: { id, name, type, known, isExtra, role, hopt, n: { main, extra, side } }  */

let cardCache = lsGet(LS.cards) || {};      // any id (incl. alt art) -> { i: canonicalId, n: name, t: type }
let roleMemory = lsGet(LS.roles) || {};     // canonical id -> [roleIdx, hopt]
const unresolved = new Set();               // ids the API didn't know about this session
let comboSeq = 0;
let lastResults = new Map();                // search results, by id

/* ===================================================================
   Card data layer
   =================================================================== */
async function apiGet(url, signal) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (res.status === 429 || res.status >= 500) { await sleep(900 * (attempt + 1)); continue; }
      if (res.status === 400 || res.status === 404) return { status: 'notfound' };
      if (!res.ok) { await sleep(400 * (attempt + 1)); continue; }
      const json = await res.json();
      return { status: 'ok', data: json.data || [] };
    } catch (e) {
      if (e.name === 'AbortError') throw e;
      await sleep(400 * (attempt + 1));
    }
  }
  return { status: 'net' };
}

function ingest(data) {
  for (const c of data) {
    const rec = { i: c.id, n: c.name, t: c.type || '' };
    cardCache[c.id] = rec;
    (c.card_images || []).forEach(im => { cardCache[im.id] = rec; });
  }
}

function saveCardCache() {
  if (Object.keys(cardCache).length > 4000) {
    cardCache = {};
    state.cards.forEach(c => { if (c.known) cardCache[c.id] = { i: c.id, n: c.name, t: c.type }; });
  }
  lsSet(LS.cards, cardCache);
}

/* Resolve a chunk of ids. If the API rejects the whole batch, split it so one
   bad id can't take the other cards down with it. */
async function resolveChunk(ids) {
  const res = await apiGet(`${API}?id=${ids.join(',')}`);
  if (res.status === 'net') return;
  if (res.status === 'ok') ingest(res.data);
  const missing = ids.filter(id => !cardCache[id]);
  if (!missing.length) return;
  if (res.status === 'notfound' && ids.length > 1) {
    const mid = ids.length >> 1;
    await resolveChunk(ids.slice(0, mid));
    await sleep(100);
    await resolveChunk(ids.slice(mid));
    return;
  }
  missing.forEach(id => unresolved.add(id));
}

async function resolveIds(ids) {
  const need = [...new Set(ids)].filter(id => !cardCache[id] && !unresolved.has(id));
  if (!need.length) return;
  for (let i = 0; i < need.length; i += 40) {
    setBusy(`Loading card data (${Math.min(i + 40, need.length)} of ${need.length})`);
    await resolveChunk(need.slice(i, i + 40));
    await sleep(120);
  }
  setBusy('');
  saveCardCache();
}

function getOrCreateCard(rawId, zoneHint) {
  const rec = cardCache[rawId];
  const id = rec ? rec.i : rawId;
  let c = state.cards.get(id);
  if (!c) {
    const mem = roleMemory[id];
    c = {
      id,
      name: rec ? rec.n : `Card #${rawId}`,
      type: rec ? rec.t : '',
      known: !!rec,
      isExtra: rec ? EXTRA_RE.test(rec.t) : zoneHint === 'extra',
      role: mem ? (ROLES[mem[0]] || 'unassigned') : 'unassigned',
      hopt: mem ? !!mem[1] : true,
      n: { main: 0, extra: 0, side: 0 }
    };
    state.cards.set(id, c);
  }
  return c;
}

const total = c => c.n.main + c.n.extra + c.n.side;
const poolCards = () => [...state.cards.values()].filter(c => !c.isExtra && c.n.main + c.n.side > 0).sort(byName);

/* ===================================================================
   Persistence, sharing, saved decks
   =================================================================== */
function serialize() {
  return {
    v: 2,
    d: [...state.cards.values()].map(c => [c.id, c.n.main, c.n.extra, c.n.side, ROLE_IDX[c.role], c.hopt ? 1 : 0]),
    c: state.combos.map(c => c.slots),
    q: state.crit,
    h: state.handSize,
    t: state.trials
  };
}

let persistTimer;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => lsSet(LS.state, serialize()), 250);
}

function remember(c) {
  roleMemory[c.id] = [ROLE_IDX[c.role], c.hopt ? 1 : 0];
  lsSet(LS.roles, roleMemory);
}

/* Rows are [rawId, main, extra, side, roleIdx, hopt]. roleIdx -1 means "use remembered role". */
async function loadSerialized(s) {
  const rows = (Array.isArray(s.d) ? s.d : []).filter(r => Array.isArray(r) && +r[0] > 0);
  await resolveIds(rows.map(r => +r[0]));

  state.cards.clear();
  for (const r of rows) {
    const [rawId, m = 0, e = 0, sd = 0, role = -1, hopt = 1] = r.map(Number);
    const c = getOrCreateCard(rawId, e > 0 && !m && !sd ? 'extra' : 'main');
    c.n.main += m; c.n.extra += e; c.n.side += sd;
    if (role >= 0 && ROLES[role]) { c.role = ROLES[role]; c.hopt = !!hopt; }
  }

  if (Array.isArray(s.c)) {
    state.combos = s.c.map(slots => ({ id: ++comboSeq, slots: [0, 1, 2].map(i => String((slots || [])[i] || '')) }));
  }
  if (s.q && typeof s.q === 'object') {
    for (const k of Object.keys(state.crit)) if (k in s.q) state.crit[k] = s.q[k];
  }
  if (s.h === 5 || s.h === 6) state.handSize = s.h;
  if ([50000, 100000, 500000].includes(s.t)) state.trials = s.t;

  resetSiding(false);
  syncInputsFromState();
  renderAll();
}

function shareLink() {
  const payload = serialize();
  delete payload.t;
  return `${location.origin}${location.pathname}#d=${b64e(JSON.stringify(payload))}`;
}

async function copyShareLink() {
  if (!state.cards.size) return toast('Add some cards first.', 'bad');
  const url = shareLink();
  try {
    await navigator.clipboard.writeText(url);
    toast('Share link copied. It includes your roles and combos.', 'good');
  } catch (e) {
    window.prompt('Copy this link:', url);
  }
}

function readShareHash() {
  const m = location.hash.match(/^#d=([\w-]+)$/);
  if (!m) return null;
  try {
    const s = JSON.parse(b64d(m[1]));
    return s && s.v === 2 ? s : null;
  } catch (e) { return null; }
}

function savedDecks() { return lsGet(LS.saved) || {}; }

function refreshSavedSelect() {
  const sel = $('#savedDecks');
  const names = Object.keys(savedDecks()).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="">${names.length ? 'Saved decks' : 'No saved decks'}</option>` +
    names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
}

function saveCurrentDeck() {
  if (!state.cards.size) return toast('Nothing to save yet.', 'bad');
  const current = $('#savedDecks').value;
  const name = (window.prompt('Name this deck:', current || '') || '').trim().slice(0, 60);
  if (!name) return;
  const all = savedDecks();
  if (all[name] && name !== current && !window.confirm(`Replace the saved deck "${name}"?`)) return;
  all[name] = serialize();
  if (!lsSet(LS.saved, all)) return toast('Could not save. Browser storage may be full or blocked.', 'bad');
  refreshSavedSelect();
  $('#savedDecks').value = name;
  toast(`Saved "${name}".`, 'good');
}

async function loadSavedDeck(name) {
  const s = savedDecks()[name];
  if (s) { await loadSerialized(s); toast(`Loaded "${name}".`, 'good'); }
}

function deleteSavedDeck() {
  const name = $('#savedDecks').value;
  if (!name) return toast('Pick a saved deck first.', 'bad');
  if (!window.confirm(`Delete the saved deck "${name}"?`)) return;
  const all = savedDecks();
  delete all[name];
  lsSet(LS.saved, all);
  refreshSavedSelect();
  toast(`Deleted "${name}".`);
}

/* ===================================================================
   .YDK import / export
   =================================================================== */
function parseYDK(text) {
  const zones = { main: new Map(), extra: new Map(), side: new Map() };
  let section = 'main';
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim().toLowerCase();
    if (line === '#main') { section = 'main'; continue; }
    if (line === '#extra') { section = 'extra'; continue; }
    if (line === '!side' || line === '#side') { section = 'side'; continue; }
    if (/^\d+$/.test(line)) {
      const id = Number(line);
      zones[section].set(id, (zones[section].get(id) || 0) + 1);
    }
  }
  return zones;
}

async function importYDK(text) {
  const z = parseYDK(text);
  const ids = new Set([...z.main.keys(), ...z.extra.keys(), ...z.side.keys()]);
  if (!ids.size) return toast('No card IDs found in that file.', 'bad');
  const rows = [...ids].map(id => [id, z.main.get(id) || 0, z.extra.get(id) || 0, z.side.get(id) || 0, -1, 1]);
  await loadSerialized({ d: rows });
  const missing = [...state.cards.values()].filter(c => !c.known).length;
  toast(missing ? `Imported with ${missing} unidentified card${missing > 1 ? 's' : ''}.` : 'Deck imported.', missing ? 'bad' : 'good');
}

function exportYDK() {
  if (!state.cards.size) return toast('The deck is empty.', 'bad');
  const lines = ['#created by YGO Deck Builder & Probability Calculator'];
  const section = (head, zone) => {
    lines.push(head);
    [...state.cards.values()].sort(byName).forEach(c => { for (let i = 0; i < c.n[zone]; i++) lines.push(String(c.id)); });
  };
  section('#main', 'main');
  section('#extra', 'extra');
  section('!side', 'side');
  lines.push('');
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  const name = ($('#savedDecks').value || 'deck').replace(/[^\w\- ]+/g, '').trim() || 'deck';
  a.href = url; a.download = `${name}.ydk`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ===================================================================
   Deck editing
   =================================================================== */
function addCopy(rawId, zone) {
  const c = getOrCreateCard(rawId, zone);
  if (total(c) >= MAX_COPIES) {
    toast(`You already have ${MAX_COPIES} copies of ${c.name}.`, 'bad');
    return false;
  }
  c.n[zone]++;
  resetSiding(false);
  renderAll();
  return c;
}

function removeCopy(c, zone) {
  if (c.n[zone] > 0) c.n[zone]--;
  if (total(c) === 0) state.cards.delete(c.id);
  resetSiding(false);
  renderAll();
}

function clearDeck() {
  if (state.cards.size && !window.confirm('Clear the whole deck and all combo lines?')) return;
  state.cards.clear();
  state.combos = [];
  resetSiding(false);
  renderAll();
}

function nextRole(role) { return ROLES[(ROLES.indexOf(role) + 1) % ROLES.length]; }

function assignRole(c, role) {
  if (c.isExtra || c.role === role) return;
  c.role = role;
  remember(c);
  patchCardUI(c);
  afterRoleChange();
  if ($('#onlyUnassigned').checked) renderTable();
}

function setHopt(c, value) {
  if (c.isExtra) return;
  c.hopt = value;
  remember(c);
  patchCardUI(c);
  afterRoleChange();
}

function afterRoleChange() {
  renderLegend();
  scheduleSim();
  persist();
}

function patchCardUI(c) {
  $$(`.tile[data-card="${c.id}"]`).forEach(t => {
    if (!t.dataset.role) return;
    t.dataset.role = c.role;
    const banner = $('.role-banner', t);
    if (banner) banner.textContent = ROLE_LABELS[c.role];
    const h = $('.hopt', t);
    if (h) h.classList.toggle('on', c.hopt);
  });
  const row = $(`tr[data-card="${c.id}"]`);
  if (row) {
    row.dataset.role = c.role;
    $('select', row).value = c.role;
    $('select', row).dataset.role = c.role;
    $('input[type="checkbox"]', row).checked = c.hopt;
  }
  renderSiding();
}

function resetRoles() {
  if (!window.confirm('Set every card in this deck back to Unassigned?')) return;
  state.cards.forEach(c => { if (!c.isExtra) { c.role = 'unassigned'; remember(c); } });
  renderAll();
}

/* ===================================================================
   Rendering
   =================================================================== */
function artHTML(c) {
  return `<div class="art"><img class="card-img" src="${IMG_SMALL(c.id)}" data-id="${c.id}" alt="${esc(c.name)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"><span class="art-fb">${esc(c.name)}</span></div>`;
}

/* Image fallback chain: small art, then full-size art, then the card name. */
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.classList.contains('card-img')) return;
  if (!img.dataset.step) { img.dataset.step = '1'; img.src = IMG_FULL(img.dataset.id); }
  else if (img.parentElement) img.parentElement.classList.add('noimg');
}, true);

function renderAll() {
  renderCounts();
  renderGrid('main');
  renderGrid('extra');
  renderGrid('side');
  renderLegend();
  renderTable();
  renderSiding();
  renderCritSpecific();
  renderCombos();
  renderStatus();
  updateSearchBadges();
  clearHands();
  scheduleSim();
  persist();
}

function setChip(sel, text, ok) {
  const el = $(sel);
  el.textContent = text;
  el.classList.toggle('ok', ok === true);
  el.classList.toggle('warn', ok === false);
}

function renderCounts() {
  const t = { main: 0, extra: 0, side: 0 };
  state.cards.forEach(c => { t.main += c.n.main; t.extra += c.n.extra; t.side += c.n.side; });
  setChip('#mainCount', t.main, t.main === 0 ? null : t.main >= 40 && t.main <= 60);
  setChip('#extraCount', t.extra, t.extra === 0 ? null : t.extra <= 15);
  setChip('#sideCount', t.side, t.side === 0 ? null : t.side <= 15);
}

const EMPTY = {
  main: 'Your main deck is empty. Import a .ydk file (or drop it anywhere on the page), or search for cards above.',
  extra: 'No Extra Deck cards.',
  side: 'No side deck cards. Import a .ydk with a side deck, or choose "Side deck" in the search box.'
};

function tileHTML(c, zone) {
  const roled = !c.isExtra;
  return `<div class="tile" role="button" tabindex="0" data-card="${c.id}" data-zone="${zone}"${roled ? ` data-role="${c.role}"` : ''}>
    ${roled ? `<span class="chip hopt${c.hopt ? ' on' : ''}" data-act="hopt" title="Hard once per turn: extra copies in the same hand are dead">HOPT</span>` : ''}
    <button type="button" class="rm" data-act="rm" title="Remove one copy" aria-label="Remove one copy of ${esc(c.name)}">&#10005;</button>
    ${artHTML(c)}
    ${roled ? `<div class="role-banner">${ROLE_LABELS[c.role]}</div>` : ''}
    <div class="tile-name" title="${esc(c.name)}">${esc(c.name)}</div>
  </div>`;
}

function renderGrid(zone) {
  const el = $(`#${zone}Grid`);
  const list = [...state.cards.values()].filter(c => c.n[zone] > 0).sort(byName);
  if (!list.length) { el.innerHTML = `<div class="empty-state">${EMPTY[zone]}</div>`; return; }
  let html = '';
  for (const c of list) for (let i = 0; i < c.n[zone]; i++) html += tileHTML(c, zone);
  el.innerHTML = html;
}

function renderLegend() {
  const counts = Object.fromEntries(ROLES.map(r => [r, 0]));
  state.cards.forEach(c => { if (!c.isExtra) counts[c.role] += c.n.main; });
  $('#legend').innerHTML = ROLES.map(r =>
    `<button type="button" class="role-pill${state.brush === r ? ' active' : ''}" data-brush="${r}" data-role="${r}" aria-pressed="${state.brush === r}">${ROLE_LABELS[r]} <b>${counts[r]}</b></button>`
  ).join('');
  $('#brushHint').textContent = state.brush
    ? `Brush: ${ROLE_LABELS[state.brush]}. Click cards to paint them. Click the brush again to turn it off.`
    : 'Pick a role to use as a brush, or click a card to cycle its role. HOPT is the gold tag.';
  $('#mainGrid').classList.toggle('brushing', !!state.brush);
  $('#sideGrid').classList.toggle('brushing', !!state.brush);
}

function copiesText(c) {
  const parts = [];
  if (c.n.main) parts.push(`${c.n.main} main`);
  if (c.n.side) parts.push(`${c.n.side} side`);
  return parts.join(', ');
}

function renderTable() {
  const q = $('#tableFilter').value.trim().toLowerCase();
  const only = $('#onlyUnassigned').checked;
  const all = poolCards();
  const list = all.filter(c => (!q || c.name.toLowerCase().includes(q)) && (!only || c.role === 'unassigned'));
  $('#tableCount').textContent = `${list.length} card${list.length === 1 ? '' : 's'}`;
  const body = $('#roleTableBody');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="4" class="empty-cell">${all.length ? 'No cards match.' : 'No main or side deck cards yet.'}</td></tr>`;
    return;
  }
  body.innerHTML = list.map(c => `<tr data-card="${c.id}" data-role="${c.role}">
    <td><div class="t-card"><div class="thumb">${artHTML(c)}</div>
      <div class="t-name"><strong>${esc(c.name)}</strong><small>${esc(c.type || 'Card data unavailable')}</small></div></div></td>
    <td class="t-copies">${copiesText(c)}</td>
    <td><select class="role-select" data-role="${c.role}" aria-label="Role for ${esc(c.name)}">
      ${ROLES.map(r => `<option value="${r}"${c.role === r ? ' selected' : ''}>${ROLE_LABELS[r]}</option>`).join('')}
    </select></td>
    <td><label class="switch"><input type="checkbox"${c.hopt ? ' checked' : ''}><span>HOPT</span></label></td>
  </tr>`).join('');
}

/* ---------- Siding ---------- */
function sidingActive() {
  for (const v of state.siding.out.values()) if (v) return true;
  for (const v of state.siding.in.values()) if (v) return true;
  return false;
}

function resetSiding(render = true) {
  state.siding.out.clear();
  state.siding.in.clear();
  if (render) { renderSiding(); scheduleSim(); }
}

function sidingTile(c, act, tag) {
  return `<div class="tile mini" role="button" tabindex="0" data-card="${c.id}" data-role="${c.role}" data-act="${act}">
    ${tag ? `<span class="tag ${tag}">${tag === 'in' ? 'In' : 'Out'}</span>` : ''}
    ${artHTML(c)}<div class="role-banner">${ROLE_LABELS[c.role]}</div>
    <div class="tile-name" title="${esc(c.name)}">${esc(c.name)}</div></div>`;
}

function renderSiding() {
  let mainHTML = '', sideHTML = '', mainN = 0, sideN = 0, swaps = 0;
  for (const c of poolCards()) {
    const out = state.siding.out.get(c.id) || 0;
    const inn = state.siding.in.get(c.id) || 0;
    swaps += out;
    for (let i = 0; i < c.n.main - out; i++) { mainHTML += sidingTile(c, 'out'); mainN++; }
    for (let i = 0; i < inn; i++) { mainHTML += sidingTile(c, 'undo-in', 'in'); mainN++; }
    for (let i = 0; i < c.n.side - inn; i++) { sideHTML += sidingTile(c, 'in'); sideN++; }
    for (let i = 0; i < out; i++) { sideHTML += sidingTile(c, 'undo-out', 'out'); sideN++; }
  }
  $('#sidingMainList').innerHTML = mainHTML || `<div class="empty-state">No main deck cards.</div>`;
  $('#sidingSideList').innerHTML = sideHTML || `<div class="empty-state">No side deck cards.</div>`;
  setChip('#sideMainCount', mainN, mainN === 0 ? null : mainN >= 40 && mainN <= 60);
  setChip('#sideSideCount', sideN, null);
  const inTotal = [...state.siding.in.values()].reduce((a, b) => a + b, 0);
  $('#sidingSummary').textContent = swaps || inTotal
    ? `${swaps} card${swaps === 1 ? '' : 's'} sided out, ${inTotal} sided in.`
    : '';
}

function swapSiding(c, act) {
  const bump = (map, delta) => {
    const v = (map.get(c.id) || 0) + delta;
    if (v > 0) map.set(c.id, v); else map.delete(c.id);
  };
  if (act === 'out') bump(state.siding.out, 1);
  else if (act === 'undo-out') bump(state.siding.out, -1);
  else if (act === 'in') bump(state.siding.in, 1);
  else if (act === 'undo-in') bump(state.siding.in, -1);
  renderSiding();
  clearHands();
  scheduleSim();
}

/* ---------- Criteria + combos ---------- */
function renderCritSpecific() {
  const sel = $('#critSpecific');
  const pool = poolCards();
  sel.innerHTML = `<option value="">Any card</option>` +
    pool.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  if (pool.some(c => String(c.id) === String(state.crit.specific))) sel.value = String(state.crit.specific);
  else { sel.value = ''; state.crit.specific = ''; }
}

function sanitizeCombos() {
  const ids = new Set(poolCards().map(c => c.id));
  state.combos.forEach(cb => {
    cb.slots = cb.slots.map(s => (s.startsWith('C:') && !ids.has(+s.slice(2))) ? '' : s);
  });
  state.combos = state.combos.filter(cb => cb.slots.some(Boolean));
}

function comboOptions(selected, pool) {
  const generic = ['combo_a', 'combo_b', 'starter', 'extender', 'handtrap'].map(r =>
    `<option value="R:${r}"${selected === 'R:' + r ? ' selected' : ''}>Any ${ROLE_LABELS[r]}</option>`).join('');
  const cards = pool.map(c =>
    `<option value="C:${c.id}"${selected === 'C:' + c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  return `<option value=""${selected ? '' : ' selected'}>None</option>
    <optgroup label="Roles">${generic}</optgroup>
    <optgroup label="Cards">${cards}</optgroup>`;
}

function renderCombos() {
  sanitizeCombos();
  const box = $('#comboList');
  if (!state.combos.length) { box.innerHTML = ''; return; }
  const pool = poolCards();
  box.innerHTML = state.combos.map((cb, n) => `<div class="combo-row" data-combo="${cb.id}">
    <div class="combo-head"><span>Line ${n + 1}</span>
      <button type="button" class="btn btn-small btn-ghost-danger" data-act="rmcombo" aria-label="Remove combo line ${n + 1}">Remove</button></div>
    <div class="combo-selects">
      ${[0, 1, 2].map(i => `<select data-slot="${i}" aria-label="Combo line ${n + 1}, piece ${i + 1}">${comboOptions(cb.slots[i], pool)}</select>`).join('')}
    </div></div>`).join('');
}

function addCombo() {
  if (!poolCards().length) return toast('Add some cards first.', 'bad');
  state.combos.push({ id: ++comboSeq, slots: ['R:combo_a', 'R:combo_b', ''] });
  renderCombos();
  scheduleSim();
  persist();
}

/* ---------- Status banner ---------- */
function setBusy(msg) { state.busy = msg; renderStatus(); }

function renderStatus() {
  const bar = $('#statusBar');
  const unknown = [...state.cards.values()].filter(c => !c.known);
  if (state.busy) {
    bar.hidden = false; bar.className = 'status';
    bar.innerHTML = `<span class="spinner"></span><span>${esc(state.busy)}</span>`;
  } else if (unknown.length) {
    bar.hidden = false; bar.className = 'status warn';
    bar.innerHTML = `<span>${unknown.length} card${unknown.length > 1 ? 's' : ''} couldn't be identified, so ${unknown.length > 1 ? 'they show' : 'it shows'} as a card ID. The card database may be unreachable, or it doesn't know ${unknown.length > 1 ? 'those IDs' : 'that ID'}. Images can still load.</span>
      <button type="button" class="btn btn-small" data-act="retry">Retry</button>`;
  } else {
    bar.hidden = true;
  }
}

async function retryUnknown() {
  unresolved.clear();
  const snapshot = serialize();
  await loadSerialized(snapshot);
  const still = [...state.cards.values()].filter(c => !c.known).length;
  toast(still ? `${still} still unidentified.` : 'All cards identified.', still ? 'bad' : 'good');
}

/* ===================================================================
   Search
   =================================================================== */
let searchTimer = null, searchAbort = null;

function scheduleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 280); }

async function runSearch() {
  const q = $('#searchInput').value.trim();
  const box = $('#searchResults');
  const status = $('#searchStatus');
  if (searchAbort) searchAbort.abort();
  if (q.length < 2) { box.innerHTML = ''; status.textContent = ''; return; }

  searchAbort = new AbortController();
  status.textContent = 'Searching...';
  const url = /^\d{5,}$/.test(q) ? `${API}?id=${q}` : `${API}?fname=${encodeURIComponent(q)}&num=36&offset=0`;
  try {
    const res = await apiGet(url, searchAbort.signal);
    if (res.status === 'net') { box.innerHTML = ''; status.textContent = "Couldn't reach the card database. Check your connection and try again."; return; }
    if (res.status === 'notfound' || !res.data.length) { box.innerHTML = ''; status.textContent = 'No cards found.'; return; }
    lastResults = new Map(res.data.map(c => [c.id, c]));
    status.textContent = `${res.data.length} result${res.data.length === 1 ? '' : 's'}. Click a card to add a copy.`;
    box.innerHTML = res.data.map(c => `<button type="button" class="search-item" data-card="${c.id}" title="Add ${esc(c.name)}">
      <span class="own"></span>${artHTML({ id: c.id, name: c.name })}<span class="name">${esc(c.name)}</span></button>`).join('');
    updateSearchBadges();
  } catch (e) {
    if (e.name !== 'AbortError') status.textContent = 'Search failed. Try again.';
  }
}

function updateSearchBadges() {
  $$('#searchResults .search-item').forEach(el => {
    const rec = lastResults.get(+el.dataset.card);
    const owned = rec ? ((cardCache[rec.id] && state.cards.get(cardCache[rec.id].i)) || state.cards.get(rec.id)) : null;
    $('.own', el).textContent = owned ? `x${total(owned)}` : '';
  });
}

function addFromSearch(rec) {
  ingest([rec]);
  saveCardCache();
  const zone = state.addTo === 'side' ? 'side' : (EXTRA_RE.test(rec.type || '') ? 'extra' : 'main');
  const c = addCopy(rec.id, zone);
  if (c) toast(`Added ${c.name} to ${zone === 'main' ? 'the main deck' : zone === 'extra' ? 'the extra deck' : 'the side deck'} (${total(c)}/${MAX_COPIES}).`, 'good');
}

/* ===================================================================
   Simulation engine
   =================================================================== */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Build the numeric model of the deck. `useSiding` applies sided-in / sided-out copies. */
function buildSim(useSiding) {
  const pool = poolCards();
  const idxOf = new Map(pool.map((c, i) => [c.id, i]));
  const deck = [];
  pool.forEach((c, i) => {
    let n = c.n.main;
    if (useSiding) n += (state.siding.in.get(c.id) || 0) - (state.siding.out.get(c.id) || 0);
    for (let k = 0; k < n; k++) deck.push(i);
  });

  const roleArr = new Int8Array(pool.length);
  const hoptArr = new Uint8Array(pool.length);
  pool.forEach((c, i) => { roleArr[i] = ROLE_IDX[c.role]; hoptArr[i] = c.hopt ? 1 : 0; });

  // Specific cards first, roles second, so greedy slot matching can't steal a card
  // that a more specific slot needs.
  const combos = [];
  for (const cb of state.combos) {
    const slots = [];
    let ok = true;
    for (const s of cb.slots) {
      if (!s) continue;
      if (s[0] === 'C') {
        const ix = idxOf.get(+s.slice(2));
        if (ix === undefined) { ok = false; break; }
        slots.push({ t: 1, v: ix });
      } else slots.push({ t: 2, v: ROLE_IDX[s.slice(2)] });
    }
    if (ok && slots.length) { slots.sort((a, b) => a.t - b.t); combos.push(slots); }
  }
  return { pool, idxOf, deck: Int32Array.from(deck), roleArr, hoptArr, combos };
}

function makeCtx(sim, h) {
  return {
    hand: new Int32Array(h),
    seen: new Int32Array(sim.pool.length),
    cnt: new Int32Array(sim.pool.length),
    st: new Int32Array(9),      // 0 S, 1 CA, 2 CB, 3 E, 4 H, 5 G, 6 dead dups, 7 combo hit, 8 dead mask
    stamp: 0,
    roleArr: sim.roleArr, hoptArr: sim.hoptArr, combos: sim.combos
  };
}

/* Score one hand (ctx.hand). Shared by the Monte Carlo loop and the test-hand button. */
function evalHand(h, ctx) {
  const { hand, seen, cnt, st, roleArr, hoptArr, combos } = ctx;
  const stamp = ++ctx.stamp;
  let S = 0, CA = 0, CB = 0, E = 0, H = 0, G = 0, D = 0, score = 0, dead = 0;

  for (let i = 0; i < h; i++) {
    const u = hand[i];
    if (seen[u] !== stamp) { seen[u] = stamp; cnt[u] = 1; } else cnt[u]++;
    if (cnt[u] > 1 && hoptArr[u] === 1) { D++; score -= 3; dead |= (1 << i); continue; }
    switch (roleArr[u]) {
      case 1: S++; score += 12; break;
      case 2: CA++; score += 4; break;
      case 3: CB++; score += 4; break;
      case 4: E++; score += 6; break;
      case 5: H++; score += 7; break;
      case 6: G++; score -= 12; break;
    }
  }

  let combo = 0;
  for (let c = 0; c < combos.length; c++) {
    const slots = combos[c];
    let used = dead, ok = true;
    for (let s = 0; s < slots.length && ok; s++) {
      const rq = slots[s];
      let matched = false;
      for (let p = 0; p < h; p++) {
        if (used & (1 << p)) continue;
        const ci = hand[p];
        if (rq.t === 1 ? ci === rq.v : roleArr[ci] === rq.v) { used |= (1 << p); matched = true; break; }
      }
      if (!matched) ok = false;
    }
    if (ok) { combo = 1; score += 18; }
  }

  if ((S >= 1 || combo) && E >= 1) score += 8;
  if ((S >= 1 || combo) && H >= 1) score += 8;

  st[0] = S; st[1] = CA; st[2] = CB; st[3] = E; st[4] = H; st[5] = G; st[6] = D; st[7] = combo; st[8] = dead;
  return score;
}

function simulate(sim, h, trials, seed, crit) {
  const deck = Int32Array.from(sim.deck);
  const n = deck.length;
  const ctx = makeCtx(sim, h);
  const { hand, st } = ctx;
  const rnd = mulberry32(seed);

  const reqS = +crit.starters || 0, reqCA = +crit.comboA || 0, reqCB = +crit.comboB || 0;
  const reqE = +crit.extenders || 0, reqH = +crit.handtraps || 0;
  const maxG = Number.isFinite(+crit.maxGarnets) ? +crit.maxGarnets : 6;
  const brickG = Math.max(1, +crit.brickGarnets || 2);
  const specId = crit.specific ? +crit.specific : 0;
  const specIdx = specId ? (sim.idxOf.has(specId) ? sim.idxOf.get(specId) : -2) : -1;
  const specQty = Math.max(1, +crit.specificQty || 1);

  let playable = 0, brick = 0, target = 0, dupSum = 0;
  const sums = new Float64Array(6);
  const has = new Int32Array(6);
  let bestScore = -1e9;
  const bestHand = new Int32Array(h);
  let bestDead = 0;

  for (let t = 0; t < trials; t++) {
    for (let i = 0; i < h; i++) {
      const r = i + ((rnd() * (n - i)) | 0);
      const tmp = deck[i]; deck[i] = deck[r]; deck[r] = tmp;
      hand[i] = deck[i];                       // the card that was actually drawn
    }
    const score = evalHand(h, ctx);
    const S = st[0], CA = st[1], CB = st[2], E = st[3], H = st[4], G = st[5];

    const isPlayable = S >= 1 || st[7] === 1;
    if (isPlayable) playable++;
    if (!isPlayable || G >= brickG) brick++;

    let meets = S >= reqS && CA >= reqCA && CB >= reqCB && E >= reqE && H >= reqH && G <= maxG;
    if (meets && specIdx !== -1) {
      meets = specIdx >= 0 && ctx.seen[specIdx] === ctx.stamp && ctx.cnt[specIdx] >= specQty;
    }
    if (meets) target++;

    sums[0] += S; sums[1] += CA; sums[2] += CB; sums[3] += E; sums[4] += H; sums[5] += G;
    if (S) has[0]++; if (CA) has[1]++; if (CB) has[2]++; if (E) has[3]++; if (H) has[4]++; if (G) has[5]++;
    dupSum += st[6];

    if (score > bestScore) { bestScore = score; bestHand.set(hand); bestDead = st[8]; }
  }
  return { trials, playable, brick, target, sums, has, dupSum, bestScore, bestHand, bestDead };
}

let simTimer = null;
function scheduleSim() { clearTimeout(simTimer); simTimer = setTimeout(runSimulation, 60); }

const AVG_ROWS = [
  ['starter', 'Usable starters', 0], ['combo_a', 'Combo piece A', 1], ['combo_b', 'Combo piece B', 2],
  ['extender', 'Usable extenders', 3], ['handtrap', 'Usable handtraps', 4], ['garnet', 'Garnets drawn', 5]
];

function pct(n, d) { return `${((n / d) * 100).toFixed(1)}%`; }

function setDelta(id, diff, goodWhenUp) {
  const el = $(id);
  if (diff === null) { el.textContent = ''; el.className = 'delta'; return; }
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0) { el.textContent = 'no change'; el.className = 'delta flat'; return; }
  const up = rounded > 0;
  el.textContent = `${up ? '+' : ''}${rounded.toFixed(1)}`;
  el.className = `delta ${up === goodWhenUp ? 'up' : 'down'}`;
}

function handHTML(indices, pool, deadMask) {
  const tiles = Array.from(indices).map((ix, pos) => {
    const c = pool[ix];
    const dead = (deadMask >> pos) & 1;
    return `<div class="tile mini${dead ? ' dead' : ''}" data-card="${c.id}" data-role="${c.role}" title="${esc(c.name)}">
      ${dead ? '<span class="dead-tag">Dead</span>' : ''}${artHTML(c)}<div class="role-banner">${ROLE_LABELS[c.role]}</div></div>`;
  });
  return tiles.join('');
}

function runSimulation() {
  const h = state.handSize;
  const sim = buildSim(true);
  const note = $('#simNote');
  const dash = '--';

  if (sim.deck.length < h) {
    ['playableRate', 'brickRate', 'targetRate'].forEach(id => { $('#' + id).textContent = dash; });
    ['#playableDelta', '#brickDelta', '#targetDelta'].forEach(id => setDelta(id, null));
    ['#miniPlayable', '#miniBrick', '#miniTarget'].forEach(id => { $(id).textContent = dash; });
    $('#avgList').innerHTML = '';
    $('#bestHand').innerHTML = '';
    $('#bestHandScore').textContent = '';
    $('#simSpeed').textContent = '0 ms';
    note.textContent = `The main deck needs at least ${h} cards to draw a hand.`;
    return;
  }
  note.textContent = '';

  const t0 = performance.now();
  const res = simulate(sim, h, state.trials, state.seed, state.crit);
  let base = null;
  if (sidingActive()) {
    const baseSim = buildSim(false);
    if (baseSim.deck.length >= h) base = simulate(baseSim, h, state.trials, state.seed, state.crit);
  }
  const ms = (performance.now() - t0).toFixed(0);
  const T = res.trials;

  $('#simSpeed').textContent = `${ms} ms, ${T / 1000}k hands`;
  $('#playableRate').textContent = pct(res.playable, T);
  $('#brickRate').textContent = pct(res.brick, T);
  $('#targetRate').textContent = pct(res.target, T);
  $('#miniPlayable').textContent = pct(res.playable, T);
  $('#miniBrick').textContent = pct(res.brick, T);
  $('#miniTarget').textContent = pct(res.target, T);

  setDelta('#playableDelta', base ? (res.playable - base.playable) / T * 100 : null, true);
  setDelta('#brickDelta', base ? (res.brick - base.brick) / T * 100 : null, false);
  setDelta('#targetDelta', base ? (res.target - base.target) / T * 100 : null, true);

  $('#avgList').innerHTML = AVG_ROWS.map(([role, label, i]) =>
    `<div class="avg-row" data-role="${role}"><span><span class="dot"></span>${label}</span><b>${(res.sums[i] / T).toFixed(2)}</b><i>${pct(res.has[i], T)} at least 1</i></div>`
  ).join('') + `<div class="avg-row"><span><span class="dot" style="background:var(--muted)"></span>Dead HOPT duplicates</span><b>${(res.dupSum / T).toFixed(2)}</b><i></i></div>`;

  $('#bestHandScore').textContent = `Score ${res.bestScore}`;
  const bh = $('#bestHand');
  bh.style.setProperty('--h', h);
  bh.innerHTML = handHTML(res.bestHand, sim.pool, res.bestDead);
}

/* ---------- Test hand ---------- */
function clearHands() {
  $('#testHand').innerHTML = '';
  const v = $('#testHandVerdict');
  v.textContent = 'Draw a random hand from the deck as it stands now.';
  v.className = 'hint';
}

function drawTestHand() {
  const h = state.handSize;
  const sim = buildSim(true);
  if (sim.deck.length < h) return toast(`The main deck needs at least ${h} cards.`, 'bad');
  const deck = Int32Array.from(sim.deck);
  const ctx = makeCtx(sim, h);
  for (let i = 0; i < h; i++) {
    const r = i + ((Math.random() * (deck.length - i)) | 0);
    const tmp = deck[i]; deck[i] = deck[r]; deck[r] = tmp;
    ctx.hand[i] = deck[i];
  }
  const score = evalHand(h, ctx);
  const st = ctx.st;
  const playable = st[0] >= 1 || st[7] === 1;
  const brick = !playable || st[5] >= Math.max(1, +state.crit.brickGarnets || 2);
  const box = $('#testHand');
  box.style.setProperty('--h', h);
  box.innerHTML = handHTML(ctx.hand, sim.pool, st[8]);
  const v = $('#testHandVerdict');
  v.textContent = `${brick ? 'Brick' : 'Playable'}. Score ${score}.${st[6] ? ` ${st[6]} dead HOPT duplicate${st[6] > 1 ? 's' : ''}.` : ''}`;
  v.className = brick ? 'hint bad' : 'hint ok';
}

/* ===================================================================
   UI plumbing
   =================================================================== */
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  const box = $('#toasts');
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), 2800);
}

function switchTab(name) {
  $$('.tab-btn').forEach(b => {
    const on = b.dataset.tab === name;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  $$('.tab-pane').forEach(p => { p.hidden = p.id !== `tab-${name}`; });
}

function syncInputsFromState() {
  $$('[data-crit]').forEach(el => {
    if (el.id === 'critSpecific') return;
    el.value = state.crit[el.dataset.crit];
  });
  $('#handSize').value = String(state.handSize);
  $('#trials').value = String(state.trials);
  $('#addTo').value = state.addTo;
}

/* ---------- Card hover preview (desktop) ---------- */
function setupPreview() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  const box = $('#preview'), img = $('img', box), label = $('span', box);
  let current = null;
  const place = e => {
    const w = 272, hgt = 400;
    let x = e.clientX + 20;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 20;
    box.style.left = `${Math.max(8, x)}px`;
    box.style.top = `${clamp(e.clientY - hgt / 2, 8, window.innerHeight - hgt - 8)}px`;
  };
  img.addEventListener('load', () => { img.style.visibility = 'visible'; });
  img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-card]');
    if (!el) { box.hidden = true; return; }
    const id = el.dataset.card;
    if (id !== current) {
      current = id;
      img.style.visibility = 'hidden';
      img.src = IMG_FULL(id);
      const c = state.cards.get(+id) || lastResults.get(+id);
      label.textContent = c ? c.name : '';
    }
    box.hidden = false;
    place(e);
  });
  document.addEventListener('mousemove', e => { if (!box.hidden) place(e); });
  document.addEventListener('mouseleave', () => { box.hidden = true; });
  document.addEventListener('scroll', () => { box.hidden = true; }, true);
}

function bindUI() {
  // Header actions
  $('#ydkInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (file) await importYDK(await file.text());
  });
  $('#exportBtn').addEventListener('click', exportYDK);
  $('#shareBtn').addEventListener('click', copyShareLink);
  $('#clearBtn').addEventListener('click', clearDeck);
  $('#saveDeckBtn').addEventListener('click', saveCurrentDeck);
  $('#deleteDeckBtn').addEventListener('click', deleteSavedDeck);
  $('#savedDecks').addEventListener('change', e => { if (e.target.value) loadSavedDeck(e.target.value); });
  $('#handSize').addEventListener('change', e => { state.handSize = +e.target.value; clearHands(); scheduleSim(); persist(); });
  $('#trials').addEventListener('change', e => { state.trials = +e.target.value; scheduleSim(); persist(); });
  $('#rerollBtn').addEventListener('click', () => { state.seed = (Math.random() * 0xFFFFFFFF) >>> 0; scheduleSim(); });

  // Drag and drop a .ydk anywhere
  let dragDepth = 0;
  const overlay = $('#dropOverlay');
  window.addEventListener('dragenter', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { dragDepth++; overlay.hidden = false; } });
  window.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) overlay.hidden = true; });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', async e => {
    e.preventDefault(); dragDepth = 0; overlay.hidden = true;
    const file = e.dataTransfer && e.dataTransfer.files[0];
    if (!file) return;
    if (!/\.ydk$/i.test(file.name)) return toast('That is not a .ydk file.', 'bad');
    await importYDK(await file.text());
  });

  // Tabs
  $$('.tab-btn').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // Search
  $('#searchInput').addEventListener('input', scheduleSearch);
  $('#addTo').addEventListener('change', e => { state.addTo = e.target.value; });
  $('#searchResults').addEventListener('click', e => {
    const item = e.target.closest('.search-item');
    const rec = item && lastResults.get(+item.dataset.card);
    if (rec) addFromSearch(rec);
  });

  // Role brush
  $('#legend').addEventListener('click', e => {
    const pill = e.target.closest('[data-brush]');
    if (!pill) return;
    state.brush = state.brush === pill.dataset.brush ? null : pill.dataset.brush;
    renderLegend();
  });
  $('#resetRolesBtn').addEventListener('click', resetRoles);

  // Deck grids
  const gridClick = e => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    const c = state.cards.get(+tile.dataset.card);
    if (!c) return;
    const act = e.target.closest('[data-act]');
    const kind = act && act.dataset.act;
    if (kind === 'rm') return removeCopy(c, tile.dataset.zone);
    if (c.isExtra) return;
    if (kind === 'hopt') return setHopt(c, !c.hopt);
    assignRole(c, state.brush || nextRole(c.role));
  };
  ['mainGrid', 'extraGrid', 'sideGrid'].forEach(id => {
    const el = $('#' + id);
    el.addEventListener('click', gridClick);
    el.addEventListener('contextmenu', e => {
      const tile = e.target.closest('.tile');
      if (!tile) return;
      e.preventDefault();
      const c = state.cards.get(+tile.dataset.card);
      if (c) removeCopy(c, tile.dataset.zone);
    });
    el.addEventListener('keydown', e => {
      const tile = e.target.closest('.tile');
      if (!tile || e.target !== tile) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.click(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const c = state.cards.get(+tile.dataset.card);
        if (c) removeCopy(c, tile.dataset.zone);
      }
    });
  });

  // Role table
  $('#tableFilter').addEventListener('input', renderTable);
  $('#onlyUnassigned').addEventListener('change', renderTable);
  $('#roleTableBody').addEventListener('change', e => {
    const tr = e.target.closest('tr[data-card]');
    const c = tr && state.cards.get(+tr.dataset.card);
    if (!c) return;
    if (e.target.matches('select')) assignRole(c, e.target.value);
    else if (e.target.matches('input[type="checkbox"]')) setHopt(c, e.target.checked);
  });

  // Siding
  const sidingClick = e => {
    const tile = e.target.closest('.tile[data-act]');
    const c = tile && state.cards.get(+tile.dataset.card);
    if (c) swapSiding(c, tile.dataset.act);
  };
  $('#sidingMainList').addEventListener('click', sidingClick);
  $('#sidingSideList').addEventListener('click', sidingClick);
  ['#sidingMainList', '#sidingSideList'].forEach(sel => $(sel).addEventListener('keydown', e => {
    const tile = e.target.closest('.tile[data-act]');
    if (tile && e.target === tile && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tile.click(); }
  }));
  $('#resetSidingBtn').addEventListener('click', () => resetSiding(true));

  // Hand goal inputs
  $$('[data-crit]').forEach(el => {
    el.addEventListener('input', () => {
      const key = el.dataset.crit;
      if (el.tagName === 'SELECT') state.crit[key] = el.value;
      else {
        const min = +el.min, max = +el.max;
        const v = parseInt(el.value, 10);
        state.crit[key] = Number.isFinite(v) ? clamp(v, min, max) : min;
      }
      scheduleSim();
      persist();
    });
  });

  // Combos
  $('#addComboBtn').addEventListener('click', addCombo);
  $('#comboList').addEventListener('change', e => {
    const row = e.target.closest('.combo-row');
    const cb = row && state.combos.find(c => c.id === +row.dataset.combo);
    if (cb && e.target.matches('select')) {
      cb.slots[+e.target.dataset.slot] = e.target.value;
      scheduleSim(); persist();
    }
  });
  $('#comboList').addEventListener('click', e => {
    const btn = e.target.closest('[data-act="rmcombo"]');
    const row = btn && btn.closest('.combo-row');
    if (!row) return;
    state.combos = state.combos.filter(c => c.id !== +row.dataset.combo);
    renderCombos(); scheduleSim(); persist();
  });

  // Test hand + status banner
  $('#drawHandBtn').addEventListener('click', drawTestHand);
  $('#statusBar').addEventListener('click', e => { if (e.target.closest('[data-act="retry"]')) retryUnknown(); });
}

/* ===================================================================
   Start
   =================================================================== */
async function init() {
  bindUI();
  setupPreview();
  refreshSavedSelect();
  syncInputsFromState();

  const shared = readShareHash();
  if (location.hash.startsWith('#d=')) history.replaceState(null, '', location.pathname + location.search);

  if (shared) {
    await loadSerialized(shared);
    toast('Loaded the shared deck.', 'good');
    return;
  }
  const saved = lsGet(LS.state);
  if (saved && saved.v === 2) await loadSerialized(saved);
  else renderAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
