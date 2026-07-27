window.HOJE = "2026-07-27";
window.estantesEstoque = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
window.estantesLaminas = ["Estante Lâminas 1", "Estante Lâminas 2", "Estante Lâminas 3", "Estante Lâminas 4"];

// Tabela de cores fixa para Guia e Soleira conforme sua regra
window.mapaCoresPrateleiras = {
    "Preto": "Prateleira 1",
    "Cinza": "Prateleira 2",
    "Branco": "Prateleira 3",
    "Vermelho": "Prateleira 4",
    "Azul": "Prateleira 5",
    "Amarelo": "Prateleira 6",
    "Laranja": "Prateleira 7",
    "Verde": "Prateleira 8"
};

window.pedidos = [
    // === GRUPO 1: PEDIDOS NOVOS / SEM NENHUMA IDENTIFICAÇÃO (Para testar com a equipe) ===
    { id: 11901, cliente: "Oficina do Alumínio", tipo: "Com Pintura", cor: "Vermelho", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11902, cliente: "Comercial Piauí", tipo: "Com Pintura", cor: "Azul", tamanho: "3m a 5m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11903, cliente: "Metalúrgica Teresina", tipo: "Sem Pintura", cor: "Cinza", tamanho: "Acima de 5m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11904, cliente: "Auto Peças BR", tipo: "Com Pintura", cor: "Amarelo", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11905, cliente: "Serralheria do Vale", tipo: "Com Pintura", cor: "Preto", tamanho: "3m a 5m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11906, cliente: "Construtora Nordeste", tipo: "Com Pintura", cor: "Branco", tamanho: "Acima de 5m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11907, cliente: "Vidraçaria Cristal", tipo: "Sem Pintura", cor: "Verde", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11908, cliente: "Tintas & Cia", tipo: "Com Pintura", cor: "Laranja", tamanho: "3m a 5m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11909, cliente: "Posto de Molas 2 Irmãos", tipo: "Com Pintura", cor: "Vermelho", tamanho: "Acima de 5m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },
    { id: 11910, cliente: "Central de Portas", tipo: "Sem Pintura", cor: "Cinza", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Não definido", localEixos: "Não definido" },

    // === GRUPO 2: PEDIDOS EM ANDAMENTO NA PRODUÇÃO (Com locais parciais preenchidos) ===
    { id: 11018, cliente: "Indústria Metal", tipo: "Com Pintura", cor: "Preto", tamanho: "Acima de 5m", status: "producao", expedicao: "2026-07-28", localLaminas: "Estante Lâminas 1 - Prateleira 3", localEixos: "Setor Eixos B" },
    { id: 11019, cliente: "Restaurante Sabor", tipo: "Com Pintura", cor: "Laranja", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 2 - Prateleira 5", localEixos: "Setor Eixos A" },
    { id: 11020, cliente: "Serralheria União", tipo: "Com Pintura", cor: "Vermelho", tamanho: "Acima de 5m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 3 - Prateleira 1", localEixos: "Setor Eixos C" },
    { id: 11021, cliente: "Depósito Norte", tipo: "Com Pintura", cor: "Azul", tamanho: "3m a 5m", status: "producao", expedicao: "2026-07-29", localLaminas: "Estante Lâminas 4 - Prateleira 8", localEixos: "Setor Eixos B" },
    { id: 11022, cliente: "Construtora VIP", tipo: "Com Pintura", cor: "Amarelo", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Forno de Pintura", localEixos: "Forno de Pintura" },
    { id: 11023, cliente: "Eletro Center", tipo: "Com Pintura", cor: "Verde", tamanho: "3m a 5m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 1 - Prateleira 2", localEixos: "Setor Eixos A" },
    { id: 11024, cliente: "Panificadora Central", tipo: "Sem Pintura", cor: "Branco", tamanho: "Até 3m", status: "producao", expedicao: "2026-07-28", localLaminas: "Estante Lâminas 2 - Prateleira 4", localEixos: "Setor Eixos C" },
    { id: 11025, cliente: "Frigorífico Boi Gordo", tipo: "Com Pintura", cor: "Preto", tamanho: "Acima de 5m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 3 - Prateleira 6", localEixos: "Setor Eixos B" },
    { id: 11026, cliente: "Bar e Lanchonete", tipo: "Com Pintura", cor: "Cinza", tamanho: "Até 3m", status: "producao", expedicao: "2026-07-30", localLaminas: "Forno de Pintura", localEixos: "Forno de Pintura" },
    { id: 11027, cliente: "Escola Futuro", tipo: "Com Pintura", cor: "Azul", tamanho: "3m a 5m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 4 - Prateleira 1", localEixos: "Setor Eixos A" },
    { id: 11028, cliente: "Auto Escola Direção", tipo: "Com Pintura", cor: "Vermelho", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 1 - Prateleira 5", localEixos: "Setor Eixos C" },
    { id: 11029, cliente: "Tintas e Cores", tipo: "Com Pintura", cor: "Amarelo", tamanho: "Acima de 5m", status: "producao", expedicao: "2026-07-29", localLaminas: "Estante Lâminas 2 - Prateleira 7", localEixos: "Setor Eixos B" },
    { id: 11032, cliente: "Clínica Sorriso", tipo: "Com Pintura", cor: "Branco", tamanho: "Até 3m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 3 - Prateleira 2", localEixos: "Setor Eixos A" },
    { id: 11033, cliente: "Terminal Rodoviário", tipo: "Sem Pintura", cor: "Cinza", tamanho: "Acima de 5m", status: "producao", expedicao: HOJE, localLaminas: "Estante Lâminas 4 - Prateleira 3", localEixos: "Setor Eixos C" },

    // === GRUPO 3: PEDIDOS PRONTOS NO ESTOQUE FINAL (Já alocados nas estantes de A a L) ===
    { id: 11001, cliente: "Metalúrgica Silva", tipo: "Com Pintura", cor: "Preto", tamanho: "Acima de 5m", status: "estoque", expedicao: HOJE, locais: ["A-2", "B-2"] },
    { id: 11002, cliente: "Mercado Central", tipo: "Com Pintura", cor: "Cinza", tamanho: "3m a 5m", status: "estoque", expedicao: HOJE, locais: ["A-4", "B-4"] },
    { id: 11003, cliente: "Construtora Alfa", tipo: "Sem Pintura", cor: "Branco", tamanho: "Até 3m", status: "estoque", expedicao: "2026-07-28", locais: ["C-1"] },
    { id: 11004, cliente: "Drogaria São Paulo", tipo: "Com Pintura", cor: "Vermelho", tamanho: "Acima de 5m", status: "estoque", expedicao: HOJE, locais: ["C-5", "D-5"] },
    { id: 11005, cliente: "Carlos Eduardo Ref", tipo: "Com Pintura", cor: "Azul", tamanho: "Até 3m", status: "estoque", expedicao: "2026-07-29", locais: ["F-8"] },
    { id: 11006, cliente: "Shopping Rio Mar", tipo: "Com Pintura", cor: "Preto", tamanho: "Acima de 5m", status: "estoque", expedicao: HOJE, locais: ["G-2", "H-2", "I-2"] },
    { id: 11007, cliente: "Auto Peças Lider", tipo: "Com Pintura", cor: "Amarelo", tamanho: "3m a 5m", status: "estoque", expedicao: "2026-07-28", locais: ["J-1", "K-1"] },
    { id: 11008, cliente: "Residencial Parque", tipo: "Sem Pintura", cor: "Verde", tamanho: "Até 3m", status: "estoque", expedicao: HOJE, locais: ["L-4"] },
    { id: 11009, cliente: "Padaria Suprema", tipo: "Com Pintura", cor: "Laranja", tamanho: "3m a 5m", status: "estoque", expedicao: HOJE, locais: ["B-7", "C-7"] },
    { id: 11010, cliente: "Oficina do Zé", tipo: "Sem Pintura", cor: "Cinza", tamanho: "Até 3m", status: "estoque", expedicao: "2026-07-30", locais: ["D-2"] },
    { id: 11011, cliente: "Supermercado Baita", tipo: "Com Pintura", cor: "Preto", tamanho: "Acima de 5m", status: "estoque", expedicao: HOJE, locais: ["E-3", "F-3"] },
    { id: 11012, cliente: "Posto Alvorada", tipo: "Com Pintura", cor: "Vermelho", tamanho: "Acima de 5m", status: "estoque", expedicao: HOJE, locais: ["H-6", "I-6"] },
    { id: 11013, cliente: "Galpão Logístico Sul", tipo: "Com Pintura", cor: "Azul", tamanho: "Acima de 5m", status: "estoque", expedicao: "2026-07-28", locais: ["J-4", "K-4", "L-4"] },
    { id: 11014, cliente: "Academia Flex", tipo: "Com Pintura", cor: "Amarelo", tamanho: "3m a 5m", status: "estoque", expedicao: HOJE, locais: ["E-1", "F-1"] },
    { id: 11015, cliente: "Farmácia Vida", tipo: "Com Pintura", cor: "Branco", tamanho: "Até 3m", status: "estoque", expedicao: HOJE, locais: ["G-5"] },
    { id: 11016, cliente: "Lojas Modernas", tipo: "Com Pintura", cor: "Verde", tamanho: "3m a 5m", status: "estoque", expedicao: "2026-07-29", locais: ["H-2", "I-2"] },
    { id: 11017, cliente: "Condomínio Sol", tipo: "Sem Pintura", cor: "Cinza", tamanho: "Acima de 5m", status: "estoque", expedicao: HOJE, locais: ["J-5", "K-5", "L-5"] }
];