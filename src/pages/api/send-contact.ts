// src/pages/api/send-contact.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, subject, message } = data;
    
    // 1. Año dinámico
    const currentYear = new Date().getFullYear();

    // 2. Validaciones
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400 }
      );
    }

    // 3. Obtener Redes Sociales
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['social_facebook', 'social_instagram', 'social_tiktok']);

    if (settingsError) {
      console.error('Error leyendo configuración:', settingsError);
    }

    const socialLinks = settingsData?.reduce<Record<string, string>>((acc, curr) => {
      if (typeof curr.value === 'string') {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {}) || {};

    // --- HELPER MEJORADO PARA ICONOS DE REDES SOCIALES ---
    // Usamos imágenes PNG transparentes (32x32px)
    const renderSocialIcon = (url: string | undefined, platform: 'facebook' | 'instagram' | 'tiktok') => {
      if (!url || url.length < 5) return ''; 

      // URLs públicas de iconos (puedes cambiarlas por las de tu propio storage si prefieres)
      const iconUrls = {
        facebook: 'https://cdn-icons-png.flaticon.com/512/145/145802.png', // Versión simple
        instagram: 'https://cdn-icons-png.flaticon.com/512/174/174855.png', // Versión cámara
        tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' // Versión TikTok
      };

      const labels = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' };

      return `
        <a href="${url}" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;">
          <img 
            src="${iconUrls[platform]}" 
            alt="${labels[platform]}" 
            width="32" 
            height="32" 
            style="display: block; width: 32px; height: 32px; border: 0;" 
          />
        </a>
      `;
    };

    // 4. Correo al ADMIN
    const sendToAdmin = resend.emails.send({
      from: 'La Reserva Web <info@lareservabartending.com>',
      to: ['bartendinglareserva@gmail.com'],
      replyTo: email,
      subject: `Nuevo Lead: ${subject}`,
      html: `
        <div style="font-family: sans-serif; color: #333; max-width: 600px;">
          <h2 style="color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 10px;">Nuevo Contacto Recibido</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Teléfono:</strong> ${phone || 'No especificado'}</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
            <strong style="display: block; margin-bottom: 5px;">Mensaje:</strong>
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
        </div>
      `,
    });

    // 5. Correo al CLIENTE (Con Iconos)
    const sendToClient = resend.emails.send({
      from: 'La Reserva <info@lareservabartending.com>',
      to: [email],
      subject: '¡Recibimos tu mensaje! - La Reserva',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; color: #333333; line-height: 1.6; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            
            <div style="background-color: #111111; padding: 30px 20px; text-align: center;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 26px; letter-spacing: 2px;">LA RESERVA</h1>
              <p style="color: #cccccc; margin: 5px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Bartending & Coctelería Premium</p>
            </div>

            <div style="padding: 40px 30px;">
              <p style="font-size: 18px; margin-top: 0;">Hola <strong>${name}</strong>,</p>
              
              <p>Gracias por escribirnos. Hemos recibido tu consulta sobre <strong>"${subject}"</strong> exitosamente.</p>
              
              <p>Nuestro equipo comercial ya está revisando tu solicitud. Nos pondremos en contacto contigo muy pronto (usualmente en menos de 24 horas) para brindarte toda la información para tu evento.</p>
              
              <div style="background-color: #f8f9fa; border-left: 4px solid #D4AF37; padding: 20px; margin: 30px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #666;">
                  <strong>Tu mensaje:</strong><br/>
                  <em style="color: #333;">"${message}"</em>
                </p>
              </div>

              <div style="text-align: center; margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 30px;">
                <p style="margin-bottom: 20px; font-weight: 600; color: #555;">Síguenos para inspiración y novedades:</p>
                
                <div style="display: inline-block;">
                  ${renderSocialIcon(socialLinks['social_facebook'], 'facebook')}
                  ${renderSocialIcon(socialLinks['social_instagram'], 'instagram')}
                  ${renderSocialIcon(socialLinks['social_tiktok'], 'tiktok')}
                </div>
              </div>
            </div>

            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #999999; border-top: 1px solid #e5e5e5;">
              <p style="margin: 5px 0;">© ${currentYear} La Reserva Bartending. Lima, Perú.</p>
              <p style="margin: 0;">Este es un correo automático, por favor no respondas directamente a esta dirección si no es necesario.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    // 6. Enviar
    const [adminResult, clientResult] = await Promise.all([sendToAdmin, sendToClient]);

    if (adminResult.error) {
      console.error('Error enviando al admin:', adminResult.error);
      throw new Error(adminResult.error.message);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error en el servidor:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
};