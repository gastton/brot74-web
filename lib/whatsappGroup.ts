/**
 * Link de invitación al grupo de WhatsApp (env WHATSAPP_GROUP_INVITE_URL, solo
 * servidor). null si falta o no es un link de invitación: /grupo muestra el
 * texto de respaldo en lugar del botón.
 */
export function getGroupInviteUrl(): string | null {
  const value = process.env.WHATSAPP_GROUP_INVITE_URL?.trim();
  return value && /^https:\/\/chat\.whatsapp\.com\/\S+$/.test(value) ? value : null;
}
