// Validação dos itens do wizard de Recebimento antes de avançar para conferência.

export interface ItemRecebimentoValidacao {
  itemId: string;
  descricao: string;
  isSerial: boolean;
  quantidade: number;
  series?: string[];
}

export interface SerieInvalida {
  itemId: string;
  descricao: string;
  quantidade: number;
  seriesInformadas: number;
}

export function validarSeriesRecebimento(itens: ItemRecebimentoValidacao[]): SerieInvalida[] {
  return itens
    .filter(item => item.isSerial && item.quantidade > 0)
    .map(item => ({
      itemId: item.itemId,
      descricao: item.descricao,
      quantidade: item.quantidade,
      seriesInformadas: (item.series ?? []).filter(s => s.trim() !== '').length,
    }))
    .filter(item => item.seriesInformadas !== item.quantidade);
}
