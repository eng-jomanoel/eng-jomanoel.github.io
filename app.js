'use strict';

/* ===================================================================
   YGO Deck Builder & Probability Calculator
   =================================================================== */

/* ---------- Constants ---------- */
const API = 'https://db.ygoprodeck.com/api/v7/cardinfo.php';
const IMG_SMALL = id => `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`;
const IMG_FULL = id => `https://images.ygoprodeck.com/images/cards/${id}.jpg`;

// 'garnet' is the internal key for the Brick role. It stays so saved decks and share links keep working.
const ROLES = ['unassigned', 'starter', 'combo_a', 'combo_b', 'extender', 'handtrap', 'garnet'];
const ROLE_IDX = Object.fromEntries(ROLES.map((r, i) => [r, i]));
const EXTRA_RE = /fusion|synchro|xyz|link/i;
const MAX_COPIES = 3;
const SEARCH_LANGS = ['en', 'pt', 'fr', 'de', 'it'];

// Hand scoring (used for "best hand" and the test hand). Playable hands always outrank unplayable ones.
const SCORE = { playable: 50, starter: 20, comboPiece: 4, extender: 6, handtrap: 7, brick: -6, dead: -3, comboHit: 10, synergy: 8 };

const LS = {
  state: 'ygocalc.state.v2',
  cards: 'ygocalc.cards.v1',
  roles: 'ygocalc.roles.v1',
  saved: 'ygocalc.saved.v1',
  lang: 'ygocalc.lang'
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
  lang: 'en',
  cards: new Map(),            // canonical card id -> card record
  combos: [],                  // { id, slots: ['R:combo_a' | 'C:12345' | '', x3] }
  crit: {
    starters: 0, comboA: 0, comboB: 0, extenders: 0, handtraps: 0,
    maxBricks: 0, specific: '', specificQty: 1
  },
  handSize: 5,
  trials: 100000,
  seed: 0xC0FFEE,
  siding: { out: new Map(), in: new Map() },
  brush: null,
  addTo: 'auto',
  busy: ''
};
/*  card record: { id, name, type, known, isExtra, role, limit, n: { main, extra, side } }
    limit = how many copies in one hand can be used. 0 means no limit, 1 means hard once per turn. */

let cardCache = lsGet(LS.cards) || {};      // any id (incl. alt art) -> { i: canonicalId, n: English name, t: type }
let roleMemory = lsGet(LS.roles) || {};     // canonical id -> [roleIdx, limit]
const unresolved = new Set();               // ids the API didn't know about this session
let comboSeq = 0;
let lastResults = new Map();                // search results, by id

/* ===================================================================
   Translations
   =================================================================== */
