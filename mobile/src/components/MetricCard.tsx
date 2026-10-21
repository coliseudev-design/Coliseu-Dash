import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react-native';
import { Colors } from '../theme/colors';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  badge?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = Colors.primary,
  trend,
  badge,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.iconBox, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
            <Icon size={18} color={color} />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>

        {badge && (
          <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
            <Text style={[styles.badgeText, { color }]}>{badge}</Text>
          </View>
        )}
      </View>

      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>

      {(subtitle || trend) && (
        <View style={styles.footer}>
          {trend && (
            <View style={[styles.trendBox, trend.isPositive ? styles.trendPositive : styles.trendNegative]}>
              {trend.isPositive ? (
                <TrendingUp size={12} color={Colors.success} />
              ) : (
                <TrendingDown size={12} color={Colors.danger} />
              )}
              <Text
                style={[
                  styles.trendText,
                  { color: trend.isPositive ? Colors.success : Colors.danger },
                ]}
              >
                {trend.value}
              </Text>
            </View>
          )}

          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  trendBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trendPositive: {
    backgroundColor: Colors.successGlow,
  },
  trendNegative: {
    backgroundColor: Colors.dangerGlow,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    flex: 1,
  },
});
