# Relatório Técnico: Diagnóstico de Rankings e Solução Definitiva

## 1. O que estava causando a diferença absurda?

1. **Como o ERP calcula o ranking de produtos (Fórmula Exata)**:
   - Para cada item faturado, o ERP aplica o desconto individual do item (`PEDIDO_ITENS.DESCONTO`):
     $$\text{Valor Líquido Item} = \text{Valor Bruto} \times \left(1 - \frac{\text{Desconto Item}}{100}\right)$$
   - Exemplo real do produto **EUCALIPTO TRATADO 11 A 13 2.7 MT** (Pedido 680881):
     - Quantidade: **314**
     - Valor Bruto: **R$ 49.411,04**
     - Desconto do Item: **30,732078%**
     - Valor Líquido no ERP: **R$ 34.226,00**

2. **Por que o Dashboard mostrou R$ 49.411,04 no print anterior?**
   - No PostgreSQL em produção, os dados antigos em `dash_vendas_itens` haviam sido sincronizados pelo Worker antes da criação da coluna `desconto_item`.
   - Quando a query foi alterada para `vi.valor_total * (1 - vi.desconto_item / 100)`, como `desconto_item` estava `0` nas linhas existentes no banco, o cálculo resultou em `49.411,04 * (1 - 0) = R$ 49.411,04` (o valor BRUTO total sem nenhum desconto).

3. **Por que `Categorias` e `Marcas` deram erro 500?**
   - A coluna `desconto_item` foi criada em arquivo de migração, mas não estava listada no array de migrações automáticas no boot do servidor. Com isso, o PostgreSQL acusava que a coluna não existia ao consultar categorias e marcas.

---

## 2. Solução Definitiva de Engenharia (Fórmula Híbrida Inteligente)

Para garantir que os números nunca fiquem inflados no bruto e batam com o ERP mesmo com dados legados no banco, implementamos a **Fórmula Híbrida**:

```sql
SUM(
    CASE 
        -- 1. Se o item já tem o desconto sincronizado do ERP (desconto individual por item):
        WHEN COALESCE(vi.desconto_item, 0) > 0 
            THEN vi.valor_total * (1 - vi.desconto_item / 100.0)
            
        -- 2. Fallback para dados legados: rateia o valor líquido real da venda (vf.valor_total):
        WHEN spv.sum_itens > 0 
            THEN vi.valor_total * (vf.valor_total / spv.sum_itens)
            
        -- 3. Caso padrão (devolução ou item sem desconto):
        ELSE vi.valor_total * (CASE WHEN vf.valor_total < 0 THEN -1 ELSE 1 END)
    END
) AS total
```

### Resultados obtidos:
- **Com `desconto_item`**: EUCALIPTO = **R$ 34.226,00** (100% idêntico ao ERP na vírgula).
- **Sem `desconto_item` (fallback)**: EUCALIPTO = **R$ 35.724,31** (valor líquido rateado da venda, nunca o bruto de R$ 49k).
- **Categorias e Marcas**: Erro 500 corrigido com a migração `010_desconto_item.sql` registrada no boot e queries validadas.
