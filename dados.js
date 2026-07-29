window.HOJE = "2026-07-29";
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
    // =========================================================================
    // 1. PEDIDOS NOVOS / AGUARDANDO DEFINIÇÃO DE LOCAIS (10 Pedidos)
    // =========================================================================
    { 
        id: 11901, cliente: "Oficina do Alumínio", tipo: "Com Pintura", cor: "Vermelho", tamanho: "3.20m x 2.80m", status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "32x Meia Cana Fechada #22 (3.20m)", guia: "2x Guia U 70x30mm (2.80m)", soleira: "1x Soleira Tubular Tubo #14 (3.20m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.20m", motor: "1x Motor AC 300kg + Testeira" }
    },
    { 
        id: 11902, cliente: "Comercial Piauí", tipo: "Com Pintura", cor: "Azul", tamanho: "4.50m x 3.50m", status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "42x Meia Cana Transvision #20 (4.50m)", guia: "2x Guia U 90x30mm com Borracha (3.50m)", soleira: "1x Soleira Dupla Cantoneira (4.50m)", eixo: "1x Eixo Tubo 5\" x 4.50m", motor: "1x Motor AC 500kg + Central Controle" }
    },
    { 
        id: 11903, cliente: "Metalúrgica Teresina", tipo: "Sem Pintura", cor: "Cinza", tamanho: "5.80m x 4.00m", status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "50x Meia Cana Galvanizada #20 (5.80m)", guia: "2x Guia U 100x30mm (4.00m)", soleira: "1x Soleira Reforçada em V (5.80m)", eixo: "1x Eixo Tubo 6\" x 5.80m", motor: "1x Motor AC 800kg Trifásico" }
    },
    { 
        id: 11904, cliente: "Auto Peças BR", tipo: "Com Pintura", cor: "Amarelo", tamanho: "2.80m x 2.40m", status: "producao", expedicao: "2026-07-30", estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "28x Meia Cana Fechada #22 (2.80m)", guia: "2x Guia U 70x30mm (2.40m)", soleira: "1x Soleira Tubo Simples (2.80m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.80m", motor: "1x Motor AC 300kg" }
    },
    { 
        id: 11905, cliente: "Serralheria do Vale", tipo: "Com Pintura", cor: "Preto", tamanho: "3.50m x 3.00m", status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "36x Meia Cana Microperfurada #22 (3.50m)", guia: "2x Guia U 80x30mm (3.00m)", soleira: "1x Soleira Dupla (3.50m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.50m", motor: "1x Motor AC 400kg + Bateria" }
    },
    { 
        id: 11906, cliente: "Construtora Nordeste", tipo: "Com Pintura", cor: "Branco", tamanho: "6.20m x 4.50m", status: "producao", expedicao: "2026-07-31", estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "56x Meia Cana Fechada #20 (6.20m)", guia: "2x Guia U 100x30mm (4.50m)", soleira: "1x Soleira Tubo Reforçado (6.20m)", eixo: "1x Eixo Tubo 6.5\" x 6.20m", motor: "1x Motor AC 1000kg" }
    },
    { 
        id: 11907, cliente: "Vidraçaria Cristal", tipo: "Sem Pintura", cor: "Cinza", tamanho: "2.50m x 2.20m", status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "26x Meia Cana Fechada #24 (2.50m)", guia: "2x Guia U 60x30mm (2.20m)", soleira: "1x Soleira Simples (2.50m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.50m", motor: "1x Motor AC 200kg" }
    },
    { 
        id: 11908, cliente: "Tintas & Cia", tipo: "Com Pintura", cor: "Laranja", tamanho: "4.00m x 3.20m", status: "producao", expedicao: "2026-07-30", estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "40x Meia Cana Transvision #22 (4.00m)", guia: "2x Guia U 80x30mm (3.20m)", soleira: "1x Soleira Tubo (4.00m)", eixo: "1x Eixo Tubo 5\" x 4.00m", motor: "1x Motor AC 500kg" }
    },
    { 
        id: 11909, cliente: "Posto de Molas 2 Irmãos", tipo: "Com Pintura", cor: "Verde", tamanho: "5.50m x 4.20m", status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "52x Meia Cana Fechada #20 (5.50m)", guia: "2x Guia U 90x30mm (4.20m)", soleira: "1x Soleira Dupla Cantoneira (5.50m)", eixo: "1x Eixo Tubo 6\" x 5.50m", motor: "1x Motor AC 800kg" }
    },
    { 
        id: 11910, cliente: "Central de Portas", tipo: "Sem Pintura", cor: "Cinza", tamanho: "3.00m x 2.60m", status: "producao", expedicao: "2026-07-30", estanteLamina: "", prtLamina: "", localEixos: "",
        detalhes: { laminas: "31x Meia Cana Fechada #22 (3.00m)", guia: "2x Guia U 70x30mm (2.60m)", soleira: "1x Soleira Tubo (3.00m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.00m", motor: "1x Motor AC 300kg" }
    },

    // =========================================================================
    // 2. PEDIDOS EM PROCESSAMENTO / LOCAIS ALOCADOS NA PRODUÇÃO (10 Pedidos)
    // =========================================================================
    { 
        id: 11018, cliente: "Indústria Metal", tipo: "Com Pintura", cor: "Preto", tamanho: "5.20m x 3.80m", status: "producao", expedicao: "2026-07-30", estanteLamina: "Estante Lâminas 1", prtLamina: "Prateleira 3", localEixos: "Prateleira 2",
        detalhes: { laminas: "46x Meia Cana Microperfurada #20 (5.20m)", guia: "2x Guia U 80x30mm (3.80m)", soleira: "1x Soleira Tubo Reforçado (5.20m)", eixo: "1x Eixo Tubo 5.1/2\" x 5.20m", motor: "1x Motor AC 600kg" }
    },
    { 
        id: 11019, cliente: "Restaurante Sabor", tipo: "Com Pintura", cor: "Laranja", tamanho: "2.90m x 2.30m", status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 2", prtLamina: "Prateleira 5", localEixos: "Prateleira 1",
        detalhes: { laminas: "28x Meia Cana Fechada #22 (2.90m)", guia: "2x Guia U 70x30mm (2.30m)", soleira: "1x Soleira Simples (2.90m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.90m", motor: "1x Motor AC 300kg" }
    },
    { 
        id: 11020, cliente: "Serralheria União", tipo: "Com Pintura", cor: "Vermelho", tamanho: "4.80m x 3.60m", status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 3", prtLamina: "Prateleira 1", localEixos: "Prateleira 4",
        detalhes: { laminas: "44x Meia Cana Fechada #20 (4.80m)", guia: "2x Guia U 90x30mm (3.60m)", soleira: "1x Soleira Dupla (4.80m)", eixo: "1x Eixo Tubo 5\" x 4.80m", motor: "1x Motor AC 600kg" }
    },
    { 
        id: 11021, cliente: "Depósito Norte", tipo: "Com Pintura", cor: "Azul", tamanho: "3.60m x 2.90m", status: "producao", expedicao: "2026-07-31", estanteLamina: "Estante Lâminas 4", prtLamina: "Prateleira 8", localEixos: "Prateleira 3",
        detalhes: { laminas: "36x Meia Cana Transvision #22 (3.60m)", guia: "2x Guia U 80x30mm (2.90m)", soleira: "1x Soleira Tubo (3.60m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.60m", motor: "1x Motor AC 400kg" }
    },
    { 
        id: 11022, cliente: "Construtora VIP", tipo: "Com Pintura", cor: "Amarelo", tamanho: "3.10m x 2.70m", status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 1", prtLamina: "Prateleira 4", localEixos: "Prateleira 5",
        detalhes: { laminas: "32x Meia Cana Fechada #22 (3.10m)", guia: "2x Guia U 70x30mm (2.70m)", soleira: "1x Soleira Simples (3.10m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.10m", motor: "1x Motor AC 300kg" }
    },
    { 
        id: 11023, cliente: "Eletro Center", tipo: "Com Pintura", cor: "Verde", tamanho: "4.20m x 3.10m", status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 1", prtLamina: "Prateleira 2", localEixos: "Prateleira 2",
        detalhes: { laminas: "38x Meia Cana Microperfurada #22 (4.20m)", guia: "2x Guia U 80x30mm (3.10m)", soleira: "1x Soleira Dupla (4.20m)", eixo: "1x Eixo Tubo 5\" x 4.20m", motor: "1x Motor AC 500kg" }
    },
    { 
        id: 11024, cliente: "Panificadora Central", tipo: "Sem Pintura", cor: "Cinza", tamanho: "2.70m x 2.20m", status: "producao", expedicao: "2026-07-30", estanteLamina: "Estante Lâminas 2", prtLamina: "Prateleira 4", localEixos: "Prateleira 1",
        detalhes: { laminas: "27x Meia Cana Fechada #24 (2.70m)", guia: "2x Guia U 60x30mm (2.20m)", soleira: "1x Soleira Simples (2.70m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.70m", motor: "1x Motor AC 200kg" }
    },
    { 
        id: 11025, cliente: "Frigorífico Boi Gordo", tipo: "Com Pintura", cor: "Preto", tamanho: "6.00m x 4.00m", status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 3", prtLamina: "Prateleira 6", localEixos: "Prateleira 6",
        detalhes: { laminas: "52x Meia Cana Fechada #20 (6.00m)", guia: "2x Guia U 100x30mm (4.00m)", soleira: "1x Soleira Tubo Reforçado (6.00m)", eixo: "1x Eixo Tubo 6\" x 6.00m", motor: "1x Motor AC 1000kg" }
    },
    { 
        id: 11026, cliente: "Bar e Lanchonete", tipo: "Com Pintura", cor: "Branco", tamanho: "2.40m x 2.10m", status: "producao", expedicao: "2026-08-01", estanteLamina: "Estante Lâminas 2", prtLamina: "Prateleira 1", localEixos: "Prateleira 1",
        detalhes: { laminas: "25x Meia Cana Fechada #24 (2.40m)", guia: "2x Guia U 60x30mm (2.10m)", soleira: "1x Soleira Simples (2.40m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.40m", motor: "1x Motor AC 200kg" }
    },
    { 
        id: 11027, cliente: "Escola Futuro", tipo: "Com Pintura", cor: "Azul", tamanho: "3.80m x 3.00m", status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 4", prtLamina: "Prateleira 1", localEixos: "Prateleira 3",
        detalhes: { laminas: "37x Meia Cana Microperfurada #22 (3.80m)", guia: "2x Guia U 80x30mm (3.00m)", soleira: "1x Soleira Tubo (3.80m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.80m", motor: "1x Motor AC 400kg" }
    },

    // =========================================================================
    // 3. ESTOQUE FINAL / PRONTAS PARA CARREGAMENTO E EXPEDIÇÃO (10 Pedidos)
    // =========================================================================
    { 
        id: 11001, cliente: "Metalúrgica Silva", tipo: "Com Pintura", cor: "Preto", tamanho: "5.20m x 3.80m", status: "estoque", expedicao: HOJE, locais: ["A-2", "B-2"],
        detalhes: { laminas: "46x Meia Cana Microperfurada #20 (5.20m)", guia: "2x Guia U 80x30mm (3.80m)", soleira: "1x Soleira Tubo Reforçado (5.20m)", eixo: "1x Eixo Tubo 5.1/2\" x 5.20m", motor: "1x Motor AC 600kg com Testeira" }
    },
    { 
        id: 11002, cliente: "Mercado Central", tipo: "Com Pintura", cor: "Cinza", tamanho: "3.80m x 2.50m", status: "estoque", expedicao: HOJE, locais: ["A-4", "B-4"],
        detalhes: { laminas: "30x Meia Cana Fechada #22 (3.80m)", guia: "2x Guia U 70x30mm (2.50m)", soleira: "1x Soleira Tubo Simples (3.80m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.80m", motor: "1x Motor AC 400kg" }
    },
    { 
        id: 11003, cliente: "Construtora Alfa", tipo: "Sem Pintura", cor: "Cinza", tamanho: "2.90m x 2.40m", status: "estoque", expedicao: "2026-07-30", locais: ["C-1"],
        detalhes: { laminas: "29x Meia Cana Galvanizada #22 (2.90m)", guia: "2x Guia U 70x30mm (2.40m)", soleira: "1x Soleira Cantoneira (2.90m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.90m", motor: "1x Motor AC 300kg" }
    },
    { 
        id: 11004, cliente: "Drogaria São Paulo", tipo: "Com Pintura", cor: "Vermelho", tamanho: "4.20m x 3.00m", status: "estoque", expedicao: HOJE, locais: ["C-5", "D-5"],
        detalhes: { laminas: "38x Meia Cana Transvision #22 (4.20m)", guia: "2x Guia U 80x30mm (3.00m)", soleira: "1x Soleira Dupla (4.20m)", eixo: "1x Eixo Tubo 5\" x 4.20m", motor: "1x Motor AC 500kg" }
    },
    { 
        id: 11005, cliente: "Carlos Eduardo Ref", tipo: "Com Pintura", cor: "Azul", tamanho: "2.80m x 2.20m", status: "estoque", expedicao: "2026-07-31", locais: ["F-8"],
        detalhes: { laminas: "27x Meia Cana Fechada #22 (2.80m)", guia: "2x Guia U 70x30mm (2.20m)", soleira: "1x Soleira Simples (2.80m)", eixo: "1x Eixo Tubo 4.1/2\" x 2.80m", motor: "1x Motor AC 300kg" }
    },
    { 
        id: 11006, cliente: "Shopping Rio Mar", tipo: "Com Pintura", cor: "Preto", tamanho: "7.00m x 4.50m", status: "estoque", expedicao: HOJE, locais: ["G-2", "H-2", "I-2"],
        detalhes: { laminas: "60x Meia Cana Microperfurada #20 (7.00m)", guia: "2x Guia U 100x30mm (4.50m)", soleira: "1x Soleira Tubo Reforçado (7.00m)", eixo: "1x Eixo Tubo 6.5\" x 7.00m", motor: "1x Motor AC 1200kg" }
    },
    { 
        id: 11007, cliente: "Auto Peças Lider", tipo: "Com Pintura", cor: "Amarelo", tamanho: "3.50m x 2.80m", status: "estoque", expedicao: "2026-07-30", locais: ["J-1", "K-1"],
        detalhes: { laminas: "35x Meia Cana Fechada #22 (3.50m)", guia: "2x Guia U 70x30mm (2.80m)", soleira: "1x Soleira Tubo (3.50m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.50m", motor: "1x Motor AC 400kg" }
    },
    { 
        id: 11008, cliente: "Residencial Parque", tipo: "Sem Pintura", cor: "Cinza", tamanho: "3.10m x 2.50m", status: "estoque", expedicao: HOJE, locais: ["L-4"],
        detalhes: { laminas: "31x Meia Cana Galvanizada #22 (3.10m)", guia: "2x Guia U 70x30mm (2.50m)", soleira: "1x Soleira Simples (3.10m)", eixo: "1x Eixo Tubo 4.1/2\" x 3.10m", motor: "1x Motor AC 300kg" }
    },
    { 
        id: 11009, cliente: "Padaria Suprema", tipo: "Com Pintura", cor: "Laranja", tamanho: "3.90m x 2.90m", status: "estoque", expedicao: HOJE, locais: ["B-7", "C-7"],
        detalhes: { laminas: "36x Meia Cana Transvision #22 (3.90m)", guia: "2x Guia U 80x30mm (2.90m)", soleira: "1x Soleira Dupla (3.90m)", eixo: "1x Eixo Tubo 5\" x 3.90m", motor: "1x Motor AC 500kg" }
    },
    { 
        id: 11010, cliente: "Supermercado Baita", tipo: "Com Pintura", cor: "Preto", tamanho: "5.80m x 4.00m", status: "estoque", expedicao: HOJE, locais: ["E-3", "F-3"],
        detalhes: { laminas: "50x Meia Cana Fechada #20 (5.80m)", guia: "2x Guia U 90x30mm (4.00m)", soleira: "1x Soleira Tubo Reforçado (5.80m)", eixo: "1x Eixo Tubo 6\" x 5.80m", motor: "1x Motor AC 800kg" }
    }
];
