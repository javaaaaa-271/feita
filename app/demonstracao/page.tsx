import type { Metadata } from "next";
import DemoClient from "./demo-client";

export const metadata: Metadata = {
  title: "Demonstração — Feita",
  description: "Conheça o painel e a vitrine da Feita com dados de teste.",
};

export default function DemonstrationPage() {
  return <DemoClient />;
}
