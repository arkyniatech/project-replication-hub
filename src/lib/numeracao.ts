interface SerieConfig {
  prefixo: string;
  template: string;
  reset: "NUNCA" | "ANUAL" | "MENSAL";
  porUnidade: boolean;
  proximo: number;
  bloqueado: boolean;
}

interface SeriesConfig {
  tipos: {
    contrato: SerieConfig;
    aditivo: SerieConfig;
    fatura: SerieConfig;
    titulo: SerieConfig;
    os: SerieConfig;
  };
  counters: Record<string, number>;
}

function getSeriesConfig(): SeriesConfig {
  const defaultConfig: SeriesConfig = {
    tipos: {
      contrato: { prefixo: "LOC", template: "LOC-{YYYY}-{SEQ:5}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      aditivo: { prefixo: "ADT", template: "ADT-{YYYY}-{SEQ:4}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      fatura: { prefixo: "FAT", template: "FAT-{YYYY}-{SEQ:5}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      titulo: { prefixo: "TIT", template: "TIT-{YYYY}-{SEQ:5}", reset: "ANUAL", porUnidade: false, proximo: 1, bloqueado: true },
      os: { prefixo: "OS", template: "OS-{YYYY}-{MM}-{SEQ:4}", reset: "MENSAL", porUnidade: false, proximo: 1, bloqueado: true }
    },
    counters: {}
  };

  try {
    const saved = localStorage.getItem('config.series');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...defaultConfig, ...parsed };
    }
  } catch (error) {
    console.warn('Error loading series config:', error);
  }
  
  return defaultConfig;
}

function generateCounterKey(tipo: string, config: SerieConfig, unidade: string = "MAIN"): string {
  const now = new Date();
  let key = tipo;
  
  if (config.porUnidade) {
    key += `|${unidade}`;
  }
  
  if (config.reset === "ANUAL") {
    key += `|${now.getFullYear()}`;
  } else if (config.reset === "MENSAL") {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    key += `|${year}${month}`;
  }
  
  return key;
}

function generateNumber(tipo: keyof SeriesConfig['tipos'], unidade: string = "MAIN"): string {
  const config = getSeriesConfig();
  const tipoConfig = config.tipos[tipo];
  
  if (!tipoConfig) {
    throw new Error(`Tipo de documento não configurado: ${tipo}`);
  }
  
  const counterKey = generateCounterKey(tipo, tipoConfig, unidade);
  let currentCounter = config.counters[counterKey] || tipoConfig.proximo || 1;
  
  // Gerar número com tokens
  const now = new Date();
  const tokens: Record<string, string> = {
    '{YYYY}': now.getFullYear().toString(),
    '{YY}': now.getFullYear().toString().slice(-2),
    '{MM}': String(now.getMonth() + 1).padStart(2, '0'),
    '{DD}': String(now.getDate()).padStart(2, '0'),
    '{UNID}': unidade
  };
  
  let numero = tipoConfig.prefixo + tipoConfig.template;
  
  // Substituir tokens normais
  Object.entries(tokens).forEach(([token, value]) => {
    numero = numero.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  // Gerar número único (verificar colisões)
  let tentativas = 0;
  let numeroFinal = "";
  
  while (tentativas < 100) { // Limite de segurança
    const currentSeq = currentCounter + tentativas;
    
    // Substituir {SEQ:n}
    numeroFinal = numero.replace(/{SEQ:(\d+)}/g, (match, digits) => {
      return String(currentSeq).padStart(parseInt(digits), '0');
    });
    
    // Verificar se já existe (em produção checaria no banco)
    if (!documentExiste(tipo, numeroFinal)) {
      break;
    }
    
    tentativas++;
  }
  
  if (tentativas >= 100) {
    throw new Error('Não foi possível gerar número único após 100 tentativas');
  }
  
  // Atualizar contador
  config.counters[counterKey] = currentCounter + tentativas + 1;
  
  try {
    localStorage.setItem('config.series', JSON.stringify(config));
  } catch (error) {
    console.warn('Error saving updated counter:', error);
  }
  
  return numeroFinal;
}

function documentExiste(tipo: keyof SeriesConfig['tipos'], numero: string): boolean {
  // Mock da verificação - em produção consultaria o banco de dados
  try {
    switch (tipo) {
      case 'contrato':
        const contratos = JSON.parse(localStorage.getItem('contratos') || '[]');
        return contratos.some((c: any) => c.numero === numero);
      
      case 'fatura':
        const faturas = JSON.parse(localStorage.getItem('faturas') || '[]');
        return faturas.some((f: any) => f.numero === numero);
      
      case 'titulo':
        const titulos = JSON.parse(localStorage.getItem('titulos') || '[]');
        return titulos.some((t: any) => t.numero === numero);
      
      case 'aditivo':
        // Aditivos podem estar dentro dos contratos ou em array separado
        const contratosList = JSON.parse(localStorage.getItem('contratos') || '[]');
        return contratosList.some((c: any) => 
          c.aditivos && c.aditivos.some((a: any) => a.numero === numero)
        );
      
      case 'os':
        const ordens = JSON.parse(localStorage.getItem('ordens_servico') || '[]');
        return ordens.some((o: any) => o.numero === numero);
      
      default:
        return false;
    }
  } catch (error) {
    console.warn('Error checking document existence:', error);
    return false;
  }
}

function generatePreview(config: SerieConfig, contador: number = 1, unidade: string = "MAIN"): string {
  const now = new Date();
  const tokens: Record<string, string> = {
    '{YYYY}': now.getFullYear().toString(),
    '{YY}': now.getFullYear().toString().slice(-2),
    '{MM}': String(now.getMonth() + 1).padStart(2, '0'),
    '{DD}': String(now.getDate()).padStart(2, '0'),
    '{UNID}': unidade
  };
  
  let preview = config.prefixo + config.template;
  
  // Substituir tokens normais
  Object.entries(tokens).forEach(([token, value]) => {
    preview = preview.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
  });
  
  // Substituir {SEQ:n}
  preview = preview.replace(/{SEQ:(\d+)}/g, (match, digits) => {
    return String(contador).padStart(parseInt(digits), '0');
  });
  
  return preview;
}

export {
  generateNumber,
  generatePreview,
  getSeriesConfig,
  generateCounterKey,
  documentExiste,
  type SerieConfig,
  type SeriesConfig
};