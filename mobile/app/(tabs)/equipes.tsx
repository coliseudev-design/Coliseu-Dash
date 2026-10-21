import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Users, Target, UserCheck, TrendingUp } from 'lucide-react-native';
import api from '../../src/services/api';
import { Header } from '../../src/components/Header';
import { PeriodSelector } from '../../src/components/PeriodSelector';
import { SectionHeader } from '../../src/components/SectionHeader';
import { usePeriodStore } from '../../src/store/periodStore';
import { formatBRL, formatPercent, formatNum } from '../../src/utils/format';
import { Colors } from '../../src/theme/colors';

interface VendedorItem {
  id?: string | number;
  vendedor_id?: string | number;
  nome: string;
  total_vendas?: number;
  faturamento?: number;
  meta?: number;
  meta_valor?: number;
  meta_pct?: number;
  positivacao?: number;
  comissao?: number;
  qtd_vendas?: number;
}

const VendedorCard = React.memo(({ item, index }: { item: VendedorItem; index: number }) => {
  const faturamento = parseFloat(String(item.faturamento ?? item.total_vendas ?? 0));
  const meta = parseFloat(String(item.meta ?? item.meta_valor ?? 0));
  const metaPct = meta > 0 ? (faturamento / meta) * 100 : (item.meta_pct || 0);
  const qtdVendas = parseInt(String(item.qtd_vendas ?? 0), 10);
  const positivacao = item.positivacao || 0;

  const isMetaBatida = metaPct >= 100;
  const statusColor = isMetaBatida
    ? Colors.success
    : metaPct >= 70
    ? Colors.warning
    : Colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
            <Text style={[styles.avatarText, { color: statusColor }]}>
              {item.nome.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameContainer}>
            <Text style={styles.vendedorName} numberOfLines={1}>
              {item.nome}
            </Text>
            <Text style={styles.positionText}>Posição #{index + 1}</Text>
          </View>
        </View>

        <View style={styles.faturamentoContainer}>
          <Text style={styles.faturamentoLabel}>Faturado</Text>
          <Text style={styles.faturamentoValue}>{formatBRL(faturamento)}</Text>
        </View>
      </View>

      {/* Meta e Barra de Progresso */}
      {meta > 0 && (
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Meta: {formatBRL(meta)}</Text>
            <Text style={[styles.metaPctText, { color: statusColor }]}>
              {formatPercent(metaPct)}
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, Math.max(0, metaPct))}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Indicadores complementares (Positivação / Pedidos) */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <UserCheck size={13} color={Colors.textMuted} />
          <Text style={styles.statLabel}>Positivação:</Text>
          <Text style={styles.statValue}>{formatNum(positivacao)} clientes</Text>
        </View>

        <View style={styles.statItem}>
          <TrendingUp size={13} color={Colors.textMuted} />
          <Text style={styles.statLabel}>Vendas:</Text>
          <Text style={styles.statValue}>{formatNum(qtdVendas)}</Text>
        </View>
      </View>
    </View>
  );
});

export default function EquipesScreen() {
  const { getQueryParams } = usePeriodStore();
  const queryParams = getQueryParams();

  // Polling constante a cada 15 segundos
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['equipes-ranking', queryParams],
    queryFn: async () => {
      // Tenta rota de comissões/equipes ou fallback para ranking de vendedores
      try {
        const res = await api.get('/comissoes/ranking', { params: queryParams });
        if (Array.isArray(res.data) && res.data.length > 0) return res.data;
      } catch {
        // Fallback para ranking de vendedores
      }
      const fallbackRes = await api.get('/ranking/vendedores', {
        params: { ...queryParams, limit: 50 },
      });
      return fallbackRes.data?.data || fallbackRes.data || [];
    },
  });

  const vendedores: VendedorItem[] = Array.isArray(data) ? data : [];

  const renderItem = useCallback(
    ({ item, index }: { item: VendedorItem; index: number }) => (
      <VendedorCard item={item} index={index} />
    ),
    []
  );

  const keyExtractor = useCallback(
    (item: VendedorItem, index: number) => String(item.id || item.vendedor_id || index),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header onRefresh={refetch} isRefreshing={isRefetching} />
      <PeriodSelector />

      <View style={styles.content}>
        <SectionHeader
          title="Equipe Comercial"
          subtitle={`${vendedores.length} vendedores acompanhados em tempo real`}
        />

        {isLoading && vendedores.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando métricas da equipe...</Text>
          </View>
        ) : (
          <FlatList
            data={vendedores}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={5}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum vendedor encontrado</Text>
                <Text style={styles.emptySubtitle}>
                  Não há vendas registradas para o período selecionado.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContent: {
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
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  nameContainer: {
    flex: 1,
  },
  vendedorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    marginTop: 2,
  },
  faturamentoContainer: {
    alignItems: 'flex-end',
  },
  faturamentoLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  faturamentoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  metaSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  metaPctText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.04)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  statValue: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
