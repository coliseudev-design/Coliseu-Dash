# 📱 ColiseuDash Mobile (iOS & Android)

Aplicativo executivo móvel oficial do **ColiseuDash**, desenvolvido em **React Native com Expo (SDK 52)** e **TypeScript**, integrado diretamente à infraestrutura, multi-tenancy e banco de dados PostgreSQL do Coliseu Sistemas.

---

## 🚀 Funcionalidades Principais (4 Pilares)

1. **📊 Visão Estratégica (`/(tabs)/index`)**:
   - Faturamento Líquido em Tempo Real
   - Atingimento da Meta do Mês (%) com barra de progresso visual
   - Ticket Médio e Quantidade de Vendas
   - Evolução diária do faturamento recente
   - Atualização contínua (polling a cada 15 segundos) + Pull-to-refresh

2. **👥 Equipes (`/(tabs)/equipes`)**:
   - Desempenho individual e ranqueado dos vendedores
   - Metas de cada vendedor e status de atingimento
   - Quantidade de vendas e índice de positivação de clientes
   - Virtualização memoizada via `FlatList` para alta performance 60 FPS

3. **🏆 Rankings (`/(tabs)/rankings`)**:
   - Alternância ágil entre 3 visões: **Vendedores**, **Produtos Mais Vendidos** e **Clientes**
   - Pódio estilizado com medalhas de ouro (🥇), prata (🥈) e bronze (🥉)
   - Top 50 faturados com detalhamento de volume

4. **💳 Financeiro (`/(tabs)/financeiro`)**:
   - Saldo Consolidado em Caixas e Contas Bancárias
   - Fluxo operacional: Entradas/A Receber vs Saídas/A Pagar
   - Resultado líquido provisionado do período
   - Detalhamento de saldos por agência/banco e caixa físico

---

## 🔒 Segurança & Recursos Mobile

- **Autenticação Biométrica**: Suporte nativo a **Face ID** e **Impressão Digital** via `expo-local-authentication`.
- **Armazenamento Criptografado**: Tokens JWT salvos com segurança via `expo-secure-store` (Keychain no iOS e Keystore no Android).
- **Multi-Tenant / Seleção de Empresa**: Suporte a login em contas com múltiplos CNPJs ou empresas vinculadas.
- **Filtros Rápidos Táteis**: Chips de acesso instantâneo: `[Hoje]`, `[Ontem]`, `[Este Mês]`, `[Mês Anterior]` e `[Personalizado]` com seletor de intervalo de datas.
- **Feedback Háptico**: Vibração tátil sutil (`expo-haptics`) ao navegar entre abas e filtros.
- **Design System Executivo**: Modo escuro sofisticado sem violeta/roxo, com área de toque mínima de 48dp na *Thumb Zone*.

---

## 🛠️ Como Executar no Celular (Expo Go)

1. Certifique-se de ter o Node.js instalado e entre na pasta `mobile`:
   ```bash
   cd mobile
   npm install
   ```

2. Inicie o servidor Expo:
   ```bash
   npx expo start
   ```

3. Abra no celular:
   - **No iPhone**: Abra a câmera padrão e aponte para o QR Code gerado no terminal (necessário ter o app [Expo Go](https://apps.apple.com/app/expo-go/id982107779) instalado da App Store).
   - **No Android**: Abra o aplicativo [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) e escaneie o QR Code.

---

## 📦 Como Gerar Binários de Produção (APK / AAB / IPA)

O projeto está 100% pronto para compilação nativa utilizando o **EAS Build** (Expo Application Services):

1. Instale o EAS CLI globalmente (se ainda não tiver):
   ```bash
   npm install -g eas-cli
   ```

2. Faça login na sua conta Expo:
   ```bash
   eas login
   ```

3. Configure o projeto EAS:
   ```bash
   eas build:configure
   ```

4. Gerar APK instalável para testes em Android:
   ```bash
   eas build -p android --profile preview
   ```

5. Gerar AAB para publicação na Google Play Store:
   ```bash
   eas build -p android --profile production
   ```

6. Gerar IPA para TestFlight / Apple App Store:
   ```bash
   eas build -p ios --profile production
   ```
