export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      aditivos_contratuais: {
        Row: {
          atualizado_em: string | null
          contrato_id: string
          criado_em: string | null
          criado_por: string | null
          descricao: string
          fatura_id: string | null
          faturado: boolean | null
          id: string
          item_id: string | null
          justificativa: string | null
          loja_id: string
          numero: string
          status: string
          tipo: string
          valor: number
          vinculacao: string
        }
        Insert: {
          atualizado_em?: string | null
          contrato_id: string
          criado_em?: string | null
          criado_por?: string | null
          descricao: string
          fatura_id?: string | null
          faturado?: boolean | null
          id?: string
          item_id?: string | null
          justificativa?: string | null
          loja_id: string
          numero: string
          status?: string
          tipo: string
          valor?: number
          vinculacao?: string
        }
        Update: {
          atualizado_em?: string | null
          contrato_id?: string
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string
          fatura_id?: string | null
          faturado?: boolean | null
          id?: string
          item_id?: string | null
          justificativa?: string | null
          loja_id?: string
          numero?: string
          status?: string
          tipo?: string
          valor?: number
          vinculacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "aditivos_contratuais_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aditivos_contratuais_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      aprovacoes_cp: {
        Row: {
          created_at: string | null
          historico: Json | null
          id: string
          nivel: Database["public"]["Enums"]["nivel_aprovacao"]
          status: Database["public"]["Enums"]["status_aprovacao"] | null
          titulo_id: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          historico?: Json | null
          id?: string
          nivel: Database["public"]["Enums"]["nivel_aprovacao"]
          status?: Database["public"]["Enums"]["status_aprovacao"] | null
          titulo_id: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          historico?: Json | null
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_aprovacao"]
          status?: Database["public"]["Enums"]["status_aprovacao"] | null
          titulo_id?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "aprovacoes_cp_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_sistema: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          prioridade: number
          texto: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          prioridade?: number
          texto: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          prioridade?: number
          texto?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      budget_metas: {
        Row: {
          categoria_codigo: string
          created_at: string | null
          created_by: string | null
          id: string
          loja_id: string
          meta: number
          observacoes: string | null
          periodo: string
          updated_at: string | null
        }
        Insert: {
          categoria_codigo: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id: string
          meta: number
          observacoes?: string | null
          periodo: string
          updated_at?: string | null
        }
        Update: {
          categoria_codigo?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id?: string
          meta?: number
          observacoes?: string | null
          periodo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_metas_categoria_codigo_fkey"
            columns: ["categoria_codigo"]
            isOneToOne: false
            referencedRelation: "categorias_n2"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "budget_metas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      caixa: {
        Row: {
          aberto_em: string
          created_at: string
          data_iso: string
          fechamento: Json | null
          id: string
          loja_id: string
          observacao_abertura: string | null
          saldo_inicial: number
          status: Database["public"]["Enums"]["status_caixa"]
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          aberto_em?: string
          created_at?: string
          data_iso: string
          fechamento?: Json | null
          id?: string
          loja_id: string
          observacao_abertura?: string | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["status_caixa"]
          updated_at?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          aberto_em?: string
          created_at?: string
          data_iso?: string
          fechamento?: Json | null
          id?: string
          loja_id?: string
          observacao_abertura?: string | null
          saldo_inicial?: number
          status?: Database["public"]["Enums"]["status_caixa"]
          updated_at?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixa_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_n2: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          nivel_1: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          nivel_1: string
          tipo: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          nivel_1?: string
          tipo?: Database["public"]["Enums"]["tipo_categoria"]
          updated_at?: string | null
        }
        Relationships: []
      }
      centros_custo: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          loja_id: string | null
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          loja_id?: string | null
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          loja_id?: string | null
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          itens: Json
          modelo_id: string | null
          tipo: Database["public"]["Enums"]["tipo_os"]
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          itens?: Json
          modelo_id?: string | null
          tipo: Database["public"]["Enums"]["tipo_os"]
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          itens?: Json
          modelo_id?: string | null
          tipo?: Database["public"]["Enums"]["tipo_os"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          aceite_lgpd: boolean | null
          anexos: Json | null
          ativo: boolean
          cnpj: string | null
          contato_principal_id: string | null
          contatos: Json | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_aceite_lgpd: string | null
          data_nascimento: string | null
          endereco: Json | null
          id: string
          inadimplente: boolean | null
          inscricao_estadual: string | null
          isento_ie: boolean | null
          loja_id: string
          nome: string | null
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string | null
          rg: string | null
          status_credito: string
          tipo: string
          updated_at: string
        }
        Insert: {
          aceite_lgpd?: boolean | null
          anexos?: Json | null
          ativo?: boolean
          cnpj?: string | null
          contato_principal_id?: string | null
          contatos?: Json | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_aceite_lgpd?: string | null
          data_nascimento?: string | null
          endereco?: Json | null
          id?: string
          inadimplente?: boolean | null
          inscricao_estadual?: string | null
          isento_ie?: boolean | null
          loja_id: string
          nome?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          rg?: string | null
          status_credito?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          aceite_lgpd?: boolean | null
          anexos?: Json | null
          ativo?: boolean
          cnpj?: string | null
          contato_principal_id?: string | null
          contatos?: Json | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_aceite_lgpd?: string | null
          data_nascimento?: string | null
          endereco?: Json | null
          id?: string
          inadimplente?: boolean | null
          inscricao_estadual?: string | null
          isento_ie?: boolean | null
          loja_id?: string
          nome?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string | null
          rg?: string | null
          status_credito?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      cobrancas_inter: {
        Row: {
          codigo_barras: string | null
          codigo_solicitacao: string | null
          created_at: string | null
          created_by: string | null
          history: Json | null
          id: string
          idempotency_key: string
          linha_digitavel: string | null
          loja_id: string
          pdf_url: string | null
          pix_copia_cola: string | null
          qr_code_data_url: string | null
          status: string
          titulo_id: string
          updated_at: string | null
        }
        Insert: {
          codigo_barras?: string | null
          codigo_solicitacao?: string | null
          created_at?: string | null
          created_by?: string | null
          history?: Json | null
          id?: string
          idempotency_key: string
          linha_digitavel?: string | null
          loja_id: string
          pdf_url?: string | null
          pix_copia_cola?: string | null
          qr_code_data_url?: string | null
          status?: string
          titulo_id: string
          updated_at?: string | null
        }
        Update: {
          codigo_barras?: string | null
          codigo_solicitacao?: string | null
          created_at?: string | null
          created_by?: string | null
          history?: Json | null
          id?: string
          idempotency_key?: string
          linha_digitavel?: string | null
          loja_id?: string
          pdf_url?: string | null
          pix_copia_cola?: string | null
          qr_code_data_url?: string | null
          status?: string
          titulo_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_inter_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_avisos_header: {
        Row: {
          animacao: boolean
          created_at: string
          exibir_logo: boolean
          id: string
          tempo_rotacao: number
          updated_at: string
        }
        Insert: {
          animacao?: boolean
          created_at?: string
          exibir_logo?: boolean
          id?: string
          tempo_rotacao?: number
          updated_at?: string
        }
        Update: {
          animacao?: boolean
          created_at?: string
          exibir_logo?: boolean
          id?: string
          tempo_rotacao?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_financeiro: {
        Row: {
          arredondamento: number | null
          carencia_dias: number | null
          cc_padrao_por_categoria: Json | null
          chave_pix: string | null
          contas_bancarias: Json | null
          created_at: string | null
          forma_preferencial: string | null
          formas_ativas: Json | null
          id: string
          instrucao_transferencia: string | null
          juros_dia_percent: number | null
          loja_id: string
          mensagem_cobranca_padrao: string | null
          mensagem_padrao: string | null
          mostrar_linha_boleto: boolean | null
          mostrar_na_fatura: boolean | null
          mostrar_qr_pix: boolean | null
          multa_percent: number | null
          ordem_exibicao: Json | null
          tipo_padrao_fatura: string | null
          updated_at: string | null
          vencimento_padrao_dias: number | null
        }
        Insert: {
          arredondamento?: number | null
          carencia_dias?: number | null
          cc_padrao_por_categoria?: Json | null
          chave_pix?: string | null
          contas_bancarias?: Json | null
          created_at?: string | null
          forma_preferencial?: string | null
          formas_ativas?: Json | null
          id?: string
          instrucao_transferencia?: string | null
          juros_dia_percent?: number | null
          loja_id: string
          mensagem_cobranca_padrao?: string | null
          mensagem_padrao?: string | null
          mostrar_linha_boleto?: boolean | null
          mostrar_na_fatura?: boolean | null
          mostrar_qr_pix?: boolean | null
          multa_percent?: number | null
          ordem_exibicao?: Json | null
          tipo_padrao_fatura?: string | null
          updated_at?: string | null
          vencimento_padrao_dias?: number | null
        }
        Update: {
          arredondamento?: number | null
          carencia_dias?: number | null
          cc_padrao_por_categoria?: Json | null
          chave_pix?: string | null
          contas_bancarias?: Json | null
          created_at?: string | null
          forma_preferencial?: string | null
          formas_ativas?: Json | null
          id?: string
          instrucao_transferencia?: string | null
          juros_dia_percent?: number | null
          loja_id?: string
          mensagem_cobranca_padrao?: string | null
          mensagem_padrao?: string | null
          mostrar_linha_boleto?: boolean | null
          mostrar_na_fatura?: boolean | null
          mostrar_qr_pix?: boolean | null
          multa_percent?: number | null
          ordem_exibicao?: Json | null
          tipo_padrao_fatura?: string | null
          updated_at?: string | null
          vencimento_padrao_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "config_financeiro_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_locacao: {
        Row: {
          acao_rapida_equip: boolean | null
          arredondamento: number | null
          bloqueios: Json | null
          checklist: Json | null
          comprovante_digital: boolean | null
          created_at: string | null
          devolucao: Json | null
          devolucao_fatura: boolean | null
          exigir_foto_laudo: boolean | null
          faturamento_parcial: Json | null
          frete_por_zona: Json | null
          id: string
          janelas: Json | null
          juros_dia_percent: number | null
          loja_id: string
          motivos_parada: Json | null
          multa_percent: number | null
          prazo_min_horas: number | null
          prorata_metodo: string | null
          quita_desbloqueio: boolean | null
          recebimento_foca_caixa: boolean | null
          renovacao: Json | null
          renovacao_aviso: boolean | null
          responsavel_obrigatorio: boolean | null
          snackbar_proximo_passo: boolean | null
          status_manutencao: Json | null
          substituicao: Json | null
          tolerancia_fim_min: number | null
          tolerancia_inicio_min: number | null
          transicoes: Json | null
          updated_at: string | null
        }
        Insert: {
          acao_rapida_equip?: boolean | null
          arredondamento?: number | null
          bloqueios?: Json | null
          checklist?: Json | null
          comprovante_digital?: boolean | null
          created_at?: string | null
          devolucao?: Json | null
          devolucao_fatura?: boolean | null
          exigir_foto_laudo?: boolean | null
          faturamento_parcial?: Json | null
          frete_por_zona?: Json | null
          id?: string
          janelas?: Json | null
          juros_dia_percent?: number | null
          loja_id: string
          motivos_parada?: Json | null
          multa_percent?: number | null
          prazo_min_horas?: number | null
          prorata_metodo?: string | null
          quita_desbloqueio?: boolean | null
          recebimento_foca_caixa?: boolean | null
          renovacao?: Json | null
          renovacao_aviso?: boolean | null
          responsavel_obrigatorio?: boolean | null
          snackbar_proximo_passo?: boolean | null
          status_manutencao?: Json | null
          substituicao?: Json | null
          tolerancia_fim_min?: number | null
          tolerancia_inicio_min?: number | null
          transicoes?: Json | null
          updated_at?: string | null
        }
        Update: {
          acao_rapida_equip?: boolean | null
          arredondamento?: number | null
          bloqueios?: Json | null
          checklist?: Json | null
          comprovante_digital?: boolean | null
          created_at?: string | null
          devolucao?: Json | null
          devolucao_fatura?: boolean | null
          exigir_foto_laudo?: boolean | null
          faturamento_parcial?: Json | null
          frete_por_zona?: Json | null
          id?: string
          janelas?: Json | null
          juros_dia_percent?: number | null
          loja_id?: string
          motivos_parada?: Json | null
          multa_percent?: number | null
          prazo_min_horas?: number | null
          prorata_metodo?: string | null
          quita_desbloqueio?: boolean | null
          recebimento_foca_caixa?: boolean | null
          renovacao?: Json | null
          renovacao_aviso?: boolean | null
          responsavel_obrigatorio?: boolean | null
          snackbar_proximo_passo?: boolean | null
          status_manutencao?: Json | null
          substituicao?: Json | null
          tolerancia_fim_min?: number | null
          tolerancia_inicio_min?: number | null
          transicoes?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_locacao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_numeracao: {
        Row: {
          bloqueado_apos_uso: boolean | null
          created_at: string | null
          id: string
          loja_id: string
          por_unidade: boolean | null
          prefixo: string
          primeiro_uso_em: string | null
          reset_contador: string | null
          template: string
          tipo: string
          updated_at: string | null
        }
        Insert: {
          bloqueado_apos_uso?: boolean | null
          created_at?: string | null
          id?: string
          loja_id: string
          por_unidade?: boolean | null
          prefixo: string
          primeiro_uso_em?: string | null
          reset_contador?: string | null
          template: string
          tipo: string
          updated_at?: string | null
        }
        Update: {
          bloqueado_apos_uso?: boolean | null
          created_at?: string | null
          id?: string
          loja_id?: string
          por_unidade?: boolean | null
          prefixo?: string
          primeiro_uso_em?: string | null
          reset_contador?: string | null
          template?: string
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_numeracao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_organizacao: {
        Row: {
          cnpj: string
          cores: Json | null
          created_at: string | null
          email_fiscal: string | null
          endereco: Json | null
          id: string
          inscricao_estadual: string | null
          isento_ie: boolean | null
          logo_url: string | null
          loja_id: string
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj: string
          cores?: Json | null
          created_at?: string | null
          email_fiscal?: string | null
          endereco?: Json | null
          id?: string
          inscricao_estadual?: string | null
          isento_ie?: boolean | null
          logo_url?: string | null
          loja_id: string
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string
          cores?: Json | null
          created_at?: string | null
          email_fiscal?: string | null
          endereco?: Json | null
          id?: string
          inscricao_estadual?: string | null
          isento_ie?: boolean | null
          logo_url?: string | null
          loja_id?: string
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_organizacao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_seguranca: {
        Row: {
          created_at: string | null
          dois_fatores: boolean | null
          exigir_aceite_lgpd: boolean | null
          id: string
          loja_id: string
          politica_senha: string | null
          sessao_minutos: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dois_fatores?: boolean | null
          exigir_aceite_lgpd?: boolean | null
          id?: string
          loja_id: string
          politica_senha?: string | null
          sessao_minutos?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dois_fatores?: boolean | null
          exigir_aceite_lgpd?: boolean | null
          id?: string
          loja_id?: string
          politica_senha?: string | null
          sessao_minutos?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "config_seguranca_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      contadores_documentos: {
        Row: {
          chave_contador: string
          contador_atual: number
          created_at: string
          id: string
          loja_id: string
          tipo: string
          ultimo_uso: string | null
          updated_at: string
        }
        Insert: {
          chave_contador: string
          contador_atual?: number
          created_at?: string
          id?: string
          loja_id: string
          tipo: string
          ultimo_uso?: string | null
          updated_at?: string
        }
        Update: {
          chave_contador?: string
          contador_atual?: number
          created_at?: string
          id?: string
          loja_id?: string
          tipo?: string
          ultimo_uso?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contadores_documentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_financeiras: {
        Row: {
          agencia: string | null
          ativo: boolean | null
          banco: string | null
          bloqueios: number | null
          codigo: string
          created_at: string | null
          id: string
          loja_id: string
          moeda: string | null
          nome: string
          numero: string | null
          saldo_atual: number | null
          tipo: Database["public"]["Enums"]["tipo_conta_financeira"]
          updated_at: string | null
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          bloqueios?: number | null
          codigo: string
          created_at?: string | null
          id?: string
          loja_id: string
          moeda?: string | null
          nome: string
          numero?: string | null
          saldo_atual?: number | null
          tipo: Database["public"]["Enums"]["tipo_conta_financeira"]
          updated_at?: string | null
        }
        Update: {
          agencia?: string | null
          ativo?: boolean | null
          banco?: string | null
          bloqueios?: number | null
          codigo?: string
          created_at?: string | null
          id?: string
          loja_id?: string
          moeda?: string | null
          nome?: string
          numero?: string | null
          saldo_atual?: number | null
          tipo?: Database["public"]["Enums"]["tipo_conta_financeira"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_financeiras_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      contrato_itens: {
        Row: {
          contrato_id: string
          controle: string
          created_at: string
          data_devolucao: string | null
          data_locacao: string | null
          equipamento_id: string | null
          grupo_id: string | null
          id: string
          modelo_id: string | null
          observacoes: string | null
          periodo: string
          preco_total: number
          preco_unitario: number
          quantidade: number
          status: string
          updated_at: string
        }
        Insert: {
          contrato_id: string
          controle: string
          created_at?: string
          data_devolucao?: string | null
          data_locacao?: string | null
          equipamento_id?: string | null
          grupo_id?: string | null
          id?: string
          modelo_id?: string | null
          observacoes?: string | null
          periodo: string
          preco_total: number
          preco_unitario: number
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string
          controle?: string
          created_at?: string
          data_devolucao?: string | null
          data_locacao?: string | null
          equipamento_id?: string | null
          grupo_id?: string | null
          id?: string
          modelo_id?: string | null
          observacoes?: string | null
          periodo?: string
          preco_total?: number
          preco_unitario?: number
          quantidade?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contrato_itens_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_itens_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_itens_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_depreciacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_itens_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contrato_itens_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          ativo: boolean
          cliente_id: string
          condicoes_pagamento: Json | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          data_prevista_fim: string | null
          documentos: Json | null
          forma_pagamento: string | null
          id: string
          logistica: Json | null
          loja_id: string
          numero: string
          obra_id: string | null
          observacoes: string | null
          observacoes_internas: string | null
          status: string
          timeline: Json | null
          updated_at: string
          valor_pago: number
          valor_pendente: number
          valor_total: number
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          condicoes_pagamento?: Json | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          data_prevista_fim?: string | null
          documentos?: Json | null
          forma_pagamento?: string | null
          id?: string
          logistica?: Json | null
          loja_id: string
          numero: string
          obra_id?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          status?: string
          timeline?: Json | null
          updated_at?: string
          valor_pago?: number
          valor_pendente?: number
          valor_total?: number
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          condicoes_pagamento?: Json | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_prevista_fim?: string | null
          documentos?: Json | null
          forma_pagamento?: string | null
          id?: string
          logistica?: Json | null
          loja_id?: string
          numero?: string
          obra_id?: string | null
          observacoes?: string | null
          observacoes_internas?: string | null
          status?: string
          timeline?: Json | null
          updated_at?: string
          valor_pago?: number
          valor_pendente?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          aliquota_icms: number | null
          aliquota_iss: number | null
          ano_fabricacao: number | null
          ativo: boolean
          capacidade: string | null
          cfop: string | null
          codigo_interno: string
          combustivel: string | null
          condicao: string | null
          created_at: string
          created_by: string | null
          cst_icms: string | null
          custo_total_manutencao: number | null
          data_aquisicao: string | null
          dias_ocioso_ultimo_mes: number | null
          dimensoes_cm: string | null
          grupo_id: string
          historico: Json | null
          horas_media_por_dia: number | null
          horimetro_atual: number | null
          id: string
          loja_atual_id: string
          margem_acumulada: number | null
          modelo_id: string
          ncm: string | null
          numero_serie: string | null
          observacoes: string | null
          peso_kg: number | null
          potencia: string | null
          receita_acumulada: number | null
          saldos_por_loja: Json | null
          status_global: string
          taxa_ocupacao_ultimo_mes: number | null
          tensao: string | null
          tipo: string
          ultima_leitura_horimetro: string | null
          updated_at: string
          valor_aquisicao: number | null
          valor_indenizacao: number
          vezes_locado: number | null
          vida_util_meses: number | null
        }
        Insert: {
          aliquota_icms?: number | null
          aliquota_iss?: number | null
          ano_fabricacao?: number | null
          ativo?: boolean
          capacidade?: string | null
          cfop?: string | null
          codigo_interno: string
          combustivel?: string | null
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          cst_icms?: string | null
          custo_total_manutencao?: number | null
          data_aquisicao?: string | null
          dias_ocioso_ultimo_mes?: number | null
          dimensoes_cm?: string | null
          grupo_id: string
          historico?: Json | null
          horas_media_por_dia?: number | null
          horimetro_atual?: number | null
          id?: string
          loja_atual_id: string
          margem_acumulada?: number | null
          modelo_id: string
          ncm?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          peso_kg?: number | null
          potencia?: string | null
          receita_acumulada?: number | null
          saldos_por_loja?: Json | null
          status_global?: string
          taxa_ocupacao_ultimo_mes?: number | null
          tensao?: string | null
          tipo: string
          ultima_leitura_horimetro?: string | null
          updated_at?: string
          valor_aquisicao?: number | null
          valor_indenizacao?: number
          vezes_locado?: number | null
          vida_util_meses?: number | null
        }
        Update: {
          aliquota_icms?: number | null
          aliquota_iss?: number | null
          ano_fabricacao?: number | null
          ativo?: boolean
          capacidade?: string | null
          cfop?: string | null
          codigo_interno?: string
          combustivel?: string | null
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          cst_icms?: string | null
          custo_total_manutencao?: number | null
          data_aquisicao?: string | null
          dias_ocioso_ultimo_mes?: number | null
          dimensoes_cm?: string | null
          grupo_id?: string
          historico?: Json | null
          horas_media_por_dia?: number | null
          horimetro_atual?: number | null
          id?: string
          loja_atual_id?: string
          margem_acumulada?: number | null
          modelo_id?: string
          ncm?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          peso_kg?: number | null
          potencia?: string | null
          receita_acumulada?: number | null
          saldos_por_loja?: Json | null
          status_global?: string
          taxa_ocupacao_ultimo_mes?: number | null
          tensao?: string | null
          tipo?: string
          ultima_leitura_horimetro?: string | null
          updated_at?: string
          valor_aquisicao?: number | null
          valor_indenizacao?: number
          vezes_locado?: number | null
          vida_util_meses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_loja_atual_id_fkey"
            columns: ["loja_atual_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      faturas: {
        Row: {
          cliente_id: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          emissao: string
          forma_preferida: string
          id: string
          itens: Json
          loja_id: string
          numero: string
          observacoes: string | null
          tipo: string
          total: number
          updated_at: string
          vencimento: string
        }
        Insert: {
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          emissao?: string
          forma_preferida: string
          id?: string
          itens?: Json
          loja_id: string
          numero: string
          observacoes?: string | null
          tipo: string
          total?: number
          updated_at?: string
          vencimento: string
        }
        Update: {
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          emissao?: string
          forma_preferida?: string
          id?: string
          itens?: Json
          loja_id?: string
          numero?: string
          observacoes?: string | null
          tipo?: string
          total?: number
          updated_at?: string
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_faturas_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faturas_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_faturas_loja"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          ativo: boolean | null
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      fechamentos_cp: {
        Row: {
          checklist: Json | null
          created_at: string | null
          fechado: boolean | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          loja_id: string
          motivo_reabertura: string | null
          periodo: string
          updated_at: string | null
        }
        Insert: {
          checklist?: Json | null
          created_at?: string | null
          fechado?: boolean | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          loja_id: string
          motivo_reabertura?: string | null
          periodo: string
          updated_at?: string | null
        }
        Update: {
          checklist?: Json | null
          created_at?: string | null
          fechado?: boolean | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          loja_id?: string
          motivo_reabertura?: string | null
          periodo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_cp_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cnpj: string | null
          codigo: string
          contato: Json | null
          cpf: string | null
          created_at: string | null
          created_by: string | null
          endereco: Json | null
          id: string
          nome: string
          observacoes: string | null
          razao_social: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          codigo: string
          contato?: Json | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          endereco?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          razao_social?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          codigo?: string
          contato?: Json | null
          cpf?: string | null
          created_at?: string | null
          created_by?: string | null
          endereco?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          razao_social?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      grupos_equipamentos: {
        Row: {
          ativo: boolean
          codigo_numerico: number
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_numerico: number
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_numerico?: number
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      historico_precos: {
        Row: {
          data_iso: string
          descricao: string | null
          id: string
          loja_id: string | null
          modelo_id: string
          periodo: string | null
          usuario: string
          valor_anterior: number | null
          valor_novo: number | null
        }
        Insert: {
          data_iso?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          modelo_id: string
          periodo?: string | null
          usuario: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Update: {
          data_iso?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          modelo_id?: string
          periodo?: string | null
          usuario?: string
          valor_anterior?: number | null
          valor_novo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_precos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_precos_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      horimetro_leituras: {
        Row: {
          contrato_id: string | null
          created_at: string | null
          data_leitura: string
          equipamento_id: string
          horas_trabalhadas: number | null
          id: string
          leitura_anterior: number | null
          leitura_atual: number
          lido_por: string | null
          lido_por_nome: string | null
          observacoes: string | null
          tipo_evento: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string | null
          data_leitura?: string
          equipamento_id: string
          horas_trabalhadas?: number | null
          id?: string
          leitura_anterior?: number | null
          leitura_atual: number
          lido_por?: string | null
          lido_por_nome?: string | null
          observacoes?: string | null
          tipo_evento: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string | null
          data_leitura?: string
          equipamento_id?: string
          horas_trabalhadas?: number | null
          id?: string
          leitura_anterior?: number | null
          leitura_atual?: number
          lido_por?: string | null
          lido_por_nome?: string | null
          observacoes?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "horimetro_leituras_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horimetro_leituras_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "horimetro_leituras_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_depreciacao"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_config: {
        Row: {
          base_endereco: string | null
          base_latitude: number | null
          base_longitude: number | null
          comprovante_digital: boolean | null
          confirmacoes_obrigatorias: Json | null
          created_at: string | null
          frete_por_zona: Json | null
          horario_fim: string | null
          horario_inicio: string | null
          id: string
          intervalo_almoco_fim: string | null
          intervalo_almoco_inicio: string | null
          janelas: Json | null
          loja_id: string
          motivos_nao_entrega: Json | null
          motivos_nao_saida: Json | null
          prazo_minimo_horas: number | null
          responsavel_obrigatorio: boolean | null
          template_aviso: string | null
          template_entrega: string | null
          template_retirada: string | null
          tolerancia_fim_min: number | null
          tolerancia_inicio_min: number | null
          updated_at: string | null
        }
        Insert: {
          base_endereco?: string | null
          base_latitude?: number | null
          base_longitude?: number | null
          comprovante_digital?: boolean | null
          confirmacoes_obrigatorias?: Json | null
          created_at?: string | null
          frete_por_zona?: Json | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          intervalo_almoco_fim?: string | null
          intervalo_almoco_inicio?: string | null
          janelas?: Json | null
          loja_id: string
          motivos_nao_entrega?: Json | null
          motivos_nao_saida?: Json | null
          prazo_minimo_horas?: number | null
          responsavel_obrigatorio?: boolean | null
          template_aviso?: string | null
          template_entrega?: string | null
          template_retirada?: string | null
          tolerancia_fim_min?: number | null
          tolerancia_inicio_min?: number | null
          updated_at?: string | null
        }
        Update: {
          base_endereco?: string | null
          base_latitude?: number | null
          base_longitude?: number | null
          comprovante_digital?: boolean | null
          confirmacoes_obrigatorias?: Json | null
          created_at?: string | null
          frete_por_zona?: Json | null
          horario_fim?: string | null
          horario_inicio?: string | null
          id?: string
          intervalo_almoco_fim?: string | null
          intervalo_almoco_inicio?: string | null
          janelas?: Json | null
          loja_id?: string
          motivos_nao_entrega?: Json | null
          motivos_nao_saida?: Json | null
          prazo_minimo_horas?: number | null
          responsavel_obrigatorio?: boolean | null
          template_aviso?: string | null
          template_entrega?: string | null
          template_retirada?: string | null
          tolerancia_fim_min?: number | null
          tolerancia_inicio_min?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_config_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_itinerarios: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_iso: string
          id: string
          km_final: number | null
          km_inicial: number | null
          km_total: number | null
          loja_id: string
          motorista_id: string | null
          observacoes: string | null
          updated_at: string | null
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_iso: string
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          km_total?: number | null
          loja_id: string
          motorista_id?: string | null
          observacoes?: string | null
          updated_at?: string | null
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_iso?: string
          id?: string
          km_final?: number | null
          km_inicial?: number | null
          km_total?: number | null
          loja_id?: string
          motorista_id?: string | null
          observacoes?: string | null
          updated_at?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_itinerarios_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_itinerarios_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "logistica_motoristas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_itinerarios_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "logistica_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_metricas_diarias: {
        Row: {
          concluidas: number | null
          created_at: string | null
          data_iso: string
          id: string
          km_total: number | null
          loja_id: string
          motivos_falha: Json | null
          motorista_id: string | null
          on_window: number | null
          planejadas: number | null
          reagendadas: number | null
          updated_at: string | null
        }
        Insert: {
          concluidas?: number | null
          created_at?: string | null
          data_iso: string
          id?: string
          km_total?: number | null
          loja_id: string
          motivos_falha?: Json | null
          motorista_id?: string | null
          on_window?: number | null
          planejadas?: number | null
          reagendadas?: number | null
          updated_at?: string | null
        }
        Update: {
          concluidas?: number | null
          created_at?: string | null
          data_iso?: string
          id?: string
          km_total?: number | null
          loja_id?: string
          motivos_falha?: Json | null
          motorista_id?: string | null
          on_window?: number | null
          planejadas?: number | null
          reagendadas?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_metricas_diarias_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_metricas_diarias_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "logistica_motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_motoristas: {
        Row: {
          ativo: boolean | null
          categoria_cnh: string | null
          cnh: string | null
          created_at: string | null
          created_by: string | null
          id: string
          loja_id: string
          nome: string
          pessoa_id: string | null
          telefone: string | null
          updated_at: string | null
          vencimento_cnh: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_cnh?: string | null
          cnh?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id: string
          nome: string
          pessoa_id?: string | null
          telefone?: string | null
          updated_at?: string | null
          vencimento_cnh?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_cnh?: string | null
          cnh?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id?: string
          nome?: string
          pessoa_id?: string | null
          telefone?: string | null
          updated_at?: string | null
          vencimento_cnh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_motoristas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_motoristas_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_tarefas: {
        Row: {
          check_in_latitude: number | null
          check_in_longitude: number | null
          check_in_ts: string | null
          cliente_id: string | null
          cliente_nome: string
          cliente_telefone: string | null
          concluido_ts: string | null
          contrato_id: string | null
          created_at: string | null
          created_by: string | null
          duracao_min: number | null
          endereco: Json
          id: string
          itinerario_id: string | null
          janela: string | null
          latitude: number | null
          loja_id: string
          longitude: number | null
          motivo_falha: string | null
          motivo_falha_tipo: string | null
          observacoes: string | null
          previsto_iso: string
          prioridade: Database["public"]["Enums"]["prioridade_tarefa"]
          status: Database["public"]["Enums"]["status_tarefa_logistica"]
          tipo: Database["public"]["Enums"]["tipo_tarefa_logistica"]
          updated_at: string | null
        }
        Insert: {
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_ts?: string | null
          cliente_id?: string | null
          cliente_nome: string
          cliente_telefone?: string | null
          concluido_ts?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duracao_min?: number | null
          endereco: Json
          id?: string
          itinerario_id?: string | null
          janela?: string | null
          latitude?: number | null
          loja_id: string
          longitude?: number | null
          motivo_falha?: string | null
          motivo_falha_tipo?: string | null
          observacoes?: string | null
          previsto_iso: string
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          status?: Database["public"]["Enums"]["status_tarefa_logistica"]
          tipo?: Database["public"]["Enums"]["tipo_tarefa_logistica"]
          updated_at?: string | null
        }
        Update: {
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_ts?: string | null
          cliente_id?: string | null
          cliente_nome?: string
          cliente_telefone?: string | null
          concluido_ts?: string | null
          contrato_id?: string | null
          created_at?: string | null
          created_by?: string | null
          duracao_min?: number | null
          endereco?: Json
          id?: string
          itinerario_id?: string | null
          janela?: string | null
          latitude?: number | null
          loja_id?: string
          longitude?: number | null
          motivo_falha?: string | null
          motivo_falha_tipo?: string | null
          observacoes?: string | null
          previsto_iso?: string
          prioridade?: Database["public"]["Enums"]["prioridade_tarefa"]
          status?: Database["public"]["Enums"]["status_tarefa_logistica"]
          tipo?: Database["public"]["Enums"]["tipo_tarefa_logistica"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_tarefas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_tarefas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_tarefas_itinerario_id_fkey"
            columns: ["itinerario_id"]
            isOneToOne: false
            referencedRelation: "logistica_itinerarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistica_tarefas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      logistica_veiculos: {
        Row: {
          ano: number | null
          ativo: boolean | null
          capacidade_kg: number | null
          capacidade_m3: number | null
          created_at: string | null
          created_by: string | null
          id: string
          loja_id: string
          modelo: string
          placa: string
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id: string
          modelo: string
          placa: string
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          ativo?: boolean | null
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          loja_id?: string
          modelo?: string
          placa?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logistica_veiculos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      lojas: {
        Row: {
          ativo: boolean | null
          codigo: string
          codigo_numerico: number
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          codigo_numerico: number
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          codigo_numerico?: number
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      manut_event_bus: {
        Row: {
          created_at: string
          id: string
          loja_id: string
          payload: Json | null
          solicitacao_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          loja_id: string
          payload?: Json | null
          solicitacao_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          id?: string
          loja_id?: string
          payload?: Json | null
          solicitacao_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "manut_event_bus_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_equipamentos: {
        Row: {
          ativo: boolean
          caucao_padrao: number | null
          created_at: string
          created_by: string | null
          descricao: string | null
          especificacoes: Json | null
          grupo_id: string
          id: string
          multa_diaria_atraso: number | null
          nome_comercial: string
          politica_cancelamento: string | null
          prefixo_codigo: string
          proximo_sequencial: number
          tabela_por_loja: Json
          taxa_limpeza_padrao: number | null
          tempo_padding_horas: number | null
          tolerancia_atraso_horas: number | null
          updated_at: string
          waiver_protecao_percent: number | null
        }
        Insert: {
          ativo?: boolean
          caucao_padrao?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          especificacoes?: Json | null
          grupo_id: string
          id?: string
          multa_diaria_atraso?: number | null
          nome_comercial: string
          politica_cancelamento?: string | null
          prefixo_codigo: string
          proximo_sequencial?: number
          tabela_por_loja?: Json
          taxa_limpeza_padrao?: number | null
          tempo_padding_horas?: number | null
          tolerancia_atraso_horas?: number | null
          updated_at?: string
          waiver_protecao_percent?: number | null
        }
        Update: {
          ativo?: boolean
          caucao_padrao?: number | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          especificacoes?: Json | null
          grupo_id?: string
          id?: string
          multa_diaria_atraso?: number | null
          nome_comercial?: string
          politica_cancelamento?: string | null
          prefixo_codigo?: string
          proximo_sequencial?: number
          tabela_por_loja?: Json
          taxa_limpeza_padrao?: number | null
          tempo_padding_horas?: number | null
          tolerancia_atraso_horas?: number | null
          updated_at?: string
          waiver_protecao_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modelos_equipamentos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentos_caixa: {
        Row: {
          caixa_id: string
          created_at: string
          desconto: number
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id: string
          juros_multa: number
          loja_id: string
          origem: string
          refs: Json | null
          tipo: Database["public"]["Enums"]["tipo_movimento_caixa"]
          ts: string
          usuario_id: string
          usuario_nome: string
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          caixa_id: string
          created_at?: string
          desconto?: number
          forma: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          juros_multa?: number
          loja_id: string
          origem: string
          refs?: Json | null
          tipo: Database["public"]["Enums"]["tipo_movimento_caixa"]
          ts?: string
          usuario_id: string
          usuario_nome: string
          valor_bruto: number
          valor_liquido: number
        }
        Update: {
          caixa_id?: string
          created_at?: string
          desconto?: number
          forma?: Database["public"]["Enums"]["forma_pagamento"]
          id?: string
          juros_multa?: number
          loja_id?: string
          origem?: string
          refs?: Json | null
          tipo?: Database["public"]["Enums"]["tipo_movimento_caixa"]
          ts?: string
          usuario_id?: string
          usuario_nome?: string
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_caixa_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_caixa_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentos_pagar: {
        Row: {
          comprovante_url: string | null
          conta_id: string
          created_at: string | null
          created_by: string | null
          data_pagamento: string
          desconto: number | null
          forma: string
          id: string
          juros: number | null
          loja_id: string
          multa: number | null
          observacoes: string | null
          parcela_id: string
          titulo_id: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          comprovante_url?: string | null
          conta_id: string
          created_at?: string | null
          created_by?: string | null
          data_pagamento: string
          desconto?: number | null
          forma: string
          id?: string
          juros?: number | null
          loja_id: string
          multa?: number | null
          observacoes?: string | null
          parcela_id: string
          titulo_id: string
          valor_bruto: number
          valor_liquido?: number | null
        }
        Update: {
          comprovante_url?: string | null
          conta_id?: string
          created_at?: string | null
          created_by?: string | null
          data_pagamento?: string
          desconto?: number | null
          forma?: string
          id?: string
          juros?: number | null
          loja_id?: string
          multa?: number | null
          observacoes?: string | null
          parcela_id?: string
          titulo_id?: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_pagar_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_pagar_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_pagar_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas_pagar"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_pagar_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      ncm_comuns: {
        Row: {
          aliquota_icms_padrao: number | null
          aliquota_iss_padrao: number | null
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          descricao: string
          id: string
          updated_at: string | null
        }
        Insert: {
          aliquota_icms_padrao?: number | null
          aliquota_iss_padrao?: number | null
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          descricao: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          aliquota_icms_padrao?: number | null
          aliquota_iss_padrao?: number | null
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          descricao?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      obras: {
        Row: {
          ativo: boolean
          cliente_id: string
          codigo: string | null
          contatos: Json | null
          created_at: string
          created_by: string | null
          data_inicio: string | null
          data_previsao_termino: string | null
          data_termino: string | null
          endereco: Json | null
          id: string
          is_padrao: boolean | null
          loja_id: string
          nome: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          codigo?: string | null
          contatos?: Json | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          data_previsao_termino?: string | null
          data_termino?: string | null
          endereco?: Json | null
          id?: string
          is_padrao?: boolean | null
          loja_id: string
          nome: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          codigo?: string | null
          contatos?: Json | null
          created_at?: string
          created_by?: string | null
          data_inicio?: string | null
          data_previsao_termino?: string | null
          data_termino?: string | null
          endereco?: Json | null
          id?: string
          is_padrao?: boolean | null
          loja_id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "obras_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          area_atual: Database["public"]["Enums"]["area_oficina"]
          checklist: Json | null
          classificacao_defeito:
            | Database["public"]["Enums"]["class_defeito"]
            | null
          contrato_id: string | null
          created_at: string
          entrada_area_em: string
          equipamento_id: string
          fotos: Json | null
          id: string
          laudo_html: string | null
          loja_id: string
          numero: string
          origem: Database["public"]["Enums"]["origem_os"]
          pedido_pecas: Json | null
          prioridade: Database["public"]["Enums"]["prioridade_os"]
          sla_horas: number
          status: Database["public"]["Enums"]["status_os"]
          timeline: Json
          tipo: Database["public"]["Enums"]["tipo_os"]
          updated_at: string
          usuario_resp_id: string | null
          videos: Json | null
        }
        Insert: {
          area_atual?: Database["public"]["Enums"]["area_oficina"]
          checklist?: Json | null
          classificacao_defeito?:
            | Database["public"]["Enums"]["class_defeito"]
            | null
          contrato_id?: string | null
          created_at?: string
          entrada_area_em?: string
          equipamento_id: string
          fotos?: Json | null
          id?: string
          laudo_html?: string | null
          loja_id: string
          numero: string
          origem?: Database["public"]["Enums"]["origem_os"]
          pedido_pecas?: Json | null
          prioridade?: Database["public"]["Enums"]["prioridade_os"]
          sla_horas?: number
          status?: Database["public"]["Enums"]["status_os"]
          timeline?: Json
          tipo: Database["public"]["Enums"]["tipo_os"]
          updated_at?: string
          usuario_resp_id?: string | null
          videos?: Json | null
        }
        Update: {
          area_atual?: Database["public"]["Enums"]["area_oficina"]
          checklist?: Json | null
          classificacao_defeito?:
            | Database["public"]["Enums"]["class_defeito"]
            | null
          contrato_id?: string | null
          created_at?: string
          entrada_area_em?: string
          equipamento_id?: string
          fotos?: Json | null
          id?: string
          laudo_html?: string | null
          loja_id?: string
          numero?: string
          origem?: Database["public"]["Enums"]["origem_os"]
          pedido_pecas?: Json | null
          prioridade?: Database["public"]["Enums"]["prioridade_os"]
          sla_horas?: number
          status?: Database["public"]["Enums"]["status_os"]
          timeline?: Json
          tipo?: Database["public"]["Enums"]["tipo_os"]
          updated_at?: string
          usuario_resp_id?: string | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_depreciacao"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_pagar: {
        Row: {
          anexos: Json | null
          categoria_codigo: string | null
          cc_id: string | null
          conta_preferencial_id: string | null
          created_at: string | null
          fornecedor_id: string
          id: string
          loja_id: string
          motivo_suspensao: string | null
          numero_parcela: number
          observacoes: string | null
          pago: number | null
          reprogramacoes: Json | null
          saldo: number | null
          status: Database["public"]["Enums"]["status_parcela_pagar"] | null
          suspensa: boolean | null
          titulo_id: string
          updated_at: string | null
          valor: number
          vencimento: string
        }
        Insert: {
          anexos?: Json | null
          categoria_codigo?: string | null
          cc_id?: string | null
          conta_preferencial_id?: string | null
          created_at?: string | null
          fornecedor_id: string
          id?: string
          loja_id: string
          motivo_suspensao?: string | null
          numero_parcela: number
          observacoes?: string | null
          pago?: number | null
          reprogramacoes?: Json | null
          saldo?: number | null
          status?: Database["public"]["Enums"]["status_parcela_pagar"] | null
          suspensa?: boolean | null
          titulo_id: string
          updated_at?: string | null
          valor: number
          vencimento: string
        }
        Update: {
          anexos?: Json | null
          categoria_codigo?: string | null
          cc_id?: string | null
          conta_preferencial_id?: string | null
          created_at?: string | null
          fornecedor_id?: string
          id?: string
          loja_id?: string
          motivo_suspensao?: string | null
          numero_parcela?: number
          observacoes?: string | null
          pago?: number | null
          reprogramacoes?: Json | null
          saldo?: number | null
          status?: Database["public"]["Enums"]["status_parcela_pagar"] | null
          suspensa?: boolean | null
          titulo_id?: string
          updated_at?: string | null
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_pagar_categoria_codigo_fkey"
            columns: ["categoria_codigo"]
            isOneToOne: false
            referencedRelation: "categorias_n2"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "parcelas_pagar_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_pagar_conta_preferencial_id_fkey"
            columns: ["conta_preferencial_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_pagar_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_pagar_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_movimentos: {
        Row: {
          created_at: string
          data: string
          descricao: string
          id: string
          observacao: string | null
          pessoa_id: string
          tipo: string
          updated_at: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          descricao: string
          id?: string
          observacao?: string | null
          pessoa_id: string
          tipo: string
          updated_at?: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          observacao?: string | null
          pessoa_id?: string
          tipo?: string
          updated_at?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_movimentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoas: {
        Row: {
          admissao_iso: string | null
          cargo: string | null
          cc_id: string | null
          cpf: string
          created_at: string
          email: string | null
          id: string
          loja_id: string | null
          matricula: string | null
          nome: string
          observacoes: string | null
          salario: number | null
          situacao: Database["public"]["Enums"]["situacao_pessoa"]
          telefone: string | null
          updated_at: string
        }
        Insert: {
          admissao_iso?: string | null
          cargo?: string | null
          cc_id?: string | null
          cpf: string
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          matricula?: string | null
          nome: string
          observacoes?: string | null
          salario?: number | null
          situacao?: Database["public"]["Enums"]["situacao_pessoa"]
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          admissao_iso?: string | null
          cargo?: string | null
          cc_id?: string | null
          cpf?: string
          created_at?: string
          email?: string | null
          id?: string
          loja_id?: string | null
          matricula?: string | null
          nome?: string
          observacoes?: string | null
          salario?: number | null
          situacao?: Database["public"]["Enums"]["situacao_pessoa"]
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pessoas_cc"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pessoas_loja"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      produtividade_manutencao: {
        Row: {
          aguard_diag: number
          aguard_peca: number
          andaimes_liberadas: number
          andaimes_limpas: number
          auxiliar_id: string | null
          created_at: string
          data_iso: string
          escoras_liberadas: number
          escoras_limpas: number
          id: string
          liberadas: number
          limpas: number
          loja_id: string
          mecanico_id: string | null
          suportes: number
          updated_at: string
        }
        Insert: {
          aguard_diag?: number
          aguard_peca?: number
          andaimes_liberadas?: number
          andaimes_limpas?: number
          auxiliar_id?: string | null
          created_at?: string
          data_iso: string
          escoras_liberadas?: number
          escoras_limpas?: number
          id?: string
          liberadas?: number
          limpas?: number
          loja_id: string
          mecanico_id?: string | null
          suportes?: number
          updated_at?: string
        }
        Update: {
          aguard_diag?: number
          aguard_peca?: number
          andaimes_liberadas?: number
          andaimes_limpas?: number
          auxiliar_id?: string | null
          created_at?: string
          data_iso?: string
          escoras_liberadas?: number
          escoras_limpas?: number
          id?: string
          liberadas?: number
          limpas?: number
          loja_id?: string
          mecanico_id?: string | null
          suportes?: number
          updated_at?: string
        }
        Relationships: []
      }
      recebimentos: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          desconto: number
          forma: string
          id: string
          juros_multa: number
          loja_id: string
          observacoes: string | null
          titulo_id: string
          updated_at: string
          usuario: string | null
          valor_bruto: number
          valor_liquido: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          desconto?: number
          forma: string
          id?: string
          juros_multa?: number
          loja_id: string
          observacoes?: string | null
          titulo_id: string
          updated_at?: string
          usuario?: string | null
          valor_bruto?: number
          valor_liquido?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          desconto?: number
          forma?: string
          id?: string
          juros_multa?: number
          loja_id?: string
          observacoes?: string | null
          titulo_id?: string
          updated_at?: string
          usuario?: string | null
          valor_bruto?: number
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_recebimentos_titulo"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      sequenciais_equipamentos: {
        Row: {
          created_at: string
          grupo_id: string
          id: string
          loja_id: string
          proximo_sequencial: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          id?: string
          loja_id: string
          proximo_sequencial?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          id?: string
          loja_id?: string
          proximo_sequencial?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequenciais_equipamentos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequenciais_equipamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      sequenciais_fornecedores: {
        Row: {
          id: string
          proximo_sequencial: number
          updated_at: string | null
        }
        Insert: {
          id?: string
          proximo_sequencial?: number
          updated_at?: string | null
        }
        Update: {
          id?: string
          proximo_sequencial?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sequencias_numeracao: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          loja_id: string
          por_unidade: boolean
          prefixo: string
          proximo_numero: number
          reset_modo: string
          template: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          loja_id: string
          por_unidade?: boolean
          prefixo?: string
          proximo_numero?: number
          reset_modo?: string
          template?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          loja_id?: string
          por_unidade?: boolean
          prefixo?: string
          proximo_numero?: number
          reset_modo?: string
          template?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequencias_numeracao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacao_anexo: {
        Row: {
          created_at: string
          created_by: string
          id: string
          nome: string
          path: string
          size_bytes: number | null
          solicitacao_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          nome: string
          path: string
          size_bytes?: number | null
          solicitacao_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          path?: string
          size_bytes?: number | null
          solicitacao_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_anexo_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_manutencao"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacao_item: {
        Row: {
          codigo_interno: string | null
          equip_id: string | null
          grupo_id: string
          id: string
          modelo_id: string
          qtd: number
          solicitacao_id: string
          tipo: string
        }
        Insert: {
          codigo_interno?: string | null
          equip_id?: string | null
          grupo_id: string
          id?: string
          modelo_id: string
          qtd?: number
          solicitacao_id: string
          tipo: string
        }
        Update: {
          codigo_interno?: string | null
          equip_id?: string | null
          grupo_id?: string
          id?: string
          modelo_id?: string
          qtd?: number
          solicitacao_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_item_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_manutencao"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacao_manutencao: {
        Row: {
          assistente_sugestao: Json | null
          cliente_id: string
          cliente_nome: string
          contrato_id: string
          created_at: string
          created_by: string
          id: string
          janela_data: string | null
          janela_periodo: string | null
          laudo: Json | null
          loja_id: string
          os_id: string | null
          prioridade: string
          sintomas: string
          sla_horas: number | null
          status: string
          substituto: Json | null
          tipo: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          assistente_sugestao?: Json | null
          cliente_id: string
          cliente_nome: string
          contrato_id: string
          created_at?: string
          created_by: string
          id?: string
          janela_data?: string | null
          janela_periodo?: string | null
          laudo?: Json | null
          loja_id: string
          os_id?: string | null
          prioridade: string
          sintomas: string
          sla_horas?: number | null
          status?: string
          substituto?: Json | null
          tipo: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          assistente_sugestao?: Json | null
          cliente_id?: string
          cliente_nome?: string
          contrato_id?: string
          created_at?: string
          created_by?: string
          id?: string
          janela_data?: string | null
          janela_periodo?: string | null
          laudo?: Json | null
          loja_id?: string
          os_id?: string | null
          prioridade?: string
          sintomas?: string
          sla_horas?: number | null
          status?: string
          substituto?: Json | null
          tipo?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_manutencao_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacao_manutencao_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacao_manutencao_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacao_timeline: {
        Row: {
          acao: string
          id: string
          payload: Json | null
          solicitacao_id: string
          ts: string
          user_id: string
        }
        Insert: {
          acao: string
          id?: string
          payload?: Json | null
          solicitacao_id: string
          ts?: string
          user_id: string
        }
        Update: {
          acao?: string
          id?: string
          payload?: Json | null
          solicitacao_id?: string
          ts?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_timeline_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacao_manutencao"
            referencedColumns: ["id"]
          },
        ]
      }
      templates_documentos: {
        Row: {
          ativo: boolean
          blocos: Json
          campos_visiveis: Json
          cores: Json
          created_at: string
          created_by: string | null
          fontes: Json
          id: string
          is_default: boolean
          logo_url: string | null
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          blocos?: Json
          campos_visiveis?: Json
          cores?: Json
          created_at?: string
          created_by?: string | null
          fontes?: Json
          id?: string
          is_default?: boolean
          logo_url?: string | null
          nome: string
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          blocos?: Json
          campos_visiveis?: Json
          cores?: Json
          created_at?: string
          created_by?: string | null
          fontes?: Json
          id?: string
          is_default?: boolean
          logo_url?: string | null
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      titulos: {
        Row: {
          categoria: string
          cliente_id: string
          contrato_id: string | null
          created_at: string
          created_by: string | null
          descricao: string
          emissao: string
          fatura_id: string | null
          forma: string | null
          id: string
          loja_id: string
          numero: string
          origem: string
          pago: number
          saldo: number
          status: string
          subcategoria: string | null
          timeline: Json | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria?: string
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao: string
          emissao?: string
          fatura_id?: string | null
          forma?: string | null
          id?: string
          loja_id: string
          numero: string
          origem?: string
          pago?: number
          saldo?: number
          status?: string
          subcategoria?: string | null
          timeline?: Json | null
          updated_at?: string
          valor?: number
          vencimento: string
        }
        Update: {
          categoria?: string
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string
          emissao?: string
          fatura_id?: string | null
          forma?: string | null
          id?: string
          loja_id?: string
          numero?: string
          origem?: string
          pago?: number
          saldo?: number
          status?: string
          subcategoria?: string | null
          timeline?: Json | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_titulos_cliente"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_titulos_contrato"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_titulos_fatura"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
        ]
      }
      titulos_pagar: {
        Row: {
          anexos: Json | null
          ativo: boolean | null
          categoria_codigo: string | null
          cc_id: string | null
          chave_fiscal_44: string | null
          condicao: string | null
          created_at: string | null
          created_by: string | null
          doc_numero: string | null
          doc_tipo: string | null
          dup_justificativa: string | null
          emissao: string | null
          fornecedor_id: string
          id: string
          loja_id: string
          numero: string
          observacoes: string | null
          qtd_parcelas: number
          status: Database["public"]["Enums"]["status_titulo_pagar"] | null
          timeline: Json | null
          updated_at: string | null
          valor_total: number
          vencimento_inicial: string
        }
        Insert: {
          anexos?: Json | null
          ativo?: boolean | null
          categoria_codigo?: string | null
          cc_id?: string | null
          chave_fiscal_44?: string | null
          condicao?: string | null
          created_at?: string | null
          created_by?: string | null
          doc_numero?: string | null
          doc_tipo?: string | null
          dup_justificativa?: string | null
          emissao?: string | null
          fornecedor_id: string
          id?: string
          loja_id: string
          numero: string
          observacoes?: string | null
          qtd_parcelas?: number
          status?: Database["public"]["Enums"]["status_titulo_pagar"] | null
          timeline?: Json | null
          updated_at?: string | null
          valor_total: number
          vencimento_inicial: string
        }
        Update: {
          anexos?: Json | null
          ativo?: boolean | null
          categoria_codigo?: string | null
          cc_id?: string | null
          chave_fiscal_44?: string | null
          condicao?: string | null
          created_at?: string | null
          created_by?: string | null
          doc_numero?: string | null
          doc_tipo?: string | null
          dup_justificativa?: string | null
          emissao?: string | null
          fornecedor_id?: string
          id?: string
          loja_id?: string
          numero?: string
          observacoes?: string | null
          qtd_parcelas?: number
          status?: Database["public"]["Enums"]["status_titulo_pagar"] | null
          timeline?: Json | null
          updated_at?: string | null
          valor_total?: number
          vencimento_inicial?: string
        }
        Relationships: [
          {
            foreignKeyName: "titulos_pagar_categoria_codigo_fkey"
            columns: ["categoria_codigo"]
            isOneToOne: false
            referencedRelation: "categorias_n2"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "titulos_pagar_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_pagar_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_itens: {
        Row: {
          codigo_interno: string | null
          created_at: string
          descricao: string
          grupo_id: string
          id: string
          modelo_id: string
          quantidade: number
          serie: string | null
          tipo: Database["public"]["Enums"]["tipo_item_transferencia"]
          transferencia_id: string
        }
        Insert: {
          codigo_interno?: string | null
          created_at?: string
          descricao: string
          grupo_id: string
          id?: string
          modelo_id: string
          quantidade?: number
          serie?: string | null
          tipo: Database["public"]["Enums"]["tipo_item_transferencia"]
          transferencia_id: string
        }
        Update: {
          codigo_interno?: string | null
          created_at?: string
          descricao?: string
          grupo_id?: string
          id?: string
          modelo_id?: string
          quantidade?: number
          serie?: string | null
          tipo?: Database["public"]["Enums"]["tipo_item_transferencia"]
          transferencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencia_itens_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencia_itens_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "modelos_equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencia_itens_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "transferencias"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_logs: {
        Row: {
          acao: string
          detalhe: string | null
          em: string
          id: string
          por_usuario_id: string
          por_usuario_nome: string
          transferencia_id: string
        }
        Insert: {
          acao: string
          detalhe?: string | null
          em?: string
          id?: string
          por_usuario_id: string
          por_usuario_nome: string
          transferencia_id: string
        }
        Update: {
          acao?: string
          detalhe?: string | null
          em?: string
          id?: string
          por_usuario_id?: string
          por_usuario_nome?: string
          transferencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencia_logs_transferencia_id_fkey"
            columns: ["transferencia_id"]
            isOneToOne: false
            referencedRelation: "transferencias"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias: {
        Row: {
          created_at: string
          created_by: string
          destino_loja_id: string
          id: string
          motorista: string | null
          numero: number
          observacoes: string | null
          origem_loja_id: string
          recusa: Json | null
          status: Database["public"]["Enums"]["status_transferencia"]
          updated_at: string
          veiculo: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          destino_loja_id: string
          id?: string
          motorista?: string | null
          numero: number
          observacoes?: string | null
          origem_loja_id: string
          recusa?: Json | null
          status?: Database["public"]["Enums"]["status_transferencia"]
          updated_at?: string
          veiculo?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          destino_loja_id?: string
          id?: string
          motorista?: string | null
          numero?: number
          observacoes?: string | null
          origem_loja_id?: string
          recusa?: Json | null
          status?: Database["public"]["Enums"]["status_transferencia"]
          updated_at?: string
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_destino_loja_id_fkey"
            columns: ["destino_loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_origem_loja_id_fkey"
            columns: ["origem_loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lojas_permitidas: {
        Row: {
          loja_id: string
          user_id: string
        }
        Insert: {
          loja_id: string
          user_id: string
        }
        Update: {
          loja_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          ativo: boolean
          created_at: string
          exige_troca_senha: boolean
          id: string
          loja_padrao_id: string | null
          pessoa_id: string
          two_fa_enabled: boolean
          updated_at: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          exige_troca_senha?: boolean
          id: string
          loja_padrao_id?: string | null
          pessoa_id: string
          two_fa_enabled?: boolean
          updated_at?: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          exige_troca_senha?: boolean
          id?: string
          loja_padrao_id?: string | null
          pessoa_id?: string
          two_fa_enabled?: boolean
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: true
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      equipamentos_depreciacao: {
        Row: {
          codigo_interno: string | null
          data_aquisicao: string | null
          depreciacao_mensal: number | null
          id: string | null
          meses_uso: number | null
          valor_aquisicao: number | null
          valor_residual: number | null
          vida_util_meses: number | null
        }
        Insert: {
          codigo_interno?: string | null
          data_aquisicao?: string | null
          depreciacao_mensal?: never
          id?: string | null
          meses_uso?: never
          valor_aquisicao?: number | null
          valor_residual?: never
          vida_util_meses?: number | null
        }
        Update: {
          codigo_interno?: string | null
          data_aquisicao?: string | null
          depreciacao_mensal?: never
          id?: string | null
          meses_uso?: never
          valor_aquisicao?: number | null
          valor_residual?: never
          vida_util_meses?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      gerar_codigo_equipamento: {
        Args: { p_grupo_id: string; p_loja_id: string } | { p_loja_id: string }
        Returns: string
      }
      gerar_codigo_fornecedor: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      gerar_numero_os: {
        Args: { p_loja_id: string }
        Returns: string
      }
      gerar_numero_titulo_pagar: {
        Args: { p_loja_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      incrementar_contador: {
        Args: { p_chave_contador: string; p_loja_id: string; p_tipo: string }
        Returns: number
      }
      is_periodo_fechado: {
        Args: { p_data: string; p_loja_id: string }
        Returns: boolean
      }
      recalcular_kpis_equipamento: {
        Args: { p_equipamento_id: string }
        Returns: undefined
      }
      recalcular_saldo_equipamento_direto: {
        Args: { p_equipamento_id: string }
        Returns: undefined
      }
      rpc_aplicar_substituicao: {
        Args: { p: Json }
        Returns: undefined
      }
      rpc_criar_os_de_solicitacao: {
        Args: { p: Json }
        Returns: string
      }
      rpc_criar_solicitacao: {
        Args: { p: Json }
        Returns: string
      }
      rpc_mudar_status: {
        Args: { p: Json }
        Returns: undefined
      }
      rpc_registrar_laudo: {
        Args: { p: Json }
        Returns: undefined
      }
      verificar_pessoa_ativa: {
        Args: { p_pessoa_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "vendedor"
        | "motorista"
        | "mecanico"
        | "financeiro"
        | "gestor"
        | "admin"
        | "rh"
        | "gerente"
        | "operacao"
        | "user"
      area_oficina: "AMARELA" | "VERMELHA" | "AZUL" | "VERDE" | "CINZA"
      class_defeito: "DESGASTE" | "MAU_USO" | "NA"
      forma_pagamento:
        | "PIX"
        | "CARTAO"
        | "DINHEIRO"
        | "BOLETO"
        | "TRANSFERENCIA"
      motivo_recusa_transferencia: "NUMERACAO" | "DANO" | "DESTINO" | "OUTRO"
      nivel_aprovacao: "FINANCEIRO" | "GESTOR" | "DIRECAO"
      origem_os: "POS_LOCACAO" | "AUDITORIA" | "SUPORTE"
      prioridade_os: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
      prioridade_tarefa: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
      situacao_pessoa: "ativo" | "inativo" | "ferias" | "afastado"
      status_aprovacao: "PENDENTE" | "APROVADO" | "REPROVADO"
      status_caixa: "ABERTO" | "FECHADO"
      status_os:
        | "EM_ANALISE"
        | "AGUARD_PECA"
        | "EM_REPARO"
        | "EM_TESTE"
        | "CONCLUIDA"
      status_parcela_pagar:
        | "A_VENCER"
        | "VENCIDA"
        | "PAGA"
        | "PARCIAL"
        | "SUSPENSA"
        | "NEGOCIACAO"
      status_pedido:
        | "RASCUNHO"
        | "FINALIZADO"
        | "COMPRADO"
        | "PARCIAL"
        | "TOTAL"
      status_tarefa_logistica:
        | "AGENDAR"
        | "PROGRAMADO"
        | "EM_ROTA"
        | "CONCLUIDO"
        | "REAGENDADO"
        | "CANCELADO"
      status_titulo_pagar:
        | "EM_EDICAO"
        | "AGUARDANDO_APROVACAO"
        | "APROVADO"
        | "REPROVADO"
        | "CANCELADO"
        | "CONCLUIDO"
      status_transferencia:
        | "CRIADA"
        | "EM_TRANSITO"
        | "RECEBIDA"
        | "RECUSADA"
        | "CANCELADA"
      tipo_categoria: "DESPESA" | "RECEITA"
      tipo_conta_financeira: "BANCO" | "CAIXA" | "CARTAO"
      tipo_item_transferencia: "SERIAL" | "SALDO"
      tipo_movimento_caixa: "ENTRADA" | "SAIDA"
      tipo_os: "PREVENTIVA" | "CORRETIVA"
      tipo_tarefa_logistica: "ENTREGA" | "RETIRADA" | "SUPORTE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "vendedor",
        "motorista",
        "mecanico",
        "financeiro",
        "gestor",
        "admin",
        "rh",
        "gerente",
        "operacao",
        "user",
      ],
      area_oficina: ["AMARELA", "VERMELHA", "AZUL", "VERDE", "CINZA"],
      class_defeito: ["DESGASTE", "MAU_USO", "NA"],
      forma_pagamento: ["PIX", "CARTAO", "DINHEIRO", "BOLETO", "TRANSFERENCIA"],
      motivo_recusa_transferencia: ["NUMERACAO", "DANO", "DESTINO", "OUTRO"],
      nivel_aprovacao: ["FINANCEIRO", "GESTOR", "DIRECAO"],
      origem_os: ["POS_LOCACAO", "AUDITORIA", "SUPORTE"],
      prioridade_os: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
      prioridade_tarefa: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
      situacao_pessoa: ["ativo", "inativo", "ferias", "afastado"],
      status_aprovacao: ["PENDENTE", "APROVADO", "REPROVADO"],
      status_caixa: ["ABERTO", "FECHADO"],
      status_os: [
        "EM_ANALISE",
        "AGUARD_PECA",
        "EM_REPARO",
        "EM_TESTE",
        "CONCLUIDA",
      ],
      status_parcela_pagar: [
        "A_VENCER",
        "VENCIDA",
        "PAGA",
        "PARCIAL",
        "SUSPENSA",
        "NEGOCIACAO",
      ],
      status_pedido: ["RASCUNHO", "FINALIZADO", "COMPRADO", "PARCIAL", "TOTAL"],
      status_tarefa_logistica: [
        "AGENDAR",
        "PROGRAMADO",
        "EM_ROTA",
        "CONCLUIDO",
        "REAGENDADO",
        "CANCELADO",
      ],
      status_titulo_pagar: [
        "EM_EDICAO",
        "AGUARDANDO_APROVACAO",
        "APROVADO",
        "REPROVADO",
        "CANCELADO",
        "CONCLUIDO",
      ],
      status_transferencia: [
        "CRIADA",
        "EM_TRANSITO",
        "RECEBIDA",
        "RECUSADA",
        "CANCELADA",
      ],
      tipo_categoria: ["DESPESA", "RECEITA"],
      tipo_conta_financeira: ["BANCO", "CAIXA", "CARTAO"],
      tipo_item_transferencia: ["SERIAL", "SALDO"],
      tipo_movimento_caixa: ["ENTRADA", "SAIDA"],
      tipo_os: ["PREVENTIVA", "CORRETIVA"],
      tipo_tarefa_logistica: ["ENTREGA", "RETIRADA", "SUPORTE"],
    },
  },
} as const
