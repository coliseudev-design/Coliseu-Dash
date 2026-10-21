import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  DollarSign,
  Scale,
  Clock,
} from 'lucide-react-native';
import api from '../../src/services/api';
import { Header } from '../../src/components/Header';
import { PeriodSelector } from '../../src/components/PeriodSelector';
import { MetricCard } from '../../src/components/MetricCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { usePeriodStore } from '../../src/store/periodStore';
import { formatBRL, formatPercent } from '../../src/utils/format';
import { Colors } from '../../src/theme/colors';

interface CaixaConta {
  id?: string | number;
  descricao?: string;
  nome?: string;
  saldo?: number | string;
  tipo?: string;
}

export default function FinanceiroScreen() {
  const { getQueryParams } = usePeriodStore();
  const queryParams = getQueryParams();

  // 1. Saldos de Caixas e Bancos
  const {
    data: caixasData,
    isLoading: isLoadingCaixas,
    isRefetching: isRefetchingCaixas,
    refetch: refetchCaixas,
  } = useQuery({
    queryKey: ['financeiro-caixas'],
    queryFn: async () => {
      const res = await api.get('/financeiro/caixas');
      return res.data?.data || res.data || [];
    },
  });

  // 2. Resumo Financeiro (Receitas, Despesas, Títulos)
  const {
    data: resumoData,
    isLoading: isLoadingResumo,
    isRefetching: isRefetchingResumo,
    refetch: refetchResumo,
  } = useQuery({
    queryKey: ['financeiro-resumo', queryParams],
    queryFn: async () => {
      try {
        const res = await api.get('/bi/financial/summary', { params: queryParams });
        return res.data?.data || res.data;
      } catch {
        // Fallback
        const fallback = await api.get('/financeiro/titulos-resumo', { params: queryParams });
        return fallback.data?.data || fallback.data;
      }
    },
  });

  const refetchAll = () => {
    refetchCaixas();
    refetchResumo();
  };

  const isRefreshing = isRefetchingCaixas || isRefetchingResumo;
  const isLoading = isLoadingCaixas && isLoadingResumo;

  // Normalização de dados
  const listaCaixas: CaixaConta[] = Array.isArray(caixasData) ? caixasData : [];

  const saldoTotalCaixas = listaCaixas.reduce(
    (acc, c) => acc + (parseFloat(String(c.saldo || 0)) || 0),
    0
  );

  const receitas = parseFloat(resumoData?.receitas || resumoData?.total_receber || 0);
  const despesas = parseFloat(resumoData?.despesas || resumoData?.total_pagar || 0);
  const resultadoLiquido = receitas - despesas;
  const aReceberHoje = parseFloat(resumoData?.receber_hoje || resumoData?.a_receber_hoje || 0);
  const aPagarHoje = parseFloat(resumoData?.pagar_hoje || resumoData?.a_pagar_hoje || 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header onRefresh={refetchAll} isRefreshing={isRefreshing} />
      <PeriodSelector />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetchAll}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {isLoading && !caixasData && !resumoData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando dados financeiros...</Text>
          </View>
        ) : (
          <>
            {/* Card Saldo Consolidado */}
            <SectionHeader
              title="Posição de Caixa"
              subtitle="Saldos disponíveis em contas e caixas"
            />

            <MetricCard
              title="Saldo Consolidado"
              value={formatBRL(saldoTotalCaixas)}
              subtitle="Total líquido em contas correntes e cofres"
              icon={Wallet}
              color={saldoTotalCaixas >= 0 ? Colors.success : Colors.danger}
              badge={`${listaCaixas.length} contas`}
            />

            {/* Grid Receitas x Despesas */}
            <SectionHeader
              title="Fluxo Operacional"
              subtitle="Valores provisionados e movimentados"
            />

            <View style={styles.flowGrid}>
              <View style={styles.flowCard}>
                <View style={styles.flowCardHeader}>
                  <View style={[styles.flowIcon, { backgroundColor: Colors.successGlow }]}>
                    <ArrowDownRight size={18} color={Colors.success} />
                  </View>
                  <Text style={styles.flowCardTitle}>Entradas / A Receber</Text>
                </View>
                <Text style={[styles.flowCardValue, { color: Colors.success }]}>
                  {formatBRL(receitas || aReceberHoje)}
                </Text>
                <Text style={styles.flowCardSub}>Vencimento no período</Text>
              </View>

              <View style={styles.flowCard}>
                <View style={styles.flowCardHeader}>
                  <View style={[styles.flowIcon, { backgroundColor: Colors.dangerGlow }]}>
                    <ArrowUpRight size={18} color={Colors.danger} />
                  </View>
                  <Text style={styles.flowCardTitle}>Saídas / A Pagar</Text>
                </View>
                <Text style={[styles.flowCardValue, { color: Colors.danger }]}>
                  {formatBRL(despesas || aPagarHoje)}
                </Text>
                <Text style={styles.flowCardSub}>Compromissos a liquidar</Text>
              </View>
            </View>

            {/* Resultado Previsto */}
            <View style={styles.resultBanner}>
              <View style={styles.resultHeader}>
                <Scale size={18} color={resultadoLiquido >= 0 ? Colors.success : Colors.danger} />
                <Text style={styles.resultTitle}>Resultado Líquido do Período</Text>
              </View>
              <Text
                style={[
                  styles.resultValue,
                  { color: resultadoLiquido >= 0 ? Colors.success : Colors.danger },
                ]}
              >
                {formatBRL(resultadoLiquido)}
              </Text>
            </View>

            {/* Lista dos Caixas e Contas Bancárias */}
            {listaCaixas.length > 0 && (
              <>
                <SectionHeader
                  title="Detalhamento das Contas"
                  subtitle="Distribuição por agência e caixa físico"
                />

                <View style={styles.caixasCard}>
                  {listaCaixas.map((caixa, index) => {
                    const saldo = parseFloat(String(caixa.saldo || 0));
                    const isPositivo = saldo >= 0;

                    return (
                      <View
                        key={caixa.id || index}
                        style={[
                          styles.caixaRow,
                          index === listaCaixas.length - 1 && styles.caixaRowLast,
                        ]}
                      >
                        <View style={styles.caixaLeft}>
                          <Building2 size={16} color={Colors.textMuted} />
                          <View style={styles.caixaNameContainer}>
                            <Text style={styles.caixaName} numberOfLines={1}>
                              {caixa.descricao || caixa.nome || `Conta #${caixa.id}`}
                            </Text>
                            {caixa.tipo && (
                              <Text style={styles.caixaTipo}>{caixa.tipo}</Text>
                            )}
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.caixaSaldo,
                            { color: isPositivo ? Colors.textPrimary : Colors.danger },
                          ]}
                        >
                          {formatBRL(saldo)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textMuted,
  },
  flowGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  flowCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flowCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flowIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    flex: 1,
  },
  flowCardValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  flowCardSub: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  caixasCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  caixaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  caixaRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  caixaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  caixaNameContainer: {
    flex: 1,
  },
  caixaName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  caixaTipo: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  caixaSaldo: {
    fontSize: 14,
    fontWeight: '700',
  },
});
