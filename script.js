/* ==========================================================
   SISTEMA DE GESTÃO DE PORTAS DE ROLAR - SCRIPT COMPLETO
========================================================== */

function getEstiloTagCor(cor) {
    const mapaCores = {
        "Preto": "background: #0f172a; color: #ffffff;",
        "Cinza": "background: #64748b; color: #ffffff;",
        "Branco": "background: #ffffff; color: #0f172a; border: 1px solid #cbd5e1;",
        "Vermelho": "background: #dc2626; color: #ffffff;",
        "Azul": "background: #2563eb; color: #ffffff;",
        "Amarelo": "background: #eab308; color: #0f172a;",
        "Laranja": "background: #ea580c; color: #ffffff;",
        "Verde": "background: #16a34a; color: #ffffff;"
    };
    return mapaCores[cor] || "background: #94a3b8; color: #ffffff;";
}

// Armazena estado dos checks e dropdowns
window.pedidosAbertos = window.pedidosAbertos || {};
window.checksConcluidos = window.checksConcluidos || {};

document.addEventListener("DOMContentLoaded", () => {
    setupNavigation();
    setupSearch();
    setupAvulso();
    setupModal();
    updateAll();
});

function setupNavigation() {
    const buttons = document.querySelectorAll(".menu-button");
    const pages = document.querySelectorAll(".page");

    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => b.classList.remove("active"));
            pages.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            
            const targetPage = document.getElementById(btn.dataset.page);
            if (targetPage) {
                targetPage.classList.add("active");
            }
        });
    });
}

function updateAll(filtro = "") {
    renderProducaoVertical(filtro);
    renderEstoqueGrid(filtro);
}

function setupSearch() {
    const globalInput = document.getElementById("globalSearch");
    if (globalInput) {
        globalInput.addEventListener("input", (e) => updateAll(e.target.value.toLowerCase()));
    }
}

// Função auxiliar para calcular componentes com base na Largura e Altura
function calcularComponentes(p) {
    const larg = p.largura ? p.largura.toFixed(2) : "3.00";
    const alt = p.altura ? p.altura.toFixed(2) : "2.50";
    const qtdLaminas = Math.ceil((p.altura || 2.50) * 11); // ~11 lâminas por metro de altura

    return {
        dimensao: `${larg}m (largura) x ${alt}m (altura)`,
        laminas: `${qtdLaminas}x Lâminas Meia Cana (#22) — Corde/Comp: ${larg}m`,
        guia: `2x Guias Laterais U — Altura/Comp: ${alt}m`,
        soleira: `1x Soleira de Reforço — Corde/Comp: ${larg}m`,
        eixo: `1x Eixo Tubo Industrial — Corde/Comp: ${larg}m`
    };
}

