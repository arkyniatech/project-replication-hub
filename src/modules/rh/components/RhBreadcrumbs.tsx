import { useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { ChevronRight } from 'lucide-react';

export function RhBreadcrumbs() {
  const location = useLocation();
  
  const pathSegments = location.pathname.split('/').filter(Boolean);
  
  // Mapeamento de caminhos para títulos amigáveis
  const pathTitles: Record<string, string> = {
    'rh': 'RH',
    'pessoas': 'Pessoas',
    'vagas': 'Vagas',
    'candidatos': 'Candidatos',
    'admissoes': 'Admissões',
    'ponto': 'Ponto',
    'banco-horas': 'Banco de Horas',
    'ferias': 'Férias',
    'ausencias': 'Ausências',
    'holerites': 'Holerites',
    'beneficios': 'Benefícios',
    'ssma': 'SSMA',
    'documentos': 'Documentos',
    'offboarding': 'Offboarding',
    'relatorios': 'Relatórios',
    'executivo': 'Executivo',
    'rs': 'R&S',
    'jornada': 'Jornada',
    'compliance': 'Compliance',
    'financeiro': 'Financeiro',
    'aprovacoes': 'Aprovações',
    'portal': 'Portal'
  };

  // Construir breadcrumbs
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const title = pathTitles[segment] || segment;
    const isLast = index === pathSegments.length - 1;
    
    return {
      path,
      title,
      isLast
    };
  });

  if (breadcrumbs.length <= 1) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((breadcrumb, index) => (
          <BreadcrumbItem key={breadcrumb.path}>
            {breadcrumb.isLast ? (
              <BreadcrumbPage>{breadcrumb.title}</BreadcrumbPage>
            ) : (
              <>
                <BreadcrumbLink href={breadcrumb.path}>
                  {breadcrumb.title}
                </BreadcrumbLink>
                <BreadcrumbSeparator>
                  <ChevronRight className="h-4 w-4" />
                </BreadcrumbSeparator>
              </>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}