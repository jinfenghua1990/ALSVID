import { BadRequestException, Controller, Post, Body, ServiceUnavailableException } from '@nestjs/common';
import { Public } from './public.decorator.js';
import { PublicRateLimit } from './platform/public-rate-limit.decorator.js';
import { sendResendEmail } from './identity-email-delivery.js';
import { normalizeReservationEnquiry, reservationNotification } from './fc1-reservation-input.js';
import { testRideService } from './runtime.js';

@Controller('v1/public/fc1-reservations')
export class Fc1ReservationController {
  @Public()
  // Every accepted enquiry sends mail to a fixed internal recipient, so an
  // unthrottled form is a direct path to flooding that inbox and the provider quota.
  @PublicRateLimit({ perClient: 20, perEmail: 3, perInstance: 300, windowMs: 60 * 60 * 1000 })
  @Post()
  async create(@Body() body: unknown) {
    const enquiry = normalizeReservationEnquiry(body);
    if (!enquiry) throw new BadRequestException('Invalid enquiry');

    const recipient = process.env.FC1_RESERVATION_EMAIL?.trim();
    const apiKey = process.env.MAIL_API_KEY?.trim();
    const from = process.env.MAIL_FROM_ADDRESS?.trim();

    if (enquiry.purpose === 'test_ride') {
      // Database persistence is the source of truth. Email notification is optional.
      // Do not report a successful request if persistence failed.
      let saved:{id:string;created:boolean};
      try {
        saved = await testRideService.submit({
          name:enquiry.name,email:enquiry.email,country:enquiry.country!,
          city:enquiry.city,model:enquiry.model,colour:enquiry.colour,locale:enquiry.locale,
        });
      } catch {
        throw new ServiceUnavailableException('Unable to save test-ride interest');
      }
      if (saved.created) {
        let notification:'SENT'|'FAILED'|'UNCONFIGURED'='UNCONFIGURED';
        if (recipient && apiKey && from) {
          try {
            await sendResendEmail(apiKey, `ALSVID <${from}>`,{
              to:recipient,...reservationNotification(enquiry),
            });
            notification='SENT';
          } catch {notification='FAILED';}
        }
        try{await testRideService.notification(saved.id,notification);}
        catch{/* The enquiry was saved even if mail-status bookkeeping fails. */}
      }
      return {data:{received:true,reference:saved.id}};
    }

    if (!recipient || !apiKey || !from)
      throw new ServiceUnavailableException('Reservation email is not configured');
    try {
      await sendResendEmail(apiKey, `ALSVID <${from}>`, {
        to: recipient,...reservationNotification(enquiry),
      });
    } catch {
      throw new ServiceUnavailableException('Reservation email could not be sent');
    }
    return {data:{ok:true}};
  }
}
