import { AlertTriangle } from 'lucide-react';

export function DemoBanner() {
  return (
    <div className="w-full bg-amber-500 text-amber-950 border-b border-amber-600">
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="text-center">
          Modo Demonstração / Portfólio — você pode navegar e clicar em qualquer botão, mas
          <strong className="mx-1">nenhuma ação é gravada no banco de dados</strong>.
        </span>
      </div>
    </div>
  );
}
