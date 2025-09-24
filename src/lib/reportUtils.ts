import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

export interface DadosMensais {
  id: string;
  mes: number;
  ano: number;
  faturamento_bruto: number;
  investimento_ads: number;
  itens_vendidos: number;
  tipo_campanha: string;
  roas: number | null;
  acos: number | null;
  observacoes: string | null;
  created_at: string;
  loja_id: string;
}

export interface LojaData {
  id: string;
  nome: string;
  marketplace: string;
  url: string | null;
  ativa: boolean;
  cnpj: {
    id: string;
    cnpj: string;
    nome_fantasia: string;
    cliente: {
      id: string;
      nome: string;
    };
  };
}

export interface ReportData {
  loja: LojaData;
  dados: DadosMensais[];
  periodo: {
    mes: number;
    ano: number;
  };
  comparacao?: {
    mes: number;
    ano: number;
  };
}

export interface ReportInsights {
  totalVendas: number;
  totalAds: number;
  totalItens: number;
  roasMedia: number;
  acosMedia: number;
  crescimentoVendas?: number;
  crescimentoItens?: number;
  crescimentoAds?: number;
  tendencia: 'alta' | 'baixa' | 'estavel';
  recomendacao: string;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MARKETPLACE_LABELS = {
  shopee: 'Shopee',
  mercado_livre: 'Mercado Livre',
  tiktok_shop: 'TikTok Shop',
  shein: 'Shein',
  magalu: 'Magalu',
  amazon: 'Amazon',
  outros: 'Outros'
};

export function calculateInsights(reportData: ReportData): ReportInsights {
  const { dados, periodo, comparacao } = reportData;
  
  const dadosAtual = dados.filter(d => d.mes === periodo.mes && d.ano === periodo.ano);
  const dadosComparacao = comparacao 
    ? dados.filter(d => d.mes === comparacao.mes && d.ano === comparacao.ano)
    : null;

  // Totais do período atual
  const totalVendas = dadosAtual.reduce((sum, d) => sum + Number(d.faturamento_bruto), 0);
  const totalAds = dadosAtual.reduce((sum, d) => sum + Number(d.investimento_ads), 0);
  const totalItens = dadosAtual.reduce((sum, d) => sum + d.itens_vendidos, 0);

  // Médias de ROAS e ACOS
  const roasValues = dadosAtual.filter(d => d.roas !== null).map(d => Number(d.roas));
  const acosValues = dadosAtual.filter(d => d.acos !== null).map(d => Number(d.acos));
  
  const roasMedia = roasValues.length > 0 ? roasValues.reduce((sum, r) => sum + r, 0) / roasValues.length : 0;
  const acosMedia = acosValues.length > 0 ? acosValues.reduce((sum, a) => sum + a, 0) / acosValues.length : 0;

  let insights: ReportInsights = {
    totalVendas,
    totalAds,
    totalItens,
    roasMedia,
    acosMedia,
    tendencia: 'estavel',
    recomendacao: 'Mantenha o bom trabalho!'
  };

  // Cálculo de crescimento se há dados de comparação
  if (dadosComparacao && dadosComparacao.length > 0) {
    const vendasComparacao = dadosComparacao.reduce((sum, d) => sum + Number(d.faturamento_bruto), 0);
    const itensComparacao = dadosComparacao.reduce((sum, d) => sum + d.itens_vendidos, 0);
    const adsComparacao = dadosComparacao.reduce((sum, d) => sum + Number(d.investimento_ads), 0);

    insights.crescimentoVendas = vendasComparacao > 0 ? ((totalVendas - vendasComparacao) / vendasComparacao) * 100 : 0;
    insights.crescimentoItens = itensComparacao > 0 ? ((totalItens - itensComparacao) / itensComparacao) * 100 : 0;
    insights.crescimentoAds = adsComparacao > 0 ? ((totalAds - adsComparacao) / adsComparacao) * 100 : 0;

    // Determinar tendência
    if (insights.crescimentoVendas > 5) {
      insights.tendencia = 'alta';
      insights.recomendacao = 'Excelente crescimento! Continue investindo nesta estratégia.';
    } else if (insights.crescimentoVendas < -5) {
      insights.tendencia = 'baixa';
      insights.recomendacao = 'Performance em declínio. Considere revisar a estratégia de marketing.';
    }
  }

  // Recomendações baseadas em ROAS/ACOS
  if (roasMedia > 4) {
    insights.recomendacao = 'ROAS excelente! Considere aumentar o investimento em Ads.';
  } else if (roasMedia < 2) {
    insights.recomendacao = 'ROAS baixo. Revise palavras-chave e segmentação dos anúncios.';
  }

  return insights;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function generateWhatsAppReport(reportData: ReportData, insights: ReportInsights): string {
  const { loja, periodo, comparacao } = reportData;
  const mesNome = MESES[periodo.mes - 1];
  const marketplaceLabel = MARKETPLACE_LABELS[loja.marketplace as keyof typeof MARKETPLACE_LABELS] || loja.marketplace;

  let report = `📊 Relatório de Vendas ${loja.cnpj.cliente.nome} - ${mesNome} ${periodo.ano}\n\n`;
  report += `🗓️ Período: 01 a ${new Date(periodo.ano, periodo.mes, 0).getDate()} de ${mesNome}\n\n`;
  report += `🌐 Canal: ${marketplaceLabel.toUpperCase()} - ${loja.nome.toUpperCase()}\n\n`;
  report += `📈 Resumo do Desempenho\n`;
  report += `💰 Total de Vendas: ${formatCurrency(insights.totalVendas)}\n`;
  report += `📦 Unidades Vendidas: ${insights.totalItens}\n`;
  report += `📣 Investimento em Ads: ${formatCurrency(insights.totalAds)}\n\n`;

  if (insights.roasMedia > 0) {
    report += `📊 Métricas de Performance\n`;
    report += `🎯 ROAS Médio: ${insights.roasMedia.toFixed(2)}\n`;
    report += `💸 ACOS Médio: ${(insights.acosMedia * 100).toFixed(1)}%\n\n`;
  }

  if (insights.crescimentoVendas !== undefined && comparacao) {
    const mesComparacao = MESES[comparacao.mes - 1];
    report += `📈 Comparação vs ${mesComparacao} ${comparacao.ano}\n`;
    report += `💰 Crescimento em Vendas: ${formatPercentage(insights.crescimentoVendas)}\n`;
    report += `📦 Crescimento em Unidades: ${formatPercentage(insights.crescimentoItens || 0)}\n`;
    report += `📣 Variação em Ads: ${formatPercentage(insights.crescimentoAds || 0)}\n\n`;
  }

  report += `💡 Insight: ${insights.recomendacao}\n\n`;
  report += `🏷️ Tendência: ${insights.tendencia === 'alta' ? '📈 ALTA' : insights.tendencia === 'baixa' ? '📉 BAIXA' : '➡️ ESTÁVEL'}\n\n`;
  report += `---\n`;
  report += `Relatório gerado automaticamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;

  return report;
}

export function generatePDF(reportData: ReportData, insights: ReportInsights): jsPDF {
  const pdf = new jsPDF();
  const { loja, periodo } = reportData;
  const mesNome = MESES[periodo.mes - 1];
  const marketplaceLabel = MARKETPLACE_LABELS[loja.marketplace as keyof typeof MARKETPLACE_LABELS] || loja.marketplace;

  // Título
  pdf.setFontSize(20);
  pdf.setTextColor(51, 51, 51);
  pdf.text('Relatório Analítico de Vendas', 20, 30);

  // Informações da loja
  pdf.setFontSize(14);
  pdf.text(`Cliente: ${loja.cnpj.cliente.nome}`, 20, 50);
  pdf.text(`Loja: ${loja.nome}`, 20, 65);
  pdf.text(`Marketplace: ${marketplaceLabel}`, 20, 80);
  pdf.text(`Período: ${mesNome} ${periodo.ano}`, 20, 95);

  // Linha separadora
  pdf.setLineWidth(0.5);
  pdf.line(20, 105, 190, 105);

  // Métricas principais
  pdf.setFontSize(16);
  pdf.setTextColor(0, 100, 200);
  pdf.text('📊 Resumo do Desempenho', 20, 125);

  pdf.setFontSize(12);
  pdf.setTextColor(51, 51, 51);
  pdf.text(`Total de Vendas: ${formatCurrency(insights.totalVendas)}`, 20, 145);
  pdf.text(`Unidades Vendidas: ${insights.totalItens}`, 20, 160);
  pdf.text(`Investimento em Ads: ${formatCurrency(insights.totalAds)}`, 20, 175);

  if (insights.roasMedia > 0) {
    pdf.text(`ROAS Médio: ${insights.roasMedia.toFixed(2)}`, 20, 190);
    pdf.text(`ACOS Médio: ${(insights.acosMedia * 100).toFixed(1)}%`, 20, 205);
  }

  // Insights e recomendações
  pdf.setFontSize(16);
  pdf.setTextColor(0, 150, 0);
  pdf.text('💡 Insights e Recomendações', 20, 230);

  pdf.setFontSize(10);
  pdf.setTextColor(51, 51, 51);
  const recomendacaoLines = pdf.splitTextToSize(insights.recomendacao, 150);
  pdf.text(recomendacaoLines, 20, 245);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 20, 280);

  return pdf;
}