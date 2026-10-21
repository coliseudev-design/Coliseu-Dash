import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Award, Medal, Package, Users, Building } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import api from '../../src/services/api';
import { Header } from '../../src/components/Header';
import { PeriodSelector } from '../../src/components/PeriodSelector';
import { SectionHeader } from '../../src/components/SectionHeader';
import { usePeriodStore } from '../../src/store/periodStore';
import { formatBRL, formatNum } from '../../src/utils/format';
import { Colors } from '../../src/theme/colors';

type RankingType = 'vendedores' | 'produtos' | 'clientes';

interface RankingItem {
  id?: string | number;
  codigo?: string | number;
  nome: string;
  total_vendas?: number;
  faturamento?: number;
  valor?: number;
  quantidade?: number;
  qtd?: number;
  pedidos?: number;
}

const MEDAL_COLORS = [Colors.gold, Colors.silver, Colors.bronze];
const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

const RankingCard = React.memo(
  ({
    item,
    index,
    type,
  }: {
    item: RankingItem;
    index: number;
    type: RankingType;
  }) => {
    const valor = parseFloat(String(item.faturamento ?? item.total_vendas ?? item.valor ?? 0));
    const qtd = parseInt(String(item.quantidade ?? item.qtd ?? item.pedidos ?? 0), 10);
    const isPodium = index < 3;
    const podiumColor = isPodium ? MEDAL_COLORS[index] : Colors.border;

    return (
      <View style={[styles.card, isPodium && { borderColor: podiumColor }]}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.rankBadge,
              isPodium
                ? { backgroundColor: `${podiumColor}20`, borderColor: podiumColor }
                : styles.rankBadgeNormal,
            ]}
          >
            {isPodium ? (
              <Text style={styles.podiumEmoji}>{MEDAL_EMOJIS[index]}</Text>
            ) : (
              <Text style={styles.rankNumber}>#{index + 1}</Text>
            )}
          </View>

          <View style={styles.infoCol}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.nome}
            </Text>
            <Text style={styles.itemSub}>
              {type === 'produtos'
                ? `${formatNum(qtd)} un vendidas`
                : type === 'clientes'
                ? `${formatNum(qtd)} pedidos faturados`
                : `${formatNum(qtd)} vendas realizadas`}
            </Text>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.valueText}>{formatBRL(valor)}</Text>
          <Text style={styles.valueSub}>Faturamento</Text>
        </View>
      </View>
    );
  }
);

export default function RankingsScreen() {
  const [activeType, setActiveType] = useState<RankingType>('vendedores');
  const { getQueryParams } = usePeriodStore();
  const queryParams = getQueryParams();

  const handleTypeChange = (type: RankingType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveType(type);
  };

  // Polling constante a cada 15 segundos
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['ranking-data', activeType, queryParams],
    queryFn: async () => {
      const endpoint = `/ranking/${activeType}`;
      const res = await api.get(endpoint, {
        params: { ...queryParams, limit: 50 },
      });
      return res.data?.data || res.data || [];
    },
  });

  const rankingList: RankingItem[] = Array.isArray(data) ? data : [];

  const renderItem = useCallback(
    ({ item, index }: { item: RankingItem; index: number }) => (
      <RankingCard item={item} index={index} type={activeType} />
    ),
    [activeType]
  );

  const keyExtractor = useCallback(
    (item: RankingItem, index: number) => String(item.id || item.codigo || index),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header onRefresh={refetch} isRefreshing={isRefetching} />
      <PeriodSelector />

      <View style={styles.content}>
        {/* Chips de Seleção de Categoria do Ranking */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeType === 'vendedores' && styles.segmentBtnActive]}
            onPress={() => handleTypeChange('vendedores')}
            activeOpacity={0.7}
          >
            <Users
              size={15}
              color={activeType === 'vendedores' ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                activeType === 'vendedores' && styles.segmentTextActive,
              ]}
            >
              Vendedores
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeType === 'produtos' && styles.segmentBtnActive]}
            onPress={() => handleTypeChange('produtos')}
            activeOpacity={0.7}
          >
            <Package
              size={15}
              color={activeType === 'produtos' ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                activeType === 'produtos' && styles.segmentTextActive,
              ]}
            >
              Produtos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeType === 'clientes' && styles.segmentBtnActive]}
            onPress={() => handleTypeChange('clientes')}
            activeOpacity={0.7}
          >
            <Building
              size={15}
              color={activeType === 'clientes' ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.segmentText,
                activeType === 'clientes' && styles.segmentTextActive,
              ]}
            >
              Clientes
            </Text>
          </TouchableOpacity>
        </View>

        <SectionHeader
          title={`Top 50 ${
            activeType === 'vendedores'
              ? 'Vendedores'
              : activeType === 'produtos'
              ? 'Produtos Mais Vendidos'
              : 'Maiores Clientes'
          }`}
          subtitle="Ordenado por faturamento total"
        />

        {isLoading && rankingList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Carregando posições do ranking...</Text>
          </View>
        ) : (
          <FlatList
            data={rankingList}
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
                <Trophy size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum registro para o ranking</Text>
                <Text style={styles.emptySubtitle}>
                  Altere o período ou aguarde novos faturamentos sincronizados.
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
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 4,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primaryGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeNormal: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.border,
  },
  podiumEmoji: {
    fontSize: 16,
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textSecondary,
  },
  infoCol: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  valueText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  valueSub: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginTop: 2,
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
