# LocaHub ERP - Sistema de Gestão de Locação e Ativos

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18.3.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)

> [!IMPORTANT]
> **LocaHub** é uma solução de Enterprise Resource Planning (ERP) completa e especializada, desenvolvida para transformar a gestão de empresas de locação de equipamentos. Este documento detalha todas as capacidades técnicas e funcionais do sistema.

---

## � Sobre o Projeto

O **LocaHub ERP** é mais do que um sistema de cadastro; é uma plataforma operacional que integra todas as áreas vitais de uma locadora. Diferente de ERPs genéricos, ele foi arquitetado pensando nos desafios específicos deste nicho:
1.  **Disponibilidade Real vs Teórica**: Controle preciso do que está no estoque, no cliente, em manutenção ou em trânsito.
2.  **Ciclo de Vida do Ativo**: Rastreamento desde a compra, locações, manutenções, depreciação até o descarte.
3.  **Logística Complexa**: Roteirização de entregas e coletas de equipamentos pesados.

O sistema elimina planilhas paralelas e centraliza a inteligência do negócio em um único banco de dados confiável e em tempo real.

---

## 🏗️ Arquitetura Técnica

O projeto foi construído sobre pilares de performance, escalabilidade e manutenibilidade.

### Tecnologias Principais

| Tecnologia | Função no Projeto | Justificativa |
|------------|-------------------|---------------|
| **React 18** | Frontend Library | Utiliza recursos modernos como Concurrent Mode e Hooks para interfaces reativas. |
| **Vite** | Build Tool | Proporciona um ambiente de desenvolvimento (HMR) instantâneo e builds de produção otimizados. |
| **TypeScript** | Linguagem | Garante segurança de tipo em todo o código, reduzindo drásticamente bugs em runtime. |
| **Supabase** | Backend-as-a-Service | Fornece Banco de Dados (PostgreSQL), Autenticação, Realtime Subscriptions e Edge Functions em uma única plataforma escalável. |
| **Zustand** | State Management | Gerenciamento de estado global leve e performático, evitando prop-drilling. |
| **React Query** | Server State | Gerencia cache, refetching e sincronização de dados com o backend, vital para dashboards em tempo real. |
| **TailwindCSS** | Styling | Permite desenvolvimento rápido de UI com classes utilitárias e design system consistente. |
| **Shadcn/UI** | Component Library | Componentes acessíveis e customizáveis baseados em Radix UI. |

### Estrutura de Arquivos

A organização do código segue uma abordagem modular híbrida, facilitando a escalabilidade do time de desenvolvimento:

```bash
src/
├── components/           # Componentes Globais Reutilizáveis
│   ├── ui/               # Componentes Shadcn (Button, Input, Card...)
│   ├── layout/           # Estruturas de página (TopBar, Sidebar)
│   └── ...
├── modules/              # Lógica de Negócio Isolada (Domain Driven)
│   ├── rh/               # Gestão de Pessoas, Férias, Portal do Colaborador
│   ├── logistica/        # Roteirização, App Motorista, Gestão de Frota
│   ├── manutencao/       # Painel do Mecânico, OS, Checklists
│   └── ...
├── pages/                # Rotas da Aplicação
│   ├── logistica/        # Páginas visuais do módulo logística
│   ├── NovoContratoV2.tsx # Wizard complexo de criação de contratos
│   └── ...
├── hooks/                # Custom Hooks (Lógica encapsulada)
│   ├── useAuth.ts        # Sessão do usuário
│   ├── useSupabase...    # Hooks específicos de entidades (Clientes, Equipamentos)
│   └── ...
├── services/             # Camada de Dados
│   └── api/              # Integrações externas e chamadas diretas ao banco
└── lib/                  # Utilitários Puros
    ├── utils.ts          # Helpers gerais
    └── contratos-v2-utils.ts # Regras de negócio específicas de contratos
```

---

## 🚀 Funcionalidades e Módulos Detalhados

O sistema é dividido em grandes módulos operacionais que conversam entre si. Abaixo, detalhamos cada um.

### 1. 📄 Gestão de Contratos (V2)

