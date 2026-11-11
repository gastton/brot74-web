// "¿Cómo funciona?": los 3 pasos que muestran la landing y el panel de la
// pantalla de fechas. BRT-267: el paso de pago depende del toggle mpCheckout
// (lib/featureFlags.ts). Con el toggle apagado el texto es el de siempre, así
// nadie lee "Mercado Pago" mientras el pago con MP no está disponible.
export interface HowItWorksStep {
  n: string;
  t: string;
  d: string;
}

const PAY_ALIAS: HowItWorksStep = {
  n: "2",
  t: "Pagá por transferencia",
  d: "Confirmás con una transferencia. Sin filas, sin efectivo, a tu ritmo.",
};

const PAY_MP: HowItWorksStep = {
  n: "2",
  t: "Pagá con Mercado Pago o transferencia",
  d: "Con dinero en tu cuenta de Mercado Pago el pedido se confirma al instante. Si preferís, transferís al alias y lo confirmamos nosotros.",
};

export function howItWorksSteps(mpCheckout: boolean): HowItWorksStep[] {
  return [
    { n: "1", t: "Elegí tu BROT", d: "Elegís la fecha y armás tu pedido online, según lo que haya disponible para esa tanda." },
    mpCheckout ? PAY_MP : PAY_ALIAS,
    { n: "3", t: "Retiralo o recibilo", d: "Según la fecha, pasás a buscarlo o te lo llevamos, en la franja horaria indicada. Horneamos por tandas, no hay local abierto." },
  ];
}
