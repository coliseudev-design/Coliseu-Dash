export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return 'R$ 0,00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatBRLCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return 'R$ 0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  const abs = Math.abs(num);

  if (abs >= 1_000_000) {
    return `R$ ${(num / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `R$ ${(num / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return formatBRL(num);
}

export function formatNum(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined || isNaN(Number(value))) return '0%';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(1).replace('.', ',')}%`;
}
