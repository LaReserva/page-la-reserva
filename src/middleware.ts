import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import { defineMiddleware } from 'astro:middleware';
import type { AstroCookieSetOptions } from 'astro';

// Tipos auxiliares para createServerClient
type CreateServerClientArgs = Parameters<typeof createServerClient>;
type ClientOptions = NonNullable<CreateServerClientArgs[2]>;
type CookiesHandler = NonNullable<ClientOptions['cookies']>;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, locals, redirect } = context;

  // 1. Filtro principal: Solo afecta rutas /admin
  if (url.pathname.startsWith('/admin')) {
    
    // Rutas públicas dentro de admin (Login, Recuperación)
    const publicAdminRoutes = ['/admin/login', '/admin/reset-password'];
    // Si es ruta pública, dejamos pasar sin revisar nada más
    if (publicAdminRoutes.some(route => url.pathname.startsWith(route))) return next();

    // 2. Configuración de Supabase (Igual que antes)
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
            // ✅ CORRECCIÓN CLAVE: Si no viene path, forzamos la raíz '/'
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

    // 3. Verificar Autenticación (¿Está logueado?)
    const { data: { user }, error } = await supabase.auth.getUser();


    // 🚨 LOGS DE DEBUG (Muévelos aquí arriba) 🚨
    if (url.pathname.startsWith('/admin/blog')) {
        console.log("--- DEBUG BLOG ---");
        console.log("Ruta:", url.pathname);
        console.log("User encontrado:", !!user);
        console.log("Error Supabase:", error?.message);
        console.log("Cookies recibidas:", request.headers.get('Cookie'));
        console.log("------------------");
    }
    if (!user || error) {
      return redirect('/admin/login');
    }

    // 4. Obtener Rol del Usuario
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!adminUser) {
      return redirect('/admin/login?error=unauthorized');
    }
  // 🚨 AGREGA ESTOS LOGS TEMPORALES 🚨
    console.log("--- DEBUG MIDDLEWARE ---");
    console.log("Ruta intentada:", url.pathname);
    console.log("Usuario ID:", user.id);
    console.log("Rol en DB:", adminUser.role);
    console.log("¿Es super_admin?:", adminUser.role === 'super_admin');
    console.log("Largo del string:", adminUser.role.length);
    console.log("------------------------");

    // Guardamos info en locals para usar en las páginas
    locals.user = user;
    locals.role = adminUser.role;

    // ============================================================
    // 5. CONTROL DE ACCESO POR ROLES (ACL - Access Control List)
    // ============================================================
    
    // Si es super_admin, tiene "Llave Maestra" (acceso total), no filtramos nada.
    if (adminUser.role !== 'super_admin') {
      const currentPath = url.pathname;

      // Definimos qué rutas base tiene permitidas cada rol.
      // Usamos 'starts with', así que '/admin/clientes' permite '/admin/clientes/editar/1'
      const rolePermissions: Record<string, string[]> = {
        sales: [
          '/admin/clientes', 
          '/admin/cotizaciones', 
          '/admin/eventos', 
          '/admin/perfil',
          '/admin/cocteles',
          '/admin/documentos',
          '/admin/correo',
          '/admin/testimonios'
        ],
        operations: [
          '/admin/eventos', 
          '/admin/contenido', 
          '/admin/perfil',
          '/admin/cocteles',
          '/admin/documentos',
          '/admin/testimonios',
          '/admin/blog'
        ],
      };

      const allowedRoutes = rolePermissions[adminUser.role] || [];

      // Validaciones:
      // A. El Dashboard (/admin o /admin/) siempre se permite para ver el resumen básico.
      const isDashboard = currentPath === '/admin' || currentPath === '/admin/';
      
      // B. Verificamos si la ruta actual empieza con alguna de las permitidas
      const isAllowed = allowedRoutes.some(route => currentPath.startsWith(route));

      // Si no es el dashboard Y no está en su lista permitida -> Bloqueamos
      if (!isDashboard && !isAllowed) {
        // Redirigimos al dashboard con un mensaje de error (opcional) o simplemente al home
        return redirect('/admin'); 
      }
    }
  }

  return next();
});