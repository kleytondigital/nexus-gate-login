/**
 * Validação e formatação de CNPJ
 */

export function formatCNPJ(cnpj: string | null | undefined): string {
  // Verificar se cnpj existe
  if (!cnpj) {
    return '';
  }
  
  // Remove caracteres não numéricos
  const numericCNPJ = cnpj.replace(/\D/g, '');
  
  // Formata o CNPJ
  if (numericCNPJ.length === 14) {
    return numericCNPJ.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  }
  
  return cnpj;
}

export function cleanCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) {
    return '';
  }
  return cnpj.replace(/\D/g, '');
}

export function isValidCNPJ(cnpj: string | null | undefined): boolean {
  if (!cnpj) {
    return false;
  }
  
  const numericCNPJ = cleanCNPJ(cnpj);
  
  // Verifica se tem 14 dígitos
  if (numericCNPJ.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(numericCNPJ)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numericCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numericCNPJ[12]) !== firstDigit) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numericCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(numericCNPJ[13]) === secondDigit;
}