/**
 * Date helpers that AVOID timezone conversion.
 *
 * Bug background: dates persisted as 'YYYY-MM-DD' (DATE columns) or ISO
 * "YYYY-MM-DDT00:00:00Z" are parsed by `new Date(str)` as UTC midnight.
 * In UTC-3 (Brazil) `toLocaleDateString('pt-BR')` then renders the
 * PREVIOUS day. This caused vencimentos to appear 1 day a less on
 * contracts (#19.3, #23) and on Contas a Receber (#25).
 */

/** Extract Y/M/D from a string without instantiating a Date when possible. */
function parts(input: string | Date | null | undefined): { y: number; m: number; d: number } | null {
  if (!input) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return { y: input.getFullYear(), m: input.getMonth() + 1, d: input.getDate() };
  }
  const s = String(input);
  // YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS(Z?) — treat the date PART as local.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    return { y: Number(iso[1]), m: Number(iso[2]), d: Number(iso[3]) };
  }
  // DD/MM/YYYY
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) {
    return { y: Number(br[3]), m: Number(br[2]), d: Number(br[1]) };
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Format a date as DD/MM/YYYY without any timezone shift. */
export function formatDateBR(input: string | Date | null | undefined, fallback = ''): string {
  const p = parts(input);
  if (!p) return fallback;
  return `${pad(p.d)}/${pad(p.m)}/${p.y}`;
}

/** Parse a 'YYYY-MM-DD' style value as a LOCAL Date (no UTC shift). */
export function parseDateLocal(input: string | Date | null | undefined): Date | null {
  const p = parts(input);
  if (!p) return null;
  return new Date(p.y, p.m - 1, p.d);
}

/** Convert any date input to a canonical 'YYYY-MM-DD' string (local). */
export function toISODateLocal(input: string | Date | null | undefined): string {
  const p = parts(input);
  if (!p) return '';
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

/**
 * Rola uma data para o próximo dia útil se cair no fim de semana (#40).
 * Não trabalhamos sábado/domingo — sábado e domingo viram a segunda seguinte.
 * Uma locação de diária feita na sexta termina na segunda (mesma diária),
 * pois o cliente usa o equipamento durante o fim de semana.
 */
export function proximoDiaUtil(input: string | Date | null | undefined): string {
  const p = parts(input);
  if (!p) return '';
  const d = new Date(p.y, p.m - 1, p.d);
  const dow = d.getDay(); // 0 = domingo, 6 = sábado
  if (dow === 6) d.setDate(d.getDate() + 2);
  else if (dow === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
