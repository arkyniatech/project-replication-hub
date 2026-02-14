import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';

interface PortfolioData {
  categoria: string;
  aReceberMes: number;
  aReceberProx: number;
  atrasado: number;
  percentualAtrasado: number;
}

interface PortfolioStackedChartProps {
  data: PortfolioData[];
}

export function PortfolioStackedChart({ data }: PortfolioStackedChartProps) {
  const totalAtrasado = data.reduce((sum, item) => sum + item.atrasado, 0);
  const totalCarteira = data.reduce((sum, item) => 
    sum + item.aReceberMes + item.aReceberProx + item.atrasado, 0
  );
  const percentualAtrasadoGeral = totalCarteira > 0 ? (totalAtrasado / totalCarteira * 100) : 0;

  const getSemaforoColor = (percentual: number) => {
    if (percentual <= 20) return '#2E7D32';
    if (percentual <= 30) return '#F9A825';
    return '#C62828';
  };

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
      
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          <div className="space-y-1 text-sm">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: entry.color }}
                  ></div>
                  <span>{entry.name}</span>
                </div>
                <span className="font-medium">
                  {entry.value.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </span>
              </div>
            ))}
            <div className="pt-1 border-t">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-600">Total</span>
                <span className="font-medium">
                  {total.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Carteira por Origem
            </h3>
            <p className="text-sm text-gray-500">
              Composição da carteira a receber
            </p>
          </div>
          <Badge 
            variant="outline"
            className="border-0 px-3 py-1 text-white font-medium"
            style={{ backgroundColor: getSemaforoColor(percentualAtrasadoGeral) }}
          >
            {percentualAtrasadoGeral.toFixed(1)}% Atrasado
          </Badge>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="categoria" 
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
              dataKey="aReceberMes" 
              stackId="a" 
              fill="#9E9E9E" 
              name="A Receber (Mês)"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="aReceberProx" 
              stackId="a" 
              fill="#616161" 
              name="A Receber (Próximos)"
              radius={[0, 0, 0, 0]}
            />
            <Bar 
              dataKey="atrasado" 
              stackId="a" 
              fill="#C62828" 
              name="Atrasado"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}