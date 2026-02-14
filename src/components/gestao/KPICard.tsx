import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

interface KPICardProps {
  title: string;
  value: number;
  subtitle: string;
  sparklineData: Array<{ value: number }>;
  color: string;
  trend: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  isPercentage?: boolean;
  semaforo?: 'green' | 'yellow' | 'red';
}

export function KPICard({
  title,
  value,
  subtitle,
  sparklineData,
  color,
  trend,
  isPercentage = false,
  semaforo
}: KPICardProps) {
  const formatValue = (val: number) => {
    if (isPercentage) {
      return `${(val * 100).toFixed(1)}%`;
    }
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getSemaforoColor = (semaforo: string) => {
    switch (semaforo) {
      case 'green': return '#2E7D32';
      case 'yellow': return '#F9A825';
      case 'red': return '#C62828';
      default: return color;
    }
  };

  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="h-3 w-3" />;
      case 'down':
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="p-6 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
        {semaforo && (
          <Badge 
            variant="outline" 
            className="border-0 px-2 py-1"
            style={{ backgroundColor: getSemaforoColor(semaforo), color: 'white' }}
          >
            {semaforo === 'green' && '●'}
            {semaforo === 'yellow' && '●'}
            {semaforo === 'red' && '●'}
          </Badge>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatValue(value)}
          </div>
          <div className={`flex items-center gap-1 text-xs ${getTrendColor()}`}>
            {getTrendIcon()}
            <span>{trend.label}</span>
          </div>
        </div>

        <div className="w-20 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}