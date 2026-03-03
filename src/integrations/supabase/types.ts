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
          ativo: boolean
          codigo_interno: string
          created_at: string
          created_by: string | null
          grupo_id: string
          historico: Json | null
          id: string
          loja_atual_id: string
          modelo_id: string
          numero_serie: string | null
          observacoes: string | null
          saldos_por_loja: Json | null
          status_global: string
          tipo: string
          updated_at: string
          valor_indenizacao: number
        }
        Insert: {
          ativo?: boolean
          codigo_interno: string
          created_at?: string
          created_by?: string | null
          grupo_id: string
          historico?: Json | null
          id?: string
          loja_atual_id: string
          modelo_id: string
          numero_serie?: string | null
          observacoes?: string | null
          saldos_por_loja?: Json | null
          status_global?: string
          tipo: string
          updated_at?: string
          valor_indenizacao?: number
        }
        Update: {
          ativo?: boolean
          codigo_interno?: string
          created_at?: string
          created_by?: string | null
          grupo_id?: string
          historico?: Json | null
          id?: string
          loja_atual_id?: string
          modelo_id?: string
          numero_serie?: string | null
          observacoes?: string | null
          saldos_por_loja?: Json | null
          status_global?: string
          tipo?: string
          updated_at?: string
          valor_indenizacao?: number
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
            foreignKeyName: "faturas_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
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
        ]
      }
      logistica_tarefas: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          contrato_id: string | null
          created_at: string
          duracao_min: number | null
          endereco: Json | null
          id: string
          janela: string | null
          latitude: number | null
          loja_id: string
          longitude: number | null
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
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          contrato_id?: string | null
          created_at?: string
          duracao_min?: number | null
          endereco?: Json | null
          id?: string
          janela?: string | null
          latitude?: number | null
          loja_id: string
          longitude?: number | null
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
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          contrato_id?: string | null
          created_at?: string
          duracao_min?: number | null
          endereco?: Json | null
          id?: string
          janela?: string | null
          latitude?: number | null
          loja_id?: string
          longitude?: number | null
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
            foreignKeyName: "logistica_tarefas_loja_id_fkey"
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
          codigo_numerico: number | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          codigo_numerico?: number | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          codigo_numerico?: number | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
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
      [_ in never]: never
    }
    Functions: {
      gerar_codigo_fornecedor: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active: { Args: { u_id: string }; Returns: boolean }
      is_master: { Args: { _user_id: string }; Returns: boolean }
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
      area_oficina: "AMARELA" | "VERMELHA" | "AZUL" | "VERDE" | "CINZA"
      class_defeito: "DESGASTE" | "MAU_USO" | "NA"
      origem_os: "POS_LOCACAO" | "AUDITORIA" | "SUPORTE"
      prioridade_os: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA"
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
      tipo_os: "PREVENTIVA" | "CORRETIVA"
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
        "master",
      ],
      area_oficina: ["AMARELA", "VERMELHA", "AZUL", "VERDE", "CINZA"],
      class_defeito: ["DESGASTE", "MAU_USO", "NA"],
      origem_os: ["POS_LOCACAO", "AUDITORIA", "SUPORTE"],
      prioridade_os: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
      situacao_pessoa: ["ativo", "inativo", "ferias", "afastado"],
      status_os: [
        "EM_ANALISE",
        "AGUARD_PECA",
        "EM_REPARO",
        "EM_TESTE",
        "CONCLUIDA",
      ],
      status_pedido: ["RASCUNHO", "FINALIZADO", "COMPRADO", "PARCIAL", "TOTAL"],
      tipo_os: ["PREVENTIVA", "CORRETIVA"],
    },
  },
} as const
