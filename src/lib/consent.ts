// src/lib/consent.ts
/**
 * Sistema de Gestión de Consentimiento de Cookies (CMP) - La Reserva Bartending
 * 
 * Cumplimiento de:
 * - Ley N° 29733 (Ley de Protección de Datos Personales de Perú) y su Reglamento D.S. 003-2013-JUS
 * - Principios internacionales de privacidad (GDPR / ePrivacy): consentimiento previo, libre, informado y revocable.
 * - Preparado para Google Consent Mode v2 y Meta Pixel (sin rastreadores activos en la fase actual).
 */

export const STORAGE_KEY = 'lr_cookie_consent_v1';
export const POLICY_VERSION = '1.0';
export const CONSENT_UPDATED_EVENT = 'lareserva:consent-updated';
export const OPEN_MODAL_EVENT = 'lareserva:open-cookie-modal';

export interface ConsentCategories {
  necessary: true; // Siempre activas (técnicas, seguridad, preferencias de privacidad)
  analytics: boolean; // Opcionales (Google Analytics cuando se integre)
  marketing: boolean; // Opcionales (Meta Pixel / Google Ads cuando se integren)
}

export type ConsentStatus = 'all_accepted' | 'all_rejected' | 'customized';

export interface ConsentRecord {
  categories: ConsentCategories;
  timestamp: string; // Fecha y hora ISO 8601 de la decisión
  policyVersion: string; // Versión de la política bajo la cual se dio consentimiento
  status: ConsentStatus;
}

/**
 * Obtiene el registro de consentimiento actual desde almacenamiento local de forma segura.
 */
export function getStoredConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    
    // Validar integridad mínima del registro
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.categories &&
      typeof parsed.categories.necessary === 'boolean'
    ) {
      return {
        ...parsed,
        categories: {
          necessary: true,
          analytics: Boolean(parsed.categories.analytics),
          marketing: Boolean(parsed.categories.marketing),
        },
      };
    }
  } catch (err) {
    console.warn('[Consent] Error leyendo localStorage:', err);
  }
  return null;
}

/**
 * Actualiza Google Consent Mode v2 en dataLayer si existe.
 */
export function applyGoogleConsentMode(categories: ConsentCategories): void {
  if (typeof window === 'undefined') return;

  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  function gtag(...args: any[]) {
    w.dataLayer.push(args);
  }

  // Google Consent Mode v2:
  // - analytics_storage: controla analítica
  // - ad_storage, ad_user_data, ad_personalization: controlan marketing y audiencias
  gtag('consent', 'update', {
    analytics_storage: categories.analytics ? 'granted' : 'denied',
    ad_storage: categories.marketing ? 'granted' : 'denied',
    ad_user_data: categories.marketing ? 'granted' : 'denied',
    ad_personalization: categories.marketing ? 'granted' : 'denied',
  });
}

/**
 * Dispara el evento personalizado en el DOM para notificar a futuros scripts y módulos.
 */
export function dispatchConsentEvent(record: ConsentRecord): void {
  if (typeof window === 'undefined') return;

  const event = new CustomEvent<ConsentRecord>(CONSENT_UPDATED_EVENT, {
    detail: record,
    bubbles: true,
  });
  window.dispatchEvent(event);

  // Hook preparado para Meta Pixel futuro
  const w = window as any;
  if (typeof w.fbq === 'function') {
    if (record.categories.marketing) {
      w.fbq('consent', 'grant');
    } else {
      w.fbq('consent', 'revoke');
    }
  }
}

/**
 * Guarda las preferencias de consentimiento seleccionadas por el usuario.
 */
export function saveConsent(
  preferences: { analytics: boolean; marketing: boolean },
  status: ConsentStatus
): ConsentRecord {
  const record: ConsentRecord = {
    categories: {
      necessary: true,
      analytics: Boolean(preferences.analytics),
      marketing: Boolean(preferences.marketing),
    },
    timestamp: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
    status,
  };

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (err) {
      console.warn('[Consent] No se pudo guardar en localStorage:', err);
    }

    applyGoogleConsentMode(record.categories);
    dispatchConsentEvent(record);
  }

  return record;
}

/**
 * Acepta todas las categorías.
 */
export function acceptAll(): ConsentRecord {
  return saveConsent({ analytics: true, marketing: true }, 'all_accepted');
}

/**
 * Rechaza todas las categorías opcionales (solo conserva las necesarias).
 */
export function rejectAll(): ConsentRecord {
  return saveConsent({ analytics: false, marketing: false }, 'all_rejected');
}

/**
 * Comprueba si una categoría específica tiene autorización expresa.
 */
export function hasConsent(category: keyof ConsentCategories): boolean {
  if (category === 'necessary') return true;
  const current = getStoredConsent();
  if (!current) return false;
  return Boolean(current.categories[category]);
}

/**
 * Abre el modal de configuración de preferencias de cookies.
 */
export function openConsentPreferences(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_MODAL_EVENT));
}
