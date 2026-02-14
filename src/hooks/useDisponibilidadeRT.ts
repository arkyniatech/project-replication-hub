import { useState, useEffect, useMemo } from 'react';
import { useEquipamentosStore } from '@/stores/equipamentosStore';
import { useMultiunidade } from '@/hooks/useMultiunidade';
import { contratoStorage } from '@/lib/storage';
import { supabase } from '@/integrations/supabase/client';
import { 
  DisponibilidadeResultado, 
  DisponibilidadeConflito, 
  ReservaSoft,
  BloqueioContagem,
  TransferenciaEmTransito
} from '@/types/disponibilidade-rt';

interface UseDisponibilidadeRTProps {
  equipamentoId?: string;
  modeloId?: string;
  tipoControle: 'SERIALIZADO' | 'SALDO';
  quantidade?: number;
  periodo: {
    inicio: string;
    fim: string;
  };
  contratoAtualId?: string; // Para excluir reservas do próprio contrato
}

// Mock stores para diferentes tipos de bloqueio
const mockReservasSoft: ReservaSoft[] = [];
const mockBloqueiosContagem: BloqueioContagem[] = [];

export function useDisponibilidadeRT({
  equipamentoId,
  modeloId,
  tipoControle,
  quantidade = 1,
  periodo,
  contratoAtualId
}: UseDisponibilidadeRTProps) {
  const [resultado, setResultado] = useState<DisponibilidadeResultado>({
    disponivel: true,
    quantidade: 0,
    conflitos: []
  });
  const [loading, setLoading] = useState(false);
  
  const { equipamentos, modelos } = useEquipamentosStore();
  const { lojaAtual } = useMultiunidade();

  const checkDisponibilidade = useMemo(() => {
    if (!lojaAtual) return null;

    return async () => {
      setLoading(true);
      
      const conflitos: DisponibilidadeConflito[] = [];
      let quantidadeDisponivel = 0;

      try {
        // Para SERIALIZADO - verificar equipamento específico
        if (tipoControle === 'SERIALIZADO' && equipamentoId) {
          const equipamento = equipamentos.find(e => e.id === equipamentoId);
          if (!equipamento) {
            throw new Error('Equipamento não encontrado');
          }

          // Verificar se está na loja correta
          if (equipamento.lojaAtualId !== lojaAtual.id) {
            conflitos.push({
              tipo: 'TRANSFERENCIA',
              origem: equipamento.lojaAtualId || 'Desconhecida',
              detalhes: `Equipamento está em outra loja: ${equipamento.lojaAtualId}`,
              gravidade: 'BLOQUEANTE'
            });
          }

          // Verificar status do equipamento
          if (equipamento.statusGlobal === 'MANUTENCAO' || equipamento.statusGlobal === 'EM_REVISAO') {
            conflitos.push({
              tipo: 'MANUTENCAO',
              origem: equipamento.id,
              detalhes: `Equipamento em ${equipamento.statusGlobal.toLowerCase()}`,
              gravidade: 'BLOQUEANTE'
            });
          }

          if (equipamento.statusGlobal === 'LOCADO') {
            conflitos.push({
              tipo: 'LOCADO',
              origem: 'Contrato ativo',
              detalhes: 'Equipamento já está locado',
              gravidade: 'BLOQUEANTE'
            });
          }

          // Verificar transferências em trânsito - Query real do Supabase
          try {
            const { data: transfItens } = await (supabase as any)
              .from('transferencia_itens')
              .select('transferencia_id, tipo')
              .eq('equipamento_id', equipamentoId!)
              .eq('tipo', 'SERIAL');

            if (transfItens?.length) {
              for (const item of transfItens) {
                const { data: transf } = await (supabase as any)
                  .from('transferencias')
                  .select('id, status')
                  .eq('id', item.transferencia_id)
                  .in('status', ['CRIADA', 'EM_TRANSITO'])
                  .maybeSingle();

                if (transf) {
                  conflitos.push({
                    tipo: 'TRANSFERENCIA',
                    origem: transf.id,
                    detalhes: `Equipamento em transferência ativa`,
                    gravidade: 'BLOQUEANTE'
                  });
                  break;
                }
              }
            }
          } catch (error) {
            console.error('Erro ao verificar transferências:', error);
          }

          // Verificar bloqueios de contagem
          const bloqueioContagem = mockBloqueiosContagem.find(b => b.equipamentoId === equipamentoId);
          if (bloqueioContagem) {
            conflitos.push({
              tipo: 'CONTAGEM_CEGA',
              origem: bloqueioContagem.sessaoId,
              detalhes: `Equipamento bloqueado para ${bloqueioContagem.motivo.toLowerCase()}`,
              gravidade: 'BLOQUEANTE'
            });
          }

          quantidadeDisponivel = conflitos.length === 0 ? 1 : 0;
        }

        // Para SALDO - verificar disponibilidade por modelo/grupo
        if (tipoControle === 'SALDO' && modeloId) {
          // Buscar equipamentos do modelo na loja ativa
          const equipamentosDoModelo = equipamentos.filter(e => 
            e.modeloId === modeloId && 
            e.tipo === 'SALDO'
          );

          let totalDisponivel = 0;
          
          equipamentosDoModelo.forEach(equip => {
            const saldo = equip.saldosPorLoja[lojaAtual.id]?.qtd || 0;
            
            // Descontar reservas soft ativas
            const reservasSoftAtivas = mockReservasSoft.filter(r => 
              r.modeloId === modeloId && 
              r.contratoRascunhoId !== contratoAtualId &&
              new Date(r.expiresAt) > new Date()
            );
            
            const quantidadeReservada = reservasSoftAtivas.reduce((acc, r) => acc + r.quantidade, 0);
            const saldoLiquido = Math.max(0, saldo - quantidadeReservada);
            
            totalDisponivel += saldoLiquido;

            // Adicionar conflitos se há reservas que impactam
            if (quantidadeReservada > 0) {
              conflitos.push({
                tipo: 'RESERVA',
                origem: `${reservasSoftAtivas.length} reserva(s) ativa(s)`,
                detalhes: `${quantidadeReservada} unidades reservadas temporariamente`,
                gravidade: 'AVISO'
              });
            }
          });

          // Descontar transferências em trânsito - Query real do Supabase
          try {
            const { data: transfItens } = await (supabase as any)
              .from('transferencia_itens')
              .select('quantidade, transferencia_id, tipo')
              .eq('modelo_id', modeloId!)
              .eq('tipo', 'SALDO');

            if (transfItens?.length) {
              let qtdBloqueadaPorTransferencia = 0;
              
              for (const item of transfItens) {
                const { data: transf } = await (supabase as any)
                  .from('transferencias')
                  .select('id, origem_loja_id, status')
                  .eq('id', item.transferencia_id)
                  .eq('origem_loja_id', lojaAtual.id)
                  .in('status', ['CRIADA', 'EM_TRANSITO'])
                  .maybeSingle();

                if (transf) {
                  qtdBloqueadaPorTransferencia += (item.quantidade as number) || 0;
                }
              }
              
              if (qtdBloqueadaPorTransferencia > 0) {
                totalDisponivel = Math.max(0, totalDisponivel - qtdBloqueadaPorTransferencia);
                
                conflitos.push({
                  tipo: 'TRANSFERENCIA',
                  origem: 'Transferências ativas',
                  detalhes: `${qtdBloqueadaPorTransferencia} unidades em transferência`,
                  gravidade: 'AVISO'
                });
              }
            }
          } catch (error) {
            console.error('Erro ao verificar transferências SALDO:', error);
          }

          quantidadeDisponivel = totalDisponivel;

          // CRÍTICO: Verificar se a quantidade solicitada está disponível
          if (quantidade > quantidadeDisponivel) {
            conflitos.push({
              tipo: 'RESERVA',
              origem: 'Estoque insuficiente',
              detalhes: `Solicitado: ${quantidade}, Disponível: ${quantidadeDisponivel}`,
              gravidade: 'BLOQUEANTE'
            });
          }
        }

        // Verificar reservas de outros contratos ativos (mock)
        const contratosAtivos = contratoStorage.getAll().filter(c => 
          c.status === 'ATIVO' && 
          c.id.toString() !== contratoAtualId
        );

        contratosAtivos.forEach(contrato => {
          contrato.itens.forEach(item => {
            const isPeriodoSobreposto = !(
              new Date(periodo.fim) <= new Date(contrato.dataInicio) ||
              new Date(periodo.inicio) >= new Date(contrato.dataFim)
            );

            if (isPeriodoSobreposto) {
              if (tipoControle === 'SERIALIZADO' && item.equipamentoId === equipamentoId) {
                conflitos.push({
                  tipo: 'RESERVA',
                  origem: contrato.numero,
                  detalhes: `Equipamento reservado no contrato ${contrato.numero}`,
                  periodo: {
                    inicio: contrato.dataInicio,
                    fim: contrato.dataFim
                  },
                  gravidade: 'BLOQUEANTE'
                });
              }

              if (tipoControle === 'SALDO') {
                // Para SALDO, precisamos verificar se os contratos usam equipamentos do mesmo modelo
                // Como não temos modeloId diretamente no item.equipamento (tipo antigo),
                // vamos usar uma abordagem mais simples baseada no grupoId
                const equipamentoAtual = equipamentos.find(e => e.modeloId === modeloId);
                if (equipamentoAtual && item.equipamento.grupoId === equipamentoAtual.grupoId) {
                  conflitos.push({
                    tipo: 'RESERVA',
                    origem: contrato.numero,
                    detalhes: `${item.quantidade} unidades reservadas no contrato ${contrato.numero}`,
                    periodo: {
                      inicio: contrato.dataInicio,
                      fim: contrato.dataFim
                    },
                    gravidade: 'AVISO'
                  });
                }
              }
            }
          });
        });

        const temBloqueantes = conflitos.some(c => c.gravidade === 'BLOQUEANTE');
        
        setResultado({
          disponivel: !temBloqueantes && quantidadeDisponivel >= quantidade,
          quantidade: quantidadeDisponivel,
          conflitos,
          alternativas: temBloqueantes ? {
            outrosPeriodos: [], // Mock - seria calculado com base nos conflitos
            outrasQuantidades: quantidadeDisponivel > 0 ? [quantidadeDisponivel] : [],
            outrosSeries: [] // Mock - outros equipamentos do mesmo grupo
          } : undefined
        });

      } catch (error) {
        console.error('Erro ao verificar disponibilidade:', error);
        setResultado({
          disponivel: false,
          quantidade: 0,
          conflitos: [{
            tipo: 'RESERVA',
            origem: 'Sistema',
            detalhes: 'Erro ao verificar disponibilidade',
            gravidade: 'BLOQUEANTE'
          }]
        });
      } finally {
        setLoading(false);
      }
    };
  }, [equipamentoId, modeloId, tipoControle, quantidade, periodo, contratoAtualId, equipamentos, modelos, lojaAtual]);

  useEffect(() => {
    checkDisponibilidade?.();
  }, [checkDisponibilidade]);

  // Função para criar reserva soft
  const criarReservaSoft = (contratoRascunhoId: string) => {
    if (!lojaAtual) return null;

    const reserva: ReservaSoft = {
      id: `soft_${Date.now()}`,
      contratoRascunhoId,
      equipamentoId: tipoControle === 'SERIALIZADO' ? equipamentoId : undefined,
      modeloId: tipoControle === 'SALDO' ? modeloId : undefined,
      tipoControle,
      quantidade,
      periodo,
      criadoEm: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutos
    };

    mockReservasSoft.push(reserva);
    
    // Auto-cleanup após expiração
    setTimeout(() => {
      const index = mockReservasSoft.findIndex(r => r.id === reserva.id);
      if (index > -1) {
        mockReservasSoft.splice(index, 1);
      }
    }, 15 * 60 * 1000);

    return reserva;
  };

  // Função para limpar reservas soft de um contrato
  const limparReservasSoft = (contratoRascunhoId: string) => {
    const indices = mockReservasSoft
      .map((r, i) => r.contratoRascunhoId === contratoRascunhoId ? i : -1)
      .filter(i => i > -1)
      .reverse(); // Remove de trás para frente

    indices.forEach(i => mockReservasSoft.splice(i, 1));
  };

  return {
    resultado,
    loading,
    checkDisponibilidade,
    criarReservaSoft,
    limparReservasSoft,
    // Export para debug/testing
    _mockStores: {
      reservasSoft: mockReservasSoft,
      bloqueiosContagem: mockBloqueiosContagem
    }
  };
}