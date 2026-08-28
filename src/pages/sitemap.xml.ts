import { supabase } from '@/lib/supabase';

export const prerender = false;

export async function GET() {
  const siteUrl = 'https://lareservabartending.com';
  
  // Páginas públicas estáticas principales
  const staticPages = [
    '',
    '/servicios',
    '/experiencias',
    '/portafolio',
    '/nosotros',
    '/contacto',
    '/cotizacion',
    '/blog'
  ];

  // Obtener posts dinámicos del blog desde la base de datos
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at, created_at')
    .eq('published', true);

  const pagesXml = staticPages.map(page => `
    <url>
      <loc>${siteUrl}${page}</loc>
      <changefreq>weekly</changefreq>
      <priority>${page === '' ? '1.0' : '0.8'}</priority>
    </url>
  `).join('');

  const postsXml = posts ? posts.map(post => `
    <url>
      <loc>${siteUrl}/blog/${post.slug}</loc>
      <lastmod>${new Date(post.updated_at || post.created_at).toISOString()}</lastmod>
      <changefreq>monthly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('') : '';

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    ${pagesXml}
    ${postsXml}
  </urlset>`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