/* ==========================================================
   1. PRODUÇÃO (EXIBE TAMANHOS DE LÂMINA, GUIA, SOLEIRA E EIXO)
========================================================== */
function renderProducaoVertical(filtro = "") {
    const container = document.getElementById("productionVerticalList");
    if (!container) return;
    container.innerHTML = "";

    if (!window.pedidos || !Array.isArray(window.pedidos)) return;

    const filtrados = window.pedidos.filter(p => {
        if (p.status !== "producao") return false;
        const textoCompleto = `${p.id} ${p.cliente || ''} ${p.cor || ''} ${p.tipo || ''}`.toLowerCase();
        return textoCompleto.includes(filtro);
    });

    if (filtrados.length === 0) {
        container.innerHTML = "<p style='color: var(--ink-soft); text-align:center; padding: 20px;'>Nenhum pedido em produção encontrado.</p>";
        return;
    }

    filtrados.forEach(p => {
        const prateleiraFixaCor = (window.mapaCoresPrateleiras && window.mapaCoresPrateleiras[p.cor]) ? window.mapaCoresPrateleiras[p.cor] : "Prateleira Padrão";
        const locLamina = (p.estanteLamina && p.prtLamina) ? `${p.estanteLamina} (${p.prtLamina})` : "Não def.";
        const locEixo = p.localEixos || "Não def.";
        const estaAberto = window.pedidosAbertos[p.id] === true;

        const comp = calcularComponentes(p);
        const largM = p.largura ? p.largura.toFixed(2) : "3.00";
        const altM = p.altura ? p.altura.toFixed(2) : "2.50";

        const div = document.createElement("div");
        div.style.cssText = `
            background: white; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); border-left: 5px solid #0284c7; width: 100%;
        `;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong style="font-size: 14px; color:#0f172a;">#${p.id} - ${p.cliente}</strong>
                    <div style="font-size: 11px; color: #0284c7; font-weight: bold; margin-top:2px;">
                        📐 Porta: ${comp.dimensao}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="${getEstiloTagCor(p.cor)} padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight:bold;">${p.cor}</span>
                    <button onclick="toggleDropdownProd(${p.id})" style="background:none; border:none; cursor:pointer; font-size:12px; color:#64748b; font-weight:bold;">
                        ${estaAberto ? '▲ Fechar' : '▼ Editar Locais'}
                    </button>
                </div>
            </div>

            <!-- RESUMO DOS COMPONENTES E SEUS TAMANHOS DENTRO DO CARD -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 10px; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px;">
                <div>
                    <span style="color: #64748b; display:block; font-weight:bold;">LÂMINA (${largM}m)</span>
                    <strong style="color: #0284c7;">${locLamina}</strong>
                </div>
                <div>
                    <span style="color: #64748b; display:block; font-weight:bold;">EIXO (${largM}m)</span>
                    <strong style="color: #0284c7;">${locEixo}</strong>
                </div>
                <div>
                    <span style="color: #64748b; display:block; font-weight:bold;">GUIA (${altM}m)</span>
                    <strong style="color: #0f172a;">${prateleiraFixaCor}</strong>
                </div>
                <div>
                    <span style="color: #64748b; display:block; font-weight:bold;">SOLEIRA (${largM}m)</span>
                    <strong style="color: #0f172a;">${prateleiraFixaCor}</strong>
                </div>
            </div>

            <!-- BOTÃO PARA ABRIR A MODAL COM DETALHES E CHECKLIST DAS PEÇAS -->
            <button onclick="abrirModalDetalhesPorta(${p.id})" style="width: 100%; margin-top: 8px; padding: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer; text-align: center;">
                📋 Abrir Detalhes da Porta & Check-list das Peças
            </button>

            <!-- SEÇÃO DE EDIÇÃO RÁPIDA DE ENDEREÇAMENTO -->
            <div id="dropdown-p-${p.id}" style="display: ${estaAberto ? 'block' : 'none'}; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 8px;">Endereçar Componentes no Pátio:</div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; font-size: 11px;">
                    <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-weight: bold; color: #0284c7; display: block; margin-bottom: 4px;">🧱 Lâminas (${largM}m):</span>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                            <select id="select-estante-lamina-${p.id}" onchange="salvarLocaisProducao(${p.id})" class="modal-select" style="margin:0; padding:8px; font-size:12px;">
                                <option value="">Estante...</option>
                                ${(window.estantesLaminas || []).map(e => `<option value="${e}" ${p.estanteLamina === e ? 'selected' : ''}>${e}</option>`).join('')}
                            </select>
                            <select id="select-prt-lamina-${p.id}" onchange="salvarLocaisProducao(${p.id})" class="modal-select" style="margin:0; padding:8px; font-size:12px;">
                                <option value="">Prateleira...</option>
                                ${[1,2,3,4,5,6,7,8].map(n => `<option value="Prateleira ${n}" ${p.prtLamina === `Prateleira ${n}` ? 'selected' : ''}>Prateleira ${n}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-weight: bold; color: #0284c7; display: block; margin-bottom: 4px;">🔩 Eixos (${largM}m):</span>
                        <select id="select-eixo-${p.id}" onchange="salvarLocaisProducao(${p.id})" class="modal-select" style="margin:0; padding:8px; font-size:12px;">
                            <option value="">Selecione a Prateleira do Eixo...</option>
                            ${[1,2,3,4,5,6,7,8].map(n => `<option value="Prateleira ${n}" ${p.localEixos === `Prateleira ${n}` ? 'selected' : ''}>Prateleira ${n}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display: flex;">
                    <button onclick="abrirAlocacaoEstoque(${p.id})" style="flex:1; padding:8px; background:#16a34a; color:white; border:none; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">📦 Finalizar e Enviar p/ Estoque</button>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

/* ==========================================================
   2. ESTOQUE FINAL (GRID COM DETALHES DE COMPONENTES E TAMANHOS)
========================================================== */
function renderEstoqueGrid(filtro = "") {
    const container = document.getElementById("stockGridList");
    if (!container) return;
    container.innerHTML = "";

    if (!window.pedidos || !Array.isArray(window.pedidos)) return;

    const filtrados = window.pedidos.filter(p => {
        if (p.status !== "estoque") return false;
        const locaisTexto = p.locais ? p.locais.join(' ') : '';
        const textoCompleto = `${p.id} ${p.cliente || ''} ${p.cor || ''} ${p.tipo || ''} ${locaisTexto}`.toLowerCase();
        return textoCompleto.includes(filtro);
    });

    if (filtrados.length === 0) {
        container.innerHTML = "<p style='color: var(--ink-soft); grid-column: 1/-1; text-align:center;'>Nenhum pedido no estoque final encontrado.</p>";
        return;
    }

    filtrados.forEach(p => {
        const comp = calcularComponentes(p);
        const div = document.createElement("div");
        div.className = "kpi-card";
        div.style.cssText = `
            background: white; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); border-left: 5px solid #16a34a;
        `;

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div>
                    <strong style="font-size: 14px; color:#0f172a;">#${p.id} - ${p.cliente}</strong>
                    <div style="font-size: 11px; color: #166534; font-weight:bold; margin-top:3px;">
                        📐 Porta: ${comp.dimensao}
                    </div>
                </div>
                <span style="${getEstiloTagCor(p.cor)} padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight:bold;">${p.cor}</span>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin: 10px 0;">
                <span style="font-size: 10px; color: #64748b; display:block; margin-bottom:2px;">📍 Posições de Saída no Pátio:</span>
                <strong style="font-size: 12px; color: #0369a1;">${p.locais ? p.locais.join(", ") : "A alocar"}</strong>
            </div>

            <button onclick="abrirModalDetalhesPorta(${p.id})" style="width: 100%; margin-bottom: 8px; padding: 8px; background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                📋 Ver Especificações & Itens da Porta
            </button>
            
            <div style="display: flex; gap: 6px;">
                <button onclick="abrirAlocacaoEstoque(${p.id})" style="flex:1; padding:8px; background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">Alterar Nichos</button>
            </div>`;
        container.appendChild(div);
    });
}

/* ==========================================================
   3. MODAL DE DETALHES DA PORTA & CHECK-LIST DE PEÇAS
========================================================== */
window.abrirModalDetalhesPorta = function(id) {
    const p = window.pedidos.find(x => x.id === id);
    if (!p) return;

    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    if (!modal || !modalBody) return;

    const comp = calcularComponentes(p);
    const prateleiraFixaCor = (window.mapaCoresPrateleiras && window.mapaCoresPrateleiras[p.cor]) ? window.mapaCoresPrateleiras[p.cor] : "Prateleira Padrão";
    const locLamina = (p.estanteLamina && p.prtLamina) ? `${p.estanteLamina} (${p.prtLamina})` : "Pátio / Não def.";
    const locEixo = p.localEixos || "Pátio / Não def.";

    modalBody.innerHTML = `
        <div>
            <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">
                <span style="font-size: 11px; color: #0284c7; font-weight: bold; text-transform: uppercase;">Detalhamento Técnico de Produção</span>
                <h3 style="margin: 2px 0 0; font-size: 16px; color: #0f172a;">Pedido #${p.id} — ${p.cliente}</h3>
                <div style="font-size: 12px; color: #475569; margin-top: 4px;">
                    Dimensão Total: <strong>${comp.dimensao}</strong>
                </div>
            </div>

            <div style="margin-bottom: 14px;">
                <strong style="font-size: 12px; color: #334155; display: block; margin-bottom: 8px;">Itens da Porta & Localização Atual:</strong>
                
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11px;">
                        <div>
                            <input type="checkbox" onchange="salvarCheck(${p.id}, 'lamina')" ${window.checksConcluidos[`${p.id}_lamina`] ? 'checked' : ''}> 
                            <strong>Lâminas:</strong> ${comp.laminas}
                        </div>
                        <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">📍 ${locLamina}</span>
                    </label>

                    <label style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11px;">
                        <div>
                            <input type="checkbox" onchange="salvarCheck(${p.id}, 'eixo')" ${window.checksConcluidos[`${p.id}_eixo`] ? 'checked' : ''}> 
                            <strong>Eixo:</strong> ${comp.eixo}
                        </div>
                        <span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-weight: bold;">📍 ${locEixo}</span>
                    </label>

                    <label style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11px;">
                        <div>
                            <input type="checkbox" onchange="salvarCheck(${p.id}, 'guia')" ${window.checksConcluidos[`${p.id}_guia`] ? 'checked' : ''}> 
                            <strong>Guias:</strong> ${comp.guia}
                        </div>
                        <span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: bold;">📍 ${prateleiraFixaCor}</span>
                    </label>

                    <label style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11px;">
                        <div>
                            <input type="checkbox" onchange="salvarCheck(${p.id}, 'soleira')" ${window.checksConcluidos[`${p.id}_soleira`] ? 'checked' : ''}> 
                            <strong>Soleira:</strong> ${comp.soleira}
                        </div>
                        <span style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-weight: bold;">📍 ${prateleiraFixaCor}</span>
                    </label>
                </div>
            </div>

            <!-- WARNING SIMULAÇÃO -->
            <div class="warning-box">
                ⚠️ <strong>Aviso Demonstrativo:</strong> As dimensões e quantidades de peças apresentadas são simulações calculadas automaticamente para validação do protótipo do sistema.
            </div>

            <button onclick="document.getElementById('modal').classList.remove('open')" style="width: 100%; margin-top: 12px; padding: 10px; background: #0f172a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                Fechar
            </button>
        </div>
    `;

    modal.classList.add("open");
};

window.salvarCheck = function(id, item) {
    const key = `${id}_${item}`;
    window.checksConcluidos[key] = !window.checksConcluidos[key];
};

/* ==========================================================
   FUNÇÕES AUXILIARES DE EVENTOS
========================================================== */
window.toggleDropdownProd = function(id) {
    window.pedidosAbertos[id] = !window.pedidosAbertos[id];
    const filtro = document.getElementById("globalSearch")?.value.toLowerCase() || "";
    renderProducaoVertical(filtro);
};

window.salvarLocaisProducao = function(id) {
    const p = window.pedidos.find(x => x.id === id);
    if (!p) return;

    const elEstante = document.getElementById(`select-estante-lamina-${id}`);
    const elPrt = document.getElementById(`select-prt-lamina-${id}`);
    const elEixo = document.getElementById(`select-eixo-${id}`);

    if (elEstante) p.estanteLamina = elEstante.value;
    if (elPrt) p.prtLamina = elPrt.value;
    if (elEixo) p.localEixos = elEixo.value;
    
    window.pedidosAbertos[id] = true;
    const filtro = document.getElementById("globalSearch")?.value.toLowerCase() || "";
    renderProducaoVertical(filtro);
};

/* ==========================================================
   4. MODAL DE ALOCAÇÃO DE ESTOQUE E CRIAÇÃO
========================================================== */
function setupModal() {
    const modal = document.getElementById("modal");
    const closeBtn = document.getElementById("closeModal");
    if (closeBtn && modal) {
        closeBtn.addEventListener("click", () => modal.classList.remove("open"));
    }
}

window.abrirAlocacaoEstoque = function(id) {
    const p = window.pedidos.find(x => x.id === id);
    if (!p) return;

    const modal = document.getElementById("modal");
    const modalBody = document.getElementById("modalBody");
    if (!modal || !modalBody) return;

    let htmlOpcoesNivel = "";
    for (let i = 1; i <= 8; i++) {
        htmlOpcoesNivel += `<option value="${i}">Prateleira / Nível ${i}</option>`;
    }

    let htmlCheckboxesEstantes = "";
    (window.estantesEstoque || []).forEach(est => {
        htmlCheckboxesEstantes += `
            <label style="display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 8px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer;">
                <input type="checkbox" name="estanteCheck" value="${est}" style="width: 18px; height: 18px;"> Estante ${est}
            </label>`;
    });

    modalBody.innerHTML = `
        <div>
            <h3 style="margin-top:0; font-size:16px; color:#0f172a;">Alocar Pedido #${p.id} no Estoque</h3>
            <p style="font-size:12px; color:#64748b;">Selecione o nível e marque as estantes correspondentes.</p>

            <div style="margin-bottom: 12px;">
                <label style="font-size: 12px; font-weight: bold; color: #334155;">1. Escolha o Nível:</label>
                <select id="selectNivelPrateleira" class="modal-select">${htmlOpcoesNivel}</select>
            </div>

            <div style="margin-bottom: 14px;">
                <label style="font-size: 12px; font-weight: bold; color: #334155; display:block; margin-bottom:4px;">2. Marque as Estantes:</label>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; max-height: 180px; overflow-y: auto; padding: 4px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
                    ${htmlCheckboxesEstantes}
                </div>
            </div>

            <div style="display: flex; gap: 8px;">
                <button onclick="salvarAlocacao(${p.id})" style="flex:1; padding: 12px; background: #16a34a; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">Salvar e Enviar p/ Estoque</button>
            </div>
        </div>
    `;

    modal.classList.add("open");
};

window.salvarAlocacao = function(id) {
    const p = window.pedidos.find(x => x.id === id);
    if (!p) return;

    const elNivel = document.getElementById("selectNivelPrateleira");
    const checkboxes = document.querySelectorAll('input[name="estanteCheck"]:checked');

    if (checkboxes.length === 0) {
        alert("Selecione pelo menos uma estante!");
        return;
    }

    let novasLocais = [];
    checkboxes.forEach(chk => {
        novasLocais.push(`${chk.value}-${elNivel.value}`);
    });

    p.status = "estoque";
    p.locais = novasLocais;

    document.getElementById("modal").classList.remove("open");
    updateAll();
};

function setupAvulso() {
    const btn = document.getElementById("btnAdicionarAvulso");
    if (btn) {
        btn.addEventListener("click", () => {
            const item = prompt("Nome do cliente:");
            if (item) {
                const novoId = Math.floor(Math.random() * 90000) + 10000;
                window.pedidos.push({
                    id: novoId,
                    cliente: item,
                    tipo: "Com Pintura",
                    cor: "Cinza",
                    largura: 3.00,
                    altura: 2.50,
                    status: "producao",
                    expedicao: window.HOJE || "2026-07-29",
                    estanteLamina: "",
                    prtLamina: "",
                    localEixos: ""
                });
                updateAll();
            }
        });
    }
}