const I18N = {
  en: {
    'app.title': 'YGO Deck Builder & Probability Calculator',
    'app.subtitle': 'Simulate your opening hands and see how consistent the deck really is.',
    'btn.import': 'Import .YDK', 'btn.export': 'Export .YDK', 'btn.share': 'Copy share link',
    'btn.save': 'Save deck', 'btn.delete': 'Delete', 'btn.clear': 'Clear deck',
    'btn.resetRoles': 'Reset roles', 'btn.resetSiding': 'Reset siding', 'btn.addCombo': 'Add combo',
    'btn.draw': 'Draw a hand', 'btn.retry': 'Retry',
    'aria.saved': 'Saved decks', 'aria.hand': 'Hand size', 'aria.trials': 'Simulated hands', 'aria.lang': 'Language',
    'saved.none': 'No saved decks', 'saved.pick': 'Saved decks',
    'opt.first': 'Going 1st (5 cards)', 'opt.second': 'Going 2nd (6 cards)', 'opt.hands': '{n}k hands',
    'tab.grid': 'Deck grid', 'tab.table': 'Role table', 'tab.siding': 'Siding',
    'add.title': 'Add cards', 'add.to': 'Add to', 'add.auto': 'Main / Extra (automatic)', 'add.side': 'Side deck',
    'search.ph': 'Search by card name in any language, or paste a card ID',
    'deck.main': 'Main deck', 'deck.extra': 'Extra deck', 'deck.side': 'Side deck',
    'table.title': 'Roles and uses', 'filter.ph': 'Filter by name', 'only.unassigned': 'Only unassigned',
    'table.hint': "Extra deck cards don't need a role, so they're not listed here.",
    'table.hint2': 'Uses per turn: copies beyond that limit in the same hand are dead and count for nothing.',
    'th.card': 'Card', 'th.copies': 'Copies', 'th.role': 'Role', 'th.uses': 'Uses per turn',
    'siding.title': 'Siding simulator',
    'siding.hint': 'Click a card to swap it between main and side. The results panel compares the sided deck against your original list.',
    'siding.summary': '{out} sided out, {in} sided in.',
    'help.summary': 'How this works',
    'help.1': "<strong>Roles.</strong> Give each main or side deck card a role. A <em>Starter</em> can get your play going alone. <em>Combo A</em> and <em>Combo B</em> are pieces that only work together. An <em>Extender</em> needs a starter first. A <em>Handtrap</em> is interaction you want in hand. A <em>Brick</em> is a card you never want to draw.",
    'help.2': '<strong>Fast assigning.</strong> Pick a role in the legend to use it as a brush, then click cards to paint them. With no brush selected, clicking a card cycles through the roles.',
    'help.3': '<strong>Uses per turn.</strong> Set this in the role table. A hard once per turn card is "Once": a second copy in the same hand is dead and doesn\'t count as a starter, extender or combo piece. A card you can use twice allows two copies, and "No limit" cards never go dead.',
    'help.4': "<strong>Playable and brick.</strong> A hand is playable when it has at least one starter, or when a combo line matches. Otherwise it's a brick. Brick cards in your hand don't make a playable hand a brick on their own.",
    'help.5': '<strong>Simulation.</strong> The calculator shuffles your main deck and draws a hand for every simulated trial. The random seed is fixed so the same deck always shows the same numbers. Press the reroll button to see how much the result moves. The best hand shown is the highest-scoring one that stays within your "Max bricks" limit, and starters count for the most.',
    'help.6': '<strong>Saving.</strong> Your deck, roles and combos save automatically in this browser. Roles are remembered per card, so cards you already tagged keep their role in other decks. Use "Copy share link" to send your deck with roles and combos to a friend.',
    'results.title': 'Results', 'results.reroll': 'Run again with a new random seed',
    'stat.playable': 'Playable (starter or combo)', 'stat.brick': 'Brick (nothing playable)', 'stat.goal': 'Meets your hand goal',
    'avg.title': 'Average opening hand',
    'avg.starter': 'Usable starters', 'avg.combo_a': 'Combo piece A', 'avg.combo_b': 'Combo piece B',
    'avg.extender': 'Usable extenders', 'avg.handtrap': 'Usable handtraps', 'avg.garnet': 'Brick cards drawn',
    'avg.dead': 'Dead extra copies', 'avg.atleast': '{p} at least 1',
    'goal.title': 'Hand goal', 'goal.starters': 'Min starters', 'goal.comboA': 'Min combo A', 'goal.comboB': 'Min combo B',
    'goal.extenders': 'Min extenders', 'goal.handtraps': 'Min handtraps', 'goal.maxBricks': 'Max bricks',
    'goal.mustDraw': 'Must draw', 'goal.any': 'Any card', 'goal.copies': 'Copies',
    'combo.title': 'Combo lines',
    'combo.hint': 'A hand that matches any line counts as playable. Each line needs every card or role you pick, using different cards.',
    'combo.line': 'Line {n}', 'combo.remove': 'Remove', 'combo.none': 'None', 'combo.roles': 'Roles', 'combo.cards': 'Cards',
    'combo.any': 'Any {role}', 'combo.piece': 'Combo line {n}, piece {p}',
    'hands.title': 'Test hand', 'hands.hint': 'Draw a random hand from the deck as it stands now.',
    'hands.best': 'Best hand found', 'hands.score': 'Score {n}',
    'best.none': 'Best hand found with no brick cards.',
    'best.one': 'Best hand found with at most 1 brick card.',
    'best.many': 'Best hand found with at most {n} brick cards.',
    'best.fallback': 'No simulated hand stayed within the brick limit, so this is the best hand overall.',
    'verdict.playable': 'Playable. Score {s}.', 'verdict.brick': 'Brick: nothing playable. Score {s}.',
    'verdict.dead_1': ' 1 dead extra copy.', 'verdict.dead_n': ' {n} dead extra copies.',
    'mini.playable': 'playable', 'mini.brick': 'brick', 'mini.goal': 'goal',
    'footer': 'Card data and images come from <a href="https://ygoprodeck.com/" target="_blank" rel="noopener">YGOPRODeck</a>. Yu-Gi-Oh! is a trademark of Konami. This is a fan project and isn\'t affiliated with Konami.',
    'role.unassigned': 'Unassigned', 'role.starter': 'Starter', 'role.combo_a': 'Combo A', 'role.combo_b': 'Combo B',
    'role.extender': 'Extender', 'role.handtrap': 'Handtrap', 'role.garnet': 'Brick',
    'limit.0': 'No limit', 'limit.1': 'Once (HOPT)', 'limit.2': 'Twice', 'limit.3': '3 times',
    'tag.dead': 'Dead', 'tag.in': 'In', 'tag.out': 'Out',
    'tile.remove': 'Remove one copy', 'tile.remove.named': 'Remove one copy of {name}',
    'brush.on': 'Brush: {role}. Click cards to paint them. Click the brush again to turn it off.',
    'brush.off': 'Pick a role to use as a brush, or click a card to cycle its role.',
    'empty.main': 'Your main deck is empty. Import a .ydk file (or drop it anywhere on the page), or search for cards above.',
    'empty.extra': 'No Extra Deck cards.',
    'empty.side': 'No side deck cards. Import a .ydk with a side deck, or choose "Side deck" in the search box.',
    'empty.sidingMain': 'No main deck cards.', 'empty.sidingSide': 'No side deck cards.',
    'copies.main': '{n} main', 'copies.side': '{n} side',
    'table.count_1': '1 card', 'table.count_n': '{n} cards',
    'table.nomatch': 'No cards match.', 'table.empty': 'No main or side deck cards yet.',
    'table.nodata': 'Card data unavailable', 'table.roleFor': 'Role for {name}', 'table.usesFor': 'Uses per turn for {name}',
    'status.loading': 'Loading card data ({a} of {b})',
    'status.unknown_1': "1 card couldn't be identified, so it shows as a card ID. The card database may be unreachable, or it doesn't know that ID. Images can still load.",
    'status.unknown_n': "{n} cards couldn't be identified, so they show as card IDs. The card database may be unreachable, or it doesn't know those IDs. Images can still load.",
    'retry.still': '{n} still unidentified.', 'retry.all': 'All cards identified.',
    'search.searching': 'Searching...',
    'search.net': "Couldn't reach the card database. Check your connection and try again.",
    'search.none': 'No cards found.',
    'search.count_1': '1 result. Click a card to add a copy.', 'search.count_n': '{n} results. Click a card to add a copy.',
    'search.fail': 'Search failed. Try again.', 'search.add': 'Add {name}',
    'sim.need': 'The main deck needs at least {n} cards to draw a hand.', 'sim.needToast': 'The main deck needs at least {n} cards.',
    'sim.speed': '{ms} ms, {n}k hands', 'delta.same': 'no change',
    'toast.addFirst': 'Add some cards first.',
    'toast.shareCopied': 'Share link copied. It includes your roles and combos.',
    'toast.shared': 'Loaded the shared deck.',
    'share.prompt': 'Copy this link:',
    'save.nothing': 'Nothing to save yet.', 'save.prompt': 'Name this deck:', 'save.replace': 'Replace the saved deck "{name}"?',
    'save.fail': 'Could not save. Browser storage may be full or blocked.', 'save.ok': 'Saved "{name}".',
    'load.ok': 'Loaded "{name}".', 'del.pick': 'Pick a saved deck first.', 'del.confirm': 'Delete the saved deck "{name}"?', 'del.ok': 'Deleted "{name}".',
    'import.none': 'No card IDs found in that file.', 'import.ok': 'Deck imported.',
    'import.missing_1': 'Imported with 1 unidentified card.', 'import.missing_n': 'Imported with {n} unidentified cards.',
    'export.empty': 'The deck is empty.',
    'add.limit': 'You already have {max} copies of {name}.', 'add.done': 'Added {name} to {zone} ({n}/{max}).',
    'zone.main': 'the main deck', 'zone.extra': 'the extra deck', 'zone.side': 'the side deck',
    'clear.confirm': 'Clear the whole deck and all combo lines?',
    'roles.resetConfirm': 'Set every card in this deck back to Unassigned?',
    'drop.overlay': 'Drop your .ydk file to import it', 'drop.notydk': 'That is not a .ydk file.'
  },

  pt: {
    'app.title': 'YGO Deck Builder & Calculadora de Probabilidade',
    'app.subtitle': 'Simule suas mãos iniciais e veja o quanto o deck é consistente de verdade.',
    'btn.import': 'Importar .YDK', 'btn.export': 'Exportar .YDK', 'btn.share': 'Copiar link para compartilhar',
    'btn.save': 'Salvar deck', 'btn.delete': 'Excluir', 'btn.clear': 'Limpar deck',
    'btn.resetRoles': 'Redefinir funções', 'btn.resetSiding': 'Redefinir siding', 'btn.addCombo': 'Adicionar combo',
    'btn.draw': 'Comprar uma mão', 'btn.retry': 'Tentar de novo',
    'aria.saved': 'Decks salvos', 'aria.hand': 'Tamanho da mão', 'aria.trials': 'Mãos simuladas', 'aria.lang': 'Idioma',
    'saved.none': 'Nenhum deck salvo', 'saved.pick': 'Decks salvos',
    'opt.first': 'Jogando primeiro (5 cartas)', 'opt.second': 'Jogando depois (6 cartas)', 'opt.hands': '{n}k mãos',
    'tab.grid': 'Grade do deck', 'tab.table': 'Tabela de funções', 'tab.siding': 'Siding',
    'add.title': 'Adicionar cartas', 'add.to': 'Adicionar em', 'add.auto': 'Main / Extra (automático)', 'add.side': 'Side deck',
    'search.ph': 'Busque pelo nome da carta em qualquer idioma, ou cole o ID da carta',
    'deck.main': 'Main deck', 'deck.extra': 'Extra deck', 'deck.side': 'Side deck',
    'table.title': 'Funções e usos', 'filter.ph': 'Filtrar por nome', 'only.unassigned': 'Só sem função',
    'table.hint': 'Cartas do Extra Deck não precisam de função, por isso não aparecem aqui.',
    'table.hint2': 'Usos por turno: cópias além desse limite na mesma mão ficam mortas e não contam para nada.',
    'th.card': 'Carta', 'th.copies': 'Cópias', 'th.role': 'Função', 'th.uses': 'Usos por turno',
    'siding.title': 'Simulador de siding',
    'siding.hint': 'Clique numa carta para trocá-la entre o main e o side. O painel de resultados compara o deck após o siding com a sua lista original.',
    'siding.summary': '{out} saíram, {in} entraram.',
    'help.summary': 'Como funciona',
    'help.1': '<strong>Funções.</strong> Dê uma função para cada carta do main ou do side deck. Um <em>Starter</em> consegue iniciar sua jogada sozinho. <em>Combo A</em> e <em>Combo B</em> são peças que só funcionam juntas. Um <em>Extender</em> precisa de um starter antes. Uma <em>Handtrap</em> é interação que você quer ter na mão. Um <em>Brick</em> é uma carta que você nunca quer comprar.',
    'help.2': '<strong>Atribuição rápida.</strong> Escolha uma função na legenda para usá-la como pincel e depois clique nas cartas para pintá-las. Sem pincel selecionado, clicar numa carta alterna entre as funções.',
    'help.3': '<strong>Usos por turno.</strong> Configure na tabela de funções. Uma carta "uma vez por turno" (HOPT) é "Uma vez": a segunda cópia na mesma mão fica morta e não conta como starter, extender nem peça de combo. Uma carta que pode ser usada duas vezes aceita duas cópias, e as cartas "Sem limite" nunca ficam mortas.',
    'help.4': '<strong>Jogável e brick.</strong> Uma mão é jogável quando tem pelo menos um starter, ou quando alguma linha de combo é formada. Caso contrário, é um brick. Cartas brick na mão não transformam uma mão jogável em brick por si só.',
    'help.5': '<strong>Simulação.</strong> A calculadora embaralha o main deck e compra uma mão para cada tentativa simulada. A semente aleatória é fixa, então o mesmo deck sempre mostra os mesmos números. Aperte o botão de repetir para ver o quanto o resultado varia. A melhor mão exibida é a de maior pontuação que respeita o seu limite de "Máx. bricks", e os starters valem mais pontos.',
    'help.6': '<strong>Salvamento.</strong> Seu deck, funções e combos são salvos automaticamente neste navegador. As funções são lembradas por carta, então cartas que você já classificou mantêm a função em outros decks. Use "Copiar link para compartilhar" para enviar o deck com funções e combos para um amigo.',
    'results.title': 'Resultados', 'results.reroll': 'Rodar de novo com outra semente aleatória',
    'stat.playable': 'Jogável (starter ou combo)', 'stat.brick': 'Brick (nada jogável)', 'stat.goal': 'Atende sua meta de mão',
    'avg.title': 'Mão inicial média',
    'avg.starter': 'Starters utilizáveis', 'avg.combo_a': 'Peça de combo A', 'avg.combo_b': 'Peça de combo B',
    'avg.extender': 'Extenders utilizáveis', 'avg.handtrap': 'Handtraps utilizáveis', 'avg.garnet': 'Cartas brick na mão',
    'avg.dead': 'Cópias extras mortas', 'avg.atleast': '{p} com pelo menos 1',
    'goal.title': 'Meta de mão', 'goal.starters': 'Mín. starters', 'goal.comboA': 'Mín. combo A', 'goal.comboB': 'Mín. combo B',
    'goal.extenders': 'Mín. extenders', 'goal.handtraps': 'Mín. handtraps', 'goal.maxBricks': 'Máx. bricks',
    'goal.mustDraw': 'Precisa comprar', 'goal.any': 'Qualquer carta', 'goal.copies': 'Cópias',
    'combo.title': 'Linhas de combo',
    'combo.hint': 'Uma mão que forma qualquer linha conta como jogável. Cada linha precisa de todas as cartas ou funções escolhidas, usando cartas diferentes.',
    'combo.line': 'Linha {n}', 'combo.remove': 'Remover', 'combo.none': 'Nenhuma', 'combo.roles': 'Funções', 'combo.cards': 'Cartas',
    'combo.any': 'Qualquer {role}', 'combo.piece': 'Linha de combo {n}, peça {p}',
    'hands.title': 'Mão de teste', 'hands.hint': 'Compre uma mão aleatória do deck como ele está agora.',
    'hands.best': 'Melhor mão encontrada', 'hands.score': 'Pontos {n}',
    'best.none': 'Melhor mão encontrada sem nenhuma carta brick.',
    'best.one': 'Melhor mão encontrada com no máximo 1 carta brick.',
    'best.many': 'Melhor mão encontrada com no máximo {n} cartas brick.',
    'best.fallback': 'Nenhuma mão simulada ficou dentro do limite de bricks, então esta é a melhor mão no geral.',
    'verdict.playable': 'Jogável. Pontos {s}.', 'verdict.brick': 'Brick: nada jogável. Pontos {s}.',
    'verdict.dead_1': ' 1 cópia extra morta.', 'verdict.dead_n': ' {n} cópias extras mortas.',
    'mini.playable': 'jogável', 'mini.brick': 'brick', 'mini.goal': 'meta',
    'footer': 'Dados e imagens das cartas vêm do <a href="https://ygoprodeck.com/" target="_blank" rel="noopener">YGOPRODeck</a>. Yu-Gi-Oh! é uma marca registrada da Konami. Este é um projeto de fã e não tem vínculo com a Konami.',
    'role.unassigned': 'Sem função', 'role.starter': 'Starter', 'role.combo_a': 'Combo A', 'role.combo_b': 'Combo B',
    'role.extender': 'Extender', 'role.handtrap': 'Handtrap', 'role.garnet': 'Brick',
    'limit.0': 'Sem limite', 'limit.1': 'Uma vez (HOPT)', 'limit.2': 'Duas vezes', 'limit.3': '3 vezes',
    'tag.dead': 'Morta', 'tag.in': 'Entra', 'tag.out': 'Sai',
    'tile.remove': 'Remover uma cópia', 'tile.remove.named': 'Remover uma cópia de {name}',
    'brush.on': 'Pincel: {role}. Clique nas cartas para pintá-las. Clique no pincel de novo para desligar.',
    'brush.off': 'Escolha uma função para usar como pincel, ou clique numa carta para alternar a função dela.',
    'empty.main': 'Seu main deck está vazio. Importe um arquivo .ydk (ou solte-o em qualquer lugar da página), ou busque cartas acima.',
    'empty.extra': 'Nenhuma carta no Extra Deck.',
    'empty.side': 'Nenhuma carta no side deck. Importe um .ydk com side deck, ou escolha "Side deck" na caixa de busca.',
    'empty.sidingMain': 'Nenhuma carta no main deck.', 'empty.sidingSide': 'Nenhuma carta no side deck.',
    'copies.main': '{n} no main', 'copies.side': '{n} no side',
    'table.count_1': '1 carta', 'table.count_n': '{n} cartas',
    'table.nomatch': 'Nenhuma carta encontrada.', 'table.empty': 'Ainda não há cartas no main ou no side deck.',
    'table.nodata': 'Dados da carta indisponíveis', 'table.roleFor': 'Função de {name}', 'table.usesFor': 'Usos por turno de {name}',
    'status.loading': 'Carregando dados das cartas ({a} de {b})',
    'status.unknown_1': '1 carta não pôde ser identificada e aparece como ID. O banco de dados pode estar fora do ar ou não conhecer esse ID. As imagens ainda podem carregar.',
    'status.unknown_n': '{n} cartas não puderam ser identificadas e aparecem como ID. O banco de dados pode estar fora do ar ou não conhecer esses IDs. As imagens ainda podem carregar.',
    'retry.still': '{n} ainda sem identificação.', 'retry.all': 'Todas as cartas foram identificadas.',
    'search.searching': 'Buscando...',
    'search.net': 'Não foi possível acessar o banco de dados de cartas. Verifique sua conexão e tente de novo.',
    'search.none': 'Nenhuma carta encontrada.',
    'search.count_1': '1 resultado. Clique na carta para adicionar uma cópia.', 'search.count_n': '{n} resultados. Clique na carta para adicionar uma cópia.',
    'search.fail': 'A busca falhou. Tente de novo.', 'search.add': 'Adicionar {name}',
    'sim.need': 'O main deck precisa de pelo menos {n} cartas para comprar uma mão.', 'sim.needToast': 'O main deck precisa de pelo menos {n} cartas.',
    'sim.speed': '{ms} ms, {n}k mãos', 'delta.same': 'sem mudança',
    'toast.addFirst': 'Adicione algumas cartas primeiro.',
    'toast.shareCopied': 'Link copiado. Ele inclui suas funções e combos.',
    'toast.shared': 'Deck compartilhado carregado.',
    'share.prompt': 'Copie este link:',
    'save.nothing': 'Ainda não há nada para salvar.', 'save.prompt': 'Dê um nome ao deck:', 'save.replace': 'Substituir o deck salvo "{name}"?',
    'save.fail': 'Não foi possível salvar. O armazenamento do navegador pode estar cheio ou bloqueado.', 'save.ok': 'Deck "{name}" salvo.',
    'load.ok': 'Deck "{name}" carregado.', 'del.pick': 'Escolha um deck salvo primeiro.', 'del.confirm': 'Excluir o deck salvo "{name}"?', 'del.ok': 'Deck "{name}" excluído.',
    'import.none': 'Nenhum ID de carta encontrado nesse arquivo.', 'import.ok': 'Deck importado.',
    'import.missing_1': 'Importado com 1 carta não identificada.', 'import.missing_n': 'Importado com {n} cartas não identificadas.',
    'export.empty': 'O deck está vazio.',
    'add.limit': 'Você já tem {max} cópias de {name}.', 'add.done': '{name} adicionada ao {zone} ({n}/{max}).',
    'zone.main': 'main deck', 'zone.extra': 'extra deck', 'zone.side': 'side deck',
    'clear.confirm': 'Limpar o deck inteiro e todas as linhas de combo?',
    'roles.resetConfirm': 'Voltar todas as cartas do deck para "Sem função"?',
    'drop.overlay': 'Solte o arquivo .ydk para importá-lo', 'drop.notydk': 'Esse não é um arquivo .ydk.'
  }
};

