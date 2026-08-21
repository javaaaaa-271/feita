import type { Product } from "../demonstracao/demo-client";

// Dados fictícios carregados somente no desenvolvimento local.
export const demoProducts: Product[] = [
  {
    id: 1,
    name: "Caderno Jardim",
    category: "Papelaria",
    description: "Caderno artesanal para anotações do dia a dia.",
    price: 54,
    stock: 8,
    variations: ["Capa clara", "Capa escura"],
    published: true,
    tone: "clay",
    initials: "CJ",
  },
  {
    id: 2,
    name: "Planner Semanal",
    category: "Organização",
    description: "Visão semanal sem datas para começar quando quiser.",
    price: 42,
    stock: 3,
    variations: [],
    published: true,
    tone: "plum",
    initials: "PS",
  },
  {
    id: 3,
    name: "Cartão Presente",
    category: "Presentes",
    description: "Um cartão para acompanhar presentes especiais.",
    price: 18,
    stock: 0,
    variations: [],
    published: true,
    tone: "olive",
    initials: "CP",
  },
];
