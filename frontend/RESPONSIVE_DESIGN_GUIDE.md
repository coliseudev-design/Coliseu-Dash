# Guia de Design Responsivo — Coliseu Dash

> Padrões oficiais de responsividade para o Coliseu Dash. Siga este guia ao criar ou modificar qualquer componente.

## Breakpoints

| Breakpoint | Largura | Dispositivo |
|------------|---------|-------------|
| `xs` | 320px | iPhone SE, phones pequenos |
| `sm` | 360px | Android padrão, iPhone 12 |
| `md` | 480px | Phones grandes |
| `lg` | 768px | Tablets |
| `xl` | 1024px | Desktops |
| `2xl` | 1280px | Widescreen |

> Definidos em `tailwind.config.js` e `src/utils/responsiveBreakpoints.ts`

## Padrões de Grid

```tsx
// KPIs (5 colunas)
'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4'

// Cards (3-4 colunas)
'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'

// Layout bipartido
'grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4'

// Layout tripartido
'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4'
```

## Padrões de Padding

```tsx
// Página principal
'p-3 sm:p-4 md:p-5 lg:p-6'

// Cards
'p-3 sm:p-4 md:p-5'

// Inline (horizontal)
'px-3 sm:px-4 py-2 sm:py-2.5'
```

## Padrões de Tipografia

```tsx
// Labels KPI
'text-[11px] sm:text-xs md:text-sm'

// Valores KPI
'text-base sm:text-xl md:text-2xl'

// Títulos de seção
'text-sm sm:text-base md:text-lg font-bold'

// Badges
'text-[12px] sm:text-xs px-2.5 py-1'
```

## Padrões de Filtros

```tsx
// Wrapper de filtros
<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
  // Item de filtro individual
  <div className="w-full sm:w-44 md:w-52 lg:w-56">
    <label className="text-[11px] sm:text-xs font-bold uppercase">Label</label>
    <select className="w-full h-9 sm:h-10 ...">...</select>
  </div>
</div>

// Componente pronto: src/components/FilterSelect.tsx
```

## Padrões de Gráficos

```tsx
// Altura responsiva (não use h-[XXXpx] fixo)
'min-h-[200px] sm:min-h-[260px] lg:min-h-[320px]'

// Para donuts/pizzas (proporcional)
'w-32 sm:w-40 md:w-48 h-32 sm:h-40 md:h-48'
```

## Tabelas Responsivas

```tsx
// Desktop: tabela normal
<div className="hidden sm:block overflow-x-auto border border-divider/50 rounded-xl">
  <table>...</table>
</div>

// Mobile: cards
<div className="sm:hidden space-y-2">
  {data.map(row => (
    <div className="p-3 rounded-xl border border-divider/50 bg-bg-secondary/10">
      {/* dados em layout flex/grid */}
    </div>
  ))}
</div>

// Componente pronto: src/components/ResponsiveTable.tsx
```

## Sidebar

- Mobile: `fixed`, abre com overlay
- Desktop (`lg+`): `sticky`, sempre visível
- Largura: `w-56 sm:w-64` (menor em phones)
- Animação: `transition-transform duration-300`

## Componentes Reutilizáveis

| Componente | Local | Uso |
|-----------|-------|-----|
| `FilterSelect` | `src/components/FilterSelect.tsx` | Selects responsivos sem `min-w` fixo |
| `ResponsiveTable` | `src/components/ResponsiveTable.tsx` | Tabelas com fallback mobile em cards |
| `BREAKPOINTS` | `src/utils/responsiveBreakpoints.ts` | Constantes e hook `useWindowWidth()` |
| `RP` | `src/utils/responsivePatterns.ts` | Strings de classes Tailwind padronizadas |

## Checklist de Novo Componente

Antes de criar ou modificar um componente, verifique:

- [ ] Grid usa 4+ breakpoints (xs/sm/md/lg/xl)
- [ ] Sem `min-w-[...]` fixo em selects/inputs
- [ ] Sem `h-[...]` fixo em gráficos — usar `min-h-[...]`
- [ ] Tabelas com fallback mobile em cards
- [ ] Padding usa padrão `p-3 sm:p-4 md:p-5`
- [ ] Textos usam padrão `text-[11px] sm:text-xs md:text-sm`
- [ ] Filtros usam `w-full sm:w-44 md:w-52`
- [ ] Sem scroll horizontal necessário em mobile

## Testando em Mobile

1. Chrome DevTools → Toggle Device Toolbar
2. Testar em: 320px, 360px, 480px, 768px, 1024px
3. Verificar: sem scroll horizontal, textos legíveis, proporções OK
4. Testar orientação landscape