function t(key, vars) {
  let s = (I18N[state.lang] && I18N[state.lang][key]);
  if (s === undefined) s = I18N.en[key];
  if (s === undefined) s = key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}
const tn = (key, n, vars) => t(`${key}_${n === 1 ? '1' : 'n'}`, Object.assign({ n }, vars));
const RL = role => t('role.' + role);

function applyI18n() {
  document.documentElement.lang = state.lang === 'pt' ? 'pt-BR' : 'en';
  document.title = t('app.title');
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
  $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $$('#trials option').forEach(o => { o.textContent = t('opt.hands', { n: +o.value / 1000 }); });
}

state.lang = (() => {
  const saved = lsGet(LS.lang);
  if (saved === 'en' || saved === 'pt') return saved;
  return /^pt/i.test((typeof navigator !== 'undefined' && navigator.language) || '') ? 'pt' : 'en';
})();

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
    setBusy(t('status.loading', { a: Math.min(i + 40, need.length), b: need.length }));
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
      limit: mem ? clamp(+mem[1] || 0, 0, 3) : 1,
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
    d: [...state.cards.values()].map(c => [c.id, c.n.main, c.n.extra, c.n.side, ROLE_IDX[c.role], c.limit]),
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
  roleMemory[c.id] = [ROLE_IDX[c.role], c.limit];
  lsSet(LS.roles, roleMemory);
}

