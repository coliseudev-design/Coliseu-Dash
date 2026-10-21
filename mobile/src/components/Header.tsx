import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { LogOut, RefreshCw, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';
import { useAuthStore } from '../store/authStore';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onRefresh, isRefreshing }) => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sair da Conta',
      'Deseja realmente desconectar do ColiseuDash?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onRefresh) onRefresh();
  };

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <Text style={styles.brandTitle}>Coliseu<Text style={styles.brandAccent}>Dash</Text></Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>TEMPO REAL</Text>
          </View>
        </View>
        <Text style={styles.companyName} numberOfLines={1}>
          {user?.company_name || user?.nome || 'Minha Empresa'}
        </Text>
      </View>

      <View style={styles.actions}>
        {onRefresh && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RefreshCw
              size={18}
              color={isRefreshing ? Colors.primary : Colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.iconButton, styles.logoutButton]}
          onPress={handleLogout}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <LogOut size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  left: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Colors.primary,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.successGlow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  companyName: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
});
