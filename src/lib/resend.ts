// src/lib/resend.ts

import { Resend } from 'resend';

const resendApiKey = import.meta.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('Missing RESEND_API_KEY environment variable');
}

export const resend = new Resend(resendApiKey);

/**
 * Envía email de confirmación de cotización
 */
export async function sendQuoteConfirmationEmail(data: {
  to: string;
  name: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
}) {
  try {
    const { data: result, error } = await resend.emails.send({
      from: 'La Reserva <contacto@lareserva.pe>',
      to: data.to,
      subject: 'Cotización Recibida - La Reserva',
      html: `
        <h1>¡Gracias por tu interés, ${data.name}!</h1>
        <p>Hemos recibido tu solicitud de cotización para:</p>
        <ul>
          <li>Tipo de evento: ${data.eventType}</li>
          <li>Fecha: ${data.eventDate}</li>
          <li>Invitados: ${data.guestCount}</li>
        </ul>
        <p>Te contactaremos dentro de las próximas 24 horas.</p>
        <p>Saludos,<br>Equipo La Reserva</p>
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error in sendQuoteConfirmationEmail:', error);
    return { success: false, error };
  }
}