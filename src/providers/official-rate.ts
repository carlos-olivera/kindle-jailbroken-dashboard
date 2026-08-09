import { z } from 'zod';
import { fetchJson, type HttpOptions } from './http.js';
import type { OfficialRateDatum } from '../domain/dashboard.js';

export const CUCU_OFFICIAL_URL = 'https://apibcb.cucu.bo/api/v1/tc/oficial';

export const cucuOficialSchema = z.object({
  tc_oficial: z.object({
    compra: z.number().finite().positive(),
    venta: z.number().finite().positive(),
    moneda: z.string(),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    actualizado: z.string().optional(),
    fecha_publicacion: z.string().optional(),
  }),
  fuente: z.string().optional(),
});

/** Parses a validated CUCU BCB payload into the normalized official-rate datum. */
export function normalizeCucuOficial(payload: unknown): OfficialRateDatum {
  const data = cucuOficialSchema.parse(payload);
  const tc = data.tc_oficial;
  return {
    pair: 'USD/BOB',
    buy: tc.compra,
    sell: tc.venta,
    effectiveDate: tc.fecha,
    updatedAt: tc.actualizado ?? null,
    status: 'live',
  };
}

export async function fetchOfficialRate(http: HttpOptions = {}): Promise<OfficialRateDatum> {
  const payload = await fetchJson(new URL(CUCU_OFFICIAL_URL), http);
  return normalizeCucuOficial(payload);
}
