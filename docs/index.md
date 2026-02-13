# 📚 Documentação Técnica - Locação ERP

Bem-vindo à documentação técnica completa do sistema **Locação ERP**. Esta documentação abrange todos os aspectos técnicos do sistema, desde arquitetura até guias específicos de implementação.

## 📋 Índice

### 🔐 Autenticação e Segurança
- **[Sistema de Autenticação](authentication.md)** - Migração Auth0 para Supabase Auth
  - Fluxos de autenticação
  - Login/Registro
  - Criação de usuários
  - RBAC (Role-Based Access Control)
  - Testes automatizados
  - Configurações e guias

### 🏗️ Arquitetura e Desenvolvimento
- **[Arquitetura do Sistema](architecture.md)** - Visão geral da arquitetura
- **[Guia de Desenvolvimento](development.md)** - Padrões e práticas
- **[API Reference](api.md)** - Documentação das APIs

### 📊 Módulos do Sistema
- **[Módulo RH](modules/rh.md)** - Gestão de Recursos Humanos
- **[Módulo Logística](modules/logistica.md)** - Controle Logístico
- **[Módulo Financeiro](modules/financeiro.md)** - Gestão Financeira
- **[Módulo Equipamentos](modules/equipamentos.md)** - Controle Patrimonial

### 🛠️ Configuração e Deploy
- **[Configuração do Ambiente](setup.md)** - Instalação e configuração
- **[Deploy e CI/CD](deploy.md)** - Estratégias de deployment
- **[Monitoramento](monitoring.md)** - Logs e observabilidade

### 🧪 Testes e Qualidade
- **[Testes Automatizados](testing.md)** - Estratégias de teste
- **[Code Quality](quality.md)** - Linting, formatação e padrões

## 🚀 Início Rápido

Para começar rapidamente:

1. **[Instalação](setup.md)** - Configure seu ambiente
2. **[Primeiro Login](authentication.md#guia-de-uso-para-administradores)** - Configure acesso admin
3. **[Criar Usuários](authentication.md#criação-de-usuários-reais)** - Adicione usuários do sistema

## 📖 Convenções da Documentação

### Formatação de Código
- **Funções**: `nomeDaFuncao()`
- **Arquivos**: `src/components/Component.tsx`
- **Comandos**: `npm run dev`
- **Variáveis**: `VITE_SUPABASE_URL`

### Links Cruzados
- Links para arquivos específicos: [`src/components/auth/LoginForm.tsx`](src/components/auth/LoginForm.tsx:1)
- Referências a seções: [Sistema RBAC](#sistema-rbac-mantido)

### Status dos Documentos
- ✅ **Completo**: Documentação finalizada e atualizada
- 🔄 **Em Revisão**: Conteúdo em revisão
- 📝 **Rascunho**: Documentação inicial/precisa de atualização

## 🤝 Contribuição

Para contribuir com a documentação:

1. Siga os padrões estabelecidos
2. Use Markdown consistente
3. Mantenha links atualizados
4. Inclua exemplos práticos
5. Teste os comandos e códigos fornecidos

## 📞 Suporte

- **Issues**: Relate problemas no repositório
- **Discussions**: Tire dúvidas na aba Discussions
- **Wiki**: Consulte guias específicos na Wiki

---

**Última atualização**: Janeiro 2025
**Versão do Sistema**: v0.0.0