import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';

interface Alert {
  id: string;
  tipo: 'fuga_atraso' | 'recuperacao' | 'destaque_vendedor';
  titulo: string;
  descricao: string;
  valor: number;
  variacao: number;
  severidade: 'alta' | 'media' | 'baixa';
  cliente?: string;
  vendedor?: string;
}

interface AlertsTableProps {
  alerts: Alert[];
}

export function AlertsTable({ alerts }: AlertsTableProps) {
  const getSeveridadeColor = (severidade: string) => {
    switch (severidade) {
      case 'alta': return 'bg-red-100 text-red-800 border-red-200';
      case 'media': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'baixa': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTipoIcon = (tipo: string, variacao: number) => {
    if (tipo === 'recuperacao' || variacao < 0) {
      return <TrendingDown className="h-4 w-4 text-green-600" />;
    }
    return <TrendingUp className="h-4 w-4 text-red-600" />;
  };

  const handleOpenContasReceber = (alert: Alert) => {
    // Abrir Contas a Receber em nova aba com filtros aplicados
    window.open('/contas-receber', '_blank');
  };

  if (alerts.length === 0) {
    return (
      <Card className="p-6 bg-white shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Alertas do Dia
          </h3>
          <p className="text-sm text-gray-500">
            Top 5 situações que merecem atenção
          </p>
        </div>
        <div className="text-center py-8 text-gray-500">
          <p>Nenhum alerta identificado hoje</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Alertas do Dia
        </h3>
        <p className="text-sm text-gray-500">
          Top 5 situações que merecem atenção
        </p>
      </div>

      <div className="space-y-4">
        {alerts.slice(0, 5).map((alert, index) => (
          <div
            key={alert.id}
            className="flex items-start gap-4 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0">
                {getTipoIcon(alert.tipo, alert.variacao)}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 text-sm">
                    {alert.titulo}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getSeveridadeColor(alert.severidade)}`}
                  >
                    {alert.severidade.toUpperCase()}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-600 mb-2">
                  {alert.descricao}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {alert.cliente && (
                    <span>Cliente: {alert.cliente}</span>
                  )}
                  {alert.vendedor && (
                    <span>Vendedor: {alert.vendedor}</span>
                  )}
                  <span>
                    Valor: {alert.valor.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </span>
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenContasReceber(alert)}
              className="flex-shrink-0"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {alerts.length > 5 && (
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm">
            Ver todos os {alerts.length} alertas
          </Button>
        </div>
      )}
    </Card>
  );
}