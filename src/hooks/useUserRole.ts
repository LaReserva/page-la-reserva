// src/hooks/useUserRole.ts
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
          // Consultamos la base de datos
          const { data, error: dbError } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();

          if (dbError) throw dbError;

          // ✅ CORRECCIÓN: Casting explícito para evitar error de tipo 'never'
          const userData = data as { role: UserRole } | null;

          // VALIDACIÓN:
          // Usamos userData en lugar de data
          if (userData && isValidRole(userData.role)) {
            setRole(userData.role);
          } else {
            console.warn("⚠️ Usuario sin rol válido en admin_users");
            setRole(null); // Sin permisos
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

  return { 
    role, 
    loading, 
    error,
    isSuperAdmin: role === 'super_admin'
  };
}

// Helper para validar que el string que viene de la BD sea un rol real
function isValidRole(role: string): role is UserRole {
  // Tipamos el array como const para que includes funcione bien con literales
  const validRoles = ['super_admin', 'sales', 'operations'] as const;
  return validRoles.includes(role as any);
}