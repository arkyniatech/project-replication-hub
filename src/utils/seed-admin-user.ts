import { supabase } from "@/integrations/supabase/client";

const ADMIN_SEED_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seed-admin`;

export const seedAdminUser = async (): Promise<{
  success: boolean;
  message: string;
  user_id?: string;
  email?: string;
  role?: string;
}> => {
  try {
    console.log("🌱 Iniciando seed do usuário administrador...");

    // Verificar se estamos em ambiente de desenvolvimento
    if (import.meta.env.PROD) {
      throw new Error("Seed do admin só pode ser executado em ambiente de desenvolvimento");
    }

    // Chamar a Edge Function
    const response = await fetch(ADMIN_SEED_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Não precisa de Authorization pois a função não requer autenticação
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erro na resposta da Edge Function:", data);
      throw new Error(data.error || 'Erro desconhecido na Edge Function');
    }

    if (data.success) {
      console.log("✅ Seed do usuário admin concluído com sucesso!");
      console.log(`👤 User ID: ${data.user_id}`);
      console.log(`📧 Email: ${data.email || 'admin@locacaoerp.com'}`);
      console.log(`🔑 Role: ${data.role || 'admin'}`);
      console.log("🔒 Senha: Admin123!@#");
    } else {
      console.log("⚠️", data.message);
    }

    return data;

  } catch (error) {
    console.error("❌ Erro ao executar seed do admin:", error);
    throw error;
  }
};