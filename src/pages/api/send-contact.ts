export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { supabase } from '@/lib/supabase';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const { name, email, phone, subject, message } = data;
    
    const currentYear = new Date().getFullYear();

    // 1. Validaciones
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos obligatorios' }),
        { status: 400 }
      );
    }

    // 2. Obtener Redes Sociales de la DB
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['social_facebook', 'social_instagram', 'social_tiktok']);

    if (settingsError) console.error('Error leyendo configuración:', settingsError);

    const socialLinks = settingsData?.reduce<Record<string, string>>((acc, curr) => {
      if (typeof curr.value === 'string') acc[curr.key] = curr.value;
      return acc;
    }, {}) || {};

    // 3. Helper para Iconos
    const renderSocialIcon = (url: string | undefined, platform: 'facebook' | 'instagram' | 'tiktok') => {
      if (!url || url.length < 5) return ''; 
      const iconUrls = {
        facebook: 'https://cdn-icons-png.flaticon.com/512/145/145802.png',
        instagram: 'https://cdn-icons-png.flaticon.com/512/174/174855.png',
        tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png'
      };
      return `
        <a href="${url}" target="_blank" style="text-decoration: none; display: inline-block; margin: 0 10px;">
          <img src="${iconUrls[platform]}" alt="${platform}" width="32" height="32" style="display: block; border: 0;" />
        </a>
      `;
    };

    // 4. GUARDAR MENSAJE EN DATABASE PRIMERO (Para tener el registro)
    const { data: dbMessage, error: dbError } = await supabase
      .from('contact_messages')
      .insert([{
        name,
        email,
        phone,
        subject,
        message,
        status: 'new'
      }])
      .select()
      .single();

    if (dbError) throw dbError;

    // 5. Enviar Correo al ADMIN (Este genera el Message-ID original para el hilo)
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

    // 6. Enviar Correo de Confirmación al CLIENTE
    const sendToClient = resend.emails.send({
      from: 'La Reserva <info@lareservabartending.com>',
      to: [email],
      subject: '¡Recibimos tu mensaje! - La Reserva',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #111; padding: 30px; text-align: center;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 26px;">LA RESERVA</h1>
            </div>
            <div style="padding: 40px 30px;">
              <p>Hola <strong>${name}</strong>,</p>
              <p>Gracias por escribirnos. Hemos recibido tu consulta sobre <strong>"${subject}"</strong>.</p>
              <p>Nuestro equipo se pondrá en contacto contigo muy pronto para brindarte toda la información.</p>
              <div style="text-align: center; margin-top: 40px;">
                ${renderSocialIcon(socialLinks['social_facebook'], 'facebook')}
                ${renderSocialIcon(socialLinks['social_instagram'], 'instagram')}
                ${renderSocialIcon(socialLinks['social_tiktok'], 'tiktok')}
              </div>
            </div>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 11px; color: #999;">
              <p>© ${currentYear} La Reserva Bartending. Lima, Perú.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    const [adminResult] = await Promise.all([sendToAdmin, sendToClient]);

    // 7. ACTUALIZAR EL REGISTRO CON EL ID DE RESEND (Clave para el historial de Gmail)
    if (adminResult.data) {
      await supabase
        .from('contact_messages')
        .update({ resend_id: adminResult.data.id })
        .eq('id', dbMessage.id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error: any) {
    console.error('Error en el servidor:', error);
    return new Response(JSON.stringify({ error: error.message || 'Error interno' }), { status: 500 });
  }
};