// src/pages/api/send-reply.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { id, toEmail, clientName, subject, replyMessage } = data;

    // 1. Validaciones
    if (!id || !toEmail || !replyMessage) {
      return new Response(
        JSON.stringify({ error: 'Faltan datos para enviar la respuesta' }),
        { status: 400 }
      );
    }

    // 2. Obtener Redes Sociales (Reutilizando tu lógica existente)
    const { data: settingsData } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['social_facebook', 'social_instagram', 'social_tiktok']);

    const socialLinks = settingsData?.reduce<Record<string, string>>((acc, curr) => {
      if (typeof curr.value === 'string') acc[curr.key] = curr.value;
      return acc;
    }, {}) || {};

    const renderSocialButton = (url: string | undefined, label: string) => {
      if (!url || url.length < 5) return '';
      return `
        <a href="${url}" target="_blank" style="display: inline-block; background-color: #f3f4f6; color: #1a1a1a; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 5px; font-size: 14px; border: 1px solid #e5e7eb;">
          ${label}
        </a>
      `;
    };

    const currentYear = new Date().getFullYear();

    // 3. Enviar el correo de respuesta
    const emailResult = await resend.emails.send({
      from: 'La Reserva <info@lareservabartending.com>',
      to: [toEmail],
      // ✅ AQUÍ ESTÁ EL CAMBIO:
      // Esto fuerza a que la respuesta del cliente vaya a tu Gmail principal
      replyTo: 'lareservabartending@gmail.com', 
      subject: `Re: ${subject}`, 
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; line-height: 1.6;">
          
          <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
            <h1 style="color: #d97706; margin: 0; font-size: 24px;">LA RESERVA</h1>
            <p style="color: #ffffff; margin: 5px 0 0; font-size: 14px;">Bartending & Coctelería</p>
          </div>

          <div style="padding: 30px 20px;">
            <p style="font-size: 18px;">Hola <strong>${clientName}</strong>,</p>
            
            <div style="white-space: pre-wrap; margin-bottom: 25px;">${replyMessage.replace(/\n/g, '<br/>')}</div>
            
            <p>Quedamos atentos a cualquier otra consulta.</p>
            <p>Atentamente,<br/><strong>El equipo de La Reserva</strong></p>

            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="margin-bottom: 20px; font-weight: 600;">Síguenos en nuestras redes:</p>
              ${renderSocialButton(socialLinks['social_facebook'], 'Facebook')}
              ${renderSocialButton(socialLinks['social_instagram'], 'Instagram')}
              ${renderSocialButton(socialLinks['social_tiktok'], 'TikTok')}
            </div>
          </div>

          <div style="border-top: 1px solid #eeeeee; padding: 20px; text-align: center; font-size: 12px; color: #999999;">
            <p>© ${currentYear} La Reserva Bartending. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    });

    if (emailResult.error) {
      throw new Error(emailResult.error.message);
    }

    // 4. Actualizar estado en Supabase
    const { error: updateError } = await supabase
      .from('contact_messages')
      .update({ status: 'replied' })
      .eq('id', id);

    if (updateError) {
      console.error('Correo enviado pero error actualizando DB:', updateError);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error enviando respuesta:', error);
    return new Response(JSON.stringify({ error: 'Error al enviar respuesta' }), { status: 500 });
  }
};