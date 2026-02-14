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
  Zap,
  Plus,
  RotateCcw,
  Receipt,
  Package,
  CreditCard,
  Truck,
  Settings,
  Banknote,
  HelpCircle,
  Star
} from "lucide-react";
import { clienteStorage, contratoStorage, tituloStorage, equipamentoStorage } from "@/lib/storage";
import { Cliente, Contrato, Titulo, Equipamento } from "@/types";
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
  data?: any; // Dados originais do item para ações inline
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
      action: () => {
        navigate("/clientes?action=new");
        onOpenChange(false);
      }
    },
    {
      id: "novo-contrato",
      title: "Novo Contrato", 
      subtitle: "Criar contrato de locação",
      type: "acao",
      icon: FileText,
      action: () => {
        navigate("/contratos/novo");
        onOpenChange(false);
      }
    },
    {
      id: "renovacoes",
      title: "Renovações",
      subtitle: "Contratos próximos ao vencimento",
      type: "acao",
      icon: RotateCcw,
      action: () => {
        navigate("/contratos?filter=renovacoes");
        onOpenChange(false);
      }
    },
    {
      id: "emitir-fatura",
      title: "Emitir Fatura",
      subtitle: "Gerar nova fatura",
      type: "acao",
      icon: Receipt,
      action: () => {
        navigate("/faturas?action=new");
        onOpenChange(false);
      }
    },
    {
      id: "receber-pagamento",
      title: "Receber Pagamento",
      subtitle: "Registrar recebimento",
      type: "acao",
      icon: CreditCard,
      action: () => {
        navigate("/contas-receber?tab=titulos&action=receber");
        onOpenChange(false);
      }
    },
    {
      id: "registrar-devolucao",
      title: "Registrar Devolução",
      subtitle: "Registrar devolução de equipamento",
      type: "acao",
      icon: Package,
      action: () => {
        toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" });
        onOpenChange(false);
      }
    },
    {
      id: "solicitar-retirada",
      title: "Solicitar Retirada",
      subtitle: "Agendar retirada de equipamento",
      type: "acao",
      icon: Truck,
      action: () => {
        toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" });
        onOpenChange(false);
      }
    },
    {
      id: "nova-despesa",
      title: "Nova Despesa",
      subtitle: "Lançar despesa operacional",
      type: "acao",
      icon: DollarSign,
      action: () => {
        toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" });
        onOpenChange(false);
      }
    },
    {
      id: "caixa",
      title: "Abrir/Fechar Caixa",
      subtitle: "Gerenciar caixa do dia",
      type: "acao",
      icon: Banknote,
      action: () => {
        toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve" });
        onOpenChange(false);
      }
    }
  ];

  // Adicionar aos recentes
  const handleSearch = useCallback((searchTerm: string) => {
    if (searchTerm.trim()) {
      addToRecents({
        id: `termo-${Date.now()}`,
        tipo: 'termo',
        valor: searchTerm.trim()
      });
    }
  }, [addToRecents]);

  const handleItemSelect = useCallback((result: SearchResult) => {
    if (result.type !== 'acao') {
      addToRecents({
        id: `item-${result.id}`,
        tipo: 'item',
        valor: result.id,
        meta: {
          grupo: result.type,
          id: result.id,
          titulo: result.title,
          subtitulo: result.subtitle
        }
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

    const searchResults: SearchResult[] = [];
    const searchTerm = query.toLowerCase();
    
    // Verificar padrões específicos
    if (searchTerm.startsWith("loc-")) {
      const numero = searchTerm.replace("loc-", "");
      const contrato = contratoStorage.getAll().find(c => 
        c.numero.toLowerCase().includes(numero)
      );
      if (contrato) {
        searchResults.push({
          id: String(contrato.id),
          title: `Contrato ${contrato.numero}`,
          subtitle: `Cliente: ${clienteStorage.getById(contrato.clienteId)?.nomeRazao || 'N/A'}`,
          type: "contrato",
          icon: FileText,
          badge: contrato.status,
          data: contrato,
          action: () => {
            navigate(`/contratos/${contrato.id}`);
            onOpenChange(false);
          },
          secondaryAction: () => {
            toast({ title: "Renovação", description: "Funcionalidade em breve" });
            onOpenChange(false);
          },
          secondaryLabel: "Renovar"
        });
      }
    }

    if (searchTerm.startsWith("fat-")) {
      const numero = searchTerm.replace("fat-", "");
      const titulos = tituloStorage.getAll().filter(t => 
        t.numero.toLowerCase().includes(numero)
      );
      titulos.forEach(titulo => {
        searchResults.push({
          id: titulo.id,
          title: `Título ${titulo.numero}`,
          subtitle: `Venc: ${new Date(titulo.vencimento).toLocaleDateString()} - ${formatCurrency(titulo.saldo)}`,
          type: "titulo",
          icon: DollarSign,
          badge: titulo.status,
          badgeVariant: titulo.status === 'Vencido' ? 'destructive' : 'default',
          data: titulo,
          action: () => {
            navigate(`/contas-receber?titulo=${titulo.id}`);
            onOpenChange(false);
          },
          secondaryAction: () => {
            navigate(`/contas-receber?tab=titulos&action=receber&titulo=${titulo.id}`);
            onOpenChange(false);
          },
          secondaryLabel: "Receber"
        });
      });
    }

    // Filtros especiais
    if (searchTerm.startsWith("#")) {
      const hashtag = searchTerm.replace("#", "");
      
      if (hashtag === "vencidos") {
        const vencidos = tituloStorage.getVencidos();
        vencidos.slice(0, 8).forEach(titulo => {
          const cliente = clienteStorage.getById(titulo.clienteId);
          searchResults.push({
            id: titulo.id,
            title: `Título ${titulo.numero}`,
            subtitle: `${cliente?.nomeRazao || 'N/A'} - ${formatCurrency(titulo.saldo)}`,
            type: "titulo",
            icon: DollarSign,
            badge: "Vencido",
            badgeVariant: "destructive",
            data: titulo,
            action: () => {
              navigate(`/contas-receber?titulo=${titulo.id}`);
              onOpenChange(false);
            },
            secondaryAction: () => {
              navigate(`/contas-receber?tab=titulos&action=receber&titulo=${titulo.id}`);
              onOpenChange(false);
            },
            secondaryLabel: "Receber"
          });
        });
      }
      
      if (hashtag === "ativos") {
        const ativos = contratoStorage.getAll().filter(c => c.status === "ATIVO");
        ativos.slice(0, 8).forEach(contrato => {
          const cliente = clienteStorage.getById(contrato.clienteId);
          searchResults.push({
            id: String(contrato.id),
            title: `Contrato ${contrato.numero}`,
            subtitle: `${cliente?.nomeRazao || 'N/A'} - ${contrato.status}`,
            type: "contrato",
            icon: FileText,
            badge: contrato.status,
            data: contrato,
            action: () => {
              navigate(`/contratos/${contrato.id}`);
              onOpenChange(false);
            }
          });
        });
      }
      
      if (hashtag === "disponiveis") {
        const disponiveis = equipamentoStorage.getByStatus("Disponível");
        disponiveis.slice(0, 8).forEach(equipamento => {
          searchResults.push({
            id: equipamento.id,
            title: equipamento.descricao,
            subtitle: `Código: ${equipamento.codigo} - ${equipamento.grupo}`,
            type: "equipamento",
            icon: Wrench,
            badge: equipamento.status,
            data: equipamento,
            action: () => {
              navigate(`/equipamentos?equipamento=${equipamento.id}`);
              onOpenChange(false);
            },
            secondaryAction: () => {
              toast({ title: "Manutenção", description: "Funcionalidade em breve" });
              onOpenChange(false);
            },
            secondaryLabel: "Manutenção"
          });
        });
      }
    }

    // Filtros por prefixo @
    if (searchTerm.startsWith("@")) {
      const [prefix, ...termParts] = searchTerm.split(" ");
      const term = termParts.join(" ");
      
      if (prefix === "@cliente" && term) {
        const clientes = clienteStorage.getAll().filter(c =>
          c.nomeRazao.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term) ||
          c.documento.includes(term)
        );
        clientes.slice(0, 8).forEach(cliente => {
          searchResults.push({
            id: cliente.id,
            title: cliente.nomeRazao,
            subtitle: `${cliente.documento} - ${cliente.email}`,
            type: "cliente",
            icon: User,
            badge: cliente.statusCredito,
            data: cliente,
            action: () => {
              navigate(`/clientes?cliente=${cliente.id}`);
              onOpenChange(false);
            },
            secondaryAction: () => {
              navigate(`/contratos/novo?cliente=${cliente.id}`);
              onOpenChange(false);
            },
            secondaryLabel: "Novo Contrato"
          });
        });
      }
      
      if (prefix === "@contrato" && term) {
        const contratos = contratoStorage.getAll().filter(c =>
          c.numero.toLowerCase().includes(term)
        );
        contratos.slice(0, 8).forEach(contrato => {
          const cliente = clienteStorage.getById(contrato.clienteId);
          searchResults.push({
            id: String(contrato.id),
            title: `Contrato ${contrato.numero}`,
            subtitle: `${cliente?.nomeRazao || 'N/A'} - ${contrato.status}`,
            type: "contrato",
            icon: FileText,
            badge: contrato.status,
            data: contrato,
            action: () => {
              navigate(`/contratos/${contrato.id}`);
              onOpenChange(false);
            }
          });
        });
      }
      
      if (prefix === "@titulo" && term) {
        const titulos = tituloStorage.getAll().filter(t =>
          t.numero.toLowerCase().includes(term)
        );
        titulos.slice(0, 8).forEach(titulo => {
          const cliente = clienteStorage.getById(titulo.clienteId);
          searchResults.push({
            id: titulo.id,
            title: `Título ${titulo.numero}`,
            subtitle: `${cliente?.nomeRazao || 'N/A'} - ${formatCurrency(titulo.saldo)}`,
            type: "titulo",
            icon: DollarSign,
            badge: titulo.status,
            badgeVariant: titulo.status === 'Vencido' ? 'destructive' : 'default',
            data: titulo,
            action: () => {
              navigate(`/contas-receber?titulo=${titulo.id}`);
              onOpenChange(false);
            }
          });
        });
      }
      
      if (prefix === "@equip" && term) {
        const equipamentos = equipamentoStorage.getAll().filter(e =>
          e.codigo.toLowerCase().includes(term) ||
          e.descricao.toLowerCase().includes(term)
        );
        equipamentos.slice(0, 8).forEach(equipamento => {
          searchResults.push({
            id: equipamento.id,
            title: equipamento.descricao,
            subtitle: `Código: ${equipamento.codigo} - ${equipamento.grupo}`,
            type: "equipamento",
            icon: Wrench,
            badge: equipamento.status,
            data: equipamento,
            action: () => {
              navigate(`/equipamentos?equipamento=${equipamento.id}`);
              onOpenChange(false);
            }
          });
        });
      }
    } else {
      // Busca geral
      // Clientes
      const clientes = clienteStorage.getAll().filter(c =>
        c.nomeRazao.toLowerCase().includes(searchTerm) ||
        c.email.toLowerCase().includes(searchTerm) ||
        c.documento.includes(searchTerm)
      );
      clientes.slice(0, 8).forEach(cliente => {
        searchResults.push({
          id: cliente.id,
          title: cliente.nomeRazao,
          subtitle: `${cliente.documento} - ${cliente.email}`,
          type: "cliente",
          icon: User,
          badge: cliente.statusCredito,
          data: cliente,
          action: () => {
            navigate(`/clientes?cliente=${cliente.id}`);
            onOpenChange(false);
          },
          secondaryAction: () => {
            navigate(`/contratos/novo?cliente=${cliente.id}`);
            onOpenChange(false);
          },
          secondaryLabel: "Novo Contrato"
        });
      });

      // Contratos
      const contratos = contratoStorage.getAll().filter(c =>
        c.numero.toLowerCase().includes(searchTerm)
      );
      contratos.slice(0, 8).forEach(contrato => {
        const cliente = clienteStorage.getById(contrato.clienteId);
        searchResults.push({
          id: String(contrato.id),
          title: `Contrato ${contrato.numero}`,
          subtitle: `${cliente?.nomeRazao || 'N/A'} - ${contrato.status}`,
          type: "contrato",
          icon: FileText,
          badge: contrato.status,
          data: contrato,
          action: () => {
            navigate(`/contratos/${contrato.id}`);
            onOpenChange(false);
          }
        });
      });

      // Títulos
      const titulos = tituloStorage.getAll().filter(t =>
        t.numero.toLowerCase().includes(searchTerm)
      );
      titulos.slice(0, 8).forEach(titulo => {
        const cliente = clienteStorage.getById(titulo.clienteId);
        searchResults.push({
          id: titulo.id,
          title: `Título ${titulo.numero}`,
          subtitle: `${cliente?.nomeRazao || 'N/A'} - ${formatCurrency(titulo.saldo)}`,
          type: "titulo",
          icon: DollarSign,
          badge: titulo.status,
          badgeVariant: titulo.status === 'Vencido' ? 'destructive' : 'default',
          data: titulo,
          action: () => {
            navigate(`/contas-receber?titulo=${titulo.id}`);
            onOpenChange(false);
          }
        });
      });

      // Equipamentos
      const equipamentos = equipamentoStorage.getAll().filter(e =>
        e.codigo.toLowerCase().includes(searchTerm) ||
        e.descricao.toLowerCase().includes(searchTerm)
      );
      equipamentos.slice(0, 8).forEach(equipamento => {
        searchResults.push({
          id: equipamento.id,
          title: equipamento.descricao,
          subtitle: `Código: ${equipamento.codigo} - ${equipamento.grupo}`,
          type: "equipamento",
          icon: Wrench,
          badge: equipamento.status,
          data: equipamento,
          action: () => {
            navigate(`/equipamentos?equipamento=${equipamento.id}`);
            onOpenChange(false);
          }
        });
      });
    }

    setResults(searchResults);
    
    // Registrar termo de busca se não for vazio
    if (searchTerm && searchTerm.length >= 2) {
      handleSearch(searchTerm);
    }
  }, [query, navigate, onOpenChange, toast, handleSearch]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onOpenChange(false);
      return;
    }

    const allResults = [
      ...groupedResults.acoes,
      ...groupedResults.clientes,
      ...groupedResults.contratos,
      ...groupedResults.financeiro,
      ...groupedResults.equipamentos
    ];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    }
    
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected) {
        if (e.shiftKey && selected.secondaryAction) {
          selected.secondaryAction();
        } else {
          handleItemSelect(selected);
        }
        onOpenChange(false);
      }
    }

    // Atalhos para ações inline (Alt+1, Alt+2, Alt+3)
    if (e.altKey && ['1', '2', '3'].includes(e.key)) {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected?.data) {
        // Simular clique na ação inline correspondente
        toast({ title: "Ação inline", description: `Alt+${e.key} pressionado` });
      }
    }

    // Tecla P para pin/unpin
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      const selected = allResults[selectedIndex];
      if (selected && selected.type !== 'acao') {
        toggleFavorite({
          id: selected.id,
          tipo: 'item',
          titulo: selected.title,
          subtitulo: selected.subtitle,
          grupo: selected.type,
          meta: selected.data
        });
      }
    }
  };

  // Handlers para histórico
  const handleRecentClick = useCallback((item: any) => {
    if (item.tipo === 'termo') {
      setQuery(item.valor);
    } else if (item.meta) {
      // Navegar diretamente para o item
      const routes = {
        cliente: `/clientes?cliente=${item.meta.id}`,
        contrato: `/contratos/${item.meta.id}`,
        titulo: `/contas-receber?titulo=${item.meta.id}`,
        equipamento: `/equipamentos?equipamento=${item.meta.id}`
      };
      const route = routes[item.meta.grupo as keyof typeof routes];
      if (route) {
        navigate(route);
        onOpenChange(false);
      }
    }
  }, [navigate, onOpenChange]);

  const handleFavoriteClick = useCallback((item: any) => {
    handleRecentClick(item);
  }, [handleRecentClick]);

  const groupedResults = {
    clientes: results.filter(r => r.type === 'cliente'),
    contratos: results.filter(r => r.type === 'contrato'),
    financeiro: results.filter(r => r.type === 'titulo'),
    equipamentos: results.filter(r => r.type === 'equipamento'),
    acoes: results.filter(r => r.type === 'acao')
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
            : "Nenhum resultado encontrado. Tente @cliente, @contrato ou #vencidos"
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

        {groupedResults.clientes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="👤 Clientes">
              {groupedResults.clientes.map((result) => {
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
                            toggleFavorite({
                              id: result.id,
                              tipo: 'item',
                              titulo: result.title,
                              subtitulo: result.subtitle,
                              grupo: result.type,
                              meta: result.data
                            });
                          }
                        }}
                        aria-label={isFavorite(result.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star 
                          className={`h-3 w-3 ${
                            isFavorite(result.id) 
                              ? 'fill-yellow-500 text-yellow-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {groupedResults.contratos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="📄 Contratos">
              {groupedResults.contratos.map((result) => {
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
                            toggleFavorite({
                              id: result.id,
                              tipo: 'item',
                              titulo: result.title,
                              subtitulo: result.subtitle,
                              grupo: result.type,
                              meta: result.data
                            });
                          }
                        }}
                        aria-label={isFavorite(result.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star 
                          className={`h-3 w-3 ${
                            isFavorite(result.id) 
                              ? 'fill-yellow-500 text-yellow-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {groupedResults.financeiro.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="💳 Financeiro">
              {groupedResults.financeiro.map((result) => {
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
                            toggleFavorite({
                              id: result.id,
                              tipo: 'item',
                              titulo: result.title,
                              subtitulo: result.subtitle,
                              grupo: result.type,
                              meta: result.data
                            });
                          }
                        }}
                        aria-label={isFavorite(result.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star 
                          className={`h-3 w-3 ${
                            isFavorite(result.id) 
                              ? 'fill-yellow-500 text-yellow-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}

        {groupedResults.equipamentos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="🧰 Equipamentos">
              {groupedResults.equipamentos.map((result) => {
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
                            toggleFavorite({
                              id: result.id,
                              tipo: 'item',
                              titulo: result.title,
                              subtitulo: result.subtitle,
                              grupo: result.type,
                              meta: result.data
                            });
                          }
                        }}
                        aria-label={isFavorite(result.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      >
                        <Star 
                          className={`h-3 w-3 ${
                            isFavorite(result.id) 
                              ? 'fill-yellow-500 text-yellow-500' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </Button>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}