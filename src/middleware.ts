import { defineMiddleware } from 'astro:middleware';

// Nota: Mantenemos los imports por si en el futuro agregas API endpoints (SSR),
// pero por ahora no se ejecutarán en las páginas estáticas.
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { AstroCookieSetOptions } from 'astro';

// Tipos auxiliares
type CreateServerClientArgs = Parameters<typeof createServerClient>;
type ClientOptions = NonNullable<CreateServerClientArgs[2]>;
type CookiesHandler = NonNullable<ClientOptions['cookies']>;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, locals, redirect } = context;

  // 1. Filtro principal: Rutas /admin
  if (url.pathname.startsWith('/admin')) {
    
    // ✅ MODIFICACIÓN CLAVE PARA APP SHELL (Modo Estático):
    // Como las páginas ahora son estáticas (prerender = true), el servidor NO debe
    // intentar leer cookies ni bloquear la petición. Debe entregar el HTML
    // inmediatamente para que sea rápido.
    
    // La seguridad ahora la manejan:
    // 1. El <script> de protección en cada archivo .astro (Redirección visual).
    // 2. Las políticas RLS de Supabase (Seguridad de datos real).
    
    return next();

    /* -----------------------------------------------------------------------
       BLOQUE DESACTIVADO (CÓDIGO LEGACY SSR)
       Se comenta para evitar el error: "Astro.request.headers is not available on prerendered pages"
       y evitar el bucle infinito de redirecciones.
    ----------------------------------------------------------------------- */
    
    /*
    const publicAdminRoutes = ['/admin/login', '/admin/reset-password'];
    if (publicAdminRoutes.some(route => url.pathname.startsWith(route))) return next();

    const cookieAdapter: CookiesHandler = {
      getAll() {
        const parsed = parseCookieHeader(request.headers.get('Cookie') ?? '');
        return parsed.map((cookie) => ({
          name: cookie.name,
          value: cookie.value ?? '',
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          const astroOptions: AstroCookieSetOptions = {
            path: options.path ?? '/', 
            domain: options.domain,
            maxAge: options.maxAge,
            httpOnly: options.httpOnly,
            secure: options.secure,
            sameSite: options.sameSite as AstroCookieSetOptions['sameSite'],
          };
          if (options.expires) astroOptions.expires = new Date(options.expires);
          context.cookies.set(name, value, astroOptions);
        });
      },
    };

    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      { cookies: cookieAdapter }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (!user || error) {
      return redirect('/admin/login');
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminUser) {
      return redirect('/admin/login?error=unauthorized');
    }

    locals.user = user;
    locals.role = adminUser.role;

    // Lógica de Roles (ACL)
    if (adminUser.role !== 'super_admin') {
      const currentPath = url.pathname;
      const rolePermissions: Record<string, string[]> = {
        sales: ['/admin/clientes', '/admin/cotizaciones', '/admin/eventos', '/admin/perfil', '/admin/cocteles', '/admin/documentos', '/admin/correo', '/admin/testimonios'],
        operations: ['/admin/eventos', '/admin/contenido', '/admin/perfil', '/admin/cocteles', '/admin/documentos', '/admin/testimonios', '/admin/blog'],
      };
      const allowedRoutes = rolePermissions[adminUser.role] || [];
      const isDashboard = currentPath === '/admin' || currentPath === '/admin/';
      const isAllowed = allowedRoutes.some(route => currentPath.startsWith(route));

      if (!isDashboard && !isAllowed) {
        return redirect('/admin'); 
      }
    }
    */
  }

  return next();
});