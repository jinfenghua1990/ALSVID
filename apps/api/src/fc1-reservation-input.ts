/** Parse untrusted public FC1 enquiries without creating an order or a confirmed test ride. */
export interface ReservationEnquiry {
  purpose: 'reservation' | 'test_ride';
  email: string;
  model: string;
  colour: string;
  locale: 'zh' | 'de' | 'en';
  name: string;
  city: string;
  country: 'DE' | 'AT' | null;
}

const hasControls = (value: string) => /[\x00-\x1f\x7f]/.test(value);

export function normalizeReservationEnquiry(body: unknown): ReservationEnquiry | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (typeof input.email !== 'string') return null;
  const email = input.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null;

  if (input.purpose !== undefined && input.purpose !== 'reservation' && input.purpose !== 'test_ride') return null;
  const purpose = input.purpose === 'test_ride' ? 'test_ride' : 'reservation';
  const model = typeof input.model === 'string' ? input.model.trim().slice(0, 40) : '';
  const colour = typeof input.colour === 'string' ? input.colour.trim().slice(0, 60) : '';
  const locale: ReservationEnquiry['locale'] = input.locale === 'zh' || input.locale === 'de' ? input.locale : 'en';

  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const city = typeof input.city === 'string' ? input.city.trim() : '';
  const country = input.country === 'DE' || input.country === 'AT' ? input.country : null;
  if (purpose === 'test_ride') {
    if (typeof input.city !== 'string' || city.length < 2 || city.length > 80 || hasControls(city)) return null;
    if (typeof input.name !== 'undefined' && typeof input.name !== 'string') return null;
    if (name.length > 80 || hasControls(name) || !country) return null;
  }

  return {
    purpose,
    email,
    model: model.replace(/[\r\n\t]/g, ' ') || 'FC1 Standard',
    colour: colour.replace(/[\r\n\t]/g, ' ') || 'Not specified',
    locale,
    name: purpose === 'test_ride' ? name : '',
    city: purpose === 'test_ride' ? city : '',
    country: purpose === 'test_ride' ? country : null,
  };
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
  const { email, model, colour, locale, purpose, name, city, country } = enquiry;
  if (purpose === 'test_ride') {
    return {
      subject: 'ALSVID FC1 test ride enquiry',
      text: `FC1 test-ride interest (not a confirmed booking)\nName: ${name || 'Not provided'}\nEmail: ${email}\nCountry: ${country}\nCity: ${city}\nModel: ${model}\nColour: ${colour}\nLocale: ${locale}\n\nNo test ride appointment, payment or order was created.`,
      html: `<p><strong>FC1 test-ride interest (not a confirmed booking)</strong></p><p>Name: ${escapeHtml(name || 'Not provided')}<br>Email: ${escapeHtml(email)}<br>Country: ${escapeHtml(country ?? '')}<br>City: ${escapeHtml(city)}<br>Model: ${escapeHtml(model)}<br>Colour: ${escapeHtml(colour)}<br>Locale: ${escapeHtml(locale)}</p><p>No test ride appointment, payment or order was created.</p>`,
    };
  }
  return {
    subject: 'ALSVID FC1 reservation enquiry',
    text: `FC1 reservation enquiry\nEmail: ${email}\nModel: ${model}\nColour: ${colour}\nLocale: ${locale}\n\nThis is an interest request only. No payment or order was created.`,
    html: `<p><strong>FC1 reservation enquiry</strong></p><p>Email: ${escapeHtml(email)}<br>Model: ${escapeHtml(model)}<br>Colour: ${escapeHtml(colour)}<br>Locale: ${escapeHtml(locale)}</p><p>No payment or order was created.</p>`,
  };
}
