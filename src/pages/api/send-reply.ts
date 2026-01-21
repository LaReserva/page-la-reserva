// src/pages/api/send-reply.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabasePublic } from '@/lib/supabase';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. SEGURIDAD
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) return new Response(JSON.stringify({ error: 'Falta token' }), { status: 401 });

    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Sesión inválida' }), { status: 401 });

    // 2. DATOS
    const data = await request.json();
    const { id, toEmail, clientName, subject, replyMessage } = data;

    if (!id || !toEmail || !replyMessage) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    // 3. REDES SOCIALES
    const { data: settingsData } = await supabasePublic
      .from('site_settings')
      .select('key, value')
      .in('key', ['social_facebook', 'social_instagram', 'social_tiktok']);

    const socialLinks = settingsData?.reduce<Record<string, string>>((acc, curr) => {
      if (typeof curr.value === 'string') acc[curr.key] = curr.value;
      return acc;
    }, {}) || {};

    // --- HELPER DE ICONOS ---
    const renderSocialIcon = (url: string | undefined, platform: 'facebook' | 'instagram' | 'tiktok') => {
      if (!url || url.length < 5) return ''; 

      const iconUrls = {
        facebook: 'https://cdn-icons-png.flaticon.com/512/145/145802.png',
        instagram: 'https://cdn-icons-png.flaticon.com/512/3955/3955024.png',
        tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png'
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

    const currentYear = new Date().getFullYear();

    // 4. ENVIAR CORREO
    const emailResult = await resend.emails.send({
      from: 'La Reserva <info@lareservabartending.com>',
      to: [toEmail],
      replyTo: 'lareservabartending@gmail.com', // Respuestas van a tu Gmail
      subject: `Re: ${subject}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
          <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; color: #333; line-height: 1.6; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">
            
            <div style="background-color: #111; padding: 25px; text-align: center;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; letter-spacing: 2px;">LA RESERVA</h1>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px;">Hola <strong>${clientName}</strong>,</p>
              
              <div style="margin: 20px 0; color: #333; font-size: 15px;">
                ${replyMessage.replace(/\n/g, '<br/>')}
              </div>
              
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Atentamente,<br/>
                <strong style="color: #D4AF37;">El equipo de La Reserva</strong>
              </p>
            </div>

            <div style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="margin-bottom: 15px; font-weight: 600; color: #888; font-size: 13px;">Síguenos en nuestras redes:</p>
              
              <div style="margin-bottom: 20px;">
                ${renderSocialIcon(socialLinks['social_facebook'], 'facebook')}
                ${renderSocialIcon(socialLinks['social_instagram'], 'instagram')}
                ${renderSocialIcon(socialLinks['social_tiktok'], 'tiktok')}
              </div>

              <p style="font-size: 11px; color: #aaaaaa; margin: 0;">© ${currentYear} La Reserva Bartending.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (emailResult.error) throw new Error(emailResult.error.message);

    // 5. ACTUALIZAR ESTADO EN DB
    await supabaseAdmin
      .from('contact_messages')
      .update({ status: 'replied' })
      .eq('id', id);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
};