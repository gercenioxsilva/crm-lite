# Quiz Backoffice React

Aplicação React moderna para o backoffice do sistema Quiz, construída com as melhores práticas de desenvolvimento frontend.

## 🚀 Tecnologias

- **React 18** - Framework principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Styling
- **React Router** - Roteamento
- **React Hook Form + Zod** - Formulários e validação
- **TanStack Query** - Gerenciamento de estado servidor
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones

## 📦 Instalação

```bash
npm install
```

## 🔧 Configuração

Copie `.env.example` para `.env` e configure:

```env
VITE_API_URL=http://localhost:3000
```

## 🏃‍♂️ Execução

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Preview
npm run preview
```

## 🏗️ Estrutura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Button, Input, etc)
│   └── Layout.tsx      # Layout principal
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx   # Dashboard com métricas
│   ├── Leads.tsx       # Gerenciamento de leads
│   ├── Reports.tsx     # Relatórios
│   └── Login.tsx       # Autenticação
├── hooks/              # Custom hooks
├── services/           # Serviços de API
├── types/              # Definições TypeScript
└── utils/              # Utilitários
```

## 🎨 Design System

- **Cores**: Sistema de cores dark com gradientes
- **Tipografia**: Inter font family
- **Componentes**: Biblioteca própria de componentes UI
- **Responsividade**: Mobile-first approach

## 🔐 Autenticação

Sistema de autenticação JWT com:
- Login/logout
- Proteção de rotas
- Validação automática de token
- Redirecionamento automático

## 📊 Funcionalidades

- **Dashboard**: Métricas em tempo real e gráficos
- **Leads**: Listagem, filtros e exportação
- **Relatórios**: Análises detalhadas
- **Responsivo**: Funciona em desktop e mobile