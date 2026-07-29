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

window.pedidosAbertos = window.pedidosAbertos || {};
window.detalhesAbertos = window.detalhesAbertos || {};

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
            
            if (btn.dataset.page === "pageQrScanner") {
                popularSimuladorQr();
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

/* ==========================================================
   1. PRODUÇÃO (SUPORTA BUSCA POR COMPONENTES E SANFONA)
========================================================== */
function renderProducaoVertical(filtro = "") {
    const container = document.getElementById("productionVerticalList");
    if (!container) return;
    container.innerHTML = "";

    if (!window.pedidos || !Array.isArray(window.pedidos)) {
        container.innerHTML = "<p style='color: var(--ink-soft); text-align:center;'>Nenhum dado encontrado em dados.js</p>";
        return;
    }

    const filtrados = window.pedidos.filter(p => {
        if (p.status !== "producao") return false;
        const detTexto = p.detalhes ? Object.values(p.detalhes).join(' ') : '';
        const textoCompleto = `${p.id} ${p.cliente || ''} ${p.cor || ''} ${p.tipo || ''} ${detTexto}`.toLowerCase();
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
        const detalhesAbertos = window.detalhesAbertos[p.id] === true;

        const det = p.detalhes || { 
            laminas: "Não especificado", guia: "Não especificado", soleira: "Não especificada", eixo: "Não especificado", motor: "Não especificado" 
        };

        const div = document.createElement("div");
        div.style.cssText = `
            background: white; padding: 12px 14px; border-radius: 8px; border: 1px solid #e2e8f0; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.04); border-left: 5px solid #0284c7; width: 100%;
        `;

        div.innerHTML = `
            <div onclick="toggleDropdownProd(${p.id})" style="display:flex; justify-content:space-between; align-items:center; cursor: pointer;">
                <div>
                    <strong style="font-size: 14px; color:#0f172a;">#${p.id} - ${p.cliente}</strong>
                    <div style="font-size: 11px; color: #64748b; margin-top:2px;">
                        Expedição: <strong>${p.expedicao}</strong> | Tamanho: <strong>${p.tamanho || 'N/A'}</strong>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap: 8px;">
                    <span style="${getEstiloTagCor(p.cor)} padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight:bold;">${p.cor}</span>
                    <span id="seta-p-${p.id}" style="font-size: 12px; font-weight: bold; color: #64748b;">${estaAberto ? '▲' : '▼'}</span>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin-top: 10px; background: #f8fafc; padding: 6px 8px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px;">
                <div><span style="color: #64748b; display:block; font-weight:bold;">LÂMINAS</span><strong style="color: #0284c7;">${locLamina}</strong></div>
                <div><span style="color: #64748b; display:block; font-weight:bold;">EIXOS</span><strong style="color: #0284c7;">${locEixo}</strong></div>
                <div><span style="color: #64748b; display:block; font-weight:bold;">GUIAS</span><strong style="color: #0f172a;">${prateleiraFixaCor}</strong></div>
                <div><span style="color: #64748b; display:block; font-weight:bold;">SOLEIRAS</span><strong style="color: #0f172a;">${prateleiraFixaCor}</strong></div>
            </div>

            <button onclick="toggleDetalhes(${p.id})" style="width: 100%; margin-top: 8px; padding: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-weight: bold; color: #334155; cursor: pointer; text-align: center;">
                📐 ${detalhesAbertos ? 'Ocultar Medidas e Itens da Porta' : 'Ver Medidas e Itens da Porta'}
            </button>

            <div id="detalhes-p-${p.id}" style="display: ${detalhesAbertos ? 'block' : 'none'}; margin-top: 8px; padding: 10px; background: #fffbe0; border: 1px solid #fef08a; border-radius: 6px; font-size: 11px; color: #1e293b;">
                <strong style="display:block; margin-bottom: 6px; color: #854d0e;">📋 Especificações da Porta:</strong>
                <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
                    <li><strong>Lâminas:</strong> ${det.laminas}</li>
                    <li><strong>Guias:</strong> ${det.guia}</li>
                    <li><strong>Soleira:</strong> ${det.soleira}</li>
                    <li><strong>Eixo:</strong> ${det.eixo}</li>
                    <li><strong>Motor / Ferragens:</strong> ${det.motor}</li>
                </ul>
            </div>

            <div id="dropdown-p-${p.id}" style="display: ${estaAberto ? 'block' : 'none'}; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                <div style="font-size: 11px; font-weight: bold; color: #334155; margin-bottom: 8px;">Editar Localização por Peça:</div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; font-size: 11px;">
                    <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
                        <span style="font-weight: bold; color: #0284c7; display: block; margin-bottom: 4px;">🧱 Lâminas:</span>
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
                        <span style="font-weight: bold; color: #0284c7; display: block; margin-bottom: 4px;">🔩 Eixos:</span>
                        <select id="select-eixo-${p.id}" onchange="salvarLocaisProducao(${p.id})" class="modal-select" style="margin:0; padding:8px; font-size:12px;">
                            <option value="">Selecione a Prateleira do Eixo...</option>
                            ${[1,2,3,4,5,6,7,8].map(n => `<option value="Prateleira ${n}" ${p.localEixos === `Prateleira ${n}` ? 'selected' : ''}>Prateleira ${n}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display: flex;">
                    <button onclick="abrirAlocacaoEstoque(${p.id})" style="flex:1; padding:8px; background:#16a34a; color:white; border:none; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">📦 Enviar p/ Estoque Final</button>
                </div>
            </div>`;
        container.appendChild(div);
    });
}

/* ==========================================================
   2. ESTOQUE FINAL (GRID COM DETALHES DAS PEÇAS)
========================================================== */
function renderEstoqueGrid(filtro = "") {
    const container = document.getElementById("stockGridList");
    if (!container) return;
    container.innerHTML = "";

    if (!window.pedidos || !Array.isArray(window.pedidos)) return;

    const filtrados = window.pedidos.filter(p => {
        if (p.status !== "estoque") return false;
        const detTexto = p.detalhes ? Object.values(p.detalhes).join(' ') : '';
        const locaisTexto = p.locais ? p.locais.join(' ') : '';
        const textoCompleto = `${p.id} ${p.cliente || ''} ${p.cor || ''} ${p.tipo || ''} ${locaisTexto} ${detTexto}`.toLowerCase();
        return textoCompleto.includes(filtro);
    });

    if (filtrados.length === 0) {
        container.innerHTML = "<p style='color: var(--ink-soft); grid-column: 1/-1; text-align:center;'>Nenhum pedido no estoque final encontrado.</p>";
        return;
    }

    filtrados.forEach(p => {
        const detalhesAbertos = window.detalhesAbertos[p.id] === true;
        const det = p.detalhes || { 
            laminas: "Não especificado", guia: "Não especificado", soleira: "Não especificada", eixo: "Não especificado", motor: "Não especificado" 
        };

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
                    <div style="font-size: 11px; color: #64748b; margin-top:3px;">
                        Expedição: <strong>${p.expedicao}</strong> | Tamanho: <strong>${p.tamanho || 'N/A'}</strong>
                    </div>
                </div>
                <span style="${getEstiloTagCor(p.cor)} padding: 3px 6px; border-radius: 4px; font-size: 10px; font-weight:bold;">${p.cor}</span>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; margin: 10px 0;">
                <span style="font-size: 10px; color: #64748b; display:block; margin-bottom:2px;">📍 Posições no Estoque:</span>
                <strong style="font-size: 12px; color: #0369a1;">${p.locais ? p.locais.join(", ") : "A alocar"}</strong>
            </div>

            <button onclick="toggleDetalhes(${p.id})" style="width: 100%; margin-bottom: 8px; padding: 6px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 11px; font-weight: bold; color: #334155; cursor: pointer; text-align: center;">
                📐 ${detalhesAbertos ? 'Ocultar Itens da Porta' : 'Ver Itens / Medidas da Porta'}
            </button>

            <div id="detalhes-p-${p.id}" style="display: ${detalhesAbertos ? 'block' : 'none'}; margin-bottom: 10px; padding: 10px; background: #fffbe0; border: 1px solid #fef08a; border-radius: 6px; font-size: 11px; color: #1e293b;">
                <strong style="display:block; margin-bottom: 6px; color: #854d0e;">📋 Componentes Inclusos:</strong>
                <ul style="margin: 0; padding-left: 16px; line-height: 1.5;">
                    <li><strong>Lâminas:</strong> ${det.laminas}</li>
                    <li><strong>Guias:</strong> ${det.guia}</li>
                    <li><strong>Soleira:</strong> ${det.soleira}</li>
                    <li><strong>Eixo:</strong> ${det.eixo}</li>
                    <li><strong>Motor / Ferragens:</strong> ${det.motor}</li>
                </ul>
            </div>
            
            <div style="display: flex; gap: 6px;">
                <button onclick="abrirAlocacaoEstoque(${p.id})" style="flex:1; padding:8px; background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; border-radius:6px; font-size:11px; font-weight:bold; cursor:pointer;">Alterar Nichos</button>
            </div>`;
        container.appendChild(div);
    });
}

/* ==========================================================
   FUNÇÕES AUXILIARES E EVENTOS
========================================================== */
window.toggleDetalhes = function(id) {
    window.detalhesAbertos[id] = !window.detalhesAbertos[id];
    const filtro = document.getElementById("globalSearch")?.value.toLowerCase() || "";
    updateAll(filtro);
};

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
   3. SIMULADOR DE LEITOR QR CODE
========================================================== */
function popularSimuladorQr() {
    const selPedido = document.getElementById("qrSelectPedido");
    const selPrateleira = document.getElementById("qrSelectPrateleira");
    if (!selPedido || !selPrateleira) return;

    selPedido.innerHTML = '<option value="">Selecione o pedido escaneado...</option>';
    (window.pedidos || []).filter(p => p.status === "producao").forEach(p => {
        selPedido.innerHTML += `<option value="${p.id}">#${p.id} - ${p.cliente} (${p.cor})</option>`;
    });

    selPrateleira.innerHTML = '<option value="">Selecione a prateleira escaneada...</option>';
    (window.estantesEstoque || []).forEach(est => {
        for (let i = 1; i <= 8; i++) {
            selPrateleira.innerHTML += `<option value="${est}-${i}">Estante ${est} - Prateleira ${i}</option>`;
        }
    });
}

window.executarCheckinQrCode = function() {
    const elPed = document.getElementById("qrSelectPedido");
    const elPrt = document.getElementById("qrSelectPrateleira");
    const feedback = document.getElementById("qrFeedback");

    if (!elPed || !elPrt || !elPed.value || !elPrt.value) {
        alert("Por favor, selecione tanto o pedido quanto a prateleira simulando a leitura dos QR codes.");
        return;
    }

    const p = window.pedidos.find(x => x.id == elPed.value);
    if (!p) return;

    p.status = "estoque";
    p.locais = [elPrt.value];

    if (feedback) {
        feedback.style.display = "block";
        feedback.style.background = "#dcfce7";
        feedback.style.color = "#15803d";
        feedback.innerHTML = `✔ Sucesso! Pedido #${p.id} (${p.cliente}) alocado na prateleira <strong>${elPrt.value}</strong> via QR Code!`;
    }

    updateAll();
    setTimeout(() => { popularSimuladorQr(); }, 2000);
};

/* ==========================================================
   4. MODAL E CRIAÇÃO AVULSA
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
            const item = prompt("Nome do cliente ou descrição do pedido:");
            if (item) {
                const novoId = Math.floor(Math.random() * 90000) + 10000;
                window.pedidos.push({
                    id: novoId,
                    cliente: item,
                    tipo: "Com Pintura",
                    cor: "Cinza",
                    tamanho: "3.00m x 2.50m",
                    status: "producao",
                    expedicao: window.HOJE || "2026-07-29",
                    estanteLamina: "",
                    prtLamina: "",
                    localEixos: "",
                    detalhes: {
                        laminas: "30x Lâminas Meia Cana (3.00m)",
                        guia: "2x Guias U 70x30mm (2.50m)",
                        soleira: "1x Soleira (3.00m)",
                        eixo: "1x Eixo Tubo 4.1/2\" (3.00m)",
                        motor: "1x Motor AC Standard"
                    }
                });
                updateAll();
            }
        });
    }
}
