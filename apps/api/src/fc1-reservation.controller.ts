import { BadRequestException, Controller, Post, Body, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './public.decorator.js';
import { sendResendEmail } from './identity-email-delivery.js';
import { normalizeReservationEnquiry, reservationNotification } from './fc1-reservation-input.js';

@Controller('v1/public/fc1-reservations')
export class Fc1ReservationController {
  @Public()
  @Post()
  async create(@Body() body: unknown) {
    const enquiry = normalizeReservationEnquiry(body);
    if (!enquiry) throw new BadRequestException('A valid email address is required');

    const recipient = process.env.FC1_RESERVATION_EMAIL?.trim();
    const apiKey = process.env.MAIL_API_KEY?.trim();
    const from = process.env.MAIL_FROM_ADDRESS?.trim();
    if (!recipient || !apiKey || !from) throw new ServiceUnavailableException('Reservation email is not configured');

    try {
      await sendResendEmail(apiKey, `ALSVID <${from}>`, {
        to: recipient,
        ...reservationNotification(enquiry),
      });
    } catch {
      throw new ServiceUnavailableException('Reservation email could not be sent');
    }
    return { data: { ok: true } };
  }
}
