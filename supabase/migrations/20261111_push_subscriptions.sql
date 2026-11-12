-- Migration: Crear tabla admin_push_subscriptions para Web Push Notifications
-- Ejecutar en el SQL Editor de Supabase

CREATE TABLE IF NOT EXISTS public.admin_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.admin_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad para administradores autenticados
CREATE POLICY "Admins can view their own push subscriptions"
    ON public.admin_push_subscriptions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert their own push subscriptions"
    ON public.admin_push_subscriptions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update their own push subscriptions"
    ON public.admin_push_subscriptions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can delete their own push subscriptions"
    ON public.admin_push_subscriptions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Índices de búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_admin_push_user_id ON public.admin_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_push_endpoint ON public.admin_push_subscriptions(endpoint);
