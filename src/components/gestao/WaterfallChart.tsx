import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface WaterfallData {
  categoria: string;
  valor: number;
  tipo: 'inicial' | 'positivo' | 'negativo' | 'final';
  acumulado: number;
}

interface WaterfallChartProps {
  data: WaterfallData[];
}

export function WaterfallChart({ data }: WaterfallChartProps) {
  const getBarColor = (tipo: string) => {
    switch (tipo) {
      case 'inicial':
      case 'final':
        return '#455A64';
      case 'positivo':
        return '#C62828';
      case 'negativo':
        return '#2E7D32';
      default:
        return '#9E9E9E';
    }
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>Variação</span>
              <span className={`font-medium ${data.valor >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {data.valor >= 0 ? '+' : ''}{data.valor.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Acumulado</span>
              <span className="font-medium">
                {data.acumulado.toLocaleString('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </span>
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
          Por que a carteira mudou?
        </h3>
        <p className="text-sm text-gray-500">
          Análise waterfall - variações do dia
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="categoria" 
              tick={{ fontSize: 10, fill: '#666' }}
              tickLine={{ stroke: '#e0e0e0' }}
              angle={-45}
              textAnchor="end"
              height={60}
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
            <Bar dataKey="valor" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(entry.tipo)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}