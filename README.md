# Norte Forte - Sistema de Gestão

Este é um sistema de gestão completo desenvolvido com Next.js, React e Firebase, projetado para otimizar as operações e finanças de negócios do setor de proteína animal.

## Funcionalidades Principais

- **Autenticação de Usuários:** Login e registro seguro.
- **Dashboard:** Visão geral com estatísticas financeiras, movimentações de estoque e desempenho.
- **Cadastros Essenciais:**
  - Clientes e Fornecedores
  - Produtos (Venda, Uso Interno, Matéria-Prima)
  - Funcionários e Cargos
  - Categorias e Unidades de Medida
- **Gestão de Operações:**
  - Compras de Matéria-Prima e Insumos
  - Registro de Abates
  - Controle de Produção e Perdas
  - Movimentação e Saldo de Estoque
- **Gestão Financeira:**
  - Contas a Pagar e Receber
  - Contas Bancárias e Fluxo de Caixa
- **Relatórios:** Geração de relatórios detalhados por período (Vendas, Compras, Produção, Estoque, Cadastros, Financeiro).
- **Metas de Produção:** Definição e acompanhamento de metas de rendimento.
- **Configurações:** Informações da empresa para uso em documentos.

## Tecnologias Utilizadas

- **Frontend Framework:** Next.js 15.3.3 (App Router)
- **Bibliotecas React:** React 19.0.0, React Hook Form, React Day Picker
- **Gerenciamento de Estado:** Zustand
- **Validação de Dados:** Zod
- **Backend:** Google Firebase (Firestore, Authentication, Storage)
- **Estilização:** Tailwind CSS 4, Shadcn UI (componentes)
- **Gráficos:** Recharts
- **Datas:** date-fns
- **Requisições HTTP:** Axios
- **Notificações:** Sonner

### Variáveis de Ambiente

NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_firebase_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_firebase_app_id"
