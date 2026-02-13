-- Adicionar valores faltantes ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operacao';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'user';