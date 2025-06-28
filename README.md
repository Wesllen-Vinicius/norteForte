# Norte Forte - Sistema de Gestão

Este é um sistema de gestão completo desenvolvido com Next.js, React e Firebase, projetado para otimizar as operações e finanças de negócios do setor de proteína animal.

## Funcionalidades Principais

- **Autenticação de Usuários:** Login e registro seguro com controle de permissões (Administrador e Usuário).
- **Dashboard:** Visão geral com estatísticas financeiras, movimentações de estoque e desempenho da produção.
- **Cadastros Essenciais:**
  - Clientes e Fornecedores com Endereço Fiscal completo.
  - Produtos (Venda, Uso Interno, Matéria-Prima) com campos fiscais (NCM, CFOP).
  - Funcionários e Cargos.
  - Categorias e Unidades de Medida.
- **Gestão de Operações:**
  - Compras de Matéria-Prima e Insumos com atualização automática de estoque.
  - Registro de Abates vinculados às compras.
  - Controle de Produção com cálculo de perdas e rendimento.
  - Movimentação e Saldo de Estoque.
- **Gestão Financeira:**
  - Contas a Pagar e Receber geradas automaticamente a partir de Compras e Vendas.
  - Cadastro de Despesas Operacionais (Custos Fixos e Variáveis).
  - Contas Bancárias e Relatório de Fluxo de Caixa (Extrato).
- **Relatórios:** Geração de relatórios detalhados por período (Vendas, Compras, Produção, Estoque, Cadastros, Financeiro).
- **Metas de Produção:** Definição e acompanhamento de metas de rendimento.
- **Configurações:** Informações da empresa para uso em documentos e NF-e.
- **Preparado para NF-e:** Estrutura de dados pronta para integração com API de emissão de Nota Fiscal Eletrônica.

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
