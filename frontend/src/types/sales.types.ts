import { BiPeriod } from './bi.types';

export interface ExecutiveSummaryData {
  faturamento: number;
  faturamento_anterior: number;
  crescimento_pct: number;
  quantidade_pedidos: number;
  ticket_medio: number;
  margem_bruta_pct: number;
  clientes_ativos: number;
  vendedores_ativos: number;
  periodo: BiPeriod;
}

export interface CommercialKpis {
  meta_total: number;
  atingimento_meta_pct: number;
  dias_uteis: number;
  media_diaria: number;
  melhor_dia: {
    data: string;
    valor: number;
  };
  pior_dia: {
    data: string;
    valor: number;
  };
}

export interface SalesIntelligenceResponse {
  executive_summary: ExecutiveSummaryData;
  commercial_kpis: CommercialKpis;
}

export interface OrderItem {
  id: number;
  numero_nota: string;
  data_emissao: string;
  cliente_nome: string;
  vendedor_nome: string;
  valor_total: number;
  status: 'FATURADO' | 'PENDENTE' | 'CANCELADO';
  status_code: number;
  items_count: number;
  margem_pct: number;
}

export interface SellerRanking {
  rank: number;
  vendedor_id: number;
  nome: string;
  total_vendas: number;
  quantidade_pedidos: number;
  ticket_medio: number;
  margem_media_pct: number;
  meta_atingimento_pct: number;
}

export interface SalesHubResponse {
  recent_orders: OrderItem[];
  seller_rankings: SellerRanking[];
}

export interface ABCProduct {
  id: number;
  descricao: string;
  faturamento: number;
  quantidade_vendida: number;
  margem_pct: number;
  estoque_atual: number;
  dias_reposicao: number;
  classe?: 'A' | 'B' | 'C';
}

export interface ABCClassData {
  quantidade_produtos: number;
  faturamento_total: number;
  percentual_faturamento: number;
  margem_media_pct: number;
  produtos: ABCProduct[];
}

export interface ABCAnalysisResponse {
  abc_analysis: {
    classe_a: ABCClassData;
    classe_b: ABCClassData;
    classe_c: ABCClassData;
  };
  abc_by_brand: Array<{
    marca: string;
    classe: 'A' | 'B' | 'C';
    faturamento: number;
    percentual: number;
    quantidade_produtos: number;
    margem_media_pct: number;
  }>;
}
