import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_CONFIG } from '@/config/app';
import logoUrl from '@/assets/locacao-logo.png';

/**
 * Gerador do Contrato de Locação em PDF.
 *
 * Layout segue o contrato-modelo nº 922 (LOCAACAO OURO FINO):
 *  - cabeçalho com os dados fiscais DA LOJA (tabela lojas) + logo à direita;
 *  - seções com barras cinza claro (sem faixas escuras);
 *  - tabela de equipamentos com valor de indenização por item;
 *  - bloco TOTAL com tipo de deslocamento e valor do frete;
 *  - nota promissória com o VALOR DE INDENIZAÇÃO dos equipamentos
 *    (não o valor do contrato);
 *  - tudo em UMA única página A4.
 */

export interface LojaContratoPDF {
  nome?: string | null;
  razao_social?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  telefone?: string | null;
  email?: string | null;
  horario_funcionamento?: string | null;
}

interface ContratoPDFData {
  numero?: string;
  /** Dados fiscais da loja emissora (cabeçalho + promissória) */
  loja?: LojaContratoPDF | null;
  cliente: {
    nomeRazao: string;
    documento: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endereco?: any;
    celular?: string;
  };
  obra?: {
    responsavel?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    endereco?: any;
    celular?: string;
    fixo?: string;
    contato?: string;
  } | null;
  // Endereço de entrega (obra ou logística). Cai pra cliente.endereco se vazio.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enderecoEntrega?: any;
  itens: Array<{
    equipamento: {
      nome: string;
      codigo: string;
    };
    quantidade: number;
    periodoEscolhido: string;
    valorUnitario: number;
    subtotal: number;
    /** Valor de indenização unitário (cadastro do equipamento) */
    valorIndenizacao?: number;
  }>;
  entrega: {
    data: string;
    janela: string;
    observacoes?: string;
  };
  /** Período de locação exibido na seção EQUIPAMENTOS */
  periodoLocacao?: { inicio: string; fim: string };
  /** Data/hora previstas para devolução (box de aviso) */
  dataDevolucao?: string;
  horaDevolucao?: string;
  horaInicial?: string;
  prazo?: string;
  ordemCompra?: string;
  pagamento: {
    forma: string;
    vencimentoISO: string;
    /** Cronograma de vencimentos (opcional; senão usa vencimentoISO/valorTotal) */
    parcelas?: Array<{ vencimentoISO: string; valor: number }>;
  };
  tipoDeslocamento?: string;
  valorFrete?: number;
  valorTotal: number;
  atendente?: string;
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const GRAY_BAR: [number, number, number] = [224, 224, 224];   // barras de seção (cinza claro)
const GRAY_LINE: [number, number, number] = [140, 140, 140];
const BLACK: [number, number, number] = [20, 20, 20];
const LOGO_AMBER: [number, number, number] = [222, 145, 11];

const formatarForma = (forma: string) => {
  const formas: Record<string, string> = {
    'BOLETO': 'Boleto',
    'PIX': 'PIX',
    'CARTAO': 'Cartão',
    'CARTAO_DEBITO': 'Cartão de Débito',
    'CARTAO_CREDITO': 'Cartão de Crédito',
    'DINHEIRO': 'Dinheiro'
  };
  return formas[forma] || forma;
};

const formatarMoeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

const formatarData = (iso: string) => {
  if (!iso) return '-';
  // Para strings YYYY-MM-DD usar parser local (evita timezone shift UTC-3
  // que jogava datas 1 dia pra trás).
  const soData = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (soData) {
    const [, y, m, d] = soData;
    return `${d}/${m}/${y}`;
  }
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const enderecoParaTexto = (end: any): string => {
  if (!end) return '';
  if (typeof end === 'string') return end;
  const partes = [
    end.logradouro,
    end.numero,
    end.complemento,
    end.bairro,
    end.cidade ? `${end.cidade}${end.uf ? '/' + end.uf : ''}` : '',
  ].filter(Boolean);
  return partes.join(', ');
};

// Cache do logo em dataURL (carregado uma vez por sessão)
let logoDataUrlCache: string | null | undefined;

async function carregarLogoDataUrl(): Promise<string | null> {
  if (logoDataUrlCache !== undefined) return logoDataUrlCache;
  try {
    const resp = await fetch(logoUrl);
    const blob = await resp.blob();
    logoDataUrlCache = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    logoDataUrlCache = null;
  }
  return logoDataUrlCache;
}

// Barra de seção cinza claro (estilo do contrato-modelo)
function secao(doc: jsPDF, titulo: string, y: number, margin: number, pageWidth: number, rightText?: string): number {
  doc.setFillColor(...GRAY_BAR);
  doc.rect(margin, y, pageWidth - 2 * margin, 4.6, 'F');
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(titulo, margin + 1.5, y + 3.3);
  if (rightText) {
    doc.text(rightText, pageWidth - margin - 1.5, y + 3.3, { align: 'right' });
  }
  return y + 7.6;
}

function campo(doc: jsPDF, label: string, valor: string, x: number, y: number, maxWidth?: number) {
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  const labelTxt = `${label}: `;
  doc.text(labelTxt, x, y);
  doc.setFont('helvetica', 'bold');
  doc.text(valor || '-', x + doc.getTextWidth(labelTxt) + 0.5, y, maxWidth ? { maxWidth } : undefined);
}

interface GerarPDFOptions {
  /** Injeta o logo já em dataURL (usado em testes fora do browser) */
  logoDataUrl?: string | null;
}

// ------------------------------------------------------------------
// Geração
// ------------------------------------------------------------------

export async function gerarContratoPDF(contrato: ContratoPDFData, opts?: GerarPDFOptions): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 11;
  const contentW = pageWidth - 2 * margin;

  // ---------- Dados da loja (fallback para APP_CONFIG) ----------
  const loja = contrato.loja || null;
  const nomeLoja = loja?.nome
    ? (loja.nome.toUpperCase().includes('LOCA') ? loja.nome.toUpperCase() : `LOCAACAO ${loja.nome.toUpperCase()}`)
    : APP_CONFIG.company.fullName.toUpperCase();
  const cnpjLoja = loja?.cnpj || APP_CONFIG.company.cnpj;
  const emailLoja = loja?.email || APP_CONFIG.company.contact.email;
  const foneLoja = loja?.telefone || APP_CONFIG.company.contact.phone;
  const endLoja = loja?.endereco
    || `${APP_CONFIG.company.address.street} - ${APP_CONFIG.company.address.city}/${APP_CONFIG.company.address.state}`;
  const horarioLoja = loja?.horario_funcionamento || '';
  const cidadeLoja = loja?.cidade || APP_CONFIG.company.address.city;
  const razaoLoja = loja?.razao_social || nomeLoja;

  // ---------- Cabeçalho ----------
  let y = 13;
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BLACK);
  doc.text(nomeLoja, margin, y);
  y += 4.6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${cnpjLoja} - E-mail: ${emailLoja}`, margin, y);
  y += 4.2;
  doc.text(`Fone: ${foneLoja}`, margin, y);
  y += 4.2;
  if (horarioLoja) {
    doc.text(`Horário de funcionamento: ${horarioLoja}`, margin, y);
    y += 4.2;
  }
  doc.text(endLoja, margin, y);

  // Logo (marca + wordmark) à direita
  const logoDataUrl = opts?.logoDataUrl !== undefined ? opts.logoDataUrl : await carregarLogoDataUrl();
  const logoX = pageWidth - margin - 46;
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', logoX + 14, 8, 16, 16);
    } catch {
      // logo é decorativo — não bloquear a emissão do contrato
    }
  }
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...LOGO_AMBER);
  doc.text('LOCA', logoX + 6, 29.5);
  doc.setTextColor(60, 60, 60);
  doc.text('AÇÃO', logoX + 6 + doc.getTextWidth('LOCA'), 29.5);
  doc.setFontSize(5.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(90, 90, 90);
  doc.text('ALUGUEL DE EQUIPAMENTOS', logoX + 6, 33);
  doc.setTextColor(...BLACK);

  y = 40;

  // ---------- Título ----------
  doc.setFontSize(13.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Contrato de Locação n° : ${contrato.numero || '-'}`, margin, y);
  y += 5.5;

  // Linha de dados iniciais
  doc.setFillColor(238, 238, 238);
  doc.rect(margin, y, contentW, 5, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const dataInicialTxt = `Data Inicial: ${formatarData(contrato.entrega.data)}`;
  const horaInicialTxt = `Hora Inicial: ${contrato.horaInicial || (contrato.entrega.janela === 'MANHA' ? 'Manhã' : contrato.entrega.janela === 'TARDE' ? 'Tarde' : contrato.entrega.janela || '-')}`;
  const prazoTxt = `Prazo de Locação: ${contrato.prazo || 'Determinado'}`;
  const ocTxt = `Ordem de Compra: ${contrato.ordemCompra || ''}`;
  doc.text(dataInicialTxt, margin + 1.5, y + 3.5);
  doc.text(horaInicialTxt, margin + 52, y + 3.5);
  doc.text(prazoTxt, margin + 92, y + 3.5);
  doc.text(ocTxt, margin + 145, y + 3.5);
  y += 8;

  // ---------- LOCATÁRIO ----------
  y = secao(doc, 'LOCATÁRIO', y, margin, pageWidth);
  campo(doc, 'CPF', contrato.cliente.documento, margin + 1.5, y);
  if (contrato.cliente.celular) {
    campo(doc, 'Celular', contrato.cliente.celular, pageWidth / 2 + 10, y);
  }
  y += 4.6;
  campo(doc, 'Nome', contrato.cliente.nomeRazao, margin + 1.5, y);
  y += 4.6;
  campo(doc, 'Endereço', enderecoParaTexto(contrato.cliente.endereco), margin + 1.5, y, contentW - 22);
  y += 6.4;

  // ---------- OBRA ----------
  const endObra = enderecoParaTexto(contrato.obra?.endereco || contrato.enderecoEntrega);
  y = secao(doc, 'OBRA', y, margin, pageWidth);
  campo(doc, 'Responsável', contrato.obra?.responsavel || contrato.cliente.nomeRazao.split(' ')[0], margin + 1.5, y);
  y += 4.6;
  campo(doc, 'Endereço', endObra, margin + 1.5, y, contentW - 22);
  y += 4.6;
  campo(doc, 'Celular', contrato.obra?.celular || '', margin + 1.5, y);
  campo(doc, 'Fixo', contrato.obra?.fixo || '', margin + 55, y);
  campo(doc, 'Contato', contrato.obra?.contato || '', margin + 105, y);
  y += 6.4;

  // ---------- EQUIPAMENTOS ----------
  const periodoTxt = contrato.periodoLocacao
    ? `Período de Locação:   ${formatarData(contrato.periodoLocacao.inicio)} à ${formatarData(contrato.periodoLocacao.fim)}`
    : undefined;
  y = secao(doc, 'EQUIPAMENTOS', y, margin, pageWidth, periodoTxt);

  const subtotalItens = contrato.itens.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const valorFrete = contrato.valorFrete || 0;
  const totalReal = subtotalItens + valorFrete;
  const totalParaExibir = contrato.valorTotal && contrato.valorTotal > 0 ? contrato.valorTotal : totalReal;

  // Indenização total (usada na Nota Promissória)
  const indenizacaoTotal = contrato.itens.reduce(
    (acc, it) => acc + (it.valorIndenizacao || 0) * (it.quantidade || 1), 0
  );

  autoTable(doc, {
    startY: y - 2.4,
    margin: { left: margin, right: margin },
    head: [['Patri.', 'Qt', 'Descrição', 'Vl.Indenização', 'Vl.Total']],
    body: contrato.itens.map(item => [
      item.equipamento.codigo || '-',
      String(item.quantidade),
      item.equipamento.nome,
      item.valorIndenizacao ? formatarMoeda(item.valorIndenizacao) : '-',
      formatarMoeda(item.subtotal),
    ]),
    styles: { fontSize: 8, cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 }, textColor: BLACK },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: BLACK,
      fontStyle: 'bold',
      lineWidth: { bottom: 0.2 },
      lineColor: GRAY_LINE,
    },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 24, halign: 'right' },
    },
    theme: 'plain',
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 4;

  // ---------- PAGAMENTO | TOTAL ----------
  const meioX = margin + contentW * 0.44;
  doc.setFillColor(...GRAY_BAR);
  doc.rect(margin, y, contentW * 0.42, 4.6, 'F');
  doc.rect(meioX, y, contentW - (meioX - margin), 4.6, 'F');
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  doc.text('PAGAMENTO', margin + 1.5, y + 3.3);
  doc.text('TOTAL', meioX + 1.5, y + 3.3);
  y += 7.4;

  // Coluna PAGAMENTO
  const parcelas = contrato.pagamento.parcelas?.length
    ? contrato.pagamento.parcelas
    : [{ vencimentoISO: contrato.pagamento.vencimentoISO, valor: totalParaExibir }];

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Forma', margin + 1.5, y);
  doc.text('Venc', margin + 40, y);
  doc.text('Valor', margin + 66, y, { align: 'left' });
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.15);
  doc.line(margin + 1.5, y + 1, margin + contentW * 0.42 - 1.5, y + 1);
  let yPag = y + 4.6;
  doc.setFont('helvetica', 'normal');
  doc.text(formatarForma(contrato.pagamento.forma), margin + 1.5, yPag);
  parcelas.slice(0, 7).forEach((p) => {
    doc.text(formatarData(p.vencimentoISO), margin + 40, yPag);
    doc.text(formatarMoeda(p.valor), margin + 66, yPag);
    yPag += 4.2;
  });

  // Coluna TOTAL
  let yTot = y;
  campo(doc, 'Tipo Deslocamento', contrato.tipoDeslocamento || 'Entrega/Retirada', meioX + 1.5, yTot);
  yTot += 4.8;
  campo(doc, 'Valor do Frete', formatarMoeda(valorFrete), meioX + 1.5, yTot);

  doc.setFontSize(17);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: ${formatarMoeda(totalParaExibir)}`, pageWidth - margin - 1.5, y + 4, { align: 'right' });

  y = Math.max(yPag, yTot + 6) + 3;

  // ---------- OBSERVACAO ----------
  y = secao(doc, 'OBSERVACAO', y, margin, pageWidth);
  doc.setFontSize(7.6);
  doc.setFont('helvetica', 'normal');
  const obsTexto = contrato.entrega.observacoes || '';
  const obsLinhas = doc.splitTextToSize(obsTexto || ' ', contentW - 3);
  doc.text(obsLinhas.slice(0, 2), margin + 1.5, y);
  y += Math.max(obsLinhas.slice(0, 2).length, 1) * 3.4 + 3.5;

  // ---------- Boxes de aviso ----------
  const boxH = 12.5;
  const boxW = (contentW - 4) / 3;
  const dataDevolucaoTxt = contrato.dataDevolucao || contrato.periodoLocacao?.fim || '';
  const boxes: Array<{ titulo?: string; texto: string }> = [
    {
      titulo: 'DATA E HORÁRIO PARA DEVOLUÇÃO',
      texto: `${formatarData(dataDevolucaoTxt)}  ${contrato.horaDevolucao || ''}`.trim(),
    },
    { texto: 'EQUIPAMENTO DEVOLVIDO SUJO SERÁ COBRADO A LIMPEZA' },
    { texto: 'AVISAR COM 02 HORAS DE ANTECEDÊNCIA PARA A RETIRADA DO EQUIPAMENTO OU SERÁ COBRADO MAIS 01 PERÍODO' },
  ];
  boxes.forEach((box, i) => {
    const bx = margin + i * (boxW + 2);
    doc.setDrawColor(...BLACK);
    doc.setLineWidth(0.3);
    doc.rect(bx, y, boxW, boxH);
    doc.setFontSize(6.6);
    if (box.titulo) {
      doc.setFont('helvetica', 'bold');
      doc.text(box.titulo, bx + boxW / 2, y + 4.4, { align: 'center', maxWidth: boxW - 4 });
      doc.setFont('helvetica', 'normal');
      doc.text(box.texto, bx + 3, y + 8.4, { maxWidth: boxW - 6 });
    } else {
      doc.setFont('helvetica', 'bold');
      const linhas = doc.splitTextToSize(box.texto, boxW - 6);
      const altura = linhas.length * 2.8;
      doc.text(linhas, bx + boxW / 2, y + (boxH - altura) / 2 + 2.6, { align: 'center' });
    }
  });
  y += boxH + 4;

  // ---------- DECLARAÇÃO ----------
  y = secao(doc, 'DECLARAÇÃO', y, margin, pageWidth);
  const declaracao =
    'O LOCATÁRIO recebe neste ato, ou na entrega, por si mesmo ou seu preposto, o(s) bem(ns) móvel(is) referido(s) no presente instrumento, e declara: ' +
    'Tê-lo(s) testado(s) e aprovado(s) e afirma que conhece sua correta utilização e funcionamento, pelo que se obriga a devolvê-los em idênticas condições de funcionamento, limpeza e segurança, ' +
    'no final desta locação ou na hipótese de rescisão do presente contrato; Que somente permitirá o uso do(s) equipamento(s), por profissional(is) qualificado(s) e capacitado(s) para operar; ' +
    'Ter ciência de que a prorrogação do contrato é automática e por igual período sucessivamente; Ter ciência de que o equipamento deverá ser devolvido na loja ou que deverá solicitar a retirada ' +
    'através do telefone, tendo como prova o n° do contrato e estando sujeito a taxa de retirada, caso a mesma ainda não esteja aplicada no contrato; ' +
    'O Locatário concorda com as quantias inseridas nos títulos de crédito emitidos pela Locadora, a preço pré-combinado, reconhecendo a dívida por ela apresentada, cujo valor é indicado abaixo; ' +
    'Em caso de destruição total ou parcial do(s) equipamento(s) locado(s) por qualquer motivo não especificado neste instrumento, o Locatário pagará a Locadora o valor de um novo equipamento, ' +
    'ou os reparos do mesmo caso comporte. O valor da locação será cobrado nesse período; Qualquer acidente ocorrido com o equipamento locado, ou por ele causado a terceiros é de plena e total ' +
    'responsabilidade do Locatário, excluindo a Locadora de quaisquer indenização, seja a que título for; Os descontos concedidos são válidos somente até a data de vencimento descrita nesse ' +
    'instrumento, os contratos vencidos passarão para o valor fixo da Locadora; Os contratos com mais de 6 (seis) meses devem ser renegociados caso a Locadora solicite. ' +
    'O inadimplemento por parte do LOCATÁRIO, quando superior a 10 (dez) dias, autoriza a imediata remoção do equipamento pela LOCADORA na sede da obra da LOCATÁRIA, sem necessidade de aviso ou ' +
    'autorização prévia. Constitui parte integrante desse CONTRATO as "CONDIÇÕES GERAIS - INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO DE BENS MÓVEIS", disponível ao LOCATÁRIA na forma física, ' +
    'na sede da LOCADORA, e, virtualmente, via e-mail ou aplicativo de mensagem. Equipamento enviado limpo e revisado. Sendo devolvido sujo ou danificado será cobrado uma taxa de limpeza mais ' +
    'peças necessárias na reposição.';
  doc.setFontSize(6.4);
  doc.setFont('helvetica', 'normal');
  const declLinhas = doc.splitTextToSize(declaracao, contentW);
  doc.text(declLinhas, margin, y, { align: 'justify', maxWidth: contentW });
  y += declLinhas.length * 2.55 + 6;

  // ---------- Assinaturas ----------
  const assW = contentW * 0.42;
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, y, margin + 6 + assW, y);
  doc.setFontSize(8.4);
  doc.setFont('helvetica', 'bold');
  doc.text(contrato.cliente.nomeRazao.toUpperCase(), margin + 6 + assW / 2, y + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`CPF: ${contrato.cliente.documento}`, margin + 6 + assW / 2, y + 8, { align: 'center' });

  const ass2X = pageWidth - margin - 6 - assW;
  doc.line(ass2X, y, ass2X + assW, y);
  doc.setFontSize(8.4);
  doc.text((contrato.atendente || '').toUpperCase(), ass2X + assW / 2, y + 4, { align: 'center' });
  y += 12;

  // ---------- NOTA PROMISSÓRIA ----------
  const npH = Math.min(48, pageHeight - y - 8);
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.35);
  doc.rect(margin, y, contentW, npH);

  // faixa decorativa lateral
  doc.setDrawColor(...GRAY_LINE);
  doc.setLineWidth(0.2);
  for (let i = 0; i < 6; i++) {
    doc.line(margin + 2 + i * 1.2, y + 3, margin + 2 + i * 1.2, y + npH - 3);
  }

  const npX = margin + 12;
  const npW = contentW - 16;
  let yNp = y + 6;
  doc.setFontSize(7.4);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA PROMISSORIA - INDENIZACAO DE EQUIPAMENTO(S) E ACESSORIOS', npX, yNp);
  yNp += 4.6;

  // ⚠ Valor da promissória = INDENIZAÇÃO dos equipamentos, não o total do contrato
  const valorIndenizacaoTxt = indenizacaoTotal > 0
    ? `R$ ${formatarMoeda(indenizacaoTotal)}`
    : 'R$ ____________';
  const npTexto =
    `Pagarei por esta Nota Promissória a ${razaoLoja}, CNPJ: ${cnpjLoja}, a quantia de ${valorIndenizacaoTxt} ` +
    `em moeda corrente deste país, pagável em ${cidadeLoja}`;
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  const npLinhas = doc.splitTextToSize(npTexto, npW);
  doc.text(npLinhas, npX, yNp);
  yNp += npLinhas.length * 3 + 2.6;

  campo(doc, 'Emitente', contrato.cliente.nomeRazao, npX, yNp);
  campo(doc, 'CPF', contrato.cliente.documento, npX + npW * 0.62, yNp);
  yNp += 4.2;
  const endCliente = contrato.cliente.endereco;
  const endClienteTxt = typeof endCliente === 'object' && endCliente
    ? [endCliente.logradouro, endCliente.numero].filter(Boolean).join(', ')
    : enderecoParaTexto(endCliente);
  const bairroTxt = typeof endCliente === 'object' ? (endCliente?.bairro || '') : '';
  const cidadeTxt = typeof endCliente === 'object' ? (endCliente?.cidade || '') : '';
  // Trunca o endereço para caber em uma linha sem sobrepor Bairro/Cidade
  doc.setFontSize(8.2);
  doc.setFont('helvetica', 'bold');
  const maxEndW = npW * 0.42;
  let endTrunc = endClienteTxt;
  while (endTrunc.length > 4 && doc.getTextWidth(endTrunc) > maxEndW) {
    endTrunc = endTrunc.slice(0, -4) + '…';
  }
  campo(doc, 'Endereço', endTrunc, npX, yNp);
  campo(doc, 'Bairro', bairroTxt, npX + npW * 0.52, yNp);
  campo(doc, 'Cidade', cidadeTxt, npX + npW * 0.78, yNp);
  yNp += 5.4;

  // Data/local de emissão
  doc.setFontSize(7.6);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${cidadeLoja}  ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    margin + contentW - 4, yNp, { align: 'right' }
  );
  yNp += 4.2;

  doc.setDrawColor(...BLACK);
  doc.setLineWidth(0.25);
  doc.line(npX, yNp + 2, npX + npW * 0.55, yNp + 2);
  doc.setFontSize(7.4);
  doc.setFont('helvetica', 'bold');
  doc.text(`${contrato.cliente.nomeRazao.toUpperCase()}  |  CPF: ${contrato.cliente.documento}`, npX, yNp + 6);

  return doc;
}

export async function gerarContratoPDFBase64(contrato: ContratoPDFData, opts?: GerarPDFOptions): Promise<string> {
  const doc = await gerarContratoPDF(contrato, opts);
  const dataUri = doc.output('datauristring');
  return dataUri.split(',')[1];
}

export async function downloadContratoPDF(contrato: ContratoPDFData, filename?: string) {
  const doc = await gerarContratoPDF(contrato);
  doc.save(filename || `contrato-${Date.now()}.pdf`);
}

export async function imprimirContratoPDF(contrato: ContratoPDFData) {
  const doc = await gerarContratoPDF(contrato);
  doc.autoPrint();
  const blobUrl = doc.output('bloburl');
  const printWindow = window.open(blobUrl, '_blank');
  if (!printWindow) {
    // Fallback: força download caso o popup esteja bloqueado
    doc.save(`contrato-${Date.now()}.pdf`);
  }
}
