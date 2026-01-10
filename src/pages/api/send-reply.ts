// src/pages/api/send-reply.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { supabase as supabasePublic } from '@/lib/supabase'; // Cliente público para verificar token

const resend = new Resend(import.meta.env.RESEND_API_KEY);

// Cliente ADMIN (Solo se usará si la verificación pasa)
const supabaseAdmin = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. SEGURIDAD: Obtener el token del encabezado
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'No autorizado: Falta token' }), { status: 401 });
    }

    // 2. SEGURIDAD: Verificar que el token es válido con Supabase
    // Usamos el cliente PÚBLICO para esto (no gastamos poder de admin)
    const { data: { user }, error: authError } = await supabasePublic.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado: Sesión inválida' }), { status: 401 });
    }

    // --- AQUÍ EMPIEZA LA ZONA SEGURA ---
    // Si llegamos aquí, sabemos que es un usuario real logueado.
    
    const data = await request.json();
    const { id, toEmail, clientName, subject, replyMessage } = data;

    if (!id || !toEmail || !replyMessage) {
      return new Response(JSON.stringify({ error: 'Faltan datos' }), { status: 400 });
    }

    // 3. Lógica de Redes Sociales
    const { data: settingsData } = await supabasePublic
      .from('site_settings')
      .select('key, value')
      .in('key', ['social_facebook', 'social_instagram', 'social_tiktok']);

    const socialLinks = settingsData?.reduce<Record<string, string>>((acc, curr) => {
      if (typeof curr.value === 'string') acc[curr.key] = curr.value;
      return acc;
    }, {}) || {};

    const renderSocialButton = (url: string | undefined, label: string) => {
      if (!url || url.length < 5) return '';
      return `<a href="${url}" target="_blank" style="display:inline-block;background:#f3f4f6;color:#1a1a1a;padding:10px 20px;text-decoration:none;border-radius:5px;font-weight:bold;margin:0 5px;font-size:14px;border:1px solid #e5e7eb;">${label}</a>`;
    };

    const currentYear = new Date().getFullYear();

    // 4. Enviar Correo
    const emailResult = await resend.emails.send({
      from: 'La Reserva <info@lareservabartending.com>',
      to: [toEmail],
      replyTo: 'lareservabartending@gmail.com',
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <div style="background-color: #1a1a1a; padding: 20px; text-align: center;">
            <h1 style="color: #d97706; margin: 0;">LA RESERVA</h1>
          </div>
          <div style="padding: 30px 20px;">
            <p>Hola <strong>${clientName}</strong>,</p>
            <div style="white-space: pre-wrap; margin-bottom: 25px;">${replyMessage.replace(/\n/g, '<br/>')}</div>
            <p>Atentamente,<br/><strong>El equipo de La Reserva</strong></p>
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; text-align: center;">
              ${renderSocialButton(socialLinks['social_facebook'], 'Facebook')}
              ${renderSocialButton(socialLinks['social_instagram'], 'Instagram')}
              ${renderSocialButton(socialLinks['social_tiktok'], 'TikTok')}
            </div>
          </div>
          <div style="border-top: 1px solid #eee; padding: 20px; text-align: center; font-size: 12px; color: #999;">
            © ${currentYear} La Reserva Bartending.
          </div>
        </div>
      `,
    });

    if (emailResult.error) throw new Error(emailResult.error.message);

    // 5. Actualizar DB (Usando Admin Client, pero ahora es SEGURO porque verificamos al user)
    const { error: updateError } = await supabaseAdmin
      .from('contact_messages')
      .update({ status: 'replied' })
      .eq('id', id);

    if (updateError) console.error('Error DB:', updateError);

    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Error interno' }), { status: 500 });
  }
};