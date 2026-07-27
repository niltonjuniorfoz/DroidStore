export const BRAZIL_STATES = [
  { value: "AC", label: "Acre" },
  { value: "AL", label: "Alagoas" },
  { value: "AP", label: "Amapá" },
  { value: "AM", label: "Amazonas" },
  { value: "BA", label: "Bahia" },
  { value: "CE", label: "Ceará" },
  { value: "DF", label: "Distrito Federal" },
  { value: "ES", label: "Espírito Santo" },
  { value: "GO", label: "Goiás" },
  { value: "MA", label: "Maranhão" },
  { value: "MT", label: "Mato Grosso" },
  { value: "MS", label: "Mato Grosso do Sul" },
  { value: "MG", label: "Minas Gerais" },
  { value: "PA", label: "Pará" },
  { value: "PB", label: "Paraíba" },
  { value: "PR", label: "Paraná" },
  { value: "PE", label: "Pernambuco" },
  { value: "PI", label: "Piauí" },
  { value: "RJ", label: "Rio de Janeiro" },
  { value: "RN", label: "Rio Grande do Norte" },
  { value: "RS", label: "Rio Grande do Sul" },
  { value: "RO", label: "Rondônia" },
  { value: "RR", label: "Roraima" },
  { value: "SC", label: "Santa Catarina" },
  { value: "SP", label: "São Paulo" },
  { value: "SE", label: "Sergipe" },
  { value: "TO", label: "Tocantins" },
] as const;

export const BRAZIL_STATE_CODES = BRAZIL_STATES.map((state) => state.value) as readonly string[];

export function isBrazilState(value: string) {
  return BRAZIL_STATE_CODES.includes(value.toUpperCase());
}

export function brazilNationalPhoneDigits(value?: string | null) {
  const raw = value?.trim() ?? "";
  let digits = raw.replace(/\D/g, "");

  const hasExplicitCountryCode = /^\s*\+?55(?:\D|$)/.test(raw);
  if ((hasExplicitCountryCode || digits.length > 11) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

export function formatBrazilPhone(value?: string | null) {
  const digits = brazilNationalPhoneDigits(value);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  let formatted = "+55";

  if (ddd) formatted += ` (${ddd}`;
  if (ddd.length === 2) formatted += ")";
  if (!number) return formatted;

  if (number.length <= 8) {
    const first = number.slice(0, 4);
    const last = number.slice(4);
    return `${formatted} ${first}${last ? `-${last}` : ""}`;
  }

  const first = number.slice(0, 5);
  const last = number.slice(5);
  return `${formatted} ${first}${last ? `-${last}` : ""}`;
}

export function brazilPhoneForWhatsApp(value?: string | null) {
  const digits = brazilNationalPhoneDigits(value);
  if (![10, 11].includes(digits.length)) return "";
  return `55${digits}`;
}