Este é o módulo central de vendas. O fluxo de criação de contratos (`NovoContratoV2`) é um wizard passo-a-passo projetado para evitar erros operacionais.

**Etapas do Processo de Locação:**
1.  **Seleção Inteligente de Cliente**:
    *   Busca integrada na base.
    *   *Verificação Automática de Bloqueios*: O sistema checa inadimplência financeira ou pendências documentais e bloqueia a locação se necessário, exigindo liberação de um supervisor.
2.  **Seleção de Equipamentos (O Core do Negócio)**:
    *   **Controle Híbrido**: Suporta tanto equipamentos **Serializados** (máquinas grandes, identificadas por patrimônio) quanto **Saldo/Grupo** (andaimes, escoras, peças a granel).
    *   **Validação de Estoque em Tempo Real**: Ao adicionar um item, o sistema consulta o saldo físico, subtrai reservas futuras e itens em manutenção, impedindo o *overbooking* (alugar o que não tem).
    *   **Precificação Dinâmica**: Tabelas de preço por período (Diária, Semanal, Quinzenal, Mensal) aplicadas automaticamente.
3.  **Logística de Entrega**: Agendamento de data, janela de horário (Manhã/Tarde) e definição se é Entrega pela Loja ou Retirada pelo Cliente.
4.  **Condições Comerciais**: Aplicação de taxas de deslocamento, descontos e observações contratuais.
5.  **Faturamento**: Definição da forma de pagamento (Boleto, Pix, Cartão) e condições (Faturamento único, Mês a mês, etc).
6.  **Geração de Documentos**: Criação automática da minuta do contrato e link para assinatura digital.

---

### 2. 🔧 Manutenção e Oficina

Um sistema completo de gestão de ativos que visa maximizar o "Uptime" dos equipamentos. Utiliza um painel visual (Kanban) para gestão do fluxo de trabalho.

**Código de Cores de Status (Workflow Visual):**
*   🟡 **Amarela (Pós-Locação/Triagem)**: Equipamento acabou de voltar de uma obra. Precisa ser inspecionado.
*   🔴 **Vermelha (Diagnóstico)**: Equipamento apresentou defeito. Está com o mecânico identificando o problema e levantando peças necessárias.
*   🔵 **Azul (Aguardando Peças)**: Diagnóstico feito, mas a oficina está parada esperando a chegada de peças compradas.
*   🟢 **Verde (Liberado)**: Manutenção concluída, equipamento testado, limpo e pronto para voltar ao estoque de locação.
*   ⚫ **Cinza (Baixa/Sucata)**: Equipamento inviável para conserto, retirado do ativo.

**Funcionalidades Chave:**
*   **Ordens de Serviço (OS)**: Abertura, acompanhamento de horas trabalhadas e peças utilizadas.
*   **Checklists Digitais**: Formulários de inspeção de entrada e saída personalizáveis por tipo de equipamento.
*   **Cálculo de SLA**: Monitoramento do tempo que cada equipamento fica parado em manutenção.

---

### 3. 🚛 Logística e Frota

O módulo de logística conecta o comercial (o que foi vendido) com a realidade da entrega.

*   **Roteirização de Entregas**: Planejamento diário de cargas. Agrupa entregas por região para otimizar o uso dos caminhões.
*   **Gestão de Motoristas**: Controle da equipe de campo.
*   **Status de Entrega Mobile**: Interface simplificada para o motorista marcar "Saiu para Entrega", "Entregue" ou "Ocorrência" (ex: cliente não estava) em tempo real.
*   **Transferência entre Lojas**: Controle de movimentação de estoque entre filiais para atender demandas específicas.

---

### 4. 🏢 Recursos Humanos (RH)

Gestão das pessoas que fazem a empresa funcionar, com foco em segurança de dados e processos.

*   **Perfil do Colaborador 360º**: Dados pessoais, documentos, histórico de cargos e salários.
*   **Controle de Ponto e Banco de Horas**: Registro de jornada.
*   **Portal do Colaborador**: Área onde o funcionário pode ver seus holerites, saldo de banco de horas e solicitar férias.
*   **Gestão de Acessos (RBAC)**: Interface para definir exatamente o que cada cargo pode fazer no sistema (ex: Vendedor acessa Contratos, mas não vê DRE Financeiro).

