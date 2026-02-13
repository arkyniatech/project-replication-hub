#!/bin/bash

# Script de configuração para o aplicativo locacaoERP no EasyPanel Box
# Este script automatiza a instalação de dependências, construção do projeto e inicialização da aplicação.
# Compatível com projetos React usando Vite.

set -e  # Parar o script em caso de erro

echo "🚀 Iniciando configuração do locacaoERP no EasyPanel..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "📦 Node.js não encontrado. Instalando Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
    apt-get install -y nodejs
    echo "✅ Node.js instalado com sucesso."
else
    echo "✅ Node.js já está instalado."
fi

# Verificar versão do Node.js
NODE_VERSION=$(node --version)
echo "📋 Versão do Node.js: $NODE_VERSION"

# Verificar se npm está disponível
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instalando npm..."
    apt-get install -y npm
fi

# Instalar dependências do projeto
echo "📦 Instalando dependências do projeto..."
npm install

# Construir o projeto para produção
echo "🔨 Construindo o projeto..."
npm run build

# Verificar se o build foi bem-sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Diretório 'dist' não foi criado. Build falhou."
    exit 1
fi

echo "✅ Build concluído com sucesso."

# Iniciar a aplicação em modo produção
echo "🌐 Iniciando a aplicação em modo produção..."
echo "📝 A aplicação estará disponível na porta 4173 (padrão do vite preview)."
echo "🔗 Acesse via o EasyPanel ou diretamente na URL configurada."

# Usar npm run preview para servir o build
npm run preview -- --host 0.0.0.0 --port 4173