import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Mail, Fingerprint, Eye, EyeOff, Building2, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore, Company } from '../../src/store/authStore';
import { Colors } from '../../src/theme/colors';

export default function LoginScreen() {
  const {
    login,
    loginWithBiometrics,
    selectCompany,
    requiresSelection,
    companies,
    cachedEmail,
    isBiometricAvailable,
    isLoading,
    error,
    clearError,
  } = useAuthStore();

  const [email, setEmail] = useState(cachedEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos obrigatórios', 'Por favor, informe seu e-mail e senha.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearError();
    await login(email.trim(), password);
  };

  const handleBiometricLogin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    clearError();
    const success = await loginWithBiometrics();
    if (!success) {
      Alert.alert(
        'Biometria',
        'Não foi possível autenticar por biometria. Por favor, entre com seu e-mail e senha.'
      );
    }
  };

  const handleSelectCompany = async (company: Company) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await selectCompany(company);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header & Logo */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <Text style={styles.brandTitle}>Coliseu<Text style={styles.brandAccent}>Dash</Text></Text>
            <Text style={styles.brandSubtitle}>Inteligência comercial executiva no seu bolso</Text>
          </View>

          {/* Se precisar selecionar empresa */}
          {requiresSelection ? (
            <View style={styles.companySelectionCard}>
              <View style={styles.companyHeader}>
                <Building2 size={20} color={Colors.primary} />
                <Text style={styles.companyTitle}>Selecione a Empresa</Text>
              </View>
              <Text style={styles.companySubtitle}>
                Sua conta possui acesso a múltiplos estabelecimentos:
              </Text>

              <View style={styles.companyList}>
                {companies.map((company) => (
                  <TouchableOpacity
                    key={company.id}
                    style={styles.companyItem}
                    onPress={() => handleSelectCompany(company)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.companyInfo}>
                      <Text style={styles.companyItemName}>{company.name}</Text>
                      <Text style={styles.companyItemId}>ID: {company.id}</Text>
                    </View>
                    <ArrowRight size={18} color={Colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            /* Formulário de Login Padrão */
            <View style={styles.formCard}>
              {error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Campo E-mail */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-mail</Text>
                <View style={styles.inputContainer}>
                  <Mail size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) clearError();
                    }}
                    placeholder="seu@email.com"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Campo Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Senha</Text>
                <View style={styles.inputContainer}>
                  <Lock size={18} color={Colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) clearError();
                    }}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={Colors.textMuted} />
                    ) : (
                      <Eye size={18} color={Colors.textMuted} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Botão Entrar */}
              <TouchableOpacity
                style={styles.loginButton}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.loginButtonText}>Acessar Dashboard</Text>
                )}
              </TouchableOpacity>

              {/* Botão Biometria (se disponível) */}
              {isBiometricAvailable && cachedEmail && (
                <TouchableOpacity
                  style={styles.biometricButton}
                  onPress={handleBiometricLogin}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Fingerprint size={22} color={Colors.primary} />
                  <Text style={styles.biometricButtonText}>
                    Entrar com Biometria
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Rodapé Seguro */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Conectado aos servidores oficiais Coliseu Sistemas
            </Text>
            <Text style={styles.footerSubtext}>Versão 1.0.0 • Multi-tenant Seguro</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  brandAccent: {
    color: Colors.primary,
  },
  brandSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  errorBox: {
    backgroundColor: Colors.dangerGlow,
    borderWidth: 1,
    borderColor: Colors.danger,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  eyeButton: {
    padding: 6,
  },
  loginButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  biometricButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderHighlight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 14,
  },
  biometricButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  companySelectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  companyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  companySubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  companyList: {
    gap: 10,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  companyInfo: {
    flex: 1,
  },
  companyItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  companyItemId: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
