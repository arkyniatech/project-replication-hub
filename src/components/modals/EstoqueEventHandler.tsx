import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { equipamentoStorage } from "@/lib/storage";
import { Contrato, Equipamento } from "@/types";

interface EstoqueEventHandlerProps {
  contrato?: Contrato;
  operacao: 'reservar' | 'liberar';
  onComplete?: () => void;
}

// Hook para gerenciar eventos de estoque automaticamente
export function useEstoqueAutoEvents() {
  const { toast } = useToast();

  const processarEstoqueContrato = (contrato: Contrato, operacao: 'reservar' | 'liberar') => {
    if (!contrato?.itens) return;

    let sucessos = 0;
    let erros = 0;

    contrato.itens.forEach(item => {
      try {
        const equipamento = equipamentoStorage.getById(item.equipamentoId);
        if (!equipamento) {
          erros++;
          return;
        }

        let novoStatus = equipamento.situacao;
        let novaQuantidade = equipamento.quantidade;

        if (equipamento.tipoControle === 'SERIALIZADO') {
          // Controle por série - individual
          if (operacao === 'reservar') {
            novoStatus = equipamento.situacao === 'Disponível' ? 'Reservado' : equipamento.situacao;
          } else {
            novoStatus = equipamento.situacao === 'Reservado' ? 'Disponível' : equipamento.situacao;
          }
        } else if (equipamento.tipoControle === 'GRUPO') {
          // Controle por grupo - quantidade
          if (operacao === 'reservar') {
            novaQuantidade = Math.max(0, (equipamento.quantidade || 0) - item.quantidade);
          } else {
            novaQuantidade = (equipamento.quantidade || 0) + item.quantidade;
          }
        }

        // Atualizar equipamento
        const equipamentoAtualizado: Partial<Equipamento> = {
          situacao: novoStatus,
          quantidade: novaQuantidade,
          updatedAt: new Date().toISOString()
        };

        equipamentoStorage.update(equipamento.id, equipamentoAtualizado);

        // Registrar evento na timeline (mock)
        const eventoEstoque = {
          id: Date.now().toString() + Math.random(),
          ts: Date.now(),
          usuarioId: "1",
          usuarioNome: "Admin",
          tipo: operacao === 'reservar' ? "ESTOQUE_RESERVADO" : "ESTOQUE_LIBERADO",
          resumo: `${operacao === 'reservar' ? 'Reservado' : 'Liberado'} ${item.quantidade}x ${equipamento.nome} para contrato ${contrato.numero}`
        };

        sucessos++;
      } catch (error) {
        erros++;
      }
    });

    // Feedback visual
    if (sucessos > 0) {
      toast({
        title: `Estoque ${operacao === 'reservar' ? 'reservado' : 'liberado'} ✓`,
        description: `${sucessos} ${sucessos === 1 ? 'item atualizado' : 'itens atualizados'} com sucesso.`,
      });
    }

    if (erros > 0) {
      toast({
        title: "Atenção",
        description: `${erros} ${erros === 1 ? 'item não pôde ser atualizado' : 'itens não puderam ser atualizados'}.`,
        variant: "destructive"
      });
    }
  };

  return { processarEstoqueContrato };
}

// Componente para eventos automáticos de estoque
export default function EstoqueEventHandler({ contrato, operacao, onComplete }: EstoqueEventHandlerProps) {
  const { processarEstoqueContrato } = useEstoqueAutoEvents();

  useEffect(() => {
    if (contrato) {
      processarEstoqueContrato(contrato, operacao);
      onComplete?.();
    }
  }, [contrato, operacao]);

  return null; // Componente invisível
}