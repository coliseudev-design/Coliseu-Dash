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
  TrendingUp,
  Target,
  ShoppingBag,
  Calculator,
  Calendar,
  Zap,
} from 'lucide-react-native';
import api from '../../src/services/api';
import { Header } from '../../src/components/Header';
import { PeriodSelector } from '../../src/components/PeriodSelector';
import { MetricCard } from '../../src/components/MetricCard';
import { SectionHeader } from '../../src/components/SectionHeader';
import { usePeriodStore } from '../../src/store/periodStore';
import { formatBRL, formatPercent, formatNum } from '../../src/utils/format';
import { Colors } from '../../src/theme/colors';

export default function EstrategicoScreen() {
  const { getQueryParams } = usePeriodStore();
  const queryParams = getQueryParams();

  // Polling constante a cada 15s conforme instrução do usuário
  const {
    data: overview,
    isLoading: isLoadingOverview,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['estatisticas-overview', queryParams],
    queryFn: async () => {
      const { data } = await api.get('/estatisticas/overview', { params: queryParams });
      return data;
    },
  });

  const { data: vendasFaturadas } = useQuery({
    queryKey: ['vendas-faturadas', queryParams],
    queryFn: async () => {
      const { data } = await api.get('/vendas/faturadas', { params: queryParams });
      return data;
    },
  });

  // Dados calculados
  const faturamento = parseFloat(overview?.faturamento || overview?.total_vendas || 0);
  const metaValor = parseFloat(overview?.meta || overview?.meta_valor || 0);
  const metaPct = metaValor > 0 ? (faturamento / metaValor) * 100 : (overview?.meta_atingida_pct || 0);
  const ticketMedio = parseFloat(overview?.ticket_medio || 0);
  const qtdVendas = parseInt(overview?.qtd_vendas || overview?.total_pedidos || 0, 10);

  // Evolução recente de vendas para a mini-tabela de dias
  const diasEvolucao: any[] = Array.isArray(vendasFaturadas?.dias)
    ? vendasFaturadas.dias.slice(-7)
    : Array.isArray(vendasFaturadas)
    ? vendasFaturadas.slice(-7)
    : [];

  const maxDiaValor = diasEvolucao.reduce(
    (max, d) => Math.max(max, parseFloat(d.valor || d.total || 0)),
    1
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header onRefresh={refetch} isRefreshing={isRefetching} />
      <PeriodSelector />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {isLoadingOverview && !overview ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando indicadores em tempo real...</Text>
          </View>
        ) : (
          <>
            {/* Meta Executiva Banner */}
            {metaValor > 0 && (
              <View style={styles.goalBanner}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalTitleRow}>
                    <Target size={18} color={Colors.success} />
                    <Text style={styles.goalTitle}>Meta do Mês</Text>
                  </View>
                  <Text style={styles.goalPct}>{formatPercent(metaPct)}</Text>
                </View>

                {/* Barra de Progresso da Meta */}
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(100, Math.max(0, metaPct))}%`,
                        backgroundColor: metaPct >= 100 ? Colors.success : Colors.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.goalFooter}>
                  <Text style={styles.goalFooterText}>
                    Alcançado: <Text style={styles.goalFooterBold}>{formatBRL(faturamento)}</Text>
                  </Text>
                  <Text style={styles.goalFooterText}>
                    Meta: <Text style={styles.goalFooterBold}>{formatBRL(metaValor)}</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* Cards de Métricas Principais */}
            <SectionHeader
              title="Visão Executiva"
              subtitle="Resultados comerciais consolidados"
            />

            <MetricCard
              title="Faturamento Líquido"
              value={formatBRL(faturamento)}
              subtitle="Total de vendas faturadas no período"
              icon={TrendingUp}
              color={Colors.primary}
              badge="Tempo Real"
            />

            <View style={styles.metricsGrid}>
              <View style={styles.gridColumn}>
                <MetricCard
                  title="Ticket Médio"
                  value={formatBRL(ticketMedio)}
                  subtitle="Média por venda"
                  icon={Calculator}
                  color={Colors.warning}
                />
              </View>
              <View style={styles.gridColumn}>
                <MetricCard
                  title="Total de Vendas"
                  value={formatNum(qtdVendas)}
                  subtitle="Pedidos aprovados"
                  icon={ShoppingBag}
                  color={Colors.success}
                />
              </View>
            </View>

            {/* Evolução Diária das Vendas */}
            {diasEvolucao.length > 0 && (
              <>
                <SectionHeader
                  title="Evolução das Vendas"
                  subtitle="Ritmo de faturamento dos últimos dias"
                />

                <View style={styles.chartCard}>
                  {diasEvolucao.map((dia, idx) => {
                    const val = parseFloat(dia.valor || dia.total || 0);
                    const pctBar = Math.min(100, Math.max(8, (val / maxDiaValor) * 100));
                    const dataFormatada = dia.data || dia.dia || `Dia ${idx + 1}`;

                    return (
                      <View key={idx} style={styles.barRow}>
                        <View style={styles.barLabelContainer}>
                          <Text style={styles.barDate}>{dataFormatada}</Text>
                        </View>

                        <View style={styles.barTrack}>
                          <View style={[styles.barFill, { width: `${pctBar}%` }]} />
                        </View>

                        <Text style={styles.barValue}>{formatBRL(val)}</Text>
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
  goalBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  goalPct: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.success,
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  goalFooterText: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  goalFooterBold: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  gridColumn: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabelContainer: {
    width: 60,
  },
  barDate: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 6,
  },
  barValue: {
    width: 85,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
});
