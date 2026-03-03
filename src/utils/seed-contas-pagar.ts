// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";

// Categorias padrão do Plano de Contas N2
const CATEGORIAS_PADRAO = [
  // Despesas Operacionais
  { codigo: "A5.01", descricao: "Aluguel", tipo: "DESPESA" as const, nivel_1: "A5 - Despesas Operacionais" },
  { codigo: "A5.02", descricao: "Energia Elétrica", tipo: "DESPESA" as const, nivel_1: "A5 - Despesas Operacionais" },
  { codigo: "A5.03", descricao: "Água e Esgoto", tipo: "DESPESA" as const, nivel_1: "A5 - Despesas Operacionais" },
  { codigo: "A5.04", descricao: "Telefone e Internet", tipo: "DESPESA" as const, nivel_1: "A5 - Despesas Operacionais" },
  { codigo: "A5.05", descricao: "Material de Escritório", tipo: "DESPESA" as const, nivel_1: "A5 - Despesas Operacionais" },
  { codigo: "A5.06", descricao: "Material de Limpeza", tipo: "DESPESA" as const, nivel_1: "A5 - Despesas Operacionais" },
  
  // Despesas com Pessoal
  { codigo: "B1.01", descricao: "Salários", tipo: "DESPESA" as const, nivel_1: "B1 - Despesas com Pessoal" },
  { codigo: "B1.02", descricao: "Encargos Sociais", tipo: "DESPESA" as const, nivel_1: "B1 - Despesas com Pessoal" },
  { codigo: "B1.03", descricao: "Vale Transporte", tipo: "DESPESA" as const, nivel_1: "B1 - Despesas com Pessoal" },
  { codigo: "B1.04", descricao: "Vale Alimentação", tipo: "DESPESA" as const, nivel_1: "B1 - Despesas com Pessoal" },
  
  // Manutenção de Equipamentos
  { codigo: "C2.01", descricao: "Manutenção Preventiva", tipo: "DESPESA" as const, nivel_1: "C2 - Manutenção" },
  { codigo: "C2.02", descricao: "Manutenção Corretiva", tipo: "DESPESA" as const, nivel_1: "C2 - Manutenção" },
  { codigo: "C2.03", descricao: "Peças e Acessórios", tipo: "DESPESA" as const, nivel_1: "C2 - Manutenção" },
  
  // Despesas Administrativas
  { codigo: "D3.01", descricao: "Serviços Contábeis", tipo: "DESPESA" as const, nivel_1: "D3 - Administrativo" },
  { codigo: "D3.02", descricao: "Serviços Jurídicos", tipo: "DESPESA" as const, nivel_1: "D3 - Administrativo" },
  { codigo: "D3.03", descricao: "Licenças e Softwares", tipo: "DESPESA" as const, nivel_1: "D3 - Administrativo" },
  
  // Tributos
  { codigo: "E4.01", descricao: "ISS", tipo: "DESPESA" as const, nivel_1: "E4 - Tributos" },
  { codigo: "E4.02", descricao: "PIS/COFINS", tipo: "DESPESA" as const, nivel_1: "E4 - Tributos" },
  { codigo: "E4.03", descricao: "IRPJ/CSLL", tipo: "DESPESA" as const, nivel_1: "E4 - Tributos" },
];

// Contas financeiras padrão
const gerarContasPadrao = (lojaId: string) => [
  {
    loja_id: lojaId,
    codigo: "001",
    nome: "Banco - Conta Corrente Principal",
    banco: "Banco do Brasil",
    agencia: "1234-5",
    numero: "12345-6",
    tipo: "BANCO" as const,
    moeda: "BRL",
    saldo_atual: 50000.00,
    ativo: true,
  },
  {
    loja_id: lojaId,
    codigo: "002",
    nome: "Caixa Geral",
    tipo: "CAIXA" as const,
    moeda: "BRL",
    saldo_atual: 5000.00,
    ativo: true,
  },
  {
    loja_id: lojaId,
    codigo: "003",
    nome: "Cartão Corporativo",
    banco: "Nubank",
    tipo: "CARTAO" as const,
    moeda: "BRL",
    saldo_atual: 0,
    ativo: true,
  },
];

export const seedContasPagar = async () => {
  try {
    console.log("🌱 Iniciando seed de Contas a Pagar...");

    // 1. Verificar se usuário está autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Usuário não autenticado");
    }

    // 2. Buscar lojas do usuário
    const { data: lojasPermitidas } = await supabase
      .from("user_lojas_permitidas")
      .select("loja_id")
      .eq("user_id", user.id);

    if (!lojasPermitidas || lojasPermitidas.length === 0) {
      throw new Error("Usuário não possui lojas permitidas");
    }

    const lojaId = lojasPermitidas[0].loja_id;

    // 3. Seed de Categorias N2
    console.log("📋 Inserindo categorias...");
    const { error: categoriasError } = await supabase
      .from("categorias_n2")
      .upsert(CATEGORIAS_PADRAO, { onConflict: "codigo", ignoreDuplicates: true });

    if (categoriasError) {
      console.error("Erro ao inserir categorias:", categoriasError);
    } else {
      console.log("✅ Categorias inseridas com sucesso!");
    }

    // 4. Seed de Contas Financeiras
    console.log("💰 Inserindo contas financeiras...");
    const contasPadrao = gerarContasPadrao(lojaId);
    
    const { error: contasError } = await supabase
      .from("contas_financeiras")
      .upsert(contasPadrao, { onConflict: "loja_id,codigo", ignoreDuplicates: true });

    if (contasError) {
      console.error("Erro ao inserir contas:", contasError);
    } else {
      console.log("✅ Contas financeiras inseridas com sucesso!");
    }

    // 5. Buscar fornecedores existentes
    const { data: fornecedores } = await supabase
      .from("fornecedores")
      .select("id")
      .eq("ativo", true)
      .limit(3);

    if (!fornecedores || fornecedores.length === 0) {
      console.log("⚠️ Nenhum fornecedor encontrado. Pulando seed de títulos.");
      return;
    }

    console.log("✅ Seed de Contas a Pagar concluído com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao executar seed:", error);
    throw error;
  }
};
