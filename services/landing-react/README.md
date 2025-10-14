# Quiz Landing React

Landing page moderna em React para captação de leads, convertida do HTML original com as melhores práticas de desenvolvimento.

## 🚀 Tecnologias

- **React 18** - Framework principal
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Tailwind CSS** - Styling com design system
- **React Hook Form + Zod** - Formulários e validação
- **Google Sign-In** - Autenticação social
- **Lucide React** - Ícones

## 📦 Instalação

```bash
npm install
```

## 🔧 Configuração

Copie `.env.example` para `.env` e configure:

```env
VITE_API_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🏃♂️ Execução

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
│   ├── ui/             # Componentes base (Button, Input, Checkbox)
│   ├── Header.tsx      # Cabeçalho
│   ├── LeadForm.tsx    # Formulário principal
│   ├── StepIndicator.tsx # Indicador de passos
│   └── GoogleSignIn.tsx # Integração Google
├── hooks/              # Custom hooks
├── services/           # Serviços de API
├── types/              # Definições TypeScript
└── utils/              # Utilitários e validações
```

## 🎨 Design System

- **Cores**: Dark theme com gradientes roxos
- **Tipografia**: Inter font family
- **Layout**: Responsivo mobile-first
- **Componentes**: Sistema próprio de componentes UI

## ✨ Funcionalidades

- **Formulário Multi-step**: 2 etapas com validação
- **Google Sign-In**: Cadastro rápido com Google
- **Validações**: CPF, telefone, CEP, email
- **Responsivo**: Funciona perfeitamente em mobile
- **Acessibilidade**: Componentes acessíveis
- **Performance**: Otimizado com Vite

## 🔧 Validações

- **CPF**: Validação completa com dígitos verificadores
- **Telefone**: Formato brasileiro (+55)
- **CEP**: 8 dígitos numéricos
- **Email**: Validação RFC compliant
- **Campos obrigatórios**: Nome, email, termos

## 🐳 Docker

```bash
# Build
docker build -t quiz-landing-react .

# Run
docker run -p 80:80 quiz-landing-react
```