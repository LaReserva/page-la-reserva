import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

export function useUserRole() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (user) {
          const { data, error: dbError } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (dbError) throw dbError;

          const userData = data as { role: UserRole } | null;

          if (userData && isValidRole(userData.role)) {
            setRole(userData.role);
          } else {
            console.warn("⚠️ Usuario sin rol válido en admin_users");
            setRole(null);
          }
        }
      } catch (err: any) {
        console.error("❌ Error en useUserRole:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, []);

  // ✅ AQUÍ ESTÁ EL CAMBIO: Agregamos isOperations e isSales
  return { 
    role, 
    loading, 
    error,
    isSuperAdmin: role === 'super_admin',
    isOperations: role === 'operations', // <--- Agregado
    isSales: role === 'sales'            // <--- Agregado (por si acaso)
  };
}

function isValidRole(role: string): role is UserRole {
  const validRoles = ['super_admin', 'sales', 'operations'] as const;
  return validRoles.includes(role as any);
}