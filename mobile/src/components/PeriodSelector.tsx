import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Calendar, X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../theme/colors';
import { usePeriodStore, PERIOD_OPTIONS, PeriodKey } from '../store/periodStore';

export const PeriodSelector: React.FC = () => {
  const { period, startDate, endDate, setPeriod, setCustomRange } = usePeriodStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [tempStart, setTempStart] = useState(startDate || '');
  const [tempEnd, setTempEnd] = useState(endDate || '');

  const handleSelect = (key: PeriodKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'custom') {
      // Abre modal de personalização
      setTempStart(startDate || new Date().toISOString().split('T')[0]);
      setTempEnd(endDate || new Date().toISOString().split('T')[0]);
      setModalVisible(true);
    } else {
      setPeriod(key);
    }
  };

  const handleApplyCustom = () => {
    if (!tempStart || !tempEnd) {
      Alert.alert('Período Inválido', 'Por favor, informe a data inicial e final.');
      return;
    }
    if (tempStart > tempEnd) {
      Alert.alert('Período Inválido', 'A data inicial não pode ser maior que a data final.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCustomRange(tempStart, tempEnd);
    setModalVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = period === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => handleSelect(opt.key)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {opt.key === 'custom' && (
                <Calendar
                  size={14}
                  color={isActive ? Colors.primary : Colors.textMuted}
                  style={styles.chipIcon}
                />
              )}
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Modal de Intervalo Personalizado */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Calendar size={18} color={Colors.primary} />
                <Text style={styles.modalTitle}>Intervalo Personalizado</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Defina as datas no formato AAAA-MM-DD (ex: 2026-10-01)
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Data Inicial</Text>
              <TextInput
                style={styles.input}
                value={tempStart}
                onChangeText={setTempStart}
                placeholder="2026-10-01"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Data Final</Text>
              <TextInput
                style={styles.input}
                value={tempEnd}
                onChangeText={setTempEnd}
                placeholder="2026-10-21"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleApplyCustom}
              >
                <Check size={16} color="#FFFFFF" />
                <Text style={styles.applyButtonText}>Aplicar Filtro</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primaryGlow,
    borderColor: Colors.primary,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  applyButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    gap: 6,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