/* Rows are [rawId, main, extra, side, roleIdx, limit]. roleIdx -1 means "use the remembered role".
   An older save stored 1 or 0 in the last slot (HOPT yes/no), which maps cleanly onto limit 1 or 0. */
async function loadSerialized(s) {
  const rows = (Array.isArray(s.d) ? s.d : []).filter(r => Array.isArray(r) && +r[0] > 0);
  await resolveIds(rows.map(r => +r[0]));

  state.cards.clear();
  for (const r of rows) {
    const [rawId, m = 0, e = 0, sd = 0, role = -1, limit = 1] = r.map(Number);
    const c = getOrCreateCard(rawId, e > 0 && !m && !sd ? 'extra' : 'main');
    c.n.main += m; c.n.extra += e; c.n.side += sd;
    if (role >= 0 && ROLES[role]) { c.role = ROLES[role]; c.limit = clamp(limit || 0, 0, 3); }
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
  if (!state.cards.size) return toast(t('toast.addFirst'), 'bad');
  const url = shareLink();
  try {
    await navigator.clipboard.writeText(url);
    toast(t('toast.shareCopied'), 'good');
  } catch (e) {
    window.prompt(t('share.prompt'), url);
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
  const keep = sel.value;
  const names = Object.keys(savedDecks()).sort((a, b) => a.localeCompare(b));
  sel.innerHTML = `<option value="">${esc(names.length ? t('saved.pick') : t('saved.none'))}</option>` +
    names.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  if (names.includes(keep)) sel.value = keep;
}

function saveCurrentDeck() {
  if (!state.cards.size) return toast(t('save.nothing'), 'bad');
  const current = $('#savedDecks').value;
  const name = (window.prompt(t('save.prompt'), current || '') || '').trim().slice(0, 60);
  if (!name) return;
  const all = savedDecks();
  if (all[name] && name !== current && !window.confirm(t('save.replace', { name }))) return;
  all[name] = serialize();
  if (!lsSet(LS.saved, all)) return toast(t('save.fail'), 'bad');
  refreshSavedSelect();
  $('#savedDecks').value = name;
  toast(t('save.ok', { name }), 'good');
}

async function loadSavedDeck(name) {
  const s = savedDecks()[name];
  if (s) { await loadSerialized(s); toast(t('load.ok', { name }), 'good'); }
}

function deleteSavedDeck() {
  const name = $('#savedDecks').value;
  if (!name) return toast(t('del.pick'), 'bad');
  if (!window.confirm(t('del.confirm', { name }))) return;
  const all = savedDecks();
  delete all[name];
  lsSet(LS.saved, all);
  refreshSavedSelect();
  toast(t('del.ok', { name }));
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
  if (!ids.size) return toast(t('import.none'), 'bad');
  const rows = [...ids].map(id => [id, z.main.get(id) || 0, z.extra.get(id) || 0, z.side.get(id) || 0, -1, 1]);
  await loadSerialized({ d: rows });
  const missing = [...state.cards.values()].filter(c => !c.known).length;
  toast(missing ? tn('import.missing', missing) : t('import.ok'), missing ? 'bad' : 'good');
}

function exportYDK() {
  if (!state.cards.size) return toast(t('export.empty'), 'bad');
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
    toast(t('add.limit', { max: MAX_COPIES, name: c.name }), 'bad');
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
  if (state.cards.size && !window.confirm(t('clear.confirm'))) return;
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

function setLimit(c, limit) {
  if (c.isExtra) return;
  c.limit = clamp(limit, 0, 3);
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
  $$(`.tile[data-card="${c.id}"]`).forEach(tile => {
    if (!tile.dataset.role) return;
    tile.dataset.role = c.role;
    const banner = $('.role-banner', tile);
    if (banner) banner.textContent = RL(c.role);
  });
  const row = $(`tr[data-card="${c.id}"]`);
  if (row) {
    row.dataset.role = c.role;
    const rs = $('.role-select', row);
    rs.value = c.role; rs.dataset.role = c.role;
    $('.limit-select', row).value = String(c.limit);
  }
  renderSiding();
}

function resetRoles() {
  if (!window.confirm(t('roles.resetConfirm'))) return;
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
  const tot = { main: 0, extra: 0, side: 0 };
  state.cards.forEach(c => { tot.main += c.n.main; tot.extra += c.n.extra; tot.side += c.n.side; });
  setChip('#mainCount', tot.main, tot.main === 0 ? null : tot.main >= 40 && tot.main <= 60);
  setChip('#extraCount', tot.extra, tot.extra === 0 ? null : tot.extra <= 15);
  setChip('#sideCount', tot.side, tot.side === 0 ? null : tot.side <= 15);
}

function tileHTML(c, zone) {
  const roled = !c.isExtra;
  return `<div class="tile" role="button" tabindex="0" data-card="${c.id}" data-zone="${zone}"${roled ? ` data-role="${c.role}"` : ''}>
    <button type="button" class="rm" data-act="rm" title="${esc(t('tile.remove'))}" aria-label="${esc(t('tile.remove.named', { name: c.name }))}">&#10005;</button>
    ${artHTML(c)}
    ${roled ? `<div class="role-banner">${esc(RL(c.role))}</div>` : ''}
    <div class="tile-name" title="${esc(c.name)}">${esc(c.name)}</div>
  </div>`;
}

function renderGrid(zone) {
  const el = $(`#${zone}Grid`);
  const list = [...state.cards.values()].filter(c => c.n[zone] > 0).sort(byName);
  if (!list.length) { el.innerHTML = `<div class="empty-state">${esc(t('empty.' + zone))}</div>`; return; }
  let html = '';
  for (const c of list) for (let i = 0; i < c.n[zone]; i++) html += tileHTML(c, zone);
  el.innerHTML = html;
}

function renderLegend() {
  const counts = Object.fromEntries(ROLES.map(r => [r, 0]));
  state.cards.forEach(c => { if (!c.isExtra) counts[c.role] += c.n.main; });
  $('#legend').innerHTML = ROLES.map(r =>
    `<button type="button" class="role-pill${state.brush === r ? ' active' : ''}" data-brush="${r}" data-role="${r}" aria-pressed="${state.brush === r}">${esc(RL(r))} <b>${counts[r]}</b></button>`
  ).join('');
  $('#brushHint').textContent = state.brush ? t('brush.on', { role: RL(state.brush) }) : t('brush.off');
  $('#mainGrid').classList.toggle('brushing', !!state.brush);
  $('#sideGrid').classList.toggle('brushing', !!state.brush);
}

function copiesText(c) {
  const parts = [];
  if (c.n.main) parts.push(t('copies.main', { n: c.n.main }));
  if (c.n.side) parts.push(t('copies.side', { n: c.n.side }));
  return parts.join(', ');
}

function renderTable() {
  const q = $('#tableFilter').value.trim().toLowerCase();
  const only = $('#onlyUnassigned').checked;
  const all = poolCards();
  const list = all.filter(c => (!q || c.name.toLowerCase().includes(q)) && (!only || c.role === 'unassigned'));
  $('#tableCount').textContent = tn('table.count', list.length);
  const body = $('#roleTableBody');
  if (!list.length) {
    body.innerHTML = `<tr><td colspan="4" class="empty-cell">${esc(all.length ? t('table.nomatch') : t('table.empty'))}</td></tr>`;
    return;
  }
  body.innerHTML = list.map(c => `<tr data-card="${c.id}" data-role="${c.role}">
    <td><div class="t-card"><div class="thumb">${artHTML(c)}</div>
      <div class="t-name"><strong>${esc(c.name)}</strong><small>${esc(c.type || t('table.nodata'))}</small></div></div></td>
    <td class="t-copies">${esc(copiesText(c))}</td>
    <td><select class="role-select" data-role="${c.role}" aria-label="${esc(t('table.roleFor', { name: c.name }))}">
      ${ROLES.map(r => `<option value="${r}"${c.role === r ? ' selected' : ''}>${esc(RL(r))}</option>`).join('')}
    </select></td>
    <td><select class="limit-select" aria-label="${esc(t('table.usesFor', { name: c.name }))}">
      ${[1, 2, 3, 0].map(n => `<option value="${n}"${c.limit === n ? ' selected' : ''}>${esc(t('limit.' + n))}</option>`).join('')}
    </select></td>
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
    ${tag ? `<span class="tag ${tag}">${esc(t('tag.' + tag))}</span>` : ''}
    ${artHTML(c)}<div class="role-banner">${esc(RL(c.role))}</div>
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
  $('#sidingMainList').innerHTML = mainHTML || `<div class="empty-state">${esc(t('empty.sidingMain'))}</div>`;
  $('#sidingSideList').innerHTML = sideHTML || `<div class="empty-state">${esc(t('empty.sidingSide'))}</div>`;
  setChip('#sideMainCount', mainN, mainN === 0 ? null : mainN >= 40 && mainN <= 60);
  setChip('#sideSideCount', sideN, null);
  const inTotal = [...state.siding.in.values()].reduce((a, b) => a + b, 0);
  $('#sidingSummary').textContent = swaps || inTotal ? t('siding.summary', { out: swaps, in: inTotal }) : '';
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
  sel.innerHTML = `<option value="">${esc(t('goal.any'))}</option>` +
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
    `<option value="R:${r}"${selected === 'R:' + r ? ' selected' : ''}>${esc(t('combo.any', { role: RL(r) }))}</option>`).join('');
  const cards = pool.map(c =>
    `<option value="C:${c.id}"${selected === 'C:' + c.id ? ' selected' : ''}>${esc(c.name)}</option>`).join('');
  return `<option value=""${selected ? '' : ' selected'}>${esc(t('combo.none'))}</option>
    <optgroup label="${esc(t('combo.roles'))}">${generic}</optgroup>
    <optgroup label="${esc(t('combo.cards'))}">${cards}</optgroup>`;
}

function renderCombos() {
  sanitizeCombos();
  const box = $('#comboList');
  if (!state.combos.length) { box.innerHTML = ''; return; }
  const pool = poolCards();
  box.innerHTML = state.combos.map((cb, n) => `<div class="combo-row" data-combo="${cb.id}">
    <div class="combo-head"><span>${esc(t('combo.line', { n: n + 1 }))}</span>
      <button type="button" class="btn btn-small btn-ghost-danger" data-act="rmcombo">${esc(t('combo.remove'))}</button></div>
    <div class="combo-selects">
      ${[0, 1, 2].map(i => `<select data-slot="${i}" aria-label="${esc(t('combo.piece', { n: n + 1, p: i + 1 }))}">${comboOptions(cb.slots[i], pool)}</select>`).join('')}
    </div></div>`).join('');
}

function addCombo() {
  if (!poolCards().length) return toast(t('toast.addFirst'), 'bad');
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
    bar.innerHTML = `<span>${esc(tn('status.unknown', unknown.length))}</span>
      <button type="button" class="btn btn-small" data-act="retry">${esc(t('btn.retry'))}</button>`;
  } else {
    bar.hidden = true;
  }
}

async function retryUnknown() {
  unresolved.clear();
  await loadSerialized(serialize());
  const still = [...state.cards.values()].filter(c => !c.known).length;
  toast(still ? t('retry.still', { n: still }) : t('retry.all'), still ? 'bad' : 'good');
}

/* ===================================================================
   Search (any language)
   =================================================================== */
let searchTimer = null, searchAbort = null;

function scheduleSearch() { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 280); }

/* The card database matches names per language, so one query goes out in every supported
   language at once and the hits are merged by card id. Names are stored in English. */
async function searchCards(q, signal) {
  if (/^\d{5,}$/.test(q)) {
    const r = await apiGet(`${API}?id=${q}`, signal);
    if (r.status === 'net') return { status: 'net' };
    if (r.status !== 'ok' || !r.data.length) return { status: 'none' };
    return { status: 'ok', items: r.data.map(c => ({ id: c.id, name: c.name, alt: '', type: c.type || '', api: c })) };
  }

  const enc = encodeURIComponent(q);
  const results = await Promise.all(SEARCH_LANGS.map(l =>
    apiGet(`${API}?fname=${enc}${l === 'en' ? '' : '&language=' + l}&num=36&offset=0`, signal)));
  if (results.every(r => r.status === 'net')) return { status: 'net' };

  const found = new Map();
  results.forEach((r, i) => {
    if (r.status !== 'ok') return;
    r.data.forEach(c => {
      let e = found.get(c.id);
      if (!e) { e = { id: c.id, name: '', alt: '', type: c.type || '', api: null, loc: c }; found.set(c.id, e); }
      if (SEARCH_LANGS[i] === 'en') { e.name = c.name; e.api = c; e.type = c.type || e.type; }
      else if (!e.alt) e.alt = c.name;
    });
  });

  const items = [...found.values()].slice(0, 60);
  // Cards matched only in another language: fetch their English record.
  const need = items.filter(e => !e.api).map(e => e.id);
  for (let i = 0; i < need.length; i += 40) {
    const r = await apiGet(`${API}?id=${need.slice(i, i + 40).join(',')}`, signal);
    if (r.status === 'ok') r.data.forEach(c => {
      const e = found.get(c.id);
      if (e) { e.name = c.name; e.api = c; e.type = c.type || e.type; }
    });
  }
  items.forEach(e => {
    if (!e.name) { e.name = e.loc.name; e.alt = ''; }   // English lookup failed: fall back to the matched name
    if (e.alt === e.name) e.alt = '';
  });
  return items.length ? { status: 'ok', items } : { status: 'none' };
}

async function runSearch() {
  const q = $('#searchInput').value.trim();
  const box = $('#searchResults');
  const status = $('#searchStatus');
  if (searchAbort) searchAbort.abort();
  if (q.length < 2) { box.innerHTML = ''; status.textContent = ''; return; }

  searchAbort = new AbortController();
  status.textContent = t('search.searching');
  try {
    const res = await searchCards(q, searchAbort.signal);
    if (res.status === 'net') { box.innerHTML = ''; status.textContent = t('search.net'); return; }
    if (res.status === 'none') { box.innerHTML = ''; status.textContent = t('search.none'); return; }
    lastResults = new Map(res.items.map(e => [e.id, e]));
    status.textContent = tn('search.count', res.items.length);
    box.innerHTML = res.items.map(e => `<button type="button" class="search-item" data-card="${e.id}" title="${esc(t('search.add', { name: e.name }))}${e.alt ? esc(' (' + e.alt + ')') : ''}">
      <span class="own"></span>${artHTML({ id: e.id, name: e.name })}<span class="name">${esc(e.name)}</span>${e.alt ? `<span class="name2">${esc(e.alt)}</span>` : ''}</button>`).join('');
    updateSearchBadges();
  } catch (e) {
    if (e.name !== 'AbortError') status.textContent = t('search.fail');
  }
}

function updateSearchBadges() {
  $$('#searchResults .search-item').forEach(el => {
    const id = +el.dataset.card;
    const canonical = cardCache[id] ? cardCache[id].i : id;
    const owned = state.cards.get(canonical) || state.cards.get(id);
    $('.own', el).textContent = owned ? `x${total(owned)}` : '';
  });
}

function addFromSearch(item) {
  ingest([item.api || { id: item.id, name: item.name, type: item.type, card_images: [{ id: item.id }] }]);
  saveCardCache();
  const zone = state.addTo === 'side' ? 'side' : (EXTRA_RE.test(item.type || '') ? 'extra' : 'main');
  const c = addCopy(item.id, zone);
  if (c) toast(t('add.done', { name: c.name, zone: t('zone.' + zone), n: total(c), max: MAX_COPIES }), 'good');
}

/* ===================================================================
   Simulation engine
   =================================================================== */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
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
  const limitArr = new Uint8Array(pool.length);
  pool.forEach((c, i) => { roleArr[i] = ROLE_IDX[c.role]; limitArr[i] = c.limit; });

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
  return { pool, idxOf, deck: Int32Array.from(deck), roleArr, limitArr, combos };
}

function makeCtx(sim, h) {
  return {
    hand: new Int32Array(h),
    seen: new Int32Array(sim.pool.length),
    cnt: new Int32Array(sim.pool.length),
    st: new Int32Array(9),      // 0 S, 1 CA, 2 CB, 3 E, 4 H, 5 bricks, 6 dead copies, 7 combo hit, 8 dead mask
    stamp: 0,
    roleArr: sim.roleArr, limitArr: sim.limitArr, combos: sim.combos
  };
}

/* Score one hand (ctx.hand). Shared by the Monte Carlo loop and the test-hand button. */
function evalHand(h, ctx) {
  const { hand, seen, cnt, st, roleArr, limitArr, combos } = ctx;
  const stamp = ++ctx.stamp;
  let S = 0, CA = 0, CB = 0, E = 0, H = 0, G = 0, D = 0, dead = 0;

  for (let i = 0; i < h; i++) {
    const u = hand[i];
    if (seen[u] !== stamp) { seen[u] = stamp; cnt[u] = 1; } else cnt[u]++;
    const lim = limitArr[u];
    if (lim > 0 && cnt[u] > lim) { D++; dead |= (1 << i); continue; }   // past its usage limit: dead
    switch (roleArr[u]) {
      case 1: S++; break;
      case 2: CA++; break;
      case 3: CB++; break;
      case 4: E++; break;
      case 5: H++; break;
      case 6: G++; break;
    }
  }

  let hits = 0;
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
    if (ok) hits++;
  }

  const playable = S >= 1 || hits > 0;
  let score = S * SCORE.starter + (CA + CB) * SCORE.comboPiece + E * SCORE.extender + H * SCORE.handtrap
            + G * SCORE.brick + D * SCORE.dead + hits * SCORE.comboHit;
  if (playable) {
    score += SCORE.playable;
    if (E >= 1) score += SCORE.synergy;
    if (H >= 1) score += SCORE.synergy;
  }

  st[0] = S; st[1] = CA; st[2] = CB; st[3] = E; st[4] = H; st[5] = G; st[6] = D; st[7] = playable ? 1 : 0; st[8] = dead;
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
  const maxG = Number.isFinite(+crit.maxBricks) ? +crit.maxBricks : 0;
  const specId = crit.specific ? +crit.specific : 0;
  const specIdx = specId ? (sim.idxOf.has(specId) ? sim.idxOf.get(specId) : -2) : -1;
  const specQty = Math.max(1, +crit.specificQty || 1);

  let playable = 0, brick = 0, target = 0, dupSum = 0;
  const sums = new Float64Array(6);
  const has = new Int32Array(6);
  // Best hand that stays within the brick limit, plus an overall fallback.
  let bestScore = -1e9, anyScore = -1e9, bestDead = 0, anyDead = 0;
  const bestHand = new Int32Array(h), anyHand = new Int32Array(h);

  for (let t0 = 0; t0 < trials; t0++) {
    for (let i = 0; i < h; i++) {
      const r = i + ((rnd() * (n - i)) | 0);
      const tmp = deck[i]; deck[i] = deck[r]; deck[r] = tmp;
      hand[i] = deck[i];                       // the card that was actually drawn
    }
    const score = evalHand(h, ctx);
    const S = st[0], CA = st[1], CB = st[2], E = st[3], H = st[4], G = st[5];

    if (st[7] === 1) playable++; else brick++;

    let meets = S >= reqS && CA >= reqCA && CB >= reqCB && E >= reqE && H >= reqH && G <= maxG;
    if (meets && specIdx !== -1) {
      meets = specIdx >= 0 && ctx.seen[specIdx] === ctx.stamp && ctx.cnt[specIdx] >= specQty;
    }
    if (meets) target++;

    sums[0] += S; sums[1] += CA; sums[2] += CB; sums[3] += E; sums[4] += H; sums[5] += G;
    if (S) has[0]++; if (CA) has[1]++; if (CB) has[2]++; if (E) has[3]++; if (H) has[4]++; if (G) has[5]++;
    dupSum += st[6];

    if (G <= maxG) {
      if (score > bestScore) { bestScore = score; bestHand.set(hand); bestDead = st[8]; }
    } else if (score > anyScore) { anyScore = score; anyHand.set(hand); anyDead = st[8]; }
  }

  const fallback = bestScore === -1e9;
  return {
    trials, playable, brick, target, sums, has, dupSum, fallback,
    bestScore: fallback ? anyScore : bestScore,
    bestHand: fallback ? anyHand : bestHand,
    bestDead: fallback ? anyDead : bestDead,
    maxG
  };
}

let simTimer = null;
function scheduleSim() { clearTimeout(simTimer); simTimer = setTimeout(runSimulation, 60); }

const AVG_ROWS = [
  ['starter', 0], ['combo_a', 1], ['combo_b', 2], ['extender', 3], ['handtrap', 4], ['garnet', 5]
];

function pct(n, d) { return `${((n / d) * 100).toFixed(1)}%`; }

function setDelta(id, diff, goodWhenUp) {
  const el = $(id);
  if (diff === null) { el.textContent = ''; el.className = 'delta'; return; }
  const rounded = Math.round(diff * 10) / 10;
  if (rounded === 0) { el.textContent = t('delta.same'); el.className = 'delta flat'; return; }
  const up = rounded > 0;
  el.textContent = `${up ? '+' : ''}${rounded.toFixed(1)}`;
  el.className = `delta ${up === goodWhenUp ? 'up' : 'down'}`;
}

function handHTML(indices, pool, deadMask) {
  return Array.from(indices).map((ix, pos) => {
    const c = pool[ix];
    const dead = (deadMask >> pos) & 1;
    return `<div class="tile mini${dead ? ' dead' : ''}" data-card="${c.id}" data-role="${c.role}" title="${esc(c.name)}">
      ${dead ? `<span class="dead-tag">${esc(t('tag.dead'))}</span>` : ''}${artHTML(c)}<div class="role-banner">${esc(RL(c.role))}</div></div>`;
  }).join('');
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
    $('#bestHandHint').textContent = '';
    $('#simSpeed').textContent = '0 ms';
    note.textContent = t('sim.need', { n: h });
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

  $('#simSpeed').textContent = t('sim.speed', { ms, n: T / 1000 });
  $('#playableRate').textContent = pct(res.playable, T);
  $('#brickRate').textContent = pct(res.brick, T);
  $('#targetRate').textContent = pct(res.target, T);
  $('#miniPlayable').textContent = pct(res.playable, T);
  $('#miniBrick').textContent = pct(res.brick, T);
  $('#miniTarget').textContent = pct(res.target, T);

  setDelta('#playableDelta', base ? (res.playable - base.playable) / T * 100 : null, true);
  setDelta('#brickDelta', base ? (res.brick - base.brick) / T * 100 : null, false);
  setDelta('#targetDelta', base ? (res.target - base.target) / T * 100 : null, true);

  $('#avgList').innerHTML = AVG_ROWS.map(([role, i]) =>
    `<div class="avg-row" data-role="${role}"><span><span class="dot"></span>${esc(t('avg.' + role))}</span><b>${(res.sums[i] / T).toFixed(2)}</b><i>${esc(t('avg.atleast', { p: pct(res.has[i], T) }))}</i></div>`
  ).join('') + `<div class="avg-row"><span><span class="dot" style="background:var(--muted)"></span>${esc(t('avg.dead'))}</span><b>${(res.dupSum / T).toFixed(2)}</b><i></i></div>`;

  $('#bestHandScore').textContent = t('hands.score', { n: res.bestScore });
  const bh = $('#bestHand');
  bh.style.setProperty('--h', h);
  bh.innerHTML = handHTML(res.bestHand, sim.pool, res.bestDead);
  $('#bestHandHint').textContent = res.fallback ? t('best.fallback')
    : res.maxG === 0 ? t('best.none') : res.maxG === 1 ? t('best.one') : t('best.many', { n: res.maxG });
}

/* ---------- Test hand ---------- */
function clearHands() {
  $('#testHand').innerHTML = '';
  const v = $('#testHandVerdict');
  v.textContent = t('hands.hint');
  v.className = 'hint';
}

function drawTestHand() {
  const h = state.handSize;
  const sim = buildSim(true);
  if (sim.deck.length < h) return toast(t('sim.needToast', { n: h }), 'bad');
  const deck = Int32Array.from(sim.deck);
  const ctx = makeCtx(sim, h);
  for (let i = 0; i < h; i++) {
    const r = i + ((Math.random() * (deck.length - i)) | 0);
    const tmp = deck[i]; deck[i] = deck[r]; deck[r] = tmp;
    ctx.hand[i] = deck[i];
  }
  const score = evalHand(h, ctx);
  const st = ctx.st;
  const playable = st[7] === 1;
  const box = $('#testHand');
  box.style.setProperty('--h', h);
  box.innerHTML = handHTML(ctx.hand, sim.pool, st[8]);
  const v = $('#testHandVerdict');
  v.textContent = t(playable ? 'verdict.playable' : 'verdict.brick', { s: score }) + (st[6] ? tn('verdict.dead', st[6]) : '');
  v.className = playable ? 'hint ok' : 'hint bad';
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
  $('#langSelect').value = state.lang;
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
  $('#langSelect').addEventListener('change', e => {
    state.lang = e.target.value === 'pt' ? 'pt' : 'en';
    lsSet(LS.lang, state.lang);
    applyI18n();
    refreshSavedSelect();
    renderAll();
    if ($('#searchInput').value.trim().length >= 2) runSearch();
  });

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
    if (!/\.ydk$/i.test(file.name)) return toast(t('drop.notydk'), 'bad');
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
    if (act && act.dataset.act === 'rm') return removeCopy(c, tile.dataset.zone);
    if (c.isExtra) return;
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
    if (e.target.matches('.role-select')) assignRole(c, e.target.value);
    else if (e.target.matches('.limit-select')) setLimit(c, +e.target.value);
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
  applyI18n();
  bindUI();
  setupPreview();
  refreshSavedSelect();
  syncInputsFromState();

  const shared = readShareHash();
  if (location.hash.startsWith('#d=')) history.replaceState(null, '', location.pathname + location.search);

  if (shared) {
    await loadSerialized(shared);
    toast(t('toast.shared'), 'good');
    return;
  }
  const saved = lsGet(LS.state);
  if (saved && saved.v === 2) await loadSerialized(saved);
  else renderAll();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