---

### 5. 💰 Financeiro

Controle rigoroso da saúde financeira, totalmente integrado aos contratos.

*   **Contas a Receber**: Faturas geradas automaticamente a partir dos contratos de locação. Gestão de régua de cobrança e inadimplência.
*   **Contas a Pagar**: Controle de fornecedores, compras de peças e despesas operacionais.
*   **DRE Gerencial**: Demonstrativo de Resultados do Exercício em tempo real, permitindo ver lucro/prejuízo por competência.
*   **Fluxo de Caixa**: Previsão de entradas e saídas diárias.
*   **Integração Bancária**: Emissão de Boletos e conciliação de pagamentos Pix.

---

### 6. 🛒 Compras e 📦 Almoxarifado

Gestão da cadeia de suprimentos para garantir que a operação não pare.

*   **Requisição de Compras**: Qualquer setor (ex: manutenção pedindo peça) abre uma requisição.
*   **Cotação e Pedido**: O setor de compras cota com fornecedores, aprova e emite o Pedido de Compra.
*   **Recebimento Físico**: O almoxarifado confere a mercadoria que chegou. Se for peça, vai para estoque; se for equipamento novo, inicia o processo de "tombamento" (cadastro de ativo).
*   **Inventário**: Ferramentas para contagem cíclica e ajuste de estoque físico vs sistema.

---

## 🔒 Segurança e Autenticação

A segurança é prioridade no LocaHub.

*   **Autenticação Robusta**: Utiliza Supabase Auth (compatível com migração de Auth0).
*   **Row Level Security (RLS)**: A segurança é aplicada no nível do banco de dados. Um usuário de uma loja não consegue, tecnicamente, consultar dados de outra loja a menos que tenha permissão explícita.
*   **Audit Log**: Todas as ações críticas (excluir um contrato, alterar um preço) são registradas com data, hora e usuário responsável.

---

## ⚙️ Guia de Instalação e Configuração

Siga estes passos para rodar o projeto em seu ambiente local.

### 1. Pré-requisitos
*   **Node.js**: Versão 18 ou superior.
*   **Gerenciador de Pacotes**: npm ou yarn.
*   **Ambiente Git**: Para clonar o repositório.

### 2. Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/locahub.git

# 2. Entre na pasta do projeto
cd locahub

# 3. Instale as dependências externas
npm install
```

### 3. Configuração de Variáveis de Ambiente

O sistema não funciona sem as chaves de API. Você deve criar um arquivo `.env` na raiz do projeto.

```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Abra o arquivo `.env` e preencha as seguintes chaves obrigatórias:

```env
# URL do seu projeto Supabase (encontrado em Project Settings > API)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave Anônima Pública (encontrada em Project Settings > API)
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxh...

# (Opcional) Configurações legadas de Auth0, caso ainda utilize
VITE_AUTH0_DOMAIN=...
VITE_AUTH0_CLIENT_ID=...
```

### 4. Executando o Projeto

```bash
# Inicia o servidor de desenvolvimento local
npm run dev
```

O terminal mostrará o endereço local, geralmente `http://localhost:8080`. Abra este endereço no seu navegador.

### 5. Primeiro Acesso (Ambiente Dev)

Para facilitar o desenvolvimento, você pode utilizar o **DevRoleSwitcher** na barra superior (ícone de engrenagem ou badge) para alternar entre perfis de usuário (Vendedor, Admin, Mecânico) e testar as diferentes permissões em tempo real.

---

## 🤝 Como Contribuir

Contribuições são fundamentais para a evolução do LocaHub.

1.  Faça um **Fork** do projeto.
2.  Crie uma Branch para sua feature (`git checkout -b feature/MinhaNovaFuncionalidade`).
3.  Desenvolva e realize os Commits (`git commit -m 'feat: Adiciona funcionalidade X'`).
4.  Faça o Push para a Branch (`git push origin feature/MinhaNovaFuncionalidade`).
5.  Abra um **Pull Request** detalhando suas alterações.

---

## 📄 Licença

Este projeto é proprietário e confidencial. O uso não autorizado, cópia ou distribuição é estritamente proibido sem permissão expressa.