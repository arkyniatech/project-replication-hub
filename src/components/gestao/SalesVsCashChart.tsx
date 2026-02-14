import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface SalesVsCashData {
  date: string;
  faturado: number;
  recebido: number;
  conversao: number;
}

interface SalesVsCashChartProps {
  data: SalesVsCashData[];
}

export function SalesVsCashChart({ data }: SalesVsCashChartProps) {
  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const faturado = payload.find((p: any) => p.dataKey === 'faturado')?.value || 0;
      const recebido = payload.find((p: any) => p.dataKey === 'recebido')?.value || 0;
      const conversao = faturado > 0 ? (recebido / faturado * 100) : 0;

      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#E09309] rounded"></div>
                <span>Faturado</span>
              </div>
              <span className="font-medium">
                {faturado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#455A64] rounded"></div>
                <span>Recebido</span>
              </div>
              <span className="font-medium">
                {recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
            <div className="pt-1 border-t">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600">Conversão</span>
                <span className="font-medium text-blue-600">
                  {conversao.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 bg-white shadow-sm">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Vendas x Caixa
        </h3>
        <p className="text-sm text-gray-500">
          Últimos 30 dias - Barras: Faturamento | Linha: Recebimento
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#666' }}
              tickLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#666' }}
              tickLine={{ stroke: '#e0e0e0' }}
              tickFormatter={(value) => 
                value.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              }
            />
            <Tooltip content={customTooltip} />
            <Legend />
            <Bar 
              dataKey="faturado" 
              fill="#E09309" 
              name="Faturado"
              radius={[2, 2, 0, 0]}
            />
            <Line 
              type="monotone" 
              dataKey="recebido" 
              stroke="#455A64" 
              strokeWidth={3}
              name="Recebido"
              dot={{ fill: '#455A64', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}