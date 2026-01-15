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
    
    // ✅ 1. Obtener el año actual dinámicamente
    const currentYear = new Date().getFullYear();

    // 2. Validaciones básicas
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400 }
      );
    }

    // 3. Obtener Redes Sociales desde Supabase
    // Usamos los nombres exactos que vimos en tu base de datos
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['social_facebook', 'social_instagram', 'social_tiktok']);

    if (settingsError) {
      console.error('Error leyendo configuración:', settingsError);
    }

    // Convertimos a objeto { social_facebook: 'url...', ... }
    const socialLinks = settingsData?.reduce<Record<string, string>>((acc, curr) => {
      // Verificamos que el valor sea texto para evitar errores
      if (typeof curr.value === 'string') {
        acc[curr.key] = curr.value;
      }
      return acc;
    }, {}) || {};

    // Helper para generar los botones HTML
    const renderSocialButton = (url: string | undefined, label: string) => {
      if (!url || url.length < 5) return ''; // Si no hay URL o es muy corta, no mostramos el botón
      return `
        <a href="${url}" target="_blank" style="display: inline-block; background-color: #f3f4f6; color: #1a1a1a; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 0 5px; font-size: 14px; border: 1px solid #e5e7eb;">
          ${label}
        </a>
      `;
    };

    // 4. Configurar Correo al ADMIN (Tú)
    const sendToAdmin = resend.emails.send({
      from: 'La Reserva Web <info@lareservabartending.com>',
      to: ['lareservabartending@gmail.com'], // ⚠️ RECUERDA: Cambia esto por tu email real
      replyTo: email,
      subject: `Nuevo Contacto: ${subject}`,
      html: `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #D4AF37;">Nuevo Lead Recibido</h2>
          <p><strong>De:</strong> ${name} (${email})</p>
          <p><strong>Teléfono:</strong> ${phone || 'No especificado'}</p>
          <hr />
          <h3>Mensaje:</h3>
          <p>${message}</p>
        </div>
      `,
    });

    // 5. Configurar Correo al CLIENTE (Respuesta Automática)
    const sendToClient = resend.emails.send({
      from: 'La Reserva <info@lareservabartending.com>',
      to: [email],
      subject: '¡Hemos recibido tu mensaje! - La Reserva',
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; color: #333333; line-height: 1.6;">
          
          <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
            <h1 style="color: #D4AF37; margin: 0; font-size: 24px;">LA RESERVA</h1>
            <p style="color: #ffffff; margin: 5px 0 0; font-size: 14px;">Bartending & Coctelería</p>
          </div>

          <div style="padding: 30px 20px;">
            <p style="font-size: 18px;">Hola <strong>${name}</strong>,</p>
            
            <p>Muchas gracias por contactarnos. Hemos recibido tu consulta sobre <strong>"${subject}"</strong> correctamente.</p>
            
            <p>Nuestro equipo ya está revisando tu mensaje y nos pondremos en contacto contigo a la brevedad posible para conversar sobre los detalles de tu evento.</p>
            
            <div style="background-color: #f9fafb; border-left: 4px solid #D4AF37; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #555;">
                <strong>Tu mensaje:</strong><br/>
                "${message}"
              </p>
            </div>

            <p>Mientras tanto, te invitamos a revisar nuestras redes sociales para ver nuestros últimos eventos.</p>

            <div style="text-align: center;">
              <p style="margin-bottom: 20px; font-weight: 600;">Síguenos para ver nuestros últimos eventos:</p>
              
              ${renderSocialButton(socialLinks['social_facebook'], 'Facebook')}
              ${renderSocialButton(socialLinks['social_instagram'], 'Instagram')}
              ${renderSocialButton(socialLinks['social_tiktok'], 'TikTok')}
              
            </div>
          </div>

          <div style="border-top: 1px solid #eeeeee; padding: 20px; text-align: center; font-size: 12px; color: #999999; margin-top: 20px;">
            <p>© ${currentYear} La Reserva Bartending. Todos los derechos reservados.</p>
          </div>
        </div>
      `,
    });

    // 6. Enviar ambos correos
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