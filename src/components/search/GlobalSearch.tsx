import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, 
  FileText, 
  DollarSign, 
  Wrench,
  Plus,
  RotateCcw,
  Receipt,
  Package,
  CreditCard,
  Truck,
  Banknote,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { SearchInlineActions } from "./SearchInlineActions";
import { SearchHistorySection } from "./SearchHistorySection";

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'cliente' | 'contrato' | 'titulo' | 'equipamento' | 'acao';
  icon: React.ComponentType<any>;
  action: () => void;
  secondaryAction?: () => void;
  secondaryLabel?: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  data?: any;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    recents, 
    favorites, 
    addToRecents, 
    clearRecents, 
    isFavorite, 
    toggleFavorite 
  } = useSearchHistory();

  // Ações rápidas
  const quickActions: SearchResult[] = [
    {
      id: "novo-cliente",
      title: "Novo Cliente",
      subtitle: "Cadastrar novo cliente",
      type: "acao",
      icon: User,
      action: () => { navigate("/clientes?action=new"); onOpenChange(false); }
    },
    {
      id: "novo-contrato",
      title: "Novo Contrato", 
      subtitle: "Criar contrato de locação",
      type: "acao",
      icon: FileText,
      action: () => { navigate("/contratos/novo"); onOpenChange(false); }
    },
    {
      id: "renovacoes",
      title: "Renovações",
      subtitle: "Contratos próximos ao vencimento",
      type: "acao",
      icon: RotateCcw,
      action: () => { navigate("/contratos?filter=renovacoes"); onOpenChange(false); }
    },
    {
      id: "emitir-fatura",
      title: "Emitir Fatura",
      subtitle: "Gerar nova fatura",
      type: "acao",
      icon: Receipt,
      action: () => { navigate("/faturas?action=new"); onOpenChange(false); }
    },
    {
      id: "receber-pagamento",
      title: "Receber Pagamento",
      subtitle: "Registrar recebimento",
      type: "acao",
      icon: CreditCard,
      action: () => { navigate("/contas-receber?tab=titulos&action=receber"); onOpenChange(false); }
    },
    {
      id: "registrar-devolucao",
      title: "Registrar Devolução",
      subtitle: "Registrar devolução de equipamento",
      type: "acao",
      icon: Package,
      action: () => { toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" }); onOpenChange(false); }
    },
    {
      id: "solicitar-retirada",
      title: "Solicitar Retirada",
      subtitle: "Agendar retirada de equipamento",
      type: "acao",
      icon: Truck,
      action: () => { toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" }); onOpenChange(false); }
    },
    {
      id: "nova-despesa",
      title: "Nova Despesa",
      subtitle: "Lançar despesa operacional",
      type: "acao",
      icon: DollarSign,
      action: () => { toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" }); onOpenChange(false); }
    },
    {
      id: "caixa",
      title: "Abrir/Fechar Caixa",
      subtitle: "Gerenciar caixa do dia",
      type: "acao",
      icon: Banknote,
      action: () => { toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" }); onOpenChange(false); }
    }
  ];

  const handleSearch = useCallback((searchTerm: string) => {
    if (searchTerm.trim()) {
      addToRecents({ id: `termo-${Date.now()}`, tipo: 'termo', valor: searchTerm.trim() });
    }
  }, [addToRecents]);

  const handleItemSelect = useCallback((result: SearchResult) => {
    if (result.type !== 'acao') {
      addToRecents({
        id: `item-${result.id}`,
        tipo: 'item',
        valor: result.id,
        meta: { grupo: result.type, id: result.id, titulo: result.title, subtitulo: result.subtitle }
      });
    }
    result.action();
  }, [addToRecents]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(quickActions);
      setSelectedIndex(0);
      return;
    }

    const searchTerm = query.toLowerCase();
    let cancelled = false;

    const doSearch = async () => {
      const searchResults: SearchResult[] = [];

      try {
        // Buscar clientes no Supabase
        const { data: clientes } = await supabase
          .from('clientes')
          .select('id, nome, razao_social, cpf, cnpj, status_credito')
          .eq('ativo', true)
          .or(`nome.ilike.%${searchTerm}%,razao_social.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%,cnpj.ilike.%${searchTerm}%`)
          .limit(8);

        if (!cancelled && clientes) {
          clientes.forEach(cliente => {
            const nome = cliente.nome || cliente.razao_social || 'Cliente';
            const doc = cliente.cpf || cliente.cnpj || '';
            searchResults.push({
              id: cliente.id,
              title: nome,
              subtitle: doc,
              type: "cliente",
              icon: User,
              badge: cliente.status_credito,
              data: cliente,
              action: () => { navigate(`/clientes?cliente=${cliente.id}`); onOpenChange(false); },
              secondaryAction: () => { navigate(`/contratos/novo?cliente=${cliente.id}`); onOpenChange(false); },
              secondaryLabel: "Novo Contrato"
            });
          });
        }

        // Buscar contratos no Supabase
        const { data: contratos } = await supabase
          .from('contratos')
          .select('id, numero, status, cliente_id, clientes(nome, razao_social)')
          .eq('ativo', true)
          .ilike('numero', `%${searchTerm}%`)
          .limit(8);

        if (!cancelled && contratos) {
          contratos.forEach((contrato: any) => {
            const clienteNome = contrato.clientes?.nome || contrato.clientes?.razao_social || 'N/A';
            searchResults.push({
              id: contrato.id,
              title: `Contrato ${contrato.numero}`,
              subtitle: `${clienteNome} - ${contrato.status}`,
              type: "contrato",
              icon: FileText,
              badge: contrato.status,
              data: contrato,
              action: () => { navigate(`/contratos/${contrato.id}`); onOpenChange(false); }
            });
          });
        }

        // Buscar títulos no Supabase
        const { data: titulos } = await supabase
          .from('titulos')
          .select('id, numero, status, saldo, vencimento, cliente_id, clientes:cliente_id(nome, razao_social)')
          .ilike('numero', `%${searchTerm}%`)
          .limit(8);

        if (!cancelled && titulos) {
          titulos.forEach((titulo: any) => {
            const clienteNome = titulo.clientes?.nome || titulo.clientes?.razao_social || 'N/A';
            searchResults.push({
              id: titulo.id,
              title: `Título ${titulo.numero}`,
              subtitle: `${clienteNome} - ${formatCurrency(Number(titulo.saldo))}`,
              type: "titulo",
              icon: DollarSign,
              badge: titulo.status,
              badgeVariant: titulo.status === 'VENCIDO' ? 'destructive' : 'default',
              data: titulo,
              action: () => { navigate(`/contas-receber?titulo=${titulo.id}`); onOpenChange(false); },
              secondaryAction: () => { navigate(`/contas-receber?tab=titulos&action=receber&titulo=${titulo.id}`); onOpenChange(false); },
              secondaryLabel: "Receber"
            });
          });
        }

        // Buscar equipamentos no Supabase
        const { data: equipamentos } = await supabase
          .from('equipamentos')
          .select('id, codigo_interno, status_global, modelo_id, modelos_equipamentos(nome_comercial), grupos_equipamentos:grupo_id(nome)')
          .eq('ativo', true)
          .ilike('codigo_interno', `%${searchTerm}%`)
          .limit(8);

        if (!cancelled && equipamentos) {
          equipamentos.forEach((equip: any) => {
            const nome = equip.modelos_equipamentos?.nome_comercial || equip.codigo_interno;
            const grupo = equip.grupos_equipamentos?.nome || '';
            searchResults.push({
              id: equip.id,
              title: nome,
              subtitle: `Código: ${equip.codigo_interno} - ${grupo}`,
              type: "equipamento",
              icon: Wrench,
              badge: equip.status_global,
              data: equip,
              action: () => { navigate(`/equipamentos?equipamento=${equip.id}`); onOpenChange(false); }
            });
          });
        }

        if (!cancelled) {
          setResults(searchResults);
          if (searchTerm.length >= 2) {
            handleSearch(searchTerm);
          }
        }
      } catch (error) {
        console.error('[GlobalSearch] Erro na busca:', error);
        if (!cancelled) setResults([]);
      }
    };

    const debounce = setTimeout(doSearch, 300);
    return () => { cancelled = true; clearTimeout(debounce); };
  }, [query, navigate, onOpenChange, toast, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { onOpenChange(false); return; }

    const allResults = [
      ...groupedResults.acoes,
      ...groupedResults.clientes,
      ...groupedResults.contratos,
      ...groupedResults.financeiro,
      ...groupedResults.equipamentos
    ];

    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
    if (e.key === "Enter") {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        if (e.shiftKey && selected.secondaryAction) { selected.secondaryAction(); }
        else { handleItemSelect(selected); }
        onOpenChange(false);
      }
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected && selected.type !== 'acao') {
        toggleFavorite({ id: selected.id, tipo: 'item', titulo: selected.title, subtitulo: selected.subtitle, grupo: selected.type, meta: selected.data });
      }
    }
  };

  const handleRecentClick = useCallback((item: any) => {
    if (item.tipo === 'termo') { setQuery(item.valor); }
    else if (item.meta) {
      const routes: Record<string, string> = {
        cliente: `/clientes?cliente=${item.meta.id}`,
        contrato: `/contratos/${item.meta.id}`,
        titulo: `/contas-receber?titulo=${item.meta.id}`,
        equipamento: `/equipamentos?equipamento=${item.meta.id}`
      };
      const route = routes[item.meta.grupo];
      if (route) { navigate(route); onOpenChange(false); }
    }
  }, [navigate, onOpenChange]);

  const handleFavoriteClick = useCallback((item: any) => { handleRecentClick(item); }, [handleRecentClick]);

  const groupedResults = {
    clientes: results.filter(r => r.type === 'cliente'),
    contratos: results.filter(r => r.type === 'contrato'),
    financeiro: results.filter(r => r.type === 'titulo'),
    equipamentos: results.filter(r => r.type === 'equipamento'),
    acoes: results.filter(r => r.type === 'acao')
  };

  const renderResultGroup = (heading: string, items: SearchResult[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <CommandSeparator />
        <CommandGroup heading={heading}>
          {items.map((result) => {
            const Icon = result.icon;
            return (
              <CommandItem
                key={result.id}
                value={result.title}
                onSelect={() => handleItemSelect(result)}
                className="flex items-center gap-3 p-3 group"
              >
                <Icon className="h-4 w-4" />
                <div className="flex-1">
                  <div className="font-medium">{result.title}</div>
                  <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                </div>
                {result.badge && (
                  <Badge variant={result.badgeVariant || 'default'} className="text-xs">
                    {result.badge}
                  </Badge>
                )}
                {result.secondaryLabel && (
                  <span className="text-xs text-muted-foreground">⇧↵ {result.secondaryLabel}</span>
                )}
                <div className="flex items-center gap-1">
                  {result.data && (
                    <SearchInlineActions
                      type={result.type as any}
                      item={result.data}
                      onAction={() => onOpenChange(false)}
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (result.type !== 'acao') {
                        toggleFavorite({ id: result.id, tipo: 'item', titulo: result.title, subtitulo: result.subtitle, grupo: result.type, meta: result.data });
                      }
                    }}
                    aria-label={isFavorite(result.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                  >
                    <Star className={`h-3 w-3 ${isFavorite(result.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} />
                  </Button>
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </>
    );
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar cliente, contrato, título, equipamento..."
        value={query}
        onValueChange={setQuery}
        onKeyDown={handleKeyDown}
      />
      <CommandList>
        {(!query || query.length < 2) && (recents.length > 0 || favorites.length > 0) && (
          <SearchHistorySection
            recents={recents}
            favorites={favorites}
            onRecentClick={handleRecentClick}
            onFavoriteClick={handleFavoriteClick}
            onClearRecents={clearRecents}
            onToggleFavorite={toggleFavorite}
          />
        )}

        <CommandEmpty>
          {query.length < 2 
            ? "Digite ao menos 2 letras para buscar..." 
            : "Nenhum resultado encontrado."
          }
        </CommandEmpty>

        {groupedResults.acoes.length > 0 && (
          <CommandGroup heading="⚡ Ações Rápidas">
            {groupedResults.acoes.map((result) => {
              const Icon = result.icon;
              return (
                <CommandItem
                  key={result.id}
                  value={result.title}
                  onSelect={() => handleItemSelect(result)}
                  className="flex items-center gap-3 p-3"
                >
                  <Icon className="h-4 w-4" />
                  <div className="flex-1">
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-muted-foreground">{result.subtitle}</div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {renderResultGroup("👤 Clientes", groupedResults.clientes)}
        {renderResultGroup("📄 Contratos", groupedResults.contratos)}
        {renderResultGroup("💳 Financeiro", groupedResults.financeiro)}
        {renderResultGroup("🧰 Equipamentos", groupedResults.equipamentos)}
      </CommandList>
    </CommandDialog>
  );
}
