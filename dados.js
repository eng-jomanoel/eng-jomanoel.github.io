window.HOJE = "2026-07-29";
window.estantesEstoque = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];
window.estantesLaminas = ["Estante Lâminas 1", "Estante Lâminas 2", "Estante Lâminas 3", "Estante Lâminas 4"];

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

// Dados completos das 30 portas simuladas com Largura x Altura
window.pedidos = [
    { id: 11901, cliente: "Oficina do Alumínio", tipo: "Com Pintura", cor: "Vermelho", largura: 3.20, altura: 2.80, status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11902, cliente: "Comercial Piauí", tipo: "Com Pintura", cor: "Azul", largura: 4.50, altura: 3.50, status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11903, cliente: "Metalúrgica Teresina", tipo: "Sem Pintura", cor: "Cinza", largura: 5.80, altura: 4.00, status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11904, cliente: "Auto Peças BR", tipo: "Com Pintura", cor: "Amarelo", largura: 2.80, altura: 2.40, status: "producao", expedicao: "2026-07-30", estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11905, cliente: "Serralheria do Vale", tipo: "Com Pintura", cor: "Preto", largura: 3.50, altura: 3.00, status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11906, cliente: "Construtora Nordeste", tipo: "Com Pintura", cor: "Branco", largura: 6.20, altura: 4.50, status: "producao", expedicao: "2026-07-31", estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11907, cliente: "Vidraçaria Cristal", tipo: "Sem Pintura", cor: "Cinza", largura: 2.50, altura: 2.20, status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11908, cliente: "Tintas & Cia", tipo: "Com Pintura", cor: "Laranja", largura: 4.00, altura: 3.20, status: "producao", expedicao: "2026-07-30", estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11909, cliente: "Posto de Molas 2 Irmãos", tipo: "Com Pintura", cor: "Verde", largura: 5.50, altura: 4.20, status: "producao", expedicao: HOJE, estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11910, cliente: "Central de Portas", tipo: "Sem Pintura", cor: "Cinza", largura: 3.00, altura: 2.60, status: "producao", expedicao: "2026-07-30", estanteLamina: "", prtLamina: "", localEixos: "" },
    { id: 11018, cliente: "Indústria Metal", tipo: "Com Pintura", cor: "Preto", largura: 5.20, altura: 3.80, status: "producao", expedicao: "2026-07-30", estanteLamina: "Estante Lâminas 1", prtLamina: "Prateleira 3", localEixos: "Prateleira 2" },
    { id: 11019, cliente: "Restaurante Sabor", tipo: "Com Pintura", cor: "Laranja", largura: 2.90, altura: 2.30, status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 2", prtLamina: "Prateleira 5", localEixos: "Prateleira 1" },
    { id: 11020, cliente: "Serralheria União", tipo: "Com Pintura", cor: "Vermelho", largura: 4.80, altura: 3.60, status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 3", prtLamina: "Prateleira 1", localEixos: "Prateleira 4" },
    { id: 11021, cliente: "Depósito Norte", tipo: "Com Pintura", cor: "Azul", largura: 3.60, altura: 2.90, status: "producao", expedicao: "2026-07-31", estanteLamina: "Estante Lâminas 4", prtLamina: "Prateleira 8", localEixos: "Prateleira 3" },
    { id: 11022, cliente: "Construtora VIP", tipo: "Com Pintura", cor: "Amarelo", largura: 3.10, altura: 2.70, status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 1", prtLamina: "Prateleira 4", localEixos: "Prateleira 5" },
    { id: 11023, cliente: "Eletro Center", tipo: "Com Pintura", cor: "Verde", largura: 4.20, altura: 3.10, status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 1", prtLamina: "Prateleira 2", localEixos: "Prateleira 2" },
    { id: 11024, cliente: "Panificadora Central", tipo: "Sem Pintura", cor: "Cinza", largura: 2.70, altura: 2.20, status: "producao", expedicao: "2026-07-30", estanteLamina: "Estante Lâminas 2", prtLamina: "Prateleira 4", localEixos: "Prateleira 1" },
    { id: 11025, cliente: "Frigorífico Boi Gordo", tipo: "Com Pintura", cor: "Preto", largura: 6.00, altura: 4.00, status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 3", prtLamina: "Prateleira 6", localEixos: "Prateleira 6" },
    { id: 11026, cliente: "Bar e Lanchonete", tipo: "Com Pintura", cor: "Branco", largura: 2.40, altura: 2.10, status: "producao", expedicao: "2026-08-01", estanteLamina: "Estante Lâminas 2", prtLamina: "Prateleira 1", localEixos: "Prateleira 1" },
    { id: 11027, cliente: "Escola Futuro", tipo: "Com Pintura", cor: "Azul", largura: 3.80, altura: 3.00, status: "producao", expedicao: HOJE, estanteLamina: "Estante Lâminas 4", prtLamina: "Prateleira 1", localEixos: "Prateleira 3" },
    { id: 11001, cliente: "Metalúrgica Silva", tipo: "Com Pintura", cor: "Preto", largura: 5.20, altura: 3.80, status: "estoque", expedicao: HOJE, locais: ["A-2", "B-2"] },
    { id: 11002, cliente: "Mercado Central", tipo: "Com Pintura", cor: "Cinza", largura: 3.80, altura: 2.50, status: "estoque", expedicao: HOJE, locais: ["A-4", "B-4"] },
    { id: 11003, cliente: "Construtora Alfa", tipo: "Sem Pintura", cor: "Cinza", largura: 2.90, altura: 2.40, status: "estoque", expedicao: "2026-07-30", locais: ["C-1"] },
    { id: 11004, cliente: "Drogaria São Paulo", tipo: "Com Pintura", cor: "Vermelho", largura: 4.20, altura: 3.00, status: "estoque", expedicao: HOJE, locais: ["C-5", "D-5"] },
    { id: 11005, cliente: "Carlos Eduardo Ref", tipo: "Com Pintura", cor: "Azul", largura: 2.80, altura: 2.20, status: "estoque", expedicao: "2026-07-31", locais: ["F-8"] },
    { id: 11006, cliente: "Shopping Rio Mar", tipo: "Com Pintura", cor: "Preto", largura: 7.00, altura: 4.50, status: "estoque", expedicao: HOJE, locais: ["G-2", "H-2", "I-2"] },
    { id: 11007, cliente: "Auto Peças Lider", tipo: "Com Pintura", cor: "Amarelo", largura: 3.50, altura: 2.80, status: "estoque", expedicao: "2026-07-30", locais: ["J-1", "K-1"] },
    { id: 11008, cliente: "Residencial Parque", tipo: "Sem Pintura", cor: "Cinza", largura: 3.10, altura: 2.50, status: "estoque", expedicao: HOJE, locais: ["L-4"] },
    { id: 11009, cliente: "Padaria Suprema", tipo: "Com Pintura", cor: "Laranja", largura: 3.90, altura: 2.90, status: "estoque", expedicao: HOJE, locais: ["B-7", "C-7"] },
    { id: 11010, cliente: "Supermercado Baita", tipo: "Com Pintura", cor: "Preto", largura: 5.80, altura: 4.00, status: "estoque", expedicao: HOJE, locais: ["E-3", "F-3"] }
];
