export interface SupplierOverview {
  total_fornecedores: number;
  fornecedores_ativos: number;
  compras_totais: number;
  numero_compras: number;
  ticket_medio_compra: number;
  prazo_medio_entrega_dias: number;
  taxa_devolucao_pct: number;
}

export interface TopSupplier {
  fornecedor_id: number;
  nome: string;
  compras_totais: number;
  numero_compras: number;
  ticket_medio: number;
  prazo_entrega_dias: number;
  taxa_devolucao_pct: number;
  status: string;
}

export interface InventoryAnalysis {
  estoque_total_valor: number;
  estoque_total_quantidade: number;
  produtos_estoque_critico: number;
  produtos_estoque_baixo: number;
  produtos_sem_estoque: number;
  dias_estoque_medio: number;
}

export interface BrandRanking {
  marca: string;
  compras_totais: number;
  numero_compras: number;
  ticket_medio: number;
  fornecedor_principal: string;
  margem_media_pct: number;
}

export interface SupplierAnalyticsResponse {
  supplier_overview: SupplierOverview;
  top_fornecedores: TopSupplier[];
  analise_estoque: InventoryAnalysis;
  ranking_marcas: BrandRanking[];
}
