import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type { DatosPreferencia } from "@/lib/pedido";

export class ConfiguracionFaltanteError extends Error {
  constructor(readonly variable: string) {
    super(`Falta configurar la variable de entorno ${variable}`);
    this.name = "ConfiguracionFaltanteError";
  }
}

export function leerVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new ConfiguracionFaltanteError(nombre);
  }
  return valor;
}

function cliente(): MercadoPagoConfig {
  return new MercadoPagoConfig({
    accessToken: leerVariable("MP_ACCESS_TOKEN"),
    options: { timeout: 10000 },
  });
}

export async function crearPreferencia(
  datos: DatosPreferencia,
): Promise<{ checkoutUrl: string }> {
  const respuesta = await new Preference(cliente()).create({ body: datos });
  const checkoutUrl = respuesta.init_point ?? respuesta.sandbox_init_point;
  if (!checkoutUrl) {
    throw new Error("Mercado Pago no devolvió la URL de pago");
  }
  return { checkoutUrl };
}

export type PagoConsultado = {
  id: string;
  status: string | undefined;
  externalReference: string | undefined;
  amount: number | undefined;
};

export async function consultarPago(id: string): Promise<PagoConsultado> {
  const pago = await new Payment(cliente()).get({ id });
  return {
    id: String(pago.id ?? id),
    status: pago.status,
    externalReference: pago.external_reference,
    amount: pago.transaction_amount,
  };
}
