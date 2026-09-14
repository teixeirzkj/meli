/** WhatsApp comercial: 55 (país) + 74 (DDD) + número. */
export const WHATSAPP_NUMERO = "5574999188851";

export const WHATSAPP_EXIBICAO = "(74) 99918-8851";

function link(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

export const WHATSAPP_CONTRATACAO = link(
  "Olá! Quero contratar o Rotas para conferência de rotas e pacotes.",
);

export const WHATSAPP_RENOVACAO = link(
  "Olá! Minha assinatura do Rotas venceu e quero renovar.",
);
