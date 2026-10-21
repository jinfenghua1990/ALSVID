/** Parse untrusted public FC1 reservation enquiries without creating an order. */
export interface ReservationEnquiry {
  email: string;
  model: string;
  colour: string;
  locale: 'zh' | 'de' | 'en';
}

export function normalizeReservationEnquiry(body: unknown): ReservationEnquiry | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (typeof input.email !== 'string') return null;
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null;
  const model = typeof input.model === 'string' ? input.model.trim().slice(0, 40) : '';
  const colour = typeof input.colour === 'string' ? input.colour.trim().slice(0, 60) : '';
  const locale: ReservationEnquiry['locale'] = input.locale === 'zh' || input.locale === 'de' ? input.locale : 'en';
  return { email, model: model || 'FC1 Standard', colour: colour || 'Not specified', locale };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char
  ));
}

/** Never place user-controlled strings unescaped into notification HTML. */
export function reservationNotification(enquiry: ReservationEnquiry): {
  subject: string; text: string; html: string;
} {
  const { email, model, colour, locale } = enquiry;
  return {
    subject: 'ALSVID FC1 reservation enquiry',
    text: `FC1 reservation enquiry\nEmail: ${email}\nModel: ${model}\nColour: ${colour}\nLocale: ${locale}\n\nThis is an interest request only. No payment or order was created.`,
    html: `<p><strong>FC1 reservation enquiry</strong></p><p>Email: ${escapeHtml(email)}<br>Model: ${escapeHtml(model)}<br>Colour: ${escapeHtml(colour)}<br>Locale: ${escapeHtml(locale)}</p><p>No payment or order was created.</p>`,
  };
}
