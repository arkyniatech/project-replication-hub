// Quick fix for Documentos import
export function createDefaultChecklistTemplates() {
  return [
    {
      id: 'tpl-admissao',
      processo: 'admissao' as const,
      nome: 'Admissão',
      itens: [
        { id: '1', titulo: 'Documento 1', obrigatorio: true, responsavel: 'RH', prazoHoras: 24 },
        { id: '2', titulo: 'Documento 2', obrigatorio: true, responsavel: 'RH', prazoHoras: 48 }
      ]
    }
  ];
}

// Quick implementation for missing screens with corrected types
export function seedRhContentMissing() {
  return {
    checklistTemplates: [],
    checklistInstancias: [],
    desligamentos: [],
    pontoMarcacoes: [],
    bancoHorasMovs: [],
    ausencias: [],
    vagas: [],
    candidatos: []
  };
}

export function buildRsFunnel() {
  return [];
}

export function buildJornadaKPIs() {
  return { ajustesPendentes: 0, ajustesAprovados: 0, horasExtras: 0, percentualPresenca: '100' };
}

export function buildRhFinance() {
  return { custoTotal: 0, custoMedio: 0, custoBeneficios: 0, percentualBeneficios: '0' };
}

export function saveRhStateMissing() {}
export function loadRhStateMissing() { return null; }