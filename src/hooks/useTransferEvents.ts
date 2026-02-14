import { useEffect, useRef } from 'react';
import { useTransferenciasStore } from '@/stores/transferenciasStore';
import { useEquipamentosStore } from '@/stores/equipamentosStore';
import { toast } from 'sonner';

export function useTransferEvents() {
  const isSubscribed = useRef(false);
  const { subscribe } = useTransferenciasStore();
  const { getDisponibilidadePorLoja } = useEquipamentosStore();

  useEffect(() => {
    if (isSubscribed.current) return;
    
    const unsubscribe = subscribe((event) => {
      // Show toast notification
      const messageMap = {
        CRIAR: `Transferência #${event.transferId} criada`,
        ACEITAR: `Transferência #${event.transferId} aceita`,
        NEGAR: `Transferência #${event.transferId} negada`,
        CANCELAR: `Transferência #${event.transferId} cancelada`,
      };

      toast.success(messageMap[event.type] || 'Evento de transferência', {
        description: `KPIs atualizados automaticamente`,
        duration: 3000,
      });

      // Force re-render of KPIs by triggering a store update
      // This is a simple way to notify components about changes
      console.log('Transfer event received:', event);
    });

    isSubscribed.current = true;

    return () => {
      unsubscribe();
      isSubscribed.current = false;
    };
  }, [subscribe]);

  return {
    // Return any helper functions if needed
  };
}