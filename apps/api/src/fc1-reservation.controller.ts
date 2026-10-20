import { BadRequestException, Controller, Post, Body, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './public.decorator.js';
import { sendResendEmail } from './identity-email-delivery.js';

@Controller('v1/public/fc1-reservations')
export class Fc1ReservationController {
  @Public()
  @Post()
  async create(@Body() body: { email?: string; model?: string; colour?: string; locale?: string }) {
    const email = body?.email?.trim().toLowerCase();
    const recipient = process.env.FC1_RESERVATION_EMAIL?.trim();
    const apiKey = process.env.MAIL_API_KEY?.trim();
    const from = process.env.MAIL_FROM_ADDRESS?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('A valid email address is required');
    if (!recipient || !apiKey || !from) throw new ServiceUnavailableException('Reservation email is not configured');
    const model = body.model?.trim().slice(0, 40) || 'FC1 Standard';
    const colour = body.colour?.trim().slice(0, 60) || 'Not specified';
    const locale = ['zh', 'de', 'en'].includes(body.locale ?? '') ? body.locale : 'en';
    const subject = `ALSVID FC1 reservation enquiry — ${email}`;
    const text = `FC1 reservation enquiry\nEmail: ${email}\nModel: ${model}\nColour: ${colour}\nLocale: ${locale}\n\nThis is an interest request only. No payment or order was created.`;
    try {
      await sendResendEmail(apiKey, `ALSVID <${from}>`, { to: recipient, subject, text, html: `<p><strong>FC1 reservation enquiry</strong></p><p>Email: ${email}<br>Model: ${model}<br>Colour: ${colour}<br>Locale: ${locale}</p><p>No payment or order was created.</p>` });
    } catch { throw new ServiceUnavailableException('Reservation email could not be sent'); }
    return { data: { ok: true } };
  }
}
