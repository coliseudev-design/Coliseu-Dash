import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BIService } from '../../services/biApi';
import { formatBRL, formatNum } from '../../utils/format';
import { 
  ShoppingCart, Users, AlertTriangle, PackageX, FileText, CheckCircle2, 
  Search, Filter, ChevronRight, X, Phone, Mail, MapPin, Building2, 
  Calendar, ArrowRight, PlusCircle, ExternalLink, RefreshCw, Clock,
  DollarSign, PackageCheck, AlertCircle, Layers, ArrowUpRight,
  ArrowDownUp, ArrowDownCircle, ArrowUpCircle, History, PackageMinus, PackagePlus,
  Trash2, Plus, Minus, ListPlus
} from 'lucide-react';
import clsx from 'clsx';
import PeriodFilter from '../../components/PeriodFilter';

export default function PurchasesDashboard() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'resumo' | 'fornecedores' | 'compras' | 'confronto' | 'baixa_saida'>('resumo');

  // Estados dos filtros
  const [fornecedorSearch, setFornecedorSearch] = useState('');
  const [fornecedorCidade, setFornecedorCidade] = useState('todas');
  const [fornecedorStatus, setFornecedorStatus] = useState('todos');
  const [fornecedorPage, setFornecedorPage] = useState(1);

  // Estado da Ficha 360 do Fornecedor
  const [selectedFornecedorId, setSelectedFornecedorId] = useState<number | null>(null);

  // Estados da Aba Compras
  const [compraSearch, setCompraSearch] = useState('');
  const [compraStatus, setCompraStatus] = useState('todos');
  const [compraPage, setCompraPage] = useState(1);

  // Estados da Aba Confronto
  const [confrontoFornecedorId, setConfrontoFornecedorId] = useState<number | null>(null);
  const [selectedProdutosConfronto, setSelectedProdutosConfronto] = useState<Record<number, number>>({});
  const [isNovaCompraModalOpen, setIsNovaCompraModalOpen] = useState(false);
  const [observacaoNovaCompra, setObservacaoNovaCompra] = useState('');
  const [statusNovaCompra, setStatusNovaCompra] = useState<'Pedido realizado' | 'Rascunho'>('Pedido realizado');
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  // Estados da Aba Baixa e Saída (Tópico 5 - Suporte a Multi-Itens)
  interface ItemMovGrade {
    id: string;
    produto_id: number;
    produto_nome: string;
    produto_codigo: string;
    quantidade: number;
    estoque_atual: number;
  }
  const [tipoMovimentacao, setTipoMovimentacao] = useState<'SAIDA' | 'ENTRADA'>('SAIDA');
  const [selectedClienteId, setSelectedClienteId] = useState<number | null>(null);
  const [selectedProdutoId, setSelectedProdutoId] = useState<number | null>(null);
  const [quantidadeMov, setQuantidadeMov] = useState<string>('1');
  const [descricaoMov, setDescricaoMov] = useState<string>('');
  const [itensGrade, setItensGrade] = useState<ItemMovGrade[]>([]);
  const [movSearch, setMovSearch] = useState<string>('');
  const [movTipoFiltro, setMovTipoFiltro] = useState<'todos' | 'SAIDA' | 'ENTRADA'>('todos');
  const [movPage, setMovPage] = useState<number>(1);
  const [isBaixaModalOpen, setIsBaixaModalOpen] = useState<boolean>(false);

  // Filtro de alerta de estoque da aba Resumo
  const [filtroAlertaEstoque, setFiltroAlertaEstoque] = useState<'todos' | 'comprar' | 'atencao' | 'sem_cadastro'>('todos');
  const [apenasComCompra, setApenasComCompra] = useState<boolean>(true);

  // Filtro de saldo de fornecedores (Aba Fornecedores)
  const [fornecedorSaldo, setFornecedorSaldo] = useState<'com_saldo' | 'todos' | 'sem_saldo'>('com_saldo');

  // 1. Query: Resumo Geral
  const resumoQuery = useQuery({
    queryKey: ['bi-compras-resumo', filtroAlertaEstoque, apenasComCompra],
    queryFn: () => BIService.getComprasResumo({ 
      status_estoque: filtroAlertaEstoque,
      apenas_com_compra: apenasComCompra
    }),
  });

  // 2. Query: Lista de Fornecedores (50 em 50, ordem alfabética)
  const fornecedoresQuery = useQuery({
    queryKey: ['bi-compras-fornecedores', fornecedorPage, fornecedorSearch, fornecedorCidade, fornecedorStatus, fornecedorSaldo],
    queryFn: () => BIService.getComprasFornecedores({
      page: fornecedorPage,
      limit: 50,
      saldo: fornecedorSaldo,
      search: fornecedorSearch,
      cidade: fornecedorCidade,
      status: fornecedorStatus !== 'todos' ? fornecedorStatus : undefined
    }),
    enabled: activeTab === 'fornecedores' || activeTab === 'resumo'
  });

  // 3. Query: Ficha do Fornecedor selecionado
  const fichaQuery = useQuery({
    queryKey: ['bi-compras-fornecedor-ficha', selectedFornecedorId],
    queryFn: () => BIService.getComprasFornecedorFicha(selectedFornecedorId!),
    enabled: !!selectedFornecedorId
  });

  // 4. Query: Lista de Compras / Notas (50 em 50, busca completa)
  const comprasQuery = useQuery({
    queryKey: ['bi-compras-pedidos', compraPage, compraSearch, compraStatus],
    queryFn: () => BIService.getComprasPedidos({
      page: compraPage,
      limit: 50,
      search: compraSearch,
      status: compraStatus !== 'todos' ? compraStatus : undefined
    }),
    enabled: activeTab === 'compras'
  });

  // 5. Query: Lista de Fornecedores para Select de Confronto
  const fornecedoresSelectQuery = useQuery({
    queryKey: ['bi-compras-fornecedores-select'],
    queryFn: () => BIService.getComprasFornecedoresSelect(),
  });

  // 6. Query: Clientes e Fornecedores para Select de Baixa/Saída
  const clientesSelectQuery = useQuery({
    queryKey: ['bi-compras-clientes-select'],
    queryFn: () => BIService.getComprasClientesSelect(),
  });

  // 7. Query: Produtos com Estoque para Select de Baixa/Saída
  const produtosSelectQuery = useQuery({
    queryKey: ['bi-compras-produtos-select'],
    queryFn: () => BIService.getComprasProdutosSelect(),
  });

  // 8. Query: Histórico de Movimentações (Baixas e Entradas)
  const movimentacoesQuery = useQuery({
    queryKey: ['bi-compras-movimentacoes', movPage, movSearch, movTipoFiltro],
    queryFn: () => BIService.getComprasMovimentacoes({
      page: movPage,
      limit: 50,
      search: movSearch,
      tipo: movTipoFiltro !== 'todos' ? movTipoFiltro : undefined
    }),
    enabled: activeTab === 'baixa_saida' || isBaixaModalOpen
  });

  // 9. Mutation: Registrar Baixa ou Entrada de Estoque
  const registrarMovMutation = useMutation({
    mutationFn: (payload: any) => BIService.registrarMovimentacaoEstoque(payload),
    onSuccess: (data) => {
      setSucessoMsg(data.message || 'Movimentação registrada com sucesso!');
      setIsBaixaModalOpen(false);
      setItensGrade([]);
      setSelectedProdutoId(null);
      setQuantidadeMov('1');
      setDescricaoMov('');
      queryClient.invalidateQueries({ queryKey: ['bi-compras-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['bi-compras-produtos-select'] });
      queryClient.invalidateQueries({ queryKey: ['bi-compras-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['bi-compras-confronto'] });
      setTimeout(() => setSucessoMsg(null), 5000);
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Erro ao registrar movimentação.');
    }
  });

  // Auto-selecionar primeiro fornecedor se nenhum selecionado
  const fornecedoresList = fornecedoresSelectQuery.data || [];
  const currentConfrontoId = confrontoFornecedorId || (fornecedoresList.length > 0 ? fornecedoresList[0].id_firebird : null);

  // 6. Query: Confronto de Estoque
  const confrontoQuery = useQuery({
    queryKey: ['bi-compras-confronto', currentConfrontoId],
    queryFn: () => BIService.getComprasConfronto(currentConfrontoId!),
    enabled: !!currentConfrontoId && (activeTab === 'confronto')
  });

  // 7. Mutation: Criar Nova Compra
  const criarCompraMutation = useMutation({
    mutationFn: (payload: any) => BIService.criarPedidoCompra(payload),
    onSuccess: (data) => {
      setSucessoMsg(`Pedido ${data.pedido?.numero_pedido || 'gerado'} criado com sucesso!`);
      setIsNovaCompraModalOpen(false);
      setSelectedProdutosConfronto({});
      queryClient.invalidateQueries({ queryKey: ['bi-compras-resumo'] });
      queryClient.invalidateQueries({ queryKey: ['bi-compras-pedidos'] });
      setTimeout(() => setSucessoMsg(null), 5000);
    }
  });

  const resumoData = resumoQuery.data || {};
  const kpis = resumoData.kpis || {};
  const ultimasCompras = resumoData.ultimas_compras || [];
  const topFornecedores = resumoData.top_fornecedores || [];
  const alertasEstoque = resumoData.alertas_estoque || [];

  const confrontoProdutos = confrontoQuery.data?.produtos || [];

  const handleOpenConfrontoFornecedor = (fornecedorId: number) => {
    setConfrontoFornecedorId(fornecedorId);
    setActiveTab('confronto');
  };

  const handleToggleSelectProduto = (produtoId: number, qtdSugerida: number) => {
    setSelectedProdutosConfronto(prev => {
      const copy = { ...prev };
      if (copy[produtoId]) {
        delete copy[produtoId];
      } else {
        copy[produtoId] = qtdSugerida > 0 ? qtdSugerida : 1;
      }
      return copy;
    });
  };

  const handleUpdateQtdProduto = (produtoId: number, qtd: number) => {
    setSelectedProdutosConfronto(prev => ({
      ...prev,
      [produtoId]: Math.max(1, qtd)
    }));
  };

  const handleCriarPedido = () => {
    if (!currentConfrontoId) return;
    const items = Object.entries(selectedProdutosConfronto).map(([prodId, qtd]) => {
      const prod = confrontoProdutos.find((p: any) => p.produto_id === Number(prodId));
      return {
        produto_id: Number(prodId),
        produto_nome: prod?.produto || 'Produto',
        sku: prod?.sku || '',
        quantidade: qtd,
        custo_unitario: Number(prod?.custo_ultima_compra || 0)
      };
    });

    if (items.length === 0) {
      alert('Selecione pelo menos um produto para gerar a compra.');
      return;
    }

    criarCompraMutation.mutate({
      fornecedor_id: currentConfrontoId,
      produtos: items,
      status: statusNovaCompra,
      observacao: observacaoNovaCompra
    });
  };

  const selectedProdutoInfo = useMemo(() => {
    if (!selectedProdutoId) return null;
    return (produtosSelectQuery.data || []).find((p: any) => p.id_firebird === selectedProdutoId);
  }, [selectedProdutoId, produtosSelectQuery.data]);

  const handleAdicionarItemGrade = () => {
    if (!selectedProdutoId) {
      alert('Selecione um produto antes de adicionar à lista.');
      return;
    }
    const qtdNum = parseFloat(quantidadeMov);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      alert('Informe uma quantidade válida maior que zero.');
      return;
    }

    const prod = (produtosSelectQuery.data || []).find((p: any) => p.id_firebird === selectedProdutoId);
    if (!prod) return;

    setItensGrade(prev => {
      const idx = prev.findIndex(item => item.produto_id === selectedProdutoId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantidade: copy[idx].quantidade + qtdNum
        };
        return copy;
      }
      return [
        ...prev,
        {
          id: `${selectedProdutoId}-${Date.now()}`,
          produto_id: selectedProdutoId,
          produto_nome: prod.nome,
          produto_codigo: prod.codigo || '',
          quantidade: qtdNum,
          estoque_atual: Number(prod.estoque) || 0
        }
      ];
    });

    setSelectedProdutoId(null);
    setQuantidadeMov('1');
  };

  const handleRemoverItemGrade = (id: string) => {
    setItensGrade(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateQtdItemGrade = (id: string, novaQtd: number) => {
    if (isNaN(novaQtd) || novaQtd <= 0) return;
    setItensGrade(prev => prev.map(item => item.id === id ? { ...item, quantidade: novaQtd } : item));
  };

  const handleConfirmarBaixa = () => {
    let itensParaEnviar = [...itensGrade];

    // Se a grade estiver vazia mas houver um produto selecionado no dropdown, inclui automaticamente
    if (itensParaEnviar.length === 0) {
      if (!selectedProdutoId) {
        alert('Selecione ao menos um produto para realizar a movimentação.');
        return;
      }
      const qtdNum = parseFloat(quantidadeMov);
      if (isNaN(qtdNum) || qtdNum <= 0) {
        alert('Informe uma quantidade válida maior que zero.');
        return;
      }
      const prod = (produtosSelectQuery.data || []).find((p: any) => p.id_firebird === selectedProdutoId);
      itensParaEnviar = [{
        id: `${selectedProdutoId}`,
        produto_id: selectedProdutoId,
        produto_nome: prod?.nome || 'Produto',
        produto_codigo: prod?.codigo || '',
        quantidade: qtdNum,
        estoque_atual: Number(prod?.estoque) || 0
      }];
    }

    const cliente = (clientesSelectQuery.data || []).find((c: any) => c.id_firebird === selectedClienteId);

    registrarMovMutation.mutate({
      tipo: tipoMovimentacao,
      cliente_id: selectedClienteId || undefined,
      cliente_nome: cliente?.nome || undefined,
      descricao: descricaoMov.trim() || undefined,
      itens: itensParaEnviar.map(i => ({
        produto_id: i.produto_id,
        quantidade: i.quantidade
      }))
    });
  };

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300" aria-label="Gestão de Compras por Fornecedor">
      
      {/* MENSAGEM DE SUCESSO TOAST */}
      {sucessoMsg && (
        <div className="bg-emerald-500 text-white font-bold text-xs p-3.5 rounded-xl shadow-lg flex items-center justify-between animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{sucessoMsg}</span>
          </div>
          <button onClick={() => setSucessoMsg(null)} className="text-white/80 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. HEADER EXECUTIVO COM NAVEGAÇÃO DE ABAS PROPORCIONAIS */}
      <div className="bg-bg-primary border border-border rounded-2xl p-3.5 sm:p-4 shadow-card flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
              <ShoppingCart size={20} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-text-primary tracking-tight whitespace-nowrap uppercase">
                GESTÃO DE COMPRAS
              </h1>
            </div>
          </div>

          {/* BOTÃO DE AÇÃO RÁPIDA: NOVA BAIXA / SAÍDA */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('baixa_saida');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <PlusCircle size={15} /> Nova Baixa / Saída
            </button>
          </div>
        </div>

        {/* NAVEGAÇÃO ENTRE AS 5 ABAS: PROPORCIONAIS (20% CADA UMA, SEM CORTE) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-bg-secondary p-1.5 rounded-xl border border-divider w-full">
          <button
            type="button"
            onClick={() => setActiveTab('resumo')}
            className={clsx(
              "w-full py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-center",
              activeTab === 'resumo'
                ? "bg-bg-primary text-text-primary shadow-xs border border-border font-black"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-primary/50"
            )}
          >
            <Layers size={14} className="text-sky-500 shrink-0" />
            <span className="truncate">1. Resumo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fornecedores')}
            className={clsx(
              "w-full py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-center",
              activeTab === 'fornecedores'
                ? "bg-bg-primary text-text-primary shadow-xs border border-border font-black"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-primary/50"
            )}
          >
            <Building2 size={14} className="text-amber-500 shrink-0" />
            <span className="truncate">2. Fornecedores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('compras')}
            className={clsx(
              "w-full py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-center",
              activeTab === 'compras'
                ? "bg-bg-primary text-text-primary shadow-xs border border-border font-black"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-primary/50"
            )}
          >
            <FileText size={14} className="text-blue-500 shrink-0" />
            <span className="truncate">3. Compras</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('confronto')}
            className={clsx(
              "w-full py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-center",
              activeTab === 'confronto'
                ? "bg-sky-500 text-white shadow-xs font-black"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-primary/50"
            )}
          >
            <PackageCheck size={14} className="shrink-0" />
            <span className="truncate">4. Confronto</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('baixa_saida')}
            className={clsx(
              "w-full py-2.5 px-2.5 sm:px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 text-center col-span-2 sm:col-span-1",
              activeTab === 'baixa_saida'
                ? "bg-emerald-600 text-white shadow-xs font-black"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-primary/50"
            )}
          >
            <ArrowDownUp size={14} className={clsx("shrink-0", activeTab === 'baixa_saida' ? "text-white" : "text-emerald-500")} />
            <span className="truncate">5. Baixa e Saída</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: RESUMO                                            */}
      {/* ======================================================== */}
      {activeTab === 'resumo' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* KPI CARDS RESUMO */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Fornecedores Cadastrados */}
            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
                <span>Fornecedores</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><Building2 size={14} /></div>
              </div>
              <div className="text-2xl font-black text-text-primary font-mono">{formatNum(kpis.total_fornecedores || 0)}</div>
              <div className="text-[10px] text-text-muted font-semibold mt-1">Homologados na base</div>
            </div>

            {/* Total Comprado */}
            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
                <span>Total Comprado</span>
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500"><DollarSign size={14} /></div>
              </div>
              <div className="text-2xl font-black text-text-primary font-mono">{formatBRL(kpis.total_comprado || 0)}</div>
              <div className="text-[10px] text-text-muted font-semibold mt-1">{formatNum(kpis.total_pedidos || 0)} compras registradas</div>
            </div>

            {/* Produtos Comprados */}
            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
                <span>Itens Comprados</span>
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500"><ShoppingCart size={14} /></div>
              </div>
              <div className="text-2xl font-black text-text-primary font-mono">{formatNum(kpis.produtos_comprados || 0)}</div>
              <div className="text-[10px] text-text-muted font-semibold mt-1">Variedade de Produtos</div>
            </div>

            {/* Estoque Baixo */}
            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
                <span>Estoque Baixo</span>
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500"><AlertTriangle size={14} /></div>
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{formatNum(kpis.produtos_estoque_baixo || 0)}</div>
              <div className="text-[10px] text-text-muted font-semibold mt-1">Abaixo do mínimo</div>
            </div>

            {/* Produtos Zerados / Comprar */}
            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] font-black text-text-secondary uppercase tracking-wider mb-2">
                <span>Comprar Agora</span>
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500"><PackageX size={14} /></div>
              </div>
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{formatNum(kpis.produtos_zerados || 0)}</div>
              <div className="text-[10px] text-text-muted font-semibold mt-1">Estoque zerado</div>
            </div>
          </div>

          {/* TABELA DE ALERTA DE ESTOQUE */}
          <div className="bg-bg-primary border border-border rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-divider/40 pb-3">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Alertas de Reposição e Estoque Crítico
                </h3>
                <p className="text-xs text-text-secondary">Produtos que necessitam de compras imediatas confrontados com seus fornecedores vinculados</p>
              </div>

              {/* Filtros da Tabela de Alertas */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtro: Apenas com Nota de Entrada (Padrão) vs Todos */}
                <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-divider text-xs">
                  <button
                    type="button"
                    onClick={() => setApenasComCompra(true)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer inline-flex items-center gap-1",
                      apenasComCompra 
                        ? "bg-emerald-500 text-white shadow-xs" 
                        : "text-text-secondary hover:text-text-primary"
                    )}
                    title="Exibe apenas produtos que já possuem histórico de compras registradas em notas de entrada"
                  >
                    <CheckCircle2 size={12} /> Com Nota de Entrada (Padrão)
                  </button>
                  <button
                    type="button"
                    onClick={() => setApenasComCompra(false)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer",
                      !apenasComCompra 
                        ? "bg-bg-primary text-text-primary shadow-xs border border-border" 
                        : "text-text-secondary hover:text-text-primary"
                    )}
                    title="Exibe todos os produtos do cadastro de estoque geral"
                  >
                    Todos do Catálogo
                  </button>
                </div>

                {/* Filtro de Nível de Alerta */}
                <div className="flex items-center gap-1.5 bg-bg-secondary p-1 rounded-xl border border-divider text-xs">
                  <button
                    onClick={() => setFiltroAlertaEstoque('todos')}
                    className={clsx("px-2.5 py-1 rounded-lg font-bold transition-all", filtroAlertaEstoque === 'todos' ? "bg-bg-primary text-text-primary shadow-xs" : "text-text-secondary")}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setFiltroAlertaEstoque('comprar')}
                    className={clsx("px-2.5 py-1 rounded-lg font-bold transition-all", filtroAlertaEstoque === 'comprar' ? "bg-rose-500 text-white shadow-xs" : "text-text-secondary")}
                  >
                    Comprar
                  </button>
                  <button
                    onClick={() => setFiltroAlertaEstoque('atencao')}
                    className={clsx("px-2.5 py-1 rounded-lg font-bold transition-all", filtroAlertaEstoque === 'atencao' ? "bg-amber-500 text-white shadow-xs" : "text-text-secondary")}
                  >
                    Atenção
                  </button>
                  <button
                    onClick={() => setFiltroAlertaEstoque('sem_cadastro')}
                    className={clsx("px-2.5 py-1 rounded-lg font-bold transition-all", filtroAlertaEstoque === 'sem_cadastro' ? "bg-blue-500 text-white shadow-xs" : "text-text-secondary")}
                  >
                    Sem Cadastro
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[850px] text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/60 border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider">
                    <th className="py-3 px-3">Produto</th>
                    <th className="py-3 px-3">Último Fornecedor</th>
                    <th className="py-3 px-3 text-right">Estoque Atual</th>
                    <th className="py-3 px-3 text-right">Estoque Mínimo</th>
                    <th className="py-3 px-3 text-right">Sugestão</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {alertasEstoque.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-text-secondary font-semibold">
                        Nenhum alerta de estoque encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    alertasEstoque.map((p: any) => (
                      <tr key={p.produto_id} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className="py-2.5 px-3 max-w-[280px] truncate font-extrabold text-text-primary" title={p.produto}>
                          {p.produto}
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px] truncate text-text-secondary font-semibold" title={p.fornecedor_nome}>
                          {p.fornecedor_nome || 'Sem Fornecedor Vinculado'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={clsx(Number(p.estoque_atual) <= 0 ? "text-rose-600 dark:text-rose-400" : "text-text-primary")}>
                            {formatNum(p.estoque_atual)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-text-secondary">{formatNum(p.estoque_minimo)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-brand-600 dark:text-brand-400">
                          {Number(p.sugestao_compra) > 0 ? `+${formatNum(p.sugestao_compra)}` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.status === 'comprar' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              Comprar
                            </span>
                          )}
                          {p.status === 'atencao' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              Atenção
                            </span>
                          )}
                          {p.status === 'sem_cadastro' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                              Sem Cadastro
                            </span>
                          )}
                          {p.status === 'normal' && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Normal
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {p.fornecedor_id ? (
                            <button
                              onClick={() => handleOpenConfrontoFornecedor(p.fornecedor_id)}
                              className="px-2 py-1 bg-sky-500/10 hover:bg-sky-500 text-sky-600 hover:text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                            >
                              Confrontar <ChevronRight size={12} />
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* GRID: ÚLTIMAS COMPRAS + FORNECEDORES DESTAQUE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* ÚLTIMAS COMPRAS */}
            <div className="bg-bg-primary border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3 border-b border-divider/40 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <Clock size={15} className="text-blue-500" />
                  Últimas Compras Realizadas
                </h3>
                <button
                  onClick={() => setActiveTab('compras')}
                  className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Ver todas <ChevronRight size={12} />
                </button>
              </div>

              <div className="divide-y divide-divider/30 text-xs">
                {ultimasCompras.length === 0 ? (
                  <div className="py-8 text-center text-text-secondary">Nenhuma compra recente registrada.</div>
                ) : (
                  ultimasCompras.map((c: any) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-3 hover:bg-bg-secondary/30 px-2 rounded-xl transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold bg-bg-secondary border border-border px-1.5 py-0.5 rounded">
                            #{c.numero_pedido || c.id}
                          </span>
                          <span className="font-extrabold text-text-primary truncate block uppercase text-xs" title={c.fornecedor_nome}>
                            {c.fornecedor_nome}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-text-secondary mt-0.5">
                          <span>{new Date(c.data_compra).toLocaleDateString('pt-BR')}</span>
                          <span>{c.cidade ? `${c.cidade}/${c.estado || ''}` : ''}</span>
                          <span>{c.total_itens} itens</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-text-primary text-xs">{formatBRL(c.valor_total)}</div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* FORNECEDORES COM MAIOR VALOR COMPRADO */}
            <div className="bg-bg-primary border border-border rounded-2xl p-5 shadow-card flex flex-col justify-between">
              <div className="flex justify-between items-center mb-3 border-b border-divider/40 pb-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-text-primary flex items-center gap-2">
                  <Building2 size={15} className="text-amber-500" />
                  Fornecedores com Maior Volume de Compras
                </h3>
                <button
                  onClick={() => setActiveTab('fornecedores')}
                  className="text-xs text-brand-600 dark:text-brand-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Ver lista completa <ChevronRight size={12} />
                </button>
              </div>

              <div className="divide-y divide-divider/30 text-xs">
                {topFornecedores.length === 0 ? (
                  <div className="py-8 text-center text-text-secondary">Nenhum fornecedor registrado com compras.</div>
                ) : (
                  topFornecedores.map((f: any, idx: number) => (
                    <div key={f.id_firebird} className="py-3 flex items-center justify-between gap-3 hover:bg-bg-secondary/30 px-2 rounded-xl transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-6 h-6 rounded-lg bg-bg-secondary border border-border flex items-center justify-center font-mono font-black text-[10px] text-text-secondary shrink-0">
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-text-primary truncate uppercase text-xs" title={f.nome}>
                            {f.nome}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-text-secondary font-mono">
                            <span>{f.documento || '-'}</span>
                            <span>•</span>
                            <span>{f.qtd_pedidos} pedidos</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono font-black text-text-primary text-xs">{formatBRL(f.total_comprado)}</div>
                        <button
                          onClick={() => {
                            setSelectedFornecedorId(f.id_firebird);
                          }}
                          className="mt-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          Ver ficha
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: FORNECEDORES (LISTA + FICHA 360)                   */}
      {/* ======================================================== */}
      {activeTab === 'fornecedores' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* BARRA DE FILTROS E BUSCA */}
          <div className="bg-bg-primary border border-border rounded-2xl p-4 shadow-card space-y-3">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Marcação de Saldo de Compras */}
              <div className="flex items-center gap-1.5 bg-bg-secondary p-1 rounded-xl border border-divider text-xs w-full md:w-auto overflow-x-auto">
                <button
                  type="button"
                  onClick={() => {
                    setFornecedorSaldo('com_saldo');
                    setFornecedorPage(1);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap inline-flex items-center gap-1.5",
                    fornecedorSaldo === 'com_saldo'
                      ? "bg-emerald-500 text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <CheckCircle2 size={13} /> Com Saldo de Compras (Padrão)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFornecedorSaldo('todos');
                    setFornecedorPage(1);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap",
                    fornecedorSaldo === 'todos'
                      ? "bg-bg-primary text-text-primary shadow-xs border border-border"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Todos os Fornecedores
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFornecedorSaldo('sem_saldo');
                    setFornecedorPage(1);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap",
                    fornecedorSaldo === 'sem_saldo'
                      ? "bg-slate-700 text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  Sem Saldo / Sem Compras
                </button>
              </div>

              {/* Informação da listagem: 50 em 50 e Ordem Alfabética */}
              <div className="flex items-center gap-2 text-text-secondary text-xs font-semibold self-start md:self-auto">
                <span className="bg-bg-secondary border border-border px-2.5 py-1 rounded-lg text-[11px] font-mono">
                  Ordem Alfabética (A-Z)
                </span>
                <span className="bg-bg-secondary border border-border px-2.5 py-1 rounded-lg text-[11px] font-mono">
                  50 por página
                </span>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 pt-1 border-t border-divider/30">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar fornecedor por nome, razão social, CNPJ, código ou e-mail..."
                  value={fornecedorSearch}
                  onChange={(e) => {
                    setFornecedorSearch(e.target.value);
                    setFornecedorPage(1);
                  }}
                  className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-text-primary outline-none focus:border-brand-500 transition-all placeholder:text-text-muted"
                />
                {fornecedorSearch && (
                  <button
                    onClick={() => setFornecedorSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filtro por Cidade */}
              <select
                value={fornecedorCidade}
                onChange={(e) => {
                  setFornecedorCidade(e.target.value);
                  setFornecedorPage(1);
                }}
                className="w-full md:w-48 bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer focus:border-brand-500 transition-all"
              >
                <option value="todas">Todas as Cidades</option>
                {fornecedoresQuery.data?.cidades?.map((cid: string) => (
                  <option key={cid} value={cid}>{cid}</option>
                ))}
              </select>

              {/* Filtro por Status */}
              <select
                value={fornecedorStatus}
                onChange={(e) => {
                  setFornecedorStatus(e.target.value);
                  setFornecedorPage(1);
                }}
                className="w-full md:w-36 bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer focus:border-brand-500 transition-all"
              >
                <option value="todos">Todos Status</option>
                <option value="ativo">Ativos</option>
                <option value="inativo">Inativos</option>
              </select>
            </div>
          </div>

          {/* TABELA DE FORNECEDORES */}
          <div className="bg-bg-primary border border-divider shadow-card rounded-2xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[1100px] text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/60 border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider">
                    <th className="py-3 px-3 w-16 min-w-[60px]">CÓD</th>
                    <th className="py-3 px-3 min-w-[220px] max-w-[260px]">FORNECEDOR / RAZÃO SOCIAL</th>
                    <th className="py-3 px-3 min-w-[120px]">CIDADE / UF</th>
                    <th className="py-3 px-3 min-w-[130px]">CNPJ / CPF</th>
                    <th className="py-3 px-3 min-w-[130px]">TELEFONE</th>
                    <th className="py-3 px-3 min-w-[180px] max-w-[220px]">E-MAIL</th>
                    <th className="py-3 px-3 text-right min-w-[120px]">TOTAL COMPRADO</th>
                    <th className="py-3 px-3 text-center min-w-[80px]">COMPRAS</th>
                    <th className="py-3 px-3 text-center min-w-[95px]">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {fornecedoresQuery.isLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-text-secondary font-semibold">
                        Carregando fornecedores homologados...
                      </td>
                    </tr>
                  ) : (fornecedoresQuery.data?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-text-secondary font-bold">
                        Nenhum fornecedor encontrado com os critérios de busca.
                      </td>
                    </tr>
                  ) : (
                    fornecedoresQuery.data.data.map((f: any) => (
                      <tr
                        key={f.id_firebird}
                        onClick={() => setSelectedFornecedorId(f.id_firebird)}
                        className="hover:bg-bg-secondary/60 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-3 w-16 min-w-[60px]">
                          <span className="font-mono text-xs font-bold text-text-primary bg-bg-secondary border border-border px-2 py-0.5 rounded-lg">
                            {f.id_firebird}
                          </span>
                        </td>
                        <td className="py-3 px-3 min-w-[220px] max-w-[260px]">
                          <span className="font-extrabold text-text-primary uppercase truncate block group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" title={f.nome}>
                            {f.nome}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-text-secondary min-w-[120px]">
                          <div className="flex items-center gap-1.5" title={`${f.cidade || 'NÃO INFORMADA'} / ${f.estado || ''}`}>
                            <MapPin size={12} className="text-text-muted shrink-0" />
                            <span className="truncate max-w-[110px] uppercase font-semibold">
                              {f.cidade || 'NÃO INFORMADA'}{f.estado ? ` / ${f.estado}` : ''}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-text-secondary font-medium min-w-[130px]">
                          {f.documento || '-'}
                        </td>
                        <td className="py-3 px-3 min-w-[130px]">
                          <div className="flex items-center gap-1 font-mono text-text-secondary font-medium">
                            <Phone size={11} className="text-text-muted shrink-0" />
                            <span>{f.telefone || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-text-secondary min-w-[180px] max-w-[220px]">
                          <div className="flex items-center gap-1.5 lowercase font-medium" title={f.email || ''}>
                            <Mail size={12} className="text-text-muted shrink-0" />
                            <span className="truncate max-w-[190px] font-mono text-[11px]">{f.email || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-black text-text-primary font-mono min-w-[120px]">
                          {formatBRL(f.total_comprado)}
                        </td>
                        <td className="py-3 px-3 text-center min-w-[80px]">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-bg-secondary border border-border text-text-secondary font-mono">
                            {f.qtd_compras || 0} ped.
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center min-w-[95px]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFornecedorId(f.id_firebird);
                            }}
                            className="px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500 text-brand-600 hover:text-white rounded-lg text-[10px] font-extrabold transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm"
                          >
                            Abrir Ficha <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO */}
            {fornecedoresQuery.data?.total_pages > 1 && (
              <div className="p-4 bg-bg-secondary/30 border-t border-divider flex items-center justify-between text-xs">
                <div className="text-text-secondary">
                  Página <strong>{fornecedorPage}</strong> de <strong>{fornecedoresQuery.data.total_pages}</strong> ({fornecedoresQuery.data.total} fornecedores)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={fornecedorPage <= 1}
                    onClick={() => setFornecedorPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-bg-primary border border-border rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={fornecedorPage >= fornecedoresQuery.data.total_pages}
                    onClick={() => setFornecedorPage(p => p + 1)}
                    className="px-3 py-1 bg-bg-primary border border-border rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: COMPRAS (HISTÓRICO E NOTAS DE ENTRADA)            */}
      {/* ======================================================== */}
      {activeTab === 'compras' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* BARRA DE FILTROS */}
          <div className="bg-bg-primary border border-border rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por número do pedido, nota fiscal, fornecedor, CNPJ/CPF ou cidade..."
                value={compraSearch}
                onChange={(e) => {
                  setCompraSearch(e.target.value);
                  setCompraPage(1);
                }}
                className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-text-primary outline-none focus:border-brand-500 transition-all placeholder:text-text-muted"
              />
              {compraSearch && (
                <button onClick={() => setCompraSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="hidden sm:inline-block bg-bg-secondary border border-border px-2.5 py-2 rounded-xl text-[11px] font-mono text-text-secondary whitespace-nowrap">
                50 por página
              </span>

              {/* Filtro Status */}
              <select
                value={compraStatus}
                onChange={(e) => {
                  setCompraStatus(e.target.value);
                  setCompraPage(1);
                }}
                className="w-full md:w-44 bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer focus:border-brand-500 transition-all"
              >
                <option value="todos">Todos Status</option>
                <option value="Recebida">Recebida</option>
                <option value="Pedido realizado">Pedido Realizado</option>
                <option value="Recebida parcialmente">Parcial</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* TABELA DE COMPRAS */}
          <div className="bg-bg-primary border border-divider shadow-card rounded-2xl overflow-hidden flex flex-col">
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[950px] text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/60 border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider">
                    <th className="py-3 px-3">Data</th>
                    <th className="py-3 px-3">Pedido / Nota</th>
                    <th className="py-3 px-3">Fornecedor</th>
                    <th className="py-3 px-3">Cidade / UF</th>
                    <th className="py-3 px-3 text-center">Itens</th>
                    <th className="py-3 px-3 text-right">Valor Total</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {comprasQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-secondary font-semibold">
                        Carregando histórico de compras...
                      </td>
                    </tr>
                  ) : (comprasQuery.data?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-text-secondary font-bold">
                        Nenhuma compra encontrada com os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    comprasQuery.data.data.map((c: any) => (
                      <tr key={c.compra_id} className="hover:bg-bg-secondary/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-text-secondary">
                          {new Date(c.data_compra).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-text-primary">
                          #{c.numero_pedido || c.compra_id}
                        </td>
                        <td className="py-3 px-3 max-w-[260px] truncate font-extrabold text-text-primary uppercase" title={c.fornecedor_nome}>
                          {c.fornecedor_nome}
                        </td>
                        <td className="py-3 px-3 text-text-secondary font-medium">
                          {c.fornecedor_cidade ? `${c.fornecedor_cidade} / ${c.fornecedor_estado || ''}` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-text-secondary">
                          {c.total_itens || 1} itens
                        </td>
                        <td className="py-3 px-3 text-right font-black font-mono text-text-primary">
                          {formatBRL(c.valor_total)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black border",
                            c.status === 'Recebida' 
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : c.status === 'Pedido realizado'
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : "bg-slate-500/10 text-text-secondary border-divider"
                          )}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setSelectedFornecedorId(c.fornecedor_id)}
                            className="px-2 py-1 bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-lg text-[10px] font-bold text-text-secondary hover:text-text-primary cursor-pointer transition-all inline-flex items-center gap-1"
                          >
                            Ver Fornecedor <ExternalLink size={10} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINAÇÃO */}
            {comprasQuery.data?.total_pages > 1 && (
              <div className="p-4 bg-bg-secondary/30 border-t border-divider flex items-center justify-between text-xs">
                <div className="text-text-secondary">
                  Página <strong>{compraPage}</strong> de <strong>{comprasQuery.data.total_pages}</strong> ({comprasQuery.data.total} compras)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={compraPage <= 1}
                    onClick={() => setCompraPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-bg-primary border border-border rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={compraPage >= comprasQuery.data.total_pages}
                    onClick={() => setCompraPage(p => p + 1)}
                    className="px-3 py-1 bg-bg-primary border border-border rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: CONFRONTO POR FORNECEDOR                          */}
      {/* ======================================================== */}
      {activeTab === 'confronto' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* SELETOR OBRIGATÓRIO DO FORNECEDOR */}
          <div className="bg-bg-primary border border-border rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 flex-1">
              <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
                Selecionar Fornecedor para Confronto com Estoque:
              </label>
              <div className="relative">
                <select
                  value={currentConfrontoId || ''}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setConfrontoFornecedorId(id);
                    setSelectedProdutosConfronto({});
                  }}
                  className="w-full bg-bg-secondary hover:bg-bg-tertiary border border-border rounded-xl px-4 py-2.5 text-xs font-bold text-text-primary outline-none cursor-pointer focus:border-brand-500 transition-all appearance-none"
                >
                  {fornecedoresList.map((f: any) => (
                    <option key={f.id_firebird} value={f.id_firebird}>
                      {f.nome} • CNPJ: {f.documento || '-'} ({f.cidade || ''})
                    </option>
                  ))}
                </select>
                <Building2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {/* BOTÃO CRIAR NOVA COMPRA */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (Object.keys(selectedProdutosConfronto).length === 0) {
                    const initial: Record<number, number> = {};
                    confrontoProdutos.forEach((p: any) => {
                      const sug = parseFloat(p.sugestao_compra || 0);
                      if (sug > 0) initial[p.produto_id] = sug;
                    });
                    setSelectedProdutosConfronto(initial);
                  }
                  setIsNovaCompraModalOpen(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <PlusCircle size={15} />
                Criar Nova Compra
              </button>
            </div>
          </div>

          {/* CARDS RESUMO DO CONFRONTO */}
          {confrontoQuery.data?.resumo && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="bg-bg-primary rounded-xl p-3.5 border border-border shadow-card">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">Produtos Fornecidos</span>
                <div className="text-xl font-black text-text-primary font-mono mt-0.5">{confrontoQuery.data.resumo.total_produtos}</div>
              </div>
              <div className="bg-bg-primary rounded-xl p-3.5 border border-border shadow-card">
                <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Comprar Agora (Zerados)</span>
                <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">{confrontoQuery.data.resumo.produtos_comprar}</div>
              </div>
              <div className="bg-bg-primary rounded-xl p-3.5 border border-border shadow-card">
                <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Estoque em Atenção</span>
                <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">{confrontoQuery.data.resumo.produtos_atencao}</div>
              </div>
              <div className="bg-bg-primary rounded-xl p-3.5 border border-border shadow-card">
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">Valor Sugerido Total</span>
                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{formatBRL(confrontoQuery.data.resumo.valor_sugerido_total)}</div>
              </div>
            </div>
          )}

          {/* TABELA DE CONFRONTO */}
          <div className="bg-bg-primary border border-divider shadow-card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-divider flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs font-bold text-text-secondary">
                Mostrando produtos já comprados de <strong>{confrontoQuery.data?.fornecedor?.nome || 'Fornecedor'}</strong>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Comprar agora</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Atenção</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Estoque normal</span>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[1000px] text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/60 border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider">
                    <th className="py-3 px-3 w-10 text-center">Sel.</th>
                    <th className="py-3 px-3 min-w-[240px]">Produto</th>
                    <th className="py-3 px-3 min-w-[100px]">Última Compra</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Custo Últ.</th>
                    <th className="py-3 px-3 text-right min-w-[100px]">Total Comprado</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Estoque Atual</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Estoque Mín.</th>
                    <th className="py-3 px-3 text-right min-w-[90px]">Necessidade</th>
                    <th className="py-3 px-3 text-right min-w-[100px]">Sugestão Compra</th>
                    <th className="py-3 px-3 text-center min-w-[100px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {confrontoQuery.isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-text-secondary font-semibold">
                        Confrontando histórico de compras com estoque atual...
                      </td>
                    </tr>
                  ) : confrontoProdutos.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-text-secondary font-bold">
                        Ainda não existem compras registradas para este fornecedor.
                      </td>
                    </tr>
                  ) : (
                    confrontoProdutos.map((p: any) => {
                      const isSelected = !!selectedProdutosConfronto[p.produto_id];
                      const qtdSug = parseFloat(p.sugestao_compra || 0);

                      return (
                        <tr 
                          key={p.produto_id} 
                          className={clsx(
                            "hover:bg-bg-secondary/50 transition-colors",
                            isSelected && "bg-sky-500/5 dark:bg-sky-500/10"
                          )}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectProduto(p.produto_id, qtdSug)}
                              className="rounded border-border text-brand-500 focus:ring-0 cursor-pointer w-4 h-4"
                            />
                          </td>
                          <td className="py-3 px-3 max-w-[260px] truncate font-extrabold text-text-primary" title={p.produto}>
                            {p.produto}
                          </td>
                          <td className="py-3 px-3 text-text-secondary font-semibold">
                            {p.data_ultima_compra ? new Date(p.data_ultima_compra).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-text-secondary">
                            {formatBRL(p.custo_ultima_compra)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-text-secondary">
                            {formatNum(p.qtd_total_comprada)} un.
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black">
                            <span className={clsx(Number(p.estoque_atual) <= 0 ? "text-rose-600 dark:text-rose-400" : "text-text-primary")}>
                              {formatNum(p.estoque_atual)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-text-secondary">
                            {formatNum(p.estoque_minimo)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            {Number(p.necessidade_estimada) > 0 ? formatNum(p.necessidade_estimada) : '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-brand-600 dark:text-brand-400">
                            {qtdSug > 0 ? `+${formatNum(qtdSug)}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {p.status === 'comprar_agora' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                Comprar agora
                              </span>
                            )}
                            {p.status === 'atencao' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Atenção
                              </span>
                            )}
                            {p.status === 'normal' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Normal
                              </span>
                            )}
                            {p.status === 'sem_cadastro' && (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                Sem cadastro
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: BAIXA E SAÍDA (ENTRADA / SAÍDA MANUAL NO ESTOQUE) */}
      {/* ======================================================== */}
      {activeTab === 'baixa_saida' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* CARD DE LANÇAMENTO DE BAIXA E SAÍDA (MULTI-ITENS E PROPORCIONAL) */}
          <div className="bg-bg-primary border border-border rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
            
            {/* CABEÇALHO DO CARD & TIPO DE OPERAÇÃO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-divider/40">
              <div className="flex items-center gap-2.5">
                <div className={clsx(
                  "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0",
                  tipoMovimentacao === 'SAIDA' ? "bg-rose-600" : "bg-emerald-600"
                )}>
                  {tipoMovimentacao === 'SAIDA' ? <PackageMinus size={20} /> : <PackagePlus size={20} />}
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-text-primary uppercase tracking-wide">
                    {tipoMovimentacao === 'SAIDA' ? 'Lançamento de Baixa / Saída de Estoque' : 'Lançamento de Entrada de Estoque'}
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    Insira um ou múltiplos produtos na lista abaixo e dê baixa ou entrada imediata no estoque sem valor financeiro.
                  </p>
                </div>
              </div>

              {/* SELEÇÃO DO TIPO: ENTRADA OU SAÍDA */}
              <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-divider shrink-0">
                <button
                  type="button"
                  onClick={() => setTipoMovimentacao('SAIDA')}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5",
                    tipoMovimentacao === 'SAIDA'
                      ? "bg-rose-600 text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <PackageMinus size={14} /> Baixa / Saída
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMovimentacao('ENTRADA')}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5",
                    tipoMovimentacao === 'ENTRADA'
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <PackagePlus size={14} /> Entrada
                </button>
              </div>
            </div>

            {/* SEÇÃO 1: CONTEXTO GERAL (CLIENTE / FORNECEDOR E MOTIVO) - LARGURAS PROPORCIONAIS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* 1. SELEÇÃO DO CLIENTE / FORNECEDOR */}
              <div className="md:col-span-5 space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
                  Cliente / Fornecedor (Opcional):
                </label>
                <select
                  value={selectedClienteId || ''}
                  onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-brand-500 cursor-pointer"
                >
                  <option value="">Selecione um cliente / fornecedor (opcional)</option>
                  {(clientesSelectQuery.data || []).map((c: any) => (
                    <option key={c.id_firebird} value={c.id_firebird}>
                      {c.nome} {c.documento ? `(${c.documento})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. DESCRIÇÃO / MOTIVO */}
              <div className="md:col-span-7 space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">
                  Descrição / Motivo da {tipoMovimentacao === 'SAIDA' ? 'Baixa' : 'Entrada'}:
                </label>
                <input
                  type="text"
                  value={descricaoMov}
                  onChange={(e) => setDescricaoMov(e.target.value)}
                  placeholder="Ex: Consumo interno, avaria, perda, devolução, ajuste de inventário..."
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-medium text-text-primary outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* SEÇÃO 2: INSERIR PRODUTOS NA GRADE (MULTI-ITENS COM LARGURA AMPLA) */}
            <div className="bg-bg-secondary/40 border border-border/80 rounded-xl p-3 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ListPlus size={15} className="text-sky-500" /> Inserir Produtos na {tipoMovimentacao === 'SAIDA' ? 'Baixa' : 'Entrada'}
                </span>
                {selectedProdutoInfo && (
                  <span className="text-xs font-medium bg-bg-primary border border-border px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5">
                    <span>Estoque Atual: <strong className="font-mono text-text-primary">{formatNum(selectedProdutoInfo.estoque)}</strong></span>
                    <span>→</span>
                    <span>
                      Pós-{tipoMovimentacao === 'SAIDA' ? 'Baixa' : 'Entrada'}:{' '}
                      <strong className={clsx(
                        "font-mono font-black",
                        tipoMovimentacao === 'SAIDA'
                          ? (Number(selectedProdutoInfo.estoque) - (parseFloat(quantidadeMov) || 0) < 0 ? "text-rose-600" : "text-amber-600")
                          : "text-emerald-600"
                      )}>
                        {formatNum(
                          tipoMovimentacao === 'SAIDA'
                            ? Math.max(-999999, Number(selectedProdutoInfo.estoque) - (parseFloat(quantidadeMov) || 0))
                            : Number(selectedProdutoInfo.estoque) + (parseFloat(quantidadeMov) || 0)
                        )}
                      </strong>
                    </span>
                  </span>
                )}
              </div>

              {/* LINHA DE ENTRADA DO PRODUTO + QUANTIDADE + BOTÃO INSERIR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5">
                <div className="flex-1 min-w-0 space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase block">
                    Produto do Estoque <span className="text-rose-500">*</span>:
                  </label>
                  <select
                    value={selectedProdutoId || ''}
                    onChange={(e) => setSelectedProdutoId(e.target.value ? Number(e.target.value) : null)}
                    className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="">Selecione o produto do estoque...</option>
                    {(produtosSelectQuery.data || []).map((p: any) => (
                      <option key={p.id_firebird} value={p.id_firebird}>
                        {p.codigo ? `[${p.codigo}] ` : ''}{p.nome} — (Saldo: {formatNum(p.estoque)} un)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-28 shrink-0 space-y-1">
                  <label className="text-[10px] font-black text-text-secondary uppercase block">
                    Quantidade <span className="text-rose-500">*</span>:
                  </label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    value={quantidadeMov}
                    onChange={(e) => setQuantidadeMov(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdicionarItemGrade();
                      }
                    }}
                    placeholder="Qtd"
                    className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary outline-none focus:border-brand-500 text-center"
                  />
                </div>

                <div className="shrink-0 flex items-end">
                  <button
                    type="button"
                    onClick={handleAdicionarItemGrade}
                    className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <Plus size={15} /> Inserir na Lista
                  </button>
                </div>
              </div>

              {/* GRADE DE ITENS ADICIONADOS */}
              {itensGrade.length > 0 ? (
                <div className="border border-border rounded-xl overflow-hidden bg-bg-primary mt-2">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-bg-secondary/70 border-b border-divider text-[10px] font-bold text-text-secondary uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Produto</th>
                        <th className="py-2.5 px-3 text-right">Estoque Atual</th>
                        <th className="py-2.5 px-3 text-center w-36">Quantidade a {tipoMovimentacao === 'SAIDA' ? 'Baixar' : 'Entrar'}</th>
                        <th className="py-2.5 px-3 text-right">Saldo Previsto</th>
                        <th className="py-2.5 px-3 text-center w-14">Remover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-divider/30 text-[11px]">
                      {itensGrade.map((item, idx) => {
                        const saldoPrevisto = tipoMovimentacao === 'SAIDA'
                          ? item.estoque_atual - item.quantidade
                          : item.estoque_atual + item.quantidade;

                        return (
                          <tr key={item.id} className="hover:bg-bg-secondary/40">
                            <td className="py-2 px-3 text-center text-text-muted font-mono font-bold">{idx + 1}</td>
                            <td className="py-2 px-3 font-extrabold text-text-primary max-w-[320px] truncate" title={item.produto_nome}>
                              {item.produto_nome}
                              {item.produto_codigo && (
                                <span className="ml-1.5 text-[10px] font-mono text-text-secondary font-normal">
                                  ({item.produto_codigo})
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-text-secondary">
                              {formatNum(item.estoque_atual)} un
                            </td>
                            <td className="py-2 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQtdItemGrade(item.id, Math.max(0.1, item.quantidade - 1))}
                                  className="w-6 h-6 rounded bg-bg-secondary border border-border flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer font-black text-xs"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0.001"
                                  step="any"
                                  value={item.quantidade}
                                  onChange={(e) => handleUpdateQtdItemGrade(item.id, parseFloat(e.target.value) || 1)}
                                  className="w-16 text-center font-mono font-bold bg-bg-secondary border border-border rounded py-0.5 text-xs outline-none focus:border-brand-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdateQtdItemGrade(item.id, item.quantidade + 1)}
                                  className="w-6 h-6 rounded bg-bg-secondary border border-border flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer font-black text-xs"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-black">
                              <span className={clsx(
                                tipoMovimentacao === 'SAIDA'
                                  ? (saldoPrevisto < 0 ? "text-rose-600" : "text-amber-600")
                                  : "text-emerald-600"
                              )}>
                                {formatNum(saldoPrevisto)} un
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoverItemGrade(item.id)}
                                className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                                title="Remover item da lista"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* RESUMO DOS ITENS DA GRADE */}
                  <div className="p-3 bg-bg-secondary/40 border-t border-divider flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-text-secondary">
                      <span>Total de itens: <strong className="text-text-primary font-mono">{itensGrade.length}</strong> produtos</span>
                      <span>•</span>
                      <span>Total de unidades: <strong className="text-text-primary font-mono">{formatNum(itensGrade.reduce((acc, c) => acc + c.quantidade, 0))}</strong> un</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setItensGrade([])}
                      className="text-[11px] text-text-muted hover:text-rose-600 font-bold underline cursor-pointer"
                    >
                      Limpar Lista
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-3.5 px-4 bg-bg-primary border border-border/60 rounded-xl text-center text-xs text-text-secondary">
                  💡 Você pode adicionar múltiplos produtos nesta mesma baixa. Selecione o produto e quantidade acima e clique em <strong>+ Inserir na Lista</strong>, ou clique direto em <strong>Dar Baixa no Momento</strong> para movimentar o produto selecionado.
                </div>
              )}
            </div>

            {/* BOTÃO PRINCIPAL DE CONFIRMAÇÃO DA BAIXA / ENTRADA */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={registrarMovMutation.isPending || (itensGrade.length === 0 && !selectedProdutoId)}
                onClick={handleConfirmarBaixa}
                className={clsx(
                  "w-full sm:w-auto px-7 py-2.5 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center justify-center gap-2",
                  tipoMovimentacao === 'SAIDA'
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700",
                  (registrarMovMutation.isPending || (itensGrade.length === 0 && !selectedProdutoId)) && "opacity-50 pointer-events-none"
                )}
              >
                {registrarMovMutation.isPending ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : tipoMovimentacao === 'SAIDA' ? (
                  <PackageMinus size={16} />
                ) : (
                  <PackagePlus size={16} />
                )}
                {tipoMovimentacao === 'SAIDA'
                  ? `Dar Baixa no Momento ${itensGrade.length > 0 ? `(${itensGrade.length} produtos)` : ''}`
                  : `Confirmar Entrada no Momento ${itensGrade.length > 0 ? `(${itensGrade.length} produtos)` : ''}`}
              </button>
            </div>
          </div>

          {/* KPIS RESUMO DA ABA 5 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block">Total Saídas / Baixas</span>
                <div className="text-2xl font-black text-rose-600 font-mono mt-1">
                  {formatNum(movimentacoesQuery.data?.resumo?.total_saidas || 0)} un
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500"><PackageMinus size={20} /></div>
            </div>

            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Total Entradas</span>
                <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
                  {formatNum(movimentacoesQuery.data?.resumo?.total_entradas || 0)} un
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500"><PackagePlus size={20} /></div>
            </div>

            <div className="bg-bg-primary rounded-2xl p-4 border border-border shadow-card flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-text-secondary uppercase tracking-wider block">Movimentações Registradas</span>
                <div className="text-2xl font-black text-text-primary font-mono mt-1">
                  {formatNum(movimentacoesQuery.data?.resumo?.total_registros || 0)}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500"><History size={20} /></div>
            </div>
          </div>

          {/* TABELA DE HISTÓRICO DE BAIXAS E SAÍDAS */}
          <div className="bg-bg-primary border border-divider shadow-card rounded-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-divider flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por produto, cliente/fornecedor, código ou descrição..."
                  value={movSearch}
                  onChange={(e) => {
                    setMovSearch(e.target.value);
                    setMovPage(1);
                  }}
                  className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-text-primary outline-none focus:border-brand-500 transition-all placeholder:text-text-muted"
                />
                {movSearch && (
                  <button onClick={() => setMovSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Filtro por Tipo */}
              <div className="flex items-center gap-1 bg-bg-secondary p-1 rounded-xl border border-divider text-xs">
                <button
                  type="button"
                  onClick={() => { setMovTipoFiltro('todos'); setMovPage(1); }}
                  className={clsx("px-3 py-1 rounded-lg font-bold transition-all cursor-pointer", movTipoFiltro === 'todos' ? "bg-bg-primary text-text-primary shadow-xs" : "text-text-secondary")}
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={() => { setMovTipoFiltro('SAIDA'); setMovPage(1); }}
                  className={clsx("px-3 py-1 rounded-lg font-bold transition-all cursor-pointer", movTipoFiltro === 'SAIDA' ? "bg-rose-500 text-white shadow-xs" : "text-text-secondary")}
                >
                  Baixas / Saídas
                </button>
                <button
                  type="button"
                  onClick={() => { setMovTipoFiltro('ENTRADA'); setMovPage(1); }}
                  className={clsx("px-3 py-1 rounded-lg font-bold transition-all cursor-pointer", movTipoFiltro === 'ENTRADA' ? "bg-emerald-600 text-white shadow-xs" : "text-text-secondary")}
                >
                  Entradas
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[950px] text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-bg-secondary/60 border-b border-divider text-[10px] text-text-secondary uppercase font-black tracking-wider">
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3 text-center">Tipo</th>
                    <th className="py-3 px-3">Produto</th>
                    <th className="py-3 px-3 text-right">Quantidade</th>
                    <th className="py-3 px-3">Cliente / Fornecedor</th>
                    <th className="py-3 px-3">Descrição / Motivo</th>
                    <th className="py-3 px-3 text-center">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider/30 text-[11px]">
                  {movimentacoesQuery.isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-secondary font-semibold">
                        Carregando histórico de movimentações...
                      </td>
                    </tr>
                  ) : (movimentacoesQuery.data?.data || []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-text-secondary font-bold">
                        Nenhuma movimentação registrada até o momento. Utilize o formulário acima para lançar uma baixa ou entrada.
                      </td>
                    </tr>
                  ) : (
                    movimentacoesQuery.data.data.map((m: any) => (
                      <tr key={m.id} className="hover:bg-bg-secondary/40 transition-colors">
                        <td className="py-3 px-3 font-semibold text-text-secondary">
                          {new Date(m.data_movimentacao).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-black border inline-flex items-center gap-1",
                            m.tipo === 'SAIDA'
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          )}>
                            {m.tipo === 'SAIDA' ? <PackageMinus size={11} /> : <PackagePlus size={11} />}
                            {m.tipo === 'SAIDA' ? 'Saída' : 'Entrada'}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[260px] truncate font-extrabold text-text-primary" title={m.produto_nome}>
                          {m.produto_nome}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-xs">
                          <span className={m.tipo === 'SAIDA' ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                            {m.tipo === 'SAIDA' ? '-' : '+'}{formatNum(m.quantidade)} un
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[200px] truncate text-text-secondary font-medium" title={m.cliente_nome || '-'}>
                          {m.cliente_nome || '-'}
                        </td>
                        <td className="py-3 px-3 max-w-[240px] truncate text-text-secondary font-medium" title={m.descricao || '-'}>
                          {m.descricao || '-'}
                        </td>
                        <td className="py-3 px-3 text-center text-text-muted font-mono text-[10px]">
                          {m.usuario_nome || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {movimentacoesQuery.data?.total_pages > 1 && (
              <div className="p-4 bg-bg-secondary/30 border-t border-divider flex items-center justify-between text-xs">
                <div className="text-text-secondary">
                  Página <strong>{movPage}</strong> de <strong>{movimentacoesQuery.data.total_pages}</strong> ({movimentacoesQuery.data.total} registros)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={movPage <= 1}
                    onClick={() => setMovPage(p => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-bg-primary border border-border rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={movPage >= movimentacoesQuery.data.total_pages}
                    onClick={() => setMovPage(p => p + 1)}
                    className="px-3 py-1 bg-bg-primary border border-border rounded-lg font-bold disabled:opacity-50 cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL / FICHA 360 DO FORNECEDOR                          */}
      {/* ======================================================== */}
      {selectedFornecedorId && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-divider flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-text-primary uppercase tracking-wide">
                    {fichaQuery.data?.dados_fornecedor?.nome || 'Ficha do Fornecedor'}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Código #{selectedFornecedorId} • CNPJ: {fichaQuery.data?.dados_fornecedor?.documento || '-'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFornecedorId(null)}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: 4 BLOCOS */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {fichaQuery.isLoading ? (
                <div className="py-16 text-center text-text-secondary font-semibold">Carregando ficha completa do fornecedor...</div>
              ) : (
                <>
                  {/* BLOCO 1: DADOS DO FORNECEDOR */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 size={14} className="text-amber-500" />
                      1. Dados do Fornecedor
                    </h4>
                    <div className="bg-bg-secondary/30 border border-border rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Cidade / UF</span>
                        <span className="font-semibold text-text-primary">
                          {fichaQuery.data.dados_fornecedor.cidade || 'N/A'} / {fichaQuery.data.dados_fornecedor.estado || ''}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Telefone</span>
                        <span className="font-mono text-text-primary">{fichaQuery.data.dados_fornecedor.telefone || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted font-bold uppercase block">E-mail</span>
                        <span className="font-mono text-text-primary truncate block">{fichaQuery.data.dados_fornecedor.email || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Condição de Pagamento</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{fichaQuery.data.dados_fornecedor.condicao_pagamento}</span>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 2: RESUMO DE COMPRAS */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-500" />
                      2. Resumo de Compras
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-bg-secondary/30 border border-border rounded-xl p-3">
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Total Comprado</span>
                        <span className="text-base font-black font-mono text-text-primary">{formatBRL(fichaQuery.data.resumo_compras.total_comprado)}</span>
                      </div>
                      <div className="bg-bg-secondary/30 border border-border rounded-xl p-3">
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Pedidos Realizados</span>
                        <span className="text-base font-black font-mono text-text-primary">{fichaQuery.data.resumo_compras.qtd_pedidos}</span>
                      </div>
                      <div className="bg-bg-secondary/30 border border-border rounded-xl p-3">
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Maior Compra</span>
                        <span className="text-base font-black font-mono text-text-primary">{formatBRL(fichaQuery.data.resumo_compras.maior_compra)}</span>
                      </div>
                      <div className="bg-bg-secondary/30 border border-border rounded-xl p-3">
                        <span className="text-[10px] text-text-muted font-bold uppercase block">Média por Compra</span>
                        <span className="text-base font-black font-mono text-text-primary">{formatBRL(fichaQuery.data.resumo_compras.media_compra)}</span>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 3: HISTÓRICO DE COMPRAS (NOTAS DE ENTRADA) */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-500" />
                      3. Histórico de Compras do Fornecedor
                    </h4>
                    <div className="border border-border rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-bg-secondary/70 border-b border-divider text-[10px] font-bold text-text-secondary uppercase sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Data</th>
                            <th className="py-2 px-3">Número</th>
                            <th className="py-2 px-3 text-center">Itens</th>
                            <th className="py-2 px-3 text-right">Valor Total</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider/30 text-[11px]">
                          {(fichaQuery.data.historico_compras || []).length === 0 ? (
                            <tr><td colSpan={5} className="py-4 text-center text-text-secondary">Nenhuma compra encontrada.</td></tr>
                          ) : (
                            fichaQuery.data.historico_compras.map((c: any) => (
                              <tr key={c.compra_id} className="hover:bg-bg-secondary/30">
                                <td className="py-2 px-3 text-text-secondary">{new Date(c.data_compra).toLocaleDateString('pt-BR')}</td>
                                <td className="py-2 px-3 font-mono font-bold text-text-primary">#{c.numero_pedido || c.compra_id}</td>
                                <td className="py-2 px-3 text-center font-mono">{c.total_itens}</td>
                                <td className="py-2 px-3 text-right font-mono font-black text-text-primary">{formatBRL(c.valor_total)}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    {c.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BLOCO 4: PRODUTOS COMPRADOS DESSE FORNECEDOR */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <PackageCheck size={14} className="text-teal-500" />
                        4. Produtos Comprados desse Fornecedor & Estoque Atual
                      </h4>
                      <button
                        onClick={() => {
                          const fid = selectedFornecedorId;
                          setSelectedFornecedorId(null);
                          handleOpenConfrontoFornecedor(fid);
                        }}
                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Abrir no Confronto Completo <ArrowRight size={12} />
                      </button>
                    </div>
                    <div className="border border-border rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-bg-secondary/70 border-b border-divider text-[10px] font-bold text-text-secondary uppercase sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Produto</th>
                            <th className="py-2 px-3 text-right">Qtd Comprada</th>
                            <th className="py-2 px-3 text-right">Custo Atual</th>
                            <th className="py-2 px-3 text-right">Estoque Atual</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-divider/30 text-[11px]">
                          {(fichaQuery.data.produtos_comprados || []).length === 0 ? (
                            <tr><td colSpan={5} className="py-4 text-center text-text-secondary">Nenhum produto listado.</td></tr>
                          ) : (
                            fichaQuery.data.produtos_comprados.map((p: any) => (
                              <tr key={p.produto_id} className="hover:bg-bg-secondary/30">
                                <td className="py-2 px-3 font-extrabold text-text-primary max-w-[260px] truncate" title={p.produto}>
                                  {p.produto}
                                </td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-text-secondary">{formatNum(p.total_quantidade_comprada)}</td>
                                <td className="py-2 px-3 text-right font-mono font-bold text-text-secondary">{formatBRL(p.custo_atual)}</td>
                                <td className="py-2 px-3 text-right font-mono font-black">
                                  <span className={clsx(Number(p.estoque_atual) <= 0 ? "text-rose-600 dark:text-rose-400" : "text-text-primary")}>
                                    {formatNum(p.estoque_atual)}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span className={clsx(
                                    "px-2 py-0.5 rounded text-[9px] font-bold",
                                    p.status === 'comprar' ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                                    p.status === 'atencao' ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  )}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-divider bg-bg-secondary/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedFornecedorId(null)}
                className="px-4 py-2 bg-bg-primary hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => {
                  const fid = selectedFornecedorId;
                  setSelectedFornecedorId(null);
                  handleOpenConfrontoFornecedor(fid);
                }}
                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm"
              >
                Ir para Confronto com Estoque
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CRIAR NOVA COMPRA (SUGESTÕES DE REPOSIÇÃO)        */}
      {/* ======================================================== */}
      {isNovaCompraModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-4 sm:p-5 border-b border-divider flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-text-primary uppercase tracking-wide">
                    Criar Nova Compra Sugerida
                  </h3>
                  <p className="text-xs text-text-secondary">
                    Fornecedor: <strong>{confrontoQuery.data?.fornecedor?.nome || 'Fornecedor'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNovaCompraModalOpen(false)}
                className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              <div className="text-xs text-text-secondary">
                Revise os produtos selecionados e as quantidades para o novo pedido:
              </div>

              {/* TABELA DE PRODUTOS SELECIONADOS */}
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-bg-secondary/70 border-b border-divider text-[10px] font-bold text-text-secondary uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Produto</th>
                      <th className="py-2.5 px-3 text-right">Custo Unit.</th>
                      <th className="py-2.5 px-3 text-center w-28">Quantidade</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center w-12">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider/30 text-[11px]">
                    {Object.keys(selectedProdutosConfronto).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-text-secondary font-bold">
                          Nenhum produto marcado. Selecione produtos na tabela de confronto.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(selectedProdutosConfronto).map(([prodIdStr, qtd]) => {
                        const prodId = Number(prodIdStr);
                        const prod = confrontoProdutos.find((p: any) => p.produto_id === prodId);
                        const custo = parseFloat(prod?.custo_ultima_compra || 0);
                        const totalItem = custo * qtd;

                        return (
                          <tr key={prodId} className="hover:bg-bg-secondary/40">
                            <td className="py-2.5 px-3 max-w-[240px] truncate font-extrabold text-text-primary" title={prod?.produto}>
                              {prod?.produto}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-text-secondary">{formatBRL(custo)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                value={qtd}
                                onChange={(e) => handleUpdateQtdProduto(prodId, Number(e.target.value))}
                                className="w-20 text-center font-mono font-bold bg-bg-secondary border border-border rounded-lg py-1 text-xs outline-none focus:border-brand-500"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-black text-text-primary">{formatBRL(totalItem)}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => handleToggleSelectProduto(prodId, 0)}
                                className="text-text-muted hover:text-rose-500 cursor-pointer"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* OPÇÕES ADICIONAIS DO PEDIDO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Status Inicial do Pedido</label>
                  <select
                    value={statusNovaCompra}
                    onChange={(e: any) => setStatusNovaCompra(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none"
                  >
                    <option value="Pedido realizado">Pedido Realizado (Pendente de Entrega)</option>
                    <option value="Rascunho">Rascunho de Compra</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">Observações Internas</label>
                  <input
                    type="text"
                    placeholder="Ex: Compra urgente para reposição de estoque mínimo"
                    value={observacaoNovaCompra}
                    onChange={(e) => setObservacaoNovaCompra(e.target.value)}
                    className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none"
                  />
                </div>
              </div>

              {/* TOTAL GERAL DA COMPRA */}
              <div className="bg-bg-secondary/40 border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest block">Total Estimado da Compra</span>
                  <span className="text-xs text-text-muted">{Object.keys(selectedProdutosConfronto).length} produtos selecionados</span>
                </div>
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {formatBRL(
                    Object.entries(selectedProdutosConfronto).reduce((acc, [prodIdStr, qtd]) => {
                      const prod = confrontoProdutos.find((p: any) => p.produto_id === Number(prodIdStr));
                      return acc + (parseFloat(prod?.custo_ultima_compra || 0) * qtd);
                    }, 0)
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-divider bg-bg-secondary/40 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsNovaCompraModalOpen(false)}
                className="px-4 py-2 bg-bg-primary hover:bg-bg-secondary border border-border rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={criarCompraMutation.isPending || Object.keys(selectedProdutosConfronto).length === 0}
                onClick={handleCriarPedido}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md disabled:opacity-50"
              >
                {criarCompraMutation.isPending ? 'Salvando Pedido...' : 'Salvar Pedido de Compra'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE BAIXA E SAÍDA RÁPIDA                            */}
      {/* ======================================================== */}
      {isBaixaModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-bg-primary border border-border shadow-2xl rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 sm:p-5 border-b border-divider flex items-center justify-between bg-bg-secondary/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold">
                  <ArrowDownUp size={18} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-text-primary uppercase tracking-wide">
                    {tipoMovimentacao === 'SAIDA' ? 'Dar Baixa / Saída de Estoque' : 'Registrar Entrada de Estoque'}
                  </h3>
                  <p className="text-[11px] text-text-secondary">Atualização instantânea do saldo de estoque sem valor monetário</p>
                </div>
              </div>
              <button
                onClick={() => setIsBaixaModalOpen(false)}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Seletor Tipo */}
              <div className="flex items-center bg-bg-secondary p-1 rounded-xl border border-divider">
                <button
                  type="button"
                  onClick={() => setTipoMovimentacao('SAIDA')}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center justify-center gap-2",
                    tipoMovimentacao === 'SAIDA' ? "bg-rose-600 text-white shadow-xs" : "text-text-secondary"
                  )}
                >
                  <PackageMinus size={14} /> Baixa / Saída
                </button>
                <button
                  type="button"
                  onClick={() => setTipoMovimentacao('ENTRADA')}
                  className={clsx(
                    "flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center justify-center gap-2",
                    tipoMovimentacao === 'ENTRADA' ? "bg-emerald-600 text-white shadow-xs" : "text-text-secondary"
                  )}
                >
                  <PackagePlus size={14} /> Entrada
                </button>
              </div>

              {/* Cliente */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase">Cliente / Fornecedor (Opcional):</label>
                <select
                  value={selectedClienteId || ''}
                  onChange={(e) => setSelectedClienteId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer"
                >
                  <option value="">Selecione um cliente / fornecedor (opcional)</option>
                  {(clientesSelectQuery.data || []).map((c: any) => (
                    <option key={c.id_firebird} value={c.id_firebird}>
                      {c.nome} {c.documento ? `(${c.documento})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-text-secondary uppercase">Descrição / Motivo:</label>
                <input
                  type="text"
                  value={descricaoMov}
                  onChange={(e) => setDescricaoMov(e.target.value)}
                  placeholder="Justifique o motivo da movimentação..."
                  className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-xs text-text-primary outline-none"
                />
              </div>

              {/* Inserção de Produto */}
              <div className="p-3 bg-bg-secondary/40 border border-border/80 rounded-xl space-y-2.5">
                <span className="text-[11px] font-black text-text-primary uppercase tracking-wide block">
                  Adicionar Produtos
                </span>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                      Produto <span className="text-rose-500">*</span>:
                    </label>
                    <select
                      value={selectedProdutoId || ''}
                      onChange={(e) => setSelectedProdutoId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary outline-none cursor-pointer"
                    >
                      <option value="">Selecione o produto...</option>
                      {(produtosSelectQuery.data || []).map((p: any) => (
                        <option key={p.id_firebird} value={p.id_firebird}>
                          {p.codigo ? `[${p.codigo}] ` : ''}{p.nome} (Saldo: {formatNum(p.estoque)} un)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="w-28 shrink-0">
                      <label className="text-[10px] font-bold text-text-secondary uppercase block mb-1">
                        Quantidade <span className="text-rose-500">*</span>:
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        step="any"
                        value={quantidadeMov}
                        onChange={(e) => setQuantidadeMov(e.target.value)}
                        placeholder="Qtd"
                        className="w-full bg-bg-primary border border-border rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary outline-none text-center"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAdicionarItemGrade}
                      className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Inserir Item
                    </button>
                  </div>
                </div>

                {/* Grade dos itens no modal */}
                {itensGrade.length > 0 && (
                  <div className="border border-border rounded-xl overflow-hidden bg-bg-primary mt-2">
                    <table className="w-full text-left text-xs whitespace-nowrap">
                      <thead className="bg-bg-secondary/70 border-b border-divider text-[10px] font-bold text-text-secondary uppercase">
                        <tr>
                          <th className="py-2 px-2.5">Produto</th>
                          <th className="py-2 px-2.5 text-center w-24">Qtd</th>
                          <th className="py-2 px-2.5 text-center w-10">Remover</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-divider/30 text-[11px]">
                        {itensGrade.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-2.5 max-w-[200px] truncate font-bold text-text-primary" title={item.produto_nome}>
                              {item.produto_nome}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-bold">
                              {formatNum(item.quantidade)} un
                            </td>
                            <td className="py-2 px-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoverItemGrade(item.id)}
                                className="text-rose-500 hover:text-rose-700 cursor-pointer p-0.5"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-2 bg-bg-secondary/30 text-[11px] text-text-secondary flex justify-between">
                      <span>Total: <strong>{itensGrade.length}</strong> produtos</span>
                      <span>Total un: <strong>{formatNum(itensGrade.reduce((a, b) => a + b.quantidade, 0))}</strong> un</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-divider bg-bg-secondary/20 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setIsBaixaModalOpen(false)}
                className="px-4 py-2 border border-border rounded-xl text-xs font-bold text-text-secondary hover:text-text-primary cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={registrarMovMutation.isPending || (itensGrade.length === 0 && !selectedProdutoId)}
                onClick={handleConfirmarBaixa}
                className={clsx(
                  "px-5 py-2 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer inline-flex items-center gap-1.5",
                  tipoMovimentacao === 'SAIDA' ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700",
                  (registrarMovMutation.isPending || (itensGrade.length === 0 && !selectedProdutoId)) && "opacity-50 pointer-events-none"
                )}
              >
                {registrarMovMutation.isPending && <RefreshCw size={13} className="animate-spin" />}
                {tipoMovimentacao === 'SAIDA'
                  ? `Dar Baixa no Momento ${itensGrade.length > 0 ? `(${itensGrade.length})` : ''}`
                  : `Confirmar Entrada no Momento ${itensGrade.length > 0 ? `(${itensGrade.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
