import api from './api';
import { BiPeriodFilter, BiApiResponse } from '../types/bi.types';
import { SalesIntelligenceResponse, SalesHubResponse, ABCAnalysisResponse } from '../types/sales.types';
import { Radar360Response, CustomerAnalyticsResponse } from '../types/customer.types';
import { FinancialDashboardResponse } from '../types/financial.types';
import { SupplierAnalyticsResponse } from '../types/supplier.types';
import { ComparativeAnalysisResponse } from '../types/comparative.types';
import { GoalsResponse } from '../types/goals.types';

export const BIService = {
  // Inteligência de Vendas
  getSalesIntelligence: async (filter: BiPeriodFilter): Promise<SalesIntelligenceResponse> => {
    const { data } = await api.get<BiApiResponse<SalesIntelligenceResponse>>('/bi/executive/summary', { params: filter });
    return data.data;
  },

  // Hub de Vendas
  getSalesHub: async (filter: BiPeriodFilter): Promise<SalesHubResponse> => {
    const { data } = await api.get<BiApiResponse<SalesHubResponse>>('/bi/commercial/orders', { params: filter });
    return data.data;
  },

  // Análise ABC
  getABCAnalysis: async (filter: BiPeriodFilter): Promise<ABCAnalysisResponse> => {
    const { data } = await api.get<BiApiResponse<ABCAnalysisResponse>>('/bi/products/abc', { params: filter });
    return data.data;
  },

  // Análise Financeira
  getFinancialIntelligence: async (filter: BiPeriodFilter): Promise<FinancialDashboardResponse> => {
    const { data } = await api.get<BiApiResponse<FinancialDashboardResponse>>('/bi/finance/dashboard-data', { params: filter });
    return data.data;
  },

  // Radar 360
  getRadar360: async (customerId: number, filter: Partial<BiPeriodFilter> = {}): Promise<Radar360Response> => {
    const { data } = await api.get<BiApiResponse<Radar360Response>>(`/bi/customer/${customerId}/dna`, { params: filter });
    return data.data;
  },

  // Análise de Clientes
  getCustomerAnalytics: async (filter: BiPeriodFilter): Promise<CustomerAnalyticsResponse> => {
    const { data } = await api.get<BiApiResponse<CustomerAnalyticsResponse>>('/clientes/overview/kpis', { params: filter });
    return data.data;
  },

  // Análise de Fornecedores
  getSupplierAnalytics: async (filter: BiPeriodFilter): Promise<SupplierAnalyticsResponse> => {
    const { data } = await api.get<BiApiResponse<SupplierAnalyticsResponse>>('/fornecedor/visaogeral', { params: filter });
    return data.data;
  },

  // Análise Comparativa
  getComparativeAnalysis: async (filter: BiPeriodFilter): Promise<ComparativeAnalysisResponse> => {
    const { data } = await api.get<BiApiResponse<ComparativeAnalysisResponse>>('/comparativo/resumo', { params: filter });
    return data.data;
  },

  // Análise de Metas
  getGoals: async (filter: BiPeriodFilter): Promise<GoalsResponse> => {
    const { data } = await api.get<BiApiResponse<GoalsResponse>>('/bi/goals', { params: filter });
    return data.data;
  }
};
