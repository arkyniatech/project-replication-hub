import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Search, Edit, Trash2, Building, User, Users, Eye } from "lucide-react";
import ClienteForm from "@/components/forms/ClienteForm";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import { Link } from "react-router-dom";
import { useSupabaseClientes } from "@/hooks/useSupabaseClientes";
import { useMultiunidade } from "@/hooks/useMultiunidade";
import { supabaseClienteToLegacy } from "@/lib/cliente-adapter";
import type { Cliente } from "@/types";

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<string | undefined>();
  
  const { lojaAtual } = useMultiunidade();
  const { clientes, isLoading, deleteCliente } = useSupabaseClientes(lojaAtual?.id);

  // Converter clientes do Supabase para formato legacy
  const clientesLegacy = useMemo(() => {
    return clientes.map(supabaseClienteToLegacy);
  }, [clientes]);

  const filteredClientes = useMemo(() => {
    return clientesLegacy.filter((cliente) => {
      const email = cliente.contatos.find(c => c.tipo === 'Email')?.valor || '';
      
      return (
        cliente.nomeRazao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.documento.includes(searchTerm) ||
        email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [clientesLegacy, searchTerm]);

  const getStatusInfo = (status: string) => {
    const statusMap = {
      'Ativo': { label: 'Ativo', color: 'success' as const },
      'Suspenso': { label: 'Suspenso', color: 'destructive' as const },
      'Em análise': { label: 'Em Análise', color: 'warning' as const },
    };
    return statusMap[status] || { label: status, color: 'secondary' as const };
  };

  const formatDocument = (doc: string | null | undefined, tipo: 'PF' | 'PJ') => {
    if (!doc) return '';
    if (tipo === 'PF') {
      // CPF: 123.456.789-10
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ: 12.345.678/0001-90
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const handleClienteSaved = () => {
    setIsFormOpen(false);
    setEditingClienteId(undefined);
  };

  const handleEdit = (clienteId: string) => {
    setEditingClienteId(clienteId);
    setIsFormOpen(true);
  };

  const handleDelete = async (cliente: any) => {
    const nomeCliente = cliente.tipo === 'PF' ? cliente.nome : cliente.razao_social;
    if (confirm(`Tem certeza que deseja excluir ${nomeCliente}?`)) {
      await deleteCliente.mutateAsync(cliente.id);
    }
  };

  const handleNewClient = () => {
    setEditingClienteId(undefined);
    setIsFormOpen(true);
  };

  // Atalho de teclado "C" para novo cliente
  useKeyboardShortcut('c', handleNewClient);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie o cadastro de clientes</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0" onClick={handleNewClient}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClienteId ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <ClienteForm
              cliente={editingClienteId ? clientesLegacy.find(c => c.id === editingClienteId) : undefined}
              onSave={handleClienteSaved}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, documento ou e-mail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 shadow-input border-input-border"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Clientes Cadastrados ({filteredClientes?.length || 0})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : filteredClientes && filteredClientes.length > 0 ? (
            <div className="space-y-4">
              {filteredClientes.map((cliente) => {
                const email = cliente.contatos.find(c => c.tipo === 'Email')?.valor || '';
                const telefone = cliente.contatos.find(c => c.tipo === 'Telefone')?.valor || '';
                
                return (
                  <div
                    key={cliente.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {cliente.tipo === 'PJ' ? (
                          <Building className="w-5 h-5 text-primary" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{cliente.nomeRazao}</h3>
                          <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">
                            {cliente.tipo}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDocument(cliente.documento, cliente.tipo)}
                        </p>
                        <p className="text-sm text-muted-foreground">{email}</p>
                        <p className="text-sm text-muted-foreground">{telefone}</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={getStatusInfo(cliente.statusCredito)} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/clientes/360/${cliente.id}`}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visão 360
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(cliente.id)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(cliente)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum cliente encontrado com os filtros aplicados" : "Nenhum cliente cadastrado"}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={handleNewClient}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Primeiro Cliente
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}