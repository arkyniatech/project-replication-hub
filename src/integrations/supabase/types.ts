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
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      aditivos_contratuais: {
        Row: {
          contrato_id: string
          created_at: string
          criado_em: string
          criado_por: string | null
          descricao: string | null
          historico: Json | null
          id: string
          justificativa: string | null
          loja_id: string
          numero: string
          status: string
          tipo: string
          updated_at: string
          valor: number | null
          vinculacao: string | null
        }
        Insert: {
          contrato_id: string
          created_at?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          historico?: Json | null
          id?: string
          justificativa?: string | null
          loja_id: string
          numero: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number | null
          vinculacao?: string | null
        }
        Update: {
          contrato_id?: string
          created_at?: string
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          historico?: Json | null
          id?: string
          justificativa?: string | null
          loja_id?: string
          numero?: string
          status?: string
          tipo?: string
          updated_at?: string
          valor?: number | null
          vinculacao?: string | null
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
            foreignKeyName: "aditivos_contratuais_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      ajustes_contagem: {
        Row: {
          created_at: string
          criado_por: string
          delta: number
          id: string
          item_id: string
          motivo: string | null
          observacao: string | null
          sessao_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          delta?: number
          id?: string
          item_id: string
          motivo?: string | null
          observacao?: string | null
          sessao_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          delta?: number
          id?: string
          item_id?: string
          motivo?: string | null
          observacao?: string | null
          sessao_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_contagem_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajustes_contagem_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_contagem"
            referencedColumns: ["id"]
          },
        ]
      }
      almox_catalogo_itens: {
        Row: {
          ativo: boolean
          controle: string
          created_at: string
          created_by: string | null
          descricao: string
          estoque_maximo: number | null
          estoque_minimo: number | null
          grupo: string | null
          id: string
          modelo: string | null
          observacoes: string | null
          sku: string
          tipo: string
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          controle?: string
          created_at?: string
          created_by?: string | null
          descricao: string
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          grupo?: string | null
          id?: string
          modelo?: string | null
          observacoes?: string | null
          sku: string
          tipo: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          controle?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          estoque_maximo?: number | null
          estoque_minimo?: number | null
          grupo?: string | null
          id?: string
          modelo?: string | null
          observacoes?: string | null
          sku?: string
          tipo?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      almox_contagem_itens: {
        Row: {
          acao: string | null
          contado_em: string | null
          contado_por: string | null
          contagem_id: string
          created_at: string
          created_by: string | null
          descricao: string
          grupo: string | null
          id: string
          item_id: string
          justificativa: string | null
          loja_id: string
          observacao: string | null
          processado: boolean
          quantidade_contada: number | null
          saldo_sistema: number
          sku: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          acao?: string | null
          contado_em?: string | null
          contado_por?: string | null
          contagem_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          grupo?: string | null
          id?: string
          item_id: string
          justificativa?: string | null
          loja_id: string
          observacao?: string | null
          processado?: boolean
          quantidade_contada?: number | null
          saldo_sistema?: number
          sku?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          acao?: string | null
          contado_em?: string | null
          contado_por?: string | null
          contagem_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          grupo?: string | null
          id?: string
          item_id?: string
          justificativa?: string | null
          loja_id?: string
          observacao?: string | null
          processado?: boolean
          quantidade_contada?: number | null
          saldo_sistema?: number
          sku?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "almox_contagem_itens_contagem_id_fkey"
            columns: ["contagem_id"]
            isOneToOne: false
            referencedRelation: "almox_contagens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almox_contagem_itens_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almox_catalogo_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almox_contagem_itens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      almox_contagens: {
        Row: {
          created_at: string
          created_by: string | null
          grupo: string | null
          id: string
          incluir_zerados: boolean
          loja_id: string
          numero: string
          observacoes: string | null
          processado_em: string | null
          processado_por: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grupo?: string | null
          id?: string
          incluir_zerados?: boolean
          loja_id: string
          numero: string
          observacoes?: string | null
          processado_em?: string | null
          processado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grupo?: string | null
          id?: string
          incluir_zerados?: boolean
          loja_id?: string
          numero?: string
          observacoes?: string | null
          processado_em?: string | null
          processado_por?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "almox_contagens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      almox_estoque: {
        Row: {
          controle: string
          created_at: string
          created_by: string | null
          custo_medio: number | null
          id: string
          item_id: string
          loja_id: string
          saldo: number
          series: Json
          ultima_movimentacao: string | null
          updated_at: string
        }
        Insert: {
          controle?: string
          created_at?: string
          created_by?: string | null
          custo_medio?: number | null
          id?: string
          item_id: string
          loja_id: string
          saldo?: number
          series?: Json
          ultima_movimentacao?: string | null
          updated_at?: string
        }
        Update: {
          controle?: string
          created_at?: string
          created_by?: string | null
          custo_medio?: number | null
          id?: string
          item_id?: string
          loja_id?: string
          saldo?: number
          series?: Json
          ultima_movimentacao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "almox_estoque_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almox_catalogo_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almox_estoque_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      almox_movimentos: {
        Row: {
          created_at: string
          created_by: string | null
          custo_unitario: number | null
          id: string
          item_id: string
          loja_id: string
          observacao: string | null
          quantidade: number
          referencia: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number | null
          id?: string
          item_id: string
          loja_id: string
          observacao?: string | null
          quantidade: number
          referencia?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_unitario?: number | null
          id?: string
          item_id?: string
          loja_id?: string
          observacao?: string | null
          quantidade?: number
          referencia?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "almox_movimentos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "almox_catalogo_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "almox_movimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      aprovacoes_cp: {
        Row: {
          created_at: string
          historico: Json | null
          id: string
          nivel: string
          status: string
          titulo_id: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          historico?: Json | null
          id?: string
          nivel?: string
          status?: string
          titulo_id: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          historico?: Json | null
          id?: string
          nivel?: string
          status?: string
          titulo_id?: string
          updated_at?: string
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
      ausencias: {
        Row: {
          cc_id: string | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          dias: number | null
          documento_id: string | null
          empresa_id: string | null
          id: string
          justificativa: string | null
          loja_id: string
          pessoa_id: string
          retorno_efetivo: string | null
          retorno_previsto: string | null
          status: string
          tipo: string
          updated_at: string
          vinculo_id: string | null
        }
        Insert: {
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          dias?: number | null
          documento_id?: string | null
          empresa_id?: string | null
          id?: string
          justificativa?: string | null
          loja_id: string
          pessoa_id: string
          retorno_efetivo?: string | null
          retorno_previsto?: string | null
          status?: string
          tipo: string
          updated_at?: string
          vinculo_id?: string | null
        }
        Update: {
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          dias?: number | null
          documento_id?: string | null
          empresa_id?: string | null
          id?: string
          justificativa?: string | null
          loja_id?: string
          pessoa_id?: string
          retorno_efetivo?: string | null
          retorno_previsto?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ausencias_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ausencias_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_sistema: {
        Row: {
          ativo: boolean | null
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          prioridade: number | null
          texto: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          prioridade?: number | null
          texto: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          prioridade?: number | null
          texto?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      banco_horas_apuracoes: {
        Row: {
          apurado_em: string | null
          apurado_por: string | null
          competencia_pagamento: string | null
          created_at: string
          empresa_id: string | null
          id: string
          periodo_fim: string
          periodo_inicio: string
          status: string
          total_horas: number | null
          total_valor: number | null
        }
        Insert: {
          apurado_em?: string | null
          apurado_por?: string | null
          competencia_pagamento?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          periodo_fim: string
          periodo_inicio: string
          status?: string
          total_horas?: number | null
          total_valor?: number | null
        }
        Update: {
          apurado_em?: string | null
          apurado_por?: string | null
          competencia_pagamento?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          total_horas?: number | null
          total_valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_apuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      banco_horas_movimentos: {
        Row: {
          apuracao_id: string | null
          cc_id: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          horas: number
          id: string
          loja_id: string
          observacao: string | null
          ocorrido_em: string
          origem: string
          pessoa_id: string
          saldo_apos: number | null
          tipo: string
          vinculo_id: string | null
        }
        Insert: {
          apuracao_id?: string | null
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          horas: number
          id?: string
          loja_id: string
          observacao?: string | null
          ocorrido_em?: string
          origem?: string
          pessoa_id: string
          saldo_apos?: number | null
          tipo: string
          vinculo_id?: string | null
        }
        Update: {
          apuracao_id?: string | null
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          horas?: number
          id?: string
          loja_id?: string
          observacao?: string | null
          ocorrido_em?: string
          origem?: string
          pessoa_id?: string
          saldo_apos?: number | null
          tipo?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "banco_horas_movimentos_apuracao_id_fkey"
            columns: ["apuracao_id"]
            isOneToOne: false
            referencedRelation: "banco_horas_apuracoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_movimentos_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_movimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_movimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_movimentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "banco_horas_movimentos_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      cargos: {
        Row: {
          ativo: boolean
          cbo: string | null
          created_at: string
          empresa_id: string | null
          familia: string | null
          id: string
          nivel: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cbo?: string | null
          created_at?: string
          empresa_id?: string | null
          familia?: string | null
          id?: string
          nivel?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cbo?: string | null
          created_at?: string
          empresa_id?: string | null
          familia?: string | null
          id?: string
          nivel?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cargos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias_n2: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
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
        Relationships: [
          {
            foreignKeyName: "centros_custo_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
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
          dia_vencimento_padrao: number | null
          endereco: Json | null
          id: string
          inadimplente: boolean | null
          inscricao_estadual: string | null
          isento_ie: boolean | null
          loja_id: string
          negociacao_pontual: Json | null
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
          dia_vencimento_padrao?: number | null
          endereco?: Json | null
          id?: string
          inadimplente?: boolean | null
          inscricao_estadual?: string | null
          isento_ie?: boolean | null
          loja_id: string
          negociacao_pontual?: Json | null
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
          dia_vencimento_padrao?: number | null
          endereco?: Json | null
          id?: string
          inadimplente?: boolean | null
          inscricao_estadual?: string | null
          isento_ie?: boolean | null
          loja_id?: string
          negociacao_pontual?: Json | null
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
          created_at: string
          created_by: string | null
          history: Json
          id: string
          idempotency_key: string
          linha_digitavel: string | null
          loja_id: string
          pdf_url: string | null
          pix_copia_cola: string | null
          qr_code_data_url: string | null
          status: string
          titulo_id: string
          updated_at: string
        }
        Insert: {
          codigo_barras?: string | null
          codigo_solicitacao?: string | null
          created_at?: string
          created_by?: string | null
          history?: Json
          id?: string
          idempotency_key: string
          linha_digitavel?: string | null
          loja_id: string
          pdf_url?: string | null
          pix_copia_cola?: string | null
          qr_code_data_url?: string | null
          status?: string
          titulo_id: string
          updated_at?: string
        }
        Update: {
          codigo_barras?: string | null
          codigo_solicitacao?: string | null
          created_at?: string
          created_by?: string | null
          history?: Json
          id?: string
          idempotency_key?: string
          linha_digitavel?: string | null
          loja_id?: string
          pdf_url?: string | null
          pix_copia_cola?: string | null
          qr_code_data_url?: string | null
          status?: string
          titulo_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_inter_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobrancas_inter_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_cotacao_itens: {
        Row: {
          cotacao_id: string
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          item_catalogo_id: string | null
          loja_id: string
          quantidade: number
          sku: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          cotacao_id: string
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          item_catalogo_id?: string | null
          loja_id: string
          quantidade?: number
          sku?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          cotacao_id?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          item_catalogo_id?: string | null
          loja_id?: string
          quantidade?: number
          sku?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_cotacao_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "compras_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_cotacao_itens_item_catalogo_id_fkey"
            columns: ["item_catalogo_id"]
            isOneToOne: false
            referencedRelation: "almox_catalogo_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_cotacao_itens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_cotacao_proposta_itens: {
        Row: {
          cotacao_item_id: string
          created_at: string
          created_by: string | null
          id: string
          loja_id: string
          observacao: string | null
          prazo_entrega: number | null
          preco_unit: number
          proposta_id: string
          updated_at: string
        }
        Insert: {
          cotacao_item_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: string
          observacao?: string | null
          prazo_entrega?: number | null
          preco_unit?: number
          proposta_id: string
          updated_at?: string
        }
        Update: {
          cotacao_item_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: string
          observacao?: string | null
          prazo_entrega?: number | null
          preco_unit?: number
          proposta_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_cotacao_proposta_itens_cotacao_item_id_fkey"
            columns: ["cotacao_item_id"]
            isOneToOne: false
            referencedRelation: "compras_cotacao_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_cotacao_proposta_itens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_cotacao_proposta_itens_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "compras_cotacao_propostas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_cotacao_propostas: {
        Row: {
          condicoes_pagamento: string | null
          cotacao_id: string
          created_at: string
          created_by: string | null
          desconto: number
          fornecedor_id: string
          frete: number
          id: string
          impostos: number
          loja_id: string
          prazo_geral_dias: number
          total: number
          updated_at: string
          validade_proposta: string | null
        }
        Insert: {
          condicoes_pagamento?: string | null
          cotacao_id: string
          created_at?: string
          created_by?: string | null
          desconto?: number
          fornecedor_id: string
          frete?: number
          id?: string
          impostos?: number
          loja_id: string
          prazo_geral_dias?: number
          total?: number
          updated_at?: string
          validade_proposta?: string | null
        }
        Update: {
          condicoes_pagamento?: string | null
          cotacao_id?: string
          created_at?: string
          created_by?: string | null
          desconto?: number
          fornecedor_id?: string
          frete?: number
          id?: string
          impostos?: number
          loja_id?: string
          prazo_geral_dias?: number
          total?: number
          updated_at?: string
          validade_proposta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_cotacao_propostas_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "compras_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_cotacao_propostas_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_cotacao_propostas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_cotacoes: {
        Row: {
          aprovacao: Json | null
          comprador_id: string | null
          comprador_nome: string | null
          created_at: string
          created_by: string | null
          id: string
          loja_id: string
          numero: string
          origem: string
          origem_id: string | null
          sla_interno: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aprovacao?: Json | null
          comprador_id?: string | null
          comprador_nome?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: string
          numero: string
          origem: string
          origem_id?: string | null
          sla_interno?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aprovacao?: Json | null
          comprador_id?: string | null
          comprador_nome?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: string
          numero?: string
          origem?: string
          origem_id?: string | null
          sla_interno?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_cotacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedido_itens: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          item_catalogo_id: string | null
          loja_id: string
          pedido_id: string
          preco_unit: number
          quantidade: number
          sku: string | null
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          item_catalogo_id?: string | null
          loja_id: string
          pedido_id: string
          preco_unit?: number
          quantidade?: number
          sku?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          item_catalogo_id?: string | null
          loja_id?: string
          pedido_id?: string
          preco_unit?: number
          quantidade?: number
          sku?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedido_itens_item_catalogo_id_fkey"
            columns: ["item_catalogo_id"]
            isOneToOne: false
            referencedRelation: "almox_catalogo_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedido_itens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_pedidos: {
        Row: {
          anexos: Json
          condicoes_pagamento: string | null
          cotacao_id: string | null
          created_at: string
          created_by: string | null
          fornecedor_id: string
          id: string
          loja_id: string
          numero: string
          observacoes: string | null
          prazo_entrega: number | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          anexos?: Json
          condicoes_pagamento?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          fornecedor_id: string
          id?: string
          loja_id: string
          numero: string
          observacoes?: string | null
          prazo_entrega?: number | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          anexos?: Json
          condicoes_pagamento?: string | null
          cotacao_id?: string | null
          created_at?: string
          created_by?: string | null
          fornecedor_id?: string
          id?: string
          loja_id?: string
          numero?: string
          observacoes?: string | null
          prazo_entrega?: number | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_pedidos_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "compras_cotacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_pedidos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_recebimento_itens: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          loja_id: string
          observacao: string | null
          pedido_item_id: string | null
          quantidade_recebida: number
          recebimento_id: string
          series: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: string
          observacao?: string | null
          pedido_item_id?: string | null
          quantidade_recebida?: number
          recebimento_id: string
          series?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: string
          observacao?: string | null
          pedido_item_id?: string | null
          quantidade_recebida?: number
          recebimento_id?: string
          series?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_recebimento_itens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_recebimento_itens_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "compras_pedido_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_recebimento_itens_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "compras_recebimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_recebimentos: {
        Row: {
          conferente_id: string | null
          conferente_nome: string | null
          created_at: string
          created_by: string | null
          id: string
          loja_id: string
          nf_chave: string | null
          nf_emissao: string | null
          nf_numero: string | null
          numero: string
          pedido_id: string
          status: string
          updated_at: string
        }
        Insert: {
          conferente_id?: string | null
          conferente_nome?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: string
          nf_chave?: string | null
          nf_emissao?: string | null
          nf_numero?: string | null
          numero: string
          pedido_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          conferente_id?: string | null
          conferente_nome?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: string
          nf_chave?: string | null
          nf_emissao?: string | null
          nf_numero?: string | null
          numero?: string
          pedido_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_recebimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_recebimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "compras_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_requisicao_itens: {
        Row: {
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          item_catalogo_id: string | null
          loja_id: string
          obs: string | null
          quantidade: number
          requisicao_id: string
          sku: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          item_catalogo_id?: string | null
          loja_id: string
          obs?: string | null
          quantidade?: number
          requisicao_id: string
          sku?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          item_catalogo_id?: string | null
          loja_id?: string
          obs?: string | null
          quantidade?: number
          requisicao_id?: string
          sku?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_requisicao_itens_item_catalogo_id_fkey"
            columns: ["item_catalogo_id"]
            isOneToOne: false
            referencedRelation: "almox_catalogo_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_requisicao_itens_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_requisicao_itens_requisicao_id_fkey"
            columns: ["requisicao_id"]
            isOneToOne: false
            referencedRelation: "compras_requisicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_requisicoes: {
        Row: {
          anexos: Json
          categoria: string
          centro_custo: string | null
          created_at: string
          created_by: string | null
          id: string
          loja_id: string
          numero: string
          observacoes: string | null
          prioridade: string
          solicitante_id: string | null
          solicitante_nome: string
          status: string
          updated_at: string
        }
        Insert: {
          anexos?: Json
          categoria: string
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: string
          numero: string
          observacoes?: string | null
          prioridade?: string
          solicitante_id?: string | null
          solicitante_nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          anexos?: Json
          categoria?: string
          centro_custo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: string
          numero?: string
          observacoes?: string | null
          prioridade?: string
          solicitante_id?: string | null
          solicitante_nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_requisicoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      config_avisos_header: {
        Row: {
          animacao: boolean | null
          created_at: string
          exibir_logo: boolean | null
          id: string
          tempo_rotacao: number | null
          updated_at: string
        }
        Insert: {
          animacao?: boolean | null
          created_at?: string
          exibir_logo?: boolean | null
          id?: string
          tempo_rotacao?: number | null
          updated_at?: string
        }
        Update: {
          animacao?: boolean | null
          created_at?: string
          exibir_logo?: boolean | null
          id?: string
          tempo_rotacao?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contas_financeiras: {
        Row: {
          agencia: string | null
          ativo: boolean
          banco: string | null
          bloqueios: number
          codigo: string
          created_at: string
          id: string
          loja_id: string
          moeda: string
          nome: string
          numero: string | null
          saldo_atual: number
          tipo: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          bloqueios?: number
          codigo?: string
          created_at?: string
          id?: string
          loja_id: string
          moeda?: string
          nome: string
          numero?: string | null
          saldo_atual?: number
          tipo?: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          ativo?: boolean
          banco?: string | null
          bloqueios?: number
          codigo?: string
          created_at?: string
          id?: string
          loja_id?: string
          moeda?: string
          nome?: string
          numero?: string | null
          saldo_atual?: number
          tipo?: string
          updated_at?: string
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
          data_inicio_original: string | null
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
          valor_original: number | null
          valor_pago: number
          valor_pendente: number
          valor_total: number
          zapsign_doc_token: string | null
          zapsign_sign_url: string | null
          zapsign_signed_at: string | null
          zapsign_status: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_id: string
          condicoes_pagamento?: Json | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio: string
          data_inicio_original?: string | null
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
          valor_original?: number | null
          valor_pago?: number
          valor_pendente?: number
          valor_total?: number
          zapsign_doc_token?: string | null
          zapsign_sign_url?: string | null
          zapsign_signed_at?: string | null
          zapsign_status?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string
          condicoes_pagamento?: Json | null
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_inicio_original?: string | null
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
          valor_original?: number | null
          valor_pago?: number
          valor_pendente?: number
          valor_total?: number
          zapsign_doc_token?: string | null
          zapsign_sign_url?: string | null
          zapsign_signed_at?: string | null
          zapsign_status?: string | null
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
      divergencias_contagem: {
        Row: {
          acao: string | null
          anexos: Json
          aprovacao: Json | null
          created_at: string
          delta: number
          exige_aprovacao: boolean
          id: string
          item_id: string
          justificativa: string | null
          perc: number
          qtd_contada: number
          qtd_sistema: number
          sessao_id: string
          status: string
          updated_at: string
        }
        Insert: {
          acao?: string | null
          anexos?: Json
          aprovacao?: Json | null
          created_at?: string
          delta?: number
          exige_aprovacao?: boolean
          id?: string
          item_id: string
          justificativa?: string | null
          perc?: number
          qtd_contada?: number
          qtd_sistema?: number
          sessao_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          acao?: string | null
          anexos?: Json
          aprovacao?: Json | null
          created_at?: string
          delta?: number
          exige_aprovacao?: boolean
          id?: string
          item_id?: string
          justificativa?: string | null
          perc?: number
          qtd_contada?: number
          qtd_sistema?: number
          sessao_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "divergencias_contagem_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens_contagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "divergencias_contagem_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_contagem"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          cnae_principal: string | null
          cnpj: string
          created_at: string
          grupo_id: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          razao_social: string
          regime_tributario: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnae_principal?: string | null
          cnpj: string
          created_at?: string
          grupo_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social: string
          regime_tributario?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnae_principal?: string | null
          cnpj?: string
          created_at?: string
          grupo_id?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          regime_tributario?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          ano_fabricacao: number | null
          ativo: boolean
          codigo_interno: string
          condicao: string | null
          created_at: string
          created_by: string | null
          data_aquisicao: string | null
          grupo_id: string
          historico: Json | null
          id: string
          loja_atual_id: string
          marca_id: string | null
          modelo_id: string
          numero_serie: string | null
          observacoes: string | null
          saldos_por_loja: Json | null
          status_global: string
          tipo: string
          updated_at: string
          valor_aquisicao: number | null
          valor_indenizacao: number
          vida_util_meses: number | null
        }
        Insert: {
          ano_fabricacao?: number | null
          ativo?: boolean
          codigo_interno: string
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          data_aquisicao?: string | null
          grupo_id: string
          historico?: Json | null
          id?: string
          loja_atual_id: string
          marca_id?: string | null
          modelo_id: string
          numero_serie?: string | null
          observacoes?: string | null
          saldos_por_loja?: Json | null
          status_global?: string
          tipo: string
          updated_at?: string
          valor_aquisicao?: number | null
          valor_indenizacao?: number
          vida_util_meses?: number | null
        }
        Update: {
          ano_fabricacao?: number | null
          ativo?: boolean
          codigo_interno?: string
          condicao?: string | null
          created_at?: string
          created_by?: string | null
          data_aquisicao?: string | null
          grupo_id?: string
          historico?: Json | null
          id?: string
          loja_atual_id?: string
          marca_id?: string | null
          modelo_id?: string
          numero_serie?: string | null
          observacoes?: string | null
          saldos_por_loja?: Json | null
          status_global?: string
          tipo?: string
          updated_at?: string
          valor_aquisicao?: number | null
          valor_indenizacao?: number
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
            foreignKeyName: "equipamentos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas_equipamentos"
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
            foreignKeyName: "faturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_agendamentos: {
        Row: {
          abono_pecuniario_dias: number
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          created_by: string | null
          data_fim: string
          data_inicio: string
          dias: number
          id: string
          loja_id: string
          observacao: string | null
          periodo_id: string
          pessoa_id: string
          status: string
        }
        Insert: {
          abono_pecuniario_dias?: number
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_fim: string
          data_inicio: string
          dias: number
          id?: string
          loja_id: string
          observacao?: string | null
          periodo_id: string
          pessoa_id: string
          status?: string
        }
        Update: {
          abono_pecuniario_dias?: number
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          created_by?: string | null
          data_fim?: string
          data_inicio?: string
          dias?: number
          id?: string
          loja_id?: string
          observacao?: string | null
          periodo_id?: string
          pessoa_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ferias_agendamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_agendamentos_periodo_id_fkey"
            columns: ["periodo_id"]
            isOneToOne: false
            referencedRelation: "ferias_periodos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_agendamentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias_periodos: {
        Row: {
          antecipou_13: boolean
          aquisicao_fim: string
          aquisicao_inicio: string
          cc_id: string | null
          concessivo_fim: string
          created_at: string
          dias_direito: number
          dias_gozados: number
          dias_saldo: number | null
          dias_vendidos_abono: number
          empresa_id: string | null
          faltas_injustificadas: number
          id: string
          loja_id: string
          observacao: string | null
          pagamento_dobro_devido: boolean
          pessoa_id: string
          status: string
          updated_at: string
          valor_pago: number | null
          vinculo_id: string | null
        }
        Insert: {
          antecipou_13?: boolean
          aquisicao_fim: string
          aquisicao_inicio: string
          cc_id?: string | null
          concessivo_fim: string
          created_at?: string
          dias_direito?: number
          dias_gozados?: number
          dias_saldo?: number | null
          dias_vendidos_abono?: number
          empresa_id?: string | null
          faltas_injustificadas?: number
          id?: string
          loja_id: string
          observacao?: string | null
          pagamento_dobro_devido?: boolean
          pessoa_id: string
          status?: string
          updated_at?: string
          valor_pago?: number | null
          vinculo_id?: string | null
        }
        Update: {
          antecipou_13?: boolean
          aquisicao_fim?: string
          aquisicao_inicio?: string
          cc_id?: string | null
          concessivo_fim?: string
          created_at?: string
          dias_direito?: number
          dias_gozados?: number
          dias_saldo?: number | null
          dias_vendidos_abono?: number
          empresa_id?: string | null
          faltas_injustificadas?: number
          id?: string
          loja_id?: string
          observacao?: string | null
          pagamento_dobro_devido?: boolean
          pessoa_id?: string
          status?: string
          updated_at?: string
          valor_pago?: number | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferias_periodos_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_periodos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_periodos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_periodos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ferias_periodos_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      fgts_ledger: {
        Row: {
          aliquota: number | null
          base_calculo: number | null
          competencia: string
          created_at: string
          empresa_id: string | null
          id: string
          loja_id: string | null
          origem: string | null
          pessoa_id: string
          saldo_estimado: number | null
          saldo_oficial: number | null
          status_conciliacao: string | null
          valor_calculado: number | null
          valor_recolhido: number | null
          vinculo_id: string | null
        }
        Insert: {
          aliquota?: number | null
          base_calculo?: number | null
          competencia: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          loja_id?: string | null
          origem?: string | null
          pessoa_id: string
          saldo_estimado?: number | null
          saldo_oficial?: number | null
          status_conciliacao?: string | null
          valor_calculado?: number | null
          valor_recolhido?: number | null
          vinculo_id?: string | null
        }
        Update: {
          aliquota?: number | null
          base_calculo?: number | null
          competencia?: string
          created_at?: string
          empresa_id?: string | null
          id?: string
          loja_id?: string | null
          origem?: string | null
          pessoa_id?: string
          saldo_estimado?: number | null
          saldo_oficial?: number | null
          status_conciliacao?: string | null
          valor_calculado?: number | null
          valor_recolhido?: number | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fgts_ledger_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgts_ledger_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgts_ledger_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fgts_ledger_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_conciliacoes: {
        Row: {
          conta_id: string
          created_at: string
          created_by: string | null
          id: string
          loja_id: string
          periodo_fim: string
          periodo_ini: string
          saldo_final_extrato: number
          saldo_inicial_extrato: number
          status: string
        }
        Insert: {
          conta_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id: string
          periodo_fim: string
          periodo_ini: string
          saldo_final_extrato?: number
          saldo_inicial_extrato?: number
          status?: string
        }
        Update: {
          conta_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          loja_id?: string
          periodo_fim?: string
          periodo_ini?: string
          saldo_final_extrato?: number
          saldo_inicial_extrato?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_conciliacoes_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_conciliacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_extrato_linhas: {
        Row: {
          conciliacao_id: string
          data: string
          doc: string | null
          historico: string
          id: string
          pareado: boolean
          saldo: number | null
          tipo: string
          valor: number
        }
        Insert: {
          conciliacao_id: string
          data: string
          doc?: string | null
          historico?: string
          id?: string
          pareado?: boolean
          saldo?: number | null
          tipo: string
          valor: number
        }
        Update: {
          conciliacao_id?: string
          data?: string
          doc?: string | null
          historico?: string
          id?: string
          pareado?: boolean
          saldo?: number | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_extrato_linhas_conciliacao_id_fkey"
            columns: ["conciliacao_id"]
            isOneToOne: false
            referencedRelation: "fin_conciliacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_lancamentos: {
        Row: {
          cc: string | null
          conta_id: string
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          id: string
          loja_id: string | null
          origem: string
          ref_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          cc?: string | null
          conta_id: string
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          origem?: string
          ref_id?: string | null
          tipo: string
          valor: number
        }
        Update: {
          cc?: string | null
          conta_id?: string
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          id?: string
          loja_id?: string | null
          origem?: string
          ref_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_lancamentos_conta_id_fkey"
            columns: ["conta_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_lancamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_matches: {
        Row: {
          conciliacao_id: string
          created_at: string
          extrato_id: string
          id: string
          lancamento_id: string
          modo: string
        }
        Insert: {
          conciliacao_id: string
          created_at?: string
          extrato_id: string
          id?: string
          lancamento_id: string
          modo?: string
        }
        Update: {
          conciliacao_id?: string
          created_at?: string
          extrato_id?: string
          id?: string
          lancamento_id?: string
          modo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_matches_conciliacao_id_fkey"
            columns: ["conciliacao_id"]
            isOneToOne: false
            referencedRelation: "fin_conciliacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_matches_extrato_id_fkey"
            columns: ["extrato_id"]
            isOneToOne: false
            referencedRelation: "fin_extrato_linhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_matches_lancamento_id_fkey"
            columns: ["lancamento_id"]
            isOneToOne: false
            referencedRelation: "fin_lancamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transferencias: {
        Row: {
          anexo: string | null
          centros_custo: string | null
          created_at: string
          created_by: string | null
          data: string
          descricao: string | null
          destino_id: string
          estorno_de: string | null
          id: string
          loja_id: string
          observacoes: string | null
          origem_id: string
          ref: string | null
          status: string
          taxa: number
          valor: number
        }
        Insert: {
          anexo?: string | null
          centros_custo?: string | null
          created_at?: string
          created_by?: string | null
          data: string
          descricao?: string | null
          destino_id: string
          estorno_de?: string | null
          id?: string
          loja_id: string
          observacoes?: string | null
          origem_id: string
          ref?: string | null
          status?: string
          taxa?: number
          valor: number
        }
        Update: {
          anexo?: string | null
          centros_custo?: string | null
          created_at?: string
          created_by?: string | null
          data?: string
          descricao?: string | null
          destino_id?: string
          estorno_de?: string | null
          id?: string
          loja_id?: string
          observacoes?: string | null
          origem_id?: string
          ref?: string | null
          status?: string
          taxa?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_transferencias_destino_id_fkey"
            columns: ["destino_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transferencias_estorno_de_fkey"
            columns: ["estorno_de"]
            isOneToOne: false
            referencedRelation: "fin_transferencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transferencias_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transferencias_origem_id_fkey"
            columns: ["origem_id"]
            isOneToOne: false
            referencedRelation: "contas_financeiras"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          codigo: string
          contato: Json | null
          cpf: string | null
          created_at: string
          created_by: string | null
          endereco: Json | null
          id: string
          nome: string
          observacoes: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          codigo: string
          contato?: Json | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          endereco?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          codigo?: string
          contato?: Json | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          endereco?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      frota_abastecimentos: {
        Row: {
          created_by: string | null
          custo_por_km: number
          data: string
          flags_json: string | null
          id: string
          km_atual: number
          km_percorrido: number
          km_por_l: number
          litros: number
          posto_id: string | null
          preco_litro: number
          veiculo_id: string
        }
        Insert: {
          created_by?: string | null
          custo_por_km?: number
          data: string
          flags_json?: string | null
          id?: string
          km_atual?: number
          km_percorrido?: number
          km_por_l?: number
          litros?: number
          posto_id?: string | null
          preco_litro?: number
          veiculo_id: string
        }
        Update: {
          created_by?: string | null
          custo_por_km?: number
          data?: string
          flags_json?: string | null
          id?: string
          km_atual?: number
          km_percorrido?: number
          km_por_l?: number
          litros?: number
          posto_id?: string | null
          preco_litro?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frota_abastecimentos_posto_id_fkey"
            columns: ["posto_id"]
            isOneToOne: false
            referencedRelation: "frota_postos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frota_abastecimentos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "frota_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      frota_manutencoes: {
        Row: {
          created_by: string | null
          custo_mo: number | null
          custo_pecas: number | null
          data_abertura: string
          descricao: string | null
          dt_entrada: string | null
          dt_saida: string | null
          grupo_id: string | null
          id: string
          km_entrada: number | null
          km_saida: number | null
          oficina_id: string | null
          servico_id: string | null
          status: string
          tempo_parado_h: number
          veiculo_id: string
        }
        Insert: {
          created_by?: string | null
          custo_mo?: number | null
          custo_pecas?: number | null
          data_abertura?: string
          descricao?: string | null
          dt_entrada?: string | null
          dt_saida?: string | null
          grupo_id?: string | null
          id?: string
          km_entrada?: number | null
          km_saida?: number | null
          oficina_id?: string | null
          servico_id?: string | null
          status?: string
          tempo_parado_h?: number
          veiculo_id: string
        }
        Update: {
          created_by?: string | null
          custo_mo?: number | null
          custo_pecas?: number | null
          data_abertura?: string
          descricao?: string | null
          dt_entrada?: string | null
          dt_saida?: string | null
          grupo_id?: string | null
          id?: string
          km_entrada?: number | null
          km_saida?: number | null
          oficina_id?: string | null
          servico_id?: string | null
          status?: string
          tempo_parado_h?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frota_manutencoes_oficina_id_fkey"
            columns: ["oficina_id"]
            isOneToOne: false
            referencedRelation: "frota_oficinas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frota_manutencoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "frota_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      frota_oficinas: {
        Row: {
          cidade: string
          contato: string | null
          created_by: string | null
          id: string
          nome: string
          obs: string | null
          servicos_ids: Json
          uf: string
        }
        Insert: {
          cidade?: string
          contato?: string | null
          created_by?: string | null
          id?: string
          nome: string
          obs?: string | null
          servicos_ids?: Json
          uf?: string
        }
        Update: {
          cidade?: string
          contato?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          obs?: string | null
          servicos_ids?: Json
          uf?: string
        }
        Relationships: []
      }
      frota_oleos: {
        Row: {
          created_by: string | null
          id: string
          intervalo_km: number
          intervalo_meses: number
          obs: string | null
          tipo_especificacao: string
        }
        Insert: {
          created_by?: string | null
          id?: string
          intervalo_km?: number
          intervalo_meses?: number
          obs?: string | null
          tipo_especificacao: string
        }
        Update: {
          created_by?: string | null
          id?: string
          intervalo_km?: number
          intervalo_meses?: number
          obs?: string | null
          tipo_especificacao?: string
        }
        Relationships: []
      }
      frota_postos: {
        Row: {
          cidade: string
          cnpj: string | null
          created_by: string | null
          id: string
          nome: string
          obs: string | null
          uf: string
        }
        Insert: {
          cidade?: string
          cnpj?: string | null
          created_by?: string | null
          id?: string
          nome: string
          obs?: string | null
          uf?: string
        }
        Update: {
          cidade?: string
          cnpj?: string | null
          created_by?: string | null
          id?: string
          nome?: string
          obs?: string | null
          uf?: string
        }
        Relationships: []
      }
      frota_servicos: {
        Row: {
          created_by: string | null
          criticidade: string
          grupo: string
          id: string
          obs: string | null
          servico_especifico: string
        }
        Insert: {
          created_by?: string | null
          criticidade?: string
          grupo?: string
          id?: string
          obs?: string | null
          servico_especifico: string
        }
        Update: {
          created_by?: string | null
          criticidade?: string
          grupo?: string
          id?: string
          obs?: string | null
          servico_especifico?: string
        }
        Relationships: []
      }
      frota_trocas_oleo: {
        Row: {
          created_by: string | null
          custo_total: number
          data: string
          id: string
          km_atual: number
          km_desde_ultima: number
          oleo_id: string | null
          trocou_filtro: boolean
          trocou_filtro_combustivel: boolean
          veiculo_id: string
        }
        Insert: {
          created_by?: string | null
          custo_total?: number
          data: string
          id?: string
          km_atual?: number
          km_desde_ultima?: number
          oleo_id?: string | null
          trocou_filtro?: boolean
          trocou_filtro_combustivel?: boolean
          veiculo_id: string
        }
        Update: {
          created_by?: string | null
          custo_total?: number
          data?: string
          id?: string
          km_atual?: number
          km_desde_ultima?: number
          oleo_id?: string | null
          trocou_filtro?: boolean
          trocou_filtro_combustivel?: boolean
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frota_trocas_oleo_oleo_id_fkey"
            columns: ["oleo_id"]
            isOneToOne: false
            referencedRelation: "frota_oleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frota_trocas_oleo_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "frota_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      frota_veiculo_configs: {
        Row: {
          desde_data: string
          id: string
          oleo_id: string
          veiculo_id: string
        }
        Insert: {
          desde_data?: string
          id?: string
          oleo_id: string
          veiculo_id: string
        }
        Update: {
          desde_data?: string
          id?: string
          oleo_id?: string
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frota_veiculo_configs_oleo_id_fkey"
            columns: ["oleo_id"]
            isOneToOne: false
            referencedRelation: "frota_oleos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frota_veiculo_configs_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: true
            referencedRelation: "frota_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      frota_veiculos: {
        Row: {
          ano_fab: number | null
          ano_mod: number | null
          cap_tanque_l: number
          codigo_interno: string
          combustivel: string
          created_by: string | null
          criado_em: string
          fabricante: string
          id: string
          loja_id: string | null
          modelo: string
          motorista_atual_id: string | null
          observacao: string | null
          odometro_atual: number
          placa: string
          status: string
          tipo: string
        }
        Insert: {
          ano_fab?: number | null
          ano_mod?: number | null
          cap_tanque_l?: number
          codigo_interno?: string
          combustivel?: string
          created_by?: string | null
          criado_em?: string
          fabricante?: string
          id?: string
          loja_id?: string | null
          modelo?: string
          motorista_atual_id?: string | null
          observacao?: string | null
          odometro_atual?: number
          placa: string
          status?: string
          tipo?: string
        }
        Update: {
          ano_fab?: number | null
          ano_mod?: number | null
          cap_tanque_l?: number
          codigo_interno?: string
          combustivel?: string
          created_by?: string | null
          criado_em?: string
          fabricante?: string
          id?: string
          loja_id?: string | null
          modelo?: string
          motorista_atual_id?: string | null
          observacao?: string | null
          odometro_atual?: number
          placa?: string
          status?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "frota_veiculos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_equipamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      grupos_lojas: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
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
      holerite_lotes: {
        Row: {
          competencia: string
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          observacao: string | null
          publicado_em: string | null
          publicado_por: string | null
          status: string
          tipo: string
          total_colaboradores: number
          updated_at: string
        }
        Insert: {
          competencia: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          tipo?: string
          total_colaboradores?: number
          updated_at?: string
        }
        Update: {
          competencia?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          observacao?: string | null
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          tipo?: string
          total_colaboradores?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "holerite_lotes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      holerites: {
        Row: {
          cc_id: string | null
          competencia: string
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          loja_id: string
          lote_id: string
          nome_arquivo: string | null
          pessoa_id: string
          storage_path: string
          valor_liquido: number | null
          vinculo_id: string | null
          visualizado_em: string | null
        }
        Insert: {
          cc_id?: string | null
          competencia: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          loja_id: string
          lote_id: string
          nome_arquivo?: string | null
          pessoa_id: string
          storage_path: string
          valor_liquido?: number | null
          vinculo_id?: string | null
          visualizado_em?: string | null
        }
        Update: {
          cc_id?: string | null
          competencia?: string
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          loja_id?: string
          lote_id?: string
          nome_arquivo?: string | null
          pessoa_id?: string
          storage_path?: string
          valor_liquido?: number | null
          vinculo_id?: string | null
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holerites_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_lote_id_fkey"
            columns: ["lote_id"]
            isOneToOne: false
            referencedRelation: "holerite_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holerites_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      horimetro_leituras: {
        Row: {
          contrato_id: string | null
          created_at: string
          equipamento_id: string
          horas_trabalhadas: number
          id: string
          leitura_anterior: number
          leitura_atual: number
          observacoes: string | null
          tipo_evento: string
          updated_at: string
        }
        Insert: {
          contrato_id?: string | null
          created_at?: string
          equipamento_id: string
          horas_trabalhadas?: number
          id?: string
          leitura_anterior?: number
          leitura_atual?: number
          observacoes?: string | null
          tipo_evento: string
          updated_at?: string
        }
        Update: {
          contrato_id?: string | null
          created_at?: string
          equipamento_id?: string
          horas_trabalhadas?: number
          id?: string
          leitura_anterior?: number
          leitura_atual?: number
          observacoes?: string | null
          tipo_evento?: string
          updated_at?: string
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
      inter_credentials: {
        Row: {
          ambiente: string
          ativo: boolean
          certificado_pem_encrypted: string | null
          chave_privada_pem_encrypted: string | null
          client_id: string
          client_secret_encrypted: string
          created_at: string
          created_by: string | null
          escopos: string[]
          id: string
          loja_id: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          ambiente?: string
          ativo?: boolean
          certificado_pem_encrypted?: string | null
          chave_privada_pem_encrypted?: string | null
          client_id: string
          client_secret_encrypted: string
          created_at?: string
          created_by?: string | null
          escopos?: string[]
          id?: string
          loja_id: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          ambiente?: string
          ativo?: boolean
          certificado_pem_encrypted?: string | null
          chave_privada_pem_encrypted?: string | null
          client_id?: string
          client_secret_encrypted?: string
          created_at?: string
          created_by?: string | null
          escopos?: string[]
          id?: string
          loja_id?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inter_credentials_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      inter_webhook_events: {
        Row: {
          codigo_solicitacao: string
          created_at: string
          data_evento: string
          erro: string | null
          id: string
          loja_id: string | null
          nosso_numero: string | null
          payload: Json | null
          processado: boolean
          status: string
          tentativas: number
          tipo: string
          titulo_id: string | null
          ultima_tentativa: string | null
          valor: number | null
        }
        Insert: {
          codigo_solicitacao: string
          created_at?: string
          data_evento?: string
          erro?: string | null
          id?: string
          loja_id?: string | null
          nosso_numero?: string | null
          payload?: Json | null
          processado?: boolean
          status: string
          tentativas?: number
          tipo: string
          titulo_id?: string | null
          ultima_tentativa?: string | null
          valor?: number | null
        }
        Update: {
          codigo_solicitacao?: string
          created_at?: string
          data_evento?: string
          erro?: string | null
          id?: string
          loja_id?: string | null
          nosso_numero?: string | null
          payload?: Json | null
          processado?: boolean
          status?: string
          tentativas?: number
          tipo?: string
          titulo_id?: string | null
          ultima_tentativa?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inter_webhook_events_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inter_webhook_events_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_contagem: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          grupo_nome: string
          id: string
          loja_id: string
          modelo_nome: string
          observacao: string | null
          qtd_contada: number | null
          sessao_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          codigo?: string
          created_at?: string
          descricao?: string
          grupo_nome?: string
          id?: string
          loja_id: string
          modelo_nome?: string
          observacao?: string | null
          qtd_contada?: number | null
          sessao_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          grupo_nome?: string
          id?: string
          loja_id?: string
          modelo_nome?: string
          observacao?: string | null
          qtd_contada?: number | null
          sessao_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_contagem_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_contagem_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_contagem"
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
          ativo: boolean
          categoria_cnh: string | null
          cnh: string | null
          created_at: string
          id: string
          loja_id: string
          nome: string
          pessoa_id: string | null
          telefone: string | null
          updated_at: string
          vencimento_cnh: string | null
        }
        Insert: {
          ativo?: boolean
          categoria_cnh?: string | null
          cnh?: string | null
          created_at?: string
          id?: string
          loja_id: string
          nome: string
          pessoa_id?: string | null
          telefone?: string | null
          updated_at?: string
          vencimento_cnh?: string | null
        }
        Update: {
          ativo?: boolean
          categoria_cnh?: string | null
          cnh?: string | null
          created_at?: string
          id?: string
          loja_id?: string
          nome?: string
          pessoa_id?: string | null
          telefone?: string | null
          updated_at?: string
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
          cliente_nome: string | null
          cliente_telefone: string | null
          concluido_ts: string | null
          contrato_id: string | null
          created_at: string
          created_by: string | null
          duracao_min: number | null
          endereco: Json | null
          id: string
          itinerario_id: string | null
          janela: string | null
          latitude: number | null
          loja_id: string
          longitude: number | null
          motivo_falha: string | null
          motivo_falha_tipo: string | null
          motorista_id: string | null
          observacoes: string | null
          previsto_iso: string | null
          prioridade: string
          status: string
          tipo: string
          updated_at: string
          veiculo_id: string | null
        }
        Insert: {
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_ts?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          concluido_ts?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          duracao_min?: number | null
          endereco?: Json | null
          id?: string
          itinerario_id?: string | null
          janela?: string | null
          latitude?: number | null
          loja_id: string
          longitude?: number | null
          motivo_falha?: string | null
          motivo_falha_tipo?: string | null
          motorista_id?: string | null
          observacoes?: string | null
          previsto_iso?: string | null
          prioridade?: string
          status?: string
          tipo?: string
          updated_at?: string
          veiculo_id?: string | null
        }
        Update: {
          check_in_latitude?: number | null
          check_in_longitude?: number | null
          check_in_ts?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          concluido_ts?: string | null
          contrato_id?: string | null
          created_at?: string
          created_by?: string | null
          duracao_min?: number | null
          endereco?: Json | null
          id?: string
          itinerario_id?: string | null
          janela?: string | null
          latitude?: number | null
          loja_id?: string
          longitude?: number | null
          motivo_falha?: string | null
          motivo_falha_tipo?: string | null
          motorista_id?: string | null
          observacoes?: string | null
          previsto_iso?: string | null
          prioridade?: string
          status?: string
          tipo?: string
          updated_at?: string
          veiculo_id?: string | null
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
          ativo: boolean
          capacidade_kg: number | null
          capacidade_m3: number | null
          created_at: string
          id: string
          loja_id: string
          modelo: string
          placa: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          ativo?: boolean
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          created_at?: string
          id?: string
          loja_id: string
          modelo: string
          placa: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          ativo?: boolean
          capacidade_kg?: number | null
          capacidade_m3?: number | null
          created_at?: string
          id?: string
          loja_id?: string
          modelo?: string
          placa?: string
          updated_at?: string
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
          cidade: string | null
          cnpj: string | null
          codigo: string
          codigo_numerico: number | null
          created_at: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          grupo_id: string | null
          horario_funcionamento: string | null
          id: string
          nome: string
          razao_social: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          codigo: string
          codigo_numerico?: number | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          grupo_id?: string | null
          horario_funcionamento?: string | null
          id?: string
          nome: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cidade?: string | null
          cnpj?: string | null
          codigo?: string
          codigo_numerico?: number | null
          created_at?: string | null
          email?: string | null
          empresa_id?: string | null
          endereco?: string | null
          grupo_id?: string | null
          horario_funcionamento?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lojas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lojas_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_lojas"
            referencedColumns: ["id"]
          },
        ]
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
      marcas_equipamentos: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
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
      movimentos_pagar: {
        Row: {
          comprovante_url: string | null
          conta_id: string
          created_at: string
          created_by: string | null
          data_pagamento: string
          desconto: number
          forma: string
          id: string
          juros: number
          loja_id: string
          multa: number
          observacoes: string | null
          parcela_id: string
          titulo_id: string
          valor_bruto: number
          valor_liquido: number | null
        }
        Insert: {
          comprovante_url?: string | null
          conta_id: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          desconto?: number
          forma?: string
          id?: string
          juros?: number
          loja_id: string
          multa?: number
          observacoes?: string | null
          parcela_id: string
          titulo_id: string
          valor_bruto?: number
          valor_liquido?: number | null
        }
        Update: {
          comprovante_url?: string | null
          conta_id?: string
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          desconto?: number
          forma?: string
          id?: string
          juros?: number
          loja_id?: string
          multa?: number
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
          latitude: number | null
          loja_id: string
          longitude: number | null
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
          latitude?: number | null
          loja_id: string
          longitude?: number | null
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
          latitude?: number | null
          loja_id?: string
          longitude?: number | null
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
      parametros_trabalhistas: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          empresa_id: string | null
          fonte_legal: string | null
          id: string
          valor: number
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          fonte_legal?: string | null
          id?: string
          valor: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          fonte_legal?: string | null
          id?: string
          valor?: number
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "parametros_trabalhistas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas_pagar: {
        Row: {
          created_at: string
          data_pagamento: string | null
          id: string
          numero: number
          status: string
          titulo_id: string
          updated_at: string
          valor: number
          valor_pago: number | null
          vencimento: string
        }
        Insert: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          status?: string
          titulo_id: string
          updated_at?: string
          valor?: number
          valor_pago?: number | null
          vencimento: string
        }
        Update: {
          created_at?: string
          data_pagamento?: string | null
          id?: string
          numero?: number
          status?: string
          titulo_id?: string
          updated_at?: string
          valor?: number
          valor_pago?: number | null
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_pagar_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos_pagar"
            referencedColumns: ["id"]
          },
        ]
      }
      pessoa_vinculo: {
        Row: {
          cargo_id: string | null
          categoria_esocial: string | null
          cc_id: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_desligamento: string | null
          data_fim_previsto: string | null
          empresa_id: string | null
          gestor_pessoa_id: string | null
          id: string
          jornada_horas_mensais: number | null
          jornada_horas_semanais: number | null
          loja_id: string
          matricula: string | null
          motivo_alteracao: string
          observacao: string | null
          pessoa_id: string
          salario: number | null
          tipo_contrato: string
          tipo_salario: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          cargo_id?: string | null
          categoria_esocial?: string | null
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          data_fim_previsto?: string | null
          empresa_id?: string | null
          gestor_pessoa_id?: string | null
          id?: string
          jornada_horas_mensais?: number | null
          jornada_horas_semanais?: number | null
          loja_id: string
          matricula?: string | null
          motivo_alteracao?: string
          observacao?: string | null
          pessoa_id: string
          salario?: number | null
          tipo_contrato?: string
          tipo_salario?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          cargo_id?: string | null
          categoria_esocial?: string | null
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_desligamento?: string | null
          data_fim_previsto?: string | null
          empresa_id?: string | null
          gestor_pessoa_id?: string | null
          id?: string
          jornada_horas_mensais?: number | null
          jornada_horas_semanais?: number | null
          loja_id?: string
          matricula?: string | null
          motivo_alteracao?: string
          observacao?: string | null
          pessoa_id?: string
          salario?: number | null
          tipo_contrato?: string
          tipo_salario?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "pessoa_vinculo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_vinculo_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_vinculo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_vinculo_gestor_pessoa_id_fkey"
            columns: ["gestor_pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_vinculo_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pessoa_vinculo_pessoa_id_fkey"
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
      ponto_lancamentos: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          entrada: string | null
          horas_trabalhadas: number | null
          id: string
          intervalo_min: number
          justificativa: string | null
          loja_id: string
          origem: string
          pessoa_id: string
          saida: string | null
          vinculo_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: string
          entrada?: string | null
          horas_trabalhadas?: number | null
          id?: string
          intervalo_min?: number
          justificativa?: string | null
          loja_id: string
          origem?: string
          pessoa_id: string
          saida?: string | null
          vinculo_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          entrada?: string | null
          horas_trabalhadas?: number | null
          id?: string
          intervalo_min?: number
          justificativa?: string | null
          loja_id?: string
          origem?: string
          pessoa_id?: string
          saida?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ponto_lancamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_lancamentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ponto_lancamentos_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
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
      provisao_snapshots: {
        Row: {
          competencia: string
          created_at: string
          empresa_id: string | null
          encargos_patronais: number | null
          fechado_em: string | null
          fechado_por: string | null
          id: string
          loja_id: string | null
          pessoa_id: string | null
          provisao_13: number | null
          provisao_ferias: number | null
          provisao_ferias_terco: number | null
          total_adquirido: number | null
          versao_calculo: string | null
          vinculo_id: string | null
        }
        Insert: {
          competencia: string
          created_at?: string
          empresa_id?: string | null
          encargos_patronais?: number | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          loja_id?: string | null
          pessoa_id?: string | null
          provisao_13?: number | null
          provisao_ferias?: number | null
          provisao_ferias_terco?: number | null
          total_adquirido?: number | null
          versao_calculo?: string | null
          vinculo_id?: string | null
        }
        Update: {
          competencia?: string
          created_at?: string
          empresa_id?: string | null
          encargos_patronais?: number | null
          fechado_em?: string | null
          fechado_por?: string | null
          id?: string
          loja_id?: string | null
          pessoa_id?: string | null
          provisao_13?: number | null
          provisao_ferias?: number | null
          provisao_ferias_terco?: number | null
          total_adquirido?: number | null
          versao_calculo?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provisao_snapshots_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisao_snapshots_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisao_snapshots_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provisao_snapshots_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos: {
        Row: {
          created_at: string
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
            foreignKeyName: "recebimentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_titulo_id_fkey"
            columns: ["titulo_id"]
            isOneToOne: false
            referencedRelation: "titulos"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisao_itens: {
        Row: {
          aliquota: number | null
          base: number | null
          descricao: string | null
          id: string
          ordem: number | null
          quantidade: number | null
          rubrica: string
          simulacao_id: string
          valor: number
        }
        Insert: {
          aliquota?: number | null
          base?: number | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          quantidade?: number | null
          rubrica: string
          simulacao_id: string
          valor: number
        }
        Update: {
          aliquota?: number | null
          base?: number | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          quantidade?: number | null
          rubrica?: string
          simulacao_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "rescisao_itens_simulacao_id_fkey"
            columns: ["simulacao_id"]
            isOneToOne: false
            referencedRelation: "rescisao_simulacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      rescisao_simulacoes: {
        Row: {
          created_at: string
          created_by: string | null
          custo_empregador: number | null
          data_desligamento: string
          data_simulacao: string
          empresa_id: string | null
          id: string
          loja_id: string | null
          motivo: string
          pessoa_id: string
          status: string | null
          tipo_aviso: string | null
          total_descontos: number | null
          total_proventos: number | null
          versao_calculo: string | null
          vinculo_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custo_empregador?: number | null
          data_desligamento: string
          data_simulacao?: string
          empresa_id?: string | null
          id?: string
          loja_id?: string | null
          motivo: string
          pessoa_id: string
          status?: string | null
          tipo_aviso?: string | null
          total_descontos?: number | null
          total_proventos?: number | null
          versao_calculo?: string | null
          vinculo_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custo_empregador?: number | null
          data_desligamento?: string
          data_simulacao?: string
          empresa_id?: string | null
          id?: string
          loja_id?: string | null
          motivo?: string
          pessoa_id?: string
          status?: string | null
          tipo_aviso?: string | null
          total_descontos?: number | null
          total_proventos?: number | null
          versao_calculo?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rescisao_simulacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisao_simulacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisao_simulacoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rescisao_simulacoes_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_admissoes: {
        Row: {
          candidato_id: string | null
          cargo_id: string | null
          checklist: Json
          cpf: string | null
          created_at: string
          created_by: string | null
          data_admissao: string | null
          data_prevista: string | null
          id: string
          loja_id: string
          nome: string
          observacoes: string | null
          pessoa_id: string | null
          salario: number | null
          status: string
          updated_at: string
          vaga_id: string | null
        }
        Insert: {
          candidato_id?: string | null
          cargo_id?: string | null
          checklist?: Json
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_prevista?: string | null
          id?: string
          loja_id: string
          nome: string
          observacoes?: string | null
          pessoa_id?: string | null
          salario?: number | null
          status?: string
          updated_at?: string
          vaga_id?: string | null
        }
        Update: {
          candidato_id?: string | null
          cargo_id?: string | null
          checklist?: Json
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_admissao?: string | null
          data_prevista?: string | null
          id?: string
          loja_id?: string
          nome?: string
          observacoes?: string | null
          pessoa_id?: string | null
          salario?: number | null
          status?: string
          updated_at?: string
          vaga_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_admissoes_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "rh_candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_admissoes_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_admissoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_admissoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_admissoes_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "rh_vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_aprovacoes: {
        Row: {
          aprovador_id: string | null
          decidido_em: string
          decisao: string
          etapa: number
          id: string
          motivo: string | null
          papel_exigido: string | null
          solicitacao_id: string
        }
        Insert: {
          aprovador_id?: string | null
          decidido_em?: string
          decisao: string
          etapa?: number
          id?: string
          motivo?: string | null
          papel_exigido?: string | null
          solicitacao_id: string
        }
        Update: {
          aprovador_id?: string | null
          decidido_em?: string
          decisao?: string
          etapa?: number
          id?: string
          motivo?: string | null
          papel_exigido?: string | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_aprovacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "rh_solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_aso_exames: {
        Row: {
          created_at: string
          created_by: string | null
          crm: string | null
          data_exame: string
          documento_id: string | null
          id: string
          loja_id: string
          medico: string | null
          observacoes: string | null
          pessoa_id: string
          resultado: string
          tipo: string
          validade: string | null
          vinculo_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crm?: string | null
          data_exame: string
          documento_id?: string | null
          id?: string
          loja_id: string
          medico?: string | null
          observacoes?: string | null
          pessoa_id: string
          resultado?: string
          tipo: string
          validade?: string | null
          vinculo_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crm?: string | null
          data_exame?: string
          documento_id?: string | null
          id?: string
          loja_id?: string
          medico?: string | null
          observacoes?: string | null
          pessoa_id?: string
          resultado?: string
          tipo?: string
          validade?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_aso_exames_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_aso_exames_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_aso_exames_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_audit_log: {
        Row: {
          acao: string
          antes: Json | null
          campos_alterados: string[] | null
          created_at: string
          depois: Json | null
          id: string
          registro_id: string | null
          tabela: string
          user_id: string | null
        }
        Insert: {
          acao: string
          antes?: Json | null
          campos_alterados?: string[] | null
          created_at?: string
          depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          antes?: Json | null
          campos_alterados?: string[] | null
          created_at?: string
          depois?: Json | null
          id?: string
          registro_id?: string | null
          tabela?: string
          user_id?: string | null
        }
        Relationships: []
      }
      rh_beneficio_elegibilidade: {
        Row: {
          beneficio_id: string
          cargo_id: string
          created_at: string
          created_by: string | null
          id: string
          regra: string | null
        }
        Insert: {
          beneficio_id: string
          cargo_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          regra?: string | null
        }
        Update: {
          beneficio_id?: string
          cargo_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          regra?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_beneficio_elegibilidade_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "rh_beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_beneficio_elegibilidade_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_beneficio_vinculos: {
        Row: {
          beneficio_id: string
          created_at: string
          created_by: string | null
          data_fim: string | null
          data_inicio: string
          id: string
          loja_id: string
          observacoes: string | null
          pessoa_id: string
          status: string
          valor_mensal: number | null
        }
        Insert: {
          beneficio_id: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          loja_id: string
          observacoes?: string | null
          pessoa_id: string
          status?: string
          valor_mensal?: number | null
        }
        Update: {
          beneficio_id?: string
          created_at?: string
          created_by?: string | null
          data_fim?: string | null
          data_inicio?: string
          id?: string
          loja_id?: string
          observacoes?: string | null
          pessoa_id?: string
          status?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_beneficio_vinculos_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "rh_beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_beneficio_vinculos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_beneficio_vinculos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_beneficios: {
        Row: {
          ativo: boolean
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          nome: string
          politica: string | null
          provedor: string | null
          tipo: string
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          nome: string
          politica?: string | null
          provedor?: string | null
          tipo?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          nome?: string
          politica?: string | null
          provedor?: string | null
          tipo?: string
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_beneficios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_candidatos: {
        Row: {
          created_at: string
          created_by: string | null
          cv_url: string | null
          email: string | null
          id: string
          loja_id: string
          nome: string
          observacoes: string | null
          origem: string | null
          status: string
          telefone: string | null
          updated_at: string
          vaga_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cv_url?: string | null
          email?: string | null
          id?: string
          loja_id: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          vaga_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cv_url?: string | null
          email?: string | null
          id?: string
          loja_id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
          vaga_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_candidatos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_candidatos_vaga_id_fkey"
            columns: ["vaga_id"]
            isOneToOne: false
            referencedRelation: "rh_vagas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_desligamentos: {
        Row: {
          checklist: Json
          created_at: string
          created_by: string | null
          data_alvo: string | null
          data_efetiva: string | null
          id: string
          loja_id: string
          motivo: string
          observacoes: string | null
          pessoa_id: string
          simulacao_id: string | null
          status: string
          tipo_aviso: string | null
          updated_at: string
          vinculo_id: string | null
        }
        Insert: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          data_alvo?: string | null
          data_efetiva?: string | null
          id?: string
          loja_id: string
          motivo: string
          observacoes?: string | null
          pessoa_id: string
          simulacao_id?: string | null
          status?: string
          tipo_aviso?: string | null
          updated_at?: string
          vinculo_id?: string | null
        }
        Update: {
          checklist?: Json
          created_at?: string
          created_by?: string | null
          data_alvo?: string | null
          data_efetiva?: string | null
          id?: string
          loja_id?: string
          motivo?: string
          observacoes?: string | null
          pessoa_id?: string
          simulacao_id?: string | null
          status?: string
          tipo_aviso?: string | null
          updated_at?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_desligamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_desligamentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_desligamentos_simulacao_id_fkey"
            columns: ["simulacao_id"]
            isOneToOne: false
            referencedRelation: "rescisao_simulacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_desligamentos_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_documentos: {
        Row: {
          cc_id: string | null
          created_at: string
          created_by: string | null
          empresa_id: string | null
          id: string
          loja_id: string
          mime_type: string | null
          motivo_rejeicao: string | null
          nome_arquivo: string | null
          pessoa_id: string
          status: string
          storage_path: string
          tamanho_bytes: number | null
          tipo_documento_id: string | null
          validade_ate: string | null
          validado_em: string | null
          validado_por: string | null
          vinculo_id: string | null
        }
        Insert: {
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          loja_id: string
          mime_type?: string | null
          motivo_rejeicao?: string | null
          nome_arquivo?: string | null
          pessoa_id: string
          status?: string
          storage_path: string
          tamanho_bytes?: number | null
          tipo_documento_id?: string | null
          validade_ate?: string | null
          validado_em?: string | null
          validado_por?: string | null
          vinculo_id?: string | null
        }
        Update: {
          cc_id?: string | null
          created_at?: string
          created_by?: string | null
          empresa_id?: string | null
          id?: string
          loja_id?: string
          mime_type?: string | null
          motivo_rejeicao?: string | null
          nome_arquivo?: string | null
          pessoa_id?: string
          status?: string
          storage_path?: string
          tamanho_bytes?: number | null
          tipo_documento_id?: string | null
          validade_ate?: string | null
          validado_em?: string | null
          validado_por?: string | null
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_documentos_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_documentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_documentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_documentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_documentos_tipo_documento_id_fkey"
            columns: ["tipo_documento_id"]
            isOneToOne: false
            referencedRelation: "rh_tipos_documento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_documentos_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_notificacoes: {
        Row: {
          created_at: string
          entidade: string | null
          entidade_id: string | null
          id: string
          lida_em: string | null
          loja_id: string | null
          mensagem: string | null
          pessoa_id: string | null
          severidade: string
          tipo: string
          titulo: string
        }
        Insert: {
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          lida_em?: string | null
          loja_id?: string | null
          mensagem?: string | null
          pessoa_id?: string | null
          severidade?: string
          tipo: string
          titulo: string
        }
        Update: {
          created_at?: string
          entidade?: string | null
          entidade_id?: string | null
          id?: string
          lida_em?: string | null
          loja_id?: string | null
          mensagem?: string | null
          pessoa_id?: string | null
          severidade?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_notificacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_notificacoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_solicitacoes: {
        Row: {
          cc_id: string | null
          created_at: string
          empresa_id: string | null
          id: string
          loja_id: string
          payload: Json
          pessoa_id: string
          referencia_id: string | null
          solicitado_por: string | null
          status: string
          tipo: string
          titulo: string | null
          updated_at: string
          vinculo_id: string | null
        }
        Insert: {
          cc_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          loja_id: string
          payload?: Json
          pessoa_id: string
          referencia_id?: string | null
          solicitado_por?: string | null
          status?: string
          tipo: string
          titulo?: string | null
          updated_at?: string
          vinculo_id?: string | null
        }
        Update: {
          cc_id?: string | null
          created_at?: string
          empresa_id?: string | null
          id?: string
          loja_id?: string
          payload?: Json
          pessoa_id?: string
          referencia_id?: string | null
          solicitado_por?: string | null
          status?: string
          tipo?: string
          titulo?: string | null
          updated_at?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_solicitacoes_cc_id_fkey"
            columns: ["cc_id"]
            isOneToOne: false
            referencedRelation: "centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_solicitacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_solicitacoes_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_solicitacoes_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_solicitacoes_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "pessoa_vinculo"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_tipos_documento: {
        Row: {
          ativo: boolean
          created_at: string
          empresa_id: string | null
          exige_validade: boolean
          id: string
          nome: string
          obrigatorio: boolean
          processo: string
          sensivel: boolean
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string | null
          exige_validade?: boolean
          id?: string
          nome: string
          obrigatorio?: boolean
          processo?: string
          sensivel?: boolean
        }
        Update: {
          ativo?: boolean
          created_at?: string
          empresa_id?: string | null
          exige_validade?: boolean
          id?: string
          nome?: string
          obrigatorio?: boolean
          processo?: string
          sensivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "rh_tipos_documento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_treinamentos: {
        Row: {
          carga_horaria_h: number | null
          certificado_id: string | null
          created_at: string
          created_by: string | null
          data_realizacao: string
          descricao: string | null
          id: string
          instituicao: string | null
          loja_id: string
          norma: string
          pessoa_id: string
          validade: string | null
        }
        Insert: {
          carga_horaria_h?: number | null
          certificado_id?: string | null
          created_at?: string
          created_by?: string | null
          data_realizacao: string
          descricao?: string | null
          id?: string
          instituicao?: string | null
          loja_id: string
          norma: string
          pessoa_id: string
          validade?: string | null
        }
        Update: {
          carga_horaria_h?: number | null
          certificado_id?: string | null
          created_at?: string
          created_by?: string | null
          data_realizacao?: string
          descricao?: string | null
          id?: string
          instituicao?: string | null
          loja_id?: string
          norma?: string
          pessoa_id?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rh_treinamentos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_treinamentos_pessoa_id_fkey"
            columns: ["pessoa_id"]
            isOneToOne: false
            referencedRelation: "pessoas"
            referencedColumns: ["id"]
          },
        ]
      }
      rh_vagas: {
        Row: {
          aberta_em: string
          cargo_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          empresa_id: string | null
          fechada_em: string | null
          id: string
          loja_id: string
          quantidade: number
          salario_max: number | null
          salario_min: number | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          aberta_em?: string
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          fechada_em?: string | null
          id?: string
          loja_id: string
          quantidade?: number
          salario_max?: number | null
          salario_min?: number | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          aberta_em?: string
          cargo_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          empresa_id?: string | null
          fechada_em?: string | null
          id?: string
          loja_id?: string
          quantidade?: number
          salario_max?: number | null
          salario_min?: number | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rh_vagas_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_vagas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rh_vagas_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      rubricas: {
        Row: {
          codigo: string
          created_at: string
          descricao: string
          empresa_id: string | null
          entra_media_13: boolean
          entra_media_aviso: boolean
          entra_media_ferias: boolean
          id: string
          incide_fgts: boolean
          incide_inss: boolean
          incide_irrf: boolean
          natureza_esocial: string | null
          tipo: string
          vigencia_fim: string | null
          vigencia_inicio: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao: string
          empresa_id?: string | null
          entra_media_13?: boolean
          entra_media_aviso?: boolean
          entra_media_ferias?: boolean
          id?: string
          incide_fgts?: boolean
          incide_inss?: boolean
          incide_irrf?: boolean
          natureza_esocial?: string | null
          tipo?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          entra_media_13?: boolean
          entra_media_aviso?: boolean
          entra_media_ferias?: boolean
          id?: string
          incide_fgts?: boolean
          incide_inss?: boolean
          incide_irrf?: boolean
          natureza_esocial?: string | null
          tipo?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubricas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_contagem: {
        Row: {
          created_at: string
          criada_por: string
          display_no: string
          filtros: Json
          finalizada_em: string | null
          id: string
          log: Json
          loja_id: string
          observacao: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criada_por: string
          display_no?: string
          filtros?: Json
          finalizada_em?: string | null
          id?: string
          log?: Json
          loja_id: string
          observacao?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criada_por?: string
          display_no?: string
          filtros?: Json
          finalizada_em?: string | null
          id?: string
          log?: Json
          loja_id?: string
          observacao?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_contagem_loja_id_fkey"
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
      system_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      titulos: {
        Row: {
          aditivo_id: string | null
          categoria: string | null
          cliente_id: string
          contrato_id: string | null
          created_at: string
          emissao: string
          fatura_id: string | null
          forma: string | null
          id: string
          loja_id: string
          numero: string
          observacoes: string | null
          origem: string | null
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
          aditivo_id?: string | null
          categoria?: string | null
          cliente_id: string
          contrato_id?: string | null
          created_at?: string
          emissao?: string
          fatura_id?: string | null
          forma?: string | null
          id?: string
          loja_id: string
          numero: string
          observacoes?: string | null
          origem?: string | null
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
          aditivo_id?: string | null
          categoria?: string | null
          cliente_id?: string
          contrato_id?: string | null
          created_at?: string
          emissao?: string
          fatura_id?: string | null
          forma?: string | null
          id?: string
          loja_id?: string
          numero?: string
          observacoes?: string | null
          origem?: string | null
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
            foreignKeyName: "titulos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_fatura_id_fkey"
            columns: ["fatura_id"]
            isOneToOne: false
            referencedRelation: "faturas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "titulos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      titulos_pagar: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          emissao: string
          fornecedor_id: string | null
          id: string
          loja_id: string
          numero: string
          observacoes: string | null
          pago: number
          saldo: number
          status: string
          subcategoria: string | null
          updated_at: string
          valor: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          emissao?: string
          fornecedor_id?: string | null
          id?: string
          loja_id: string
          numero: string
          observacoes?: string | null
          pago?: number
          saldo?: number
          status?: string
          subcategoria?: string | null
          updated_at?: string
          valor?: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          emissao?: string
          fornecedor_id?: string | null
          id?: string
          loja_id?: string
          numero?: string
          observacoes?: string | null
          pago?: number
          saldo?: number
          status?: string
          subcategoria?: string | null
          updated_at?: string
          valor?: number
          vencimento?: string
        }
        Relationships: [
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
          descricao: string | null
          grupo_id: string | null
          id: string
          modelo_id: string | null
          quantidade: number
          serie: string | null
          tipo: string
          transferencia_id: string
        }
        Insert: {
          codigo_interno?: string | null
          created_at?: string
          descricao?: string | null
          grupo_id?: string | null
          id?: string
          modelo_id?: string | null
          quantidade?: number
          serie?: string | null
          tipo: string
          transferencia_id: string
        }
        Update: {
          codigo_interno?: string | null
          created_at?: string
          descricao?: string | null
          grupo_id?: string | null
          id?: string
          modelo_id?: string | null
          quantidade?: number
          serie?: string | null
          tipo?: string
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
          created_at: string
          detalhe: string | null
          id: string
          por_usuario_id: string | null
          por_usuario_nome: string | null
          transferencia_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhe?: string | null
          id?: string
          por_usuario_id?: string | null
          por_usuario_nome?: string | null
          transferencia_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhe?: string | null
          id?: string
          por_usuario_id?: string | null
          por_usuario_nome?: string | null
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
          created_by: string | null
          destino_loja_id: string
          id: string
          motorista: string | null
          numero: number
          observacoes: string | null
          origem_loja_id: string
          recusa: Json | null
          status: string
          updated_at: string
          veiculo: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destino_loja_id: string
          id?: string
          motorista?: string | null
          numero: number
          observacoes?: string | null
          origem_loja_id: string
          recusa?: Json | null
          status?: string
          updated_at?: string
          veiculo?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destino_loja_id?: string
          id?: string
          motorista?: string | null
          numero?: number
          observacoes?: string | null
          origem_loja_id?: string
          recusa?: Json | null
          status?: string
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
      user_grupos: {
        Row: {
          created_at: string
          grupo_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          grupo_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          grupo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_grupos_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lojas_permitidas: {
        Row: {
          loja_id: string
          origem_grupo_id: string | null
          user_id: string
        }
        Insert: {
          loja_id: string
          origem_grupo_id?: string | null
          user_id: string
        }
        Update: {
          loja_id?: string
          origem_grupo_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lojas_permitidas_origem_grupo_id_fkey"
            columns: ["origem_grupo_id"]
            isOneToOne: false
            referencedRelation: "grupos_lojas"
            referencedColumns: ["id"]
          },
        ]
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
      variacoes_equipamento: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          ordem: number
          tipo: string
          updated_at: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          ordem?: number
          tipo: string
          updated_at?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          ordem?: number
          tipo?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          created_at: string
          id: string
          instance_name: string
          instance_token: string | null
          loja_id: string
          phone_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          instance_name: string
          instance_token?: string | null
          loja_id: string
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          instance_name?: string
          instance_token?: string | null
          loja_id?: string
          phone_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: true
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_verifications: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          verified: boolean
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          verified?: boolean
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      equipamentos_depreciacao: {
        Row: {
          codigo_interno: string | null
          data_aquisicao: string | null
          depreciacao_acumulada: number | null
          depreciacao_mensal: number | null
          grupo_nome: string | null
          id: string | null
          meses_uso: number | null
          modelo_nome: string | null
          percentual_depreciado: number | null
          valor_aquisicao: number | null
          valor_contabil: number | null
          valor_residual: number | null
          vida_util_meses: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _frota_ajustar_saldo_modelo: {
        Args: {
          p_delta: number
          p_evento: Json
          p_loja_id: string
          p_modelo_id: string
        }
        Returns: undefined
      }
      abrir_contagem_almox: {
        Args: {
          p_grupo?: string
          p_incluir_zerados?: boolean
          p_loja_id: string
          p_observacoes?: string
          p_tipo?: string
        }
        Returns: string
      }
      ajustar_saldo_estoque: {
        Args: {
          p_diferenca: number
          p_item_id: string
          p_justificativa: string
          p_loja_id: string
        }
        Returns: undefined
      }
      atualizar_status_ferias: { Args: never; Returns: undefined }
      atualizar_status_transferencia: {
        Args: { p_recusa?: Json; p_status: string; p_transferencia_id: string }
        Returns: undefined
      }
      cancelar_contagem_almox: {
        Args: { p_contagem_id: string }
        Returns: undefined
      }
      compras_pode_cotar_os: { Args: { p_loja_id: string }; Returns: boolean }
      compras_pode_gerenciar: { Args: { p_loja_id: string }; Returns: boolean }
      compras_pode_loja: { Args: { p_loja_id: string }; Returns: boolean }
      criar_cotacao_de_os: { Args: { p_os_id: string }; Returns: string }
      criar_cotacao_de_requisicao: {
        Args: { p_requisicao_id: string }
        Returns: string
      }
      criar_cotacao_direta: {
        Args: { p_itens: Json; p_loja_id: string }
        Returns: string
      }
      criar_transferencia: {
        Args: {
          p_destino_loja_id: string
          p_itens: Json
          p_motorista?: string
          p_observacoes?: string
          p_origem_loja_id: string
          p_veiculo?: string
        }
        Returns: Json
      }
      fin_efetivar_transferencia: { Args: { p_id: string }; Returns: undefined }
      fin_estornar_transferencia: {
        Args: { p_id: string; p_motivo: string }
        Returns: string
      }
      gerar_codigo_fornecedor: { Args: never; Returns: string }
      gerar_ferias_periodos: {
        Args: { p_pessoa_id: string }
        Returns: undefined
      }
      gerar_notificacoes_rh: { Args: never; Returns: number }
      gerar_numero_os: { Args: { p_loja_id: string }; Returns: string }
      gerar_pedidos_de_cotacao: {
        Args: { p_cotacao_id: string }
        Returns: string
      }
      gerar_provisao_snapshots: {
        Args: { p_competencia?: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { u_id: string }; Returns: boolean }
      is_demo_user: { Args: never; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
      job_rh_diario: { Args: never; Returns: number }
      param_trab: {
        Args: { p_chave: string; p_empresa?: string }
        Returns: number
      }
      processar_contagem_almox: {
        Args: { p_contagem_id: string }
        Returns: number
      }
      recompute_ferias_faltas: {
        Args: { p_pessoa_id: string }
        Returns: undefined
      }
      registrar_recebimento: {
        Args: { p_itens: Json; p_nf: Json; p_pedido_id: string }
        Returns: string
      }
      rpc_aplicar_substituicao: { Args: { p: Json }; Returns: undefined }
      rpc_criar_os_de_solicitacao: { Args: { p: Json }; Returns: string }
      rpc_criar_solicitacao: { Args: { p: Json }; Returns: string }
      rpc_mudar_status: { Args: { p: Json }; Returns: undefined }
      rpc_registrar_laudo: { Args: { p: Json }; Returns: undefined }
      simular_rescisao: {
        Args: { p_data: string; p_motivo: string; p_pessoa_id: string }
        Returns: string
      }
      sync_lojas_do_usuario: { Args: { p_user_id: string }; Returns: undefined }
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
        | "master"
        | "operacao"
        | "usuario"
      area_oficina: "AMARELA" | "VERMELHA" | "AZUL" | "VERDE" | "CINZA"
      class_defeito: "DESGASTE" | "MAU_USO" | "NA"
      origem_os: "POS_LOCACAO" | "AUDITORIA" | "SUPORTE"
      prioridade_os: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
      prioridade_tarefa: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
      situacao_pessoa: "ativo" | "inativo" | "ferias" | "afastado"
      status_os:
        | "EM_ANALISE"
        | "AGUARD_PECA"
        | "EM_REPARO"
        | "EM_TESTE"
        | "CONCLUIDA"
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
  graphql_public: {
    Enums: {},
  },
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
        "master",
        "operacao",
        "usuario",
      ],
      area_oficina: ["AMARELA", "VERMELHA", "AZUL", "VERDE", "CINZA"],
      class_defeito: ["DESGASTE", "MAU_USO", "NA"],
      origem_os: ["POS_LOCACAO", "AUDITORIA", "SUPORTE"],
      prioridade_os: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
      prioridade_tarefa: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
      situacao_pessoa: ["ativo", "inativo", "ferias", "afastado"],
      status_os: [
        "EM_ANALISE",
        "AGUARD_PECA",
        "EM_REPARO",
        "EM_TESTE",
        "CONCLUIDA",
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
      tipo_os: ["PREVENTIVA", "CORRETIVA"],
      tipo_tarefa_logistica: ["ENTREGA", "RETIRADA", "SUPORTE"],
    },
  },
} as const
