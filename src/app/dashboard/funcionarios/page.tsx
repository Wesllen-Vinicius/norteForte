// src/app/dashboard/funcionarios/page.tsx
'use client'

import PageContainer from '@/components/PageContainer'
import { useState, useMemo, useEffect } from 'react' // Importe useEffect
import { useFeedbackStore } from '@/store/feedbackStore';
import { FiEdit, FiTrash2, FiSearch, FiUserPlus, FiUsers } from 'react-icons/fi';
import Skeleton from '@/components/Skeleton'; // Importe o componente Skeleton

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
}

export default function FuncionariosPage() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cargo, setCargo] = useState('');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Estado para botão de carregamento
  const [loadingList, setLoadingList] = useState(true); // Novo estado para carregamento da lista

  const setFeedback = useFeedbackStore((state) => state.setFeedback);

  // Simula o carregamento inicial da lista de funcionários
  useEffect(() => {
    const fetchFuncionarios = async () => {
      setLoadingList(true);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simula delay de rede
      // Em uma aplicação real, você buscaria os dados do Firebase aqui
      setFuncionarios([
        { id: '1', nome: 'Ana Souza', email: 'ana.souza@empresa.com', cargo: 'Gerente' },
        { id: '2', nome: 'Carlos Mendes', email: 'carlos.mendes@empresa.com', cargo: 'Desenvolvedor' },
        { id: '3', nome: 'Beatriz Costa', email: 'beatriz.costa@empresa.com', cargo: 'Suporte' },
      ]);
      setLoadingList(false);
    };
    fetchFuncionarios();
  }, []); // Executa apenas uma vez ao montar o componente

  // Filtra funcionários com base no termo de busca
  const filteredFuncionarios = useMemo(() => {
    if (!searchTerm) {
      return funcionarios;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return funcionarios.filter(
      (func) =>
        func.nome.toLowerCase().includes(lowerCaseSearchTerm) ||
        func.email.toLowerCase().includes(lowerCaseSearchTerm) ||
        func.cargo.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [funcionarios, searchTerm]);

  const handleClearForm = () => {
    setNome('');
    setEmail('');
    setCargo('');
    setEditingId(null);
  };

  const handleEdit = (func: Funcionario) => {
    setNome(func.nome);
    setEmail(func.email);
    setCargo(func.cargo);
    setEditingId(func.id);
  };

  const handleDelete = (id: string) => {
    // Substituir alert por modal de confirmação no futuro para melhor UX
    if (window.confirm('Tem certeza que deseja excluir este funcionário?')) {
      // Em uma aplicação real, você faria a chamada para o Firebase/backend aqui
      setFuncionarios((prev) => prev.filter((func) => func.id !== id));
      setFeedback('Funcionário excluído com sucesso!', 'success');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simula uma chamada assíncrona

    if (editingId) {
      setFuncionarios((prev) =>
        prev.map((func) =>
          func.id === editingId ? { ...func, nome, email, cargo } : func
        )
      );
      setFeedback('Funcionário atualizado com sucesso!', 'success');
    } else {
      const newFuncionario: Funcionario = {
        id: Date.now().toString(),
        nome,
        email,
        cargo,
      };
      setFuncionarios((prev) => [...prev, newFuncionario]);
      setFeedback('Funcionário cadastrado com sucesso!', 'success');
    }

    handleClearForm();
    setIsLoading(false);
  };

  return (
    <PageContainer title="Gerenciar Funcionários">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário de Cadastro/Edição */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-xl
                        dark:bg-neutral-900 dark:border-neutral-800">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex items-center gap-3
                         dark:text-white">
            <FiUserPlus className="text-indigo-600 dark:text-indigo-400" /> {/* Ícone colorido */}
            {editingId ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-neutral-600 font-medium mb-1" htmlFor="nome">
                Nome Completo
              </label>
              <input
                type="text"
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-neutral-100 border border-neutral-300 text-neutral-900 placeholder-neutral-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-600 transition duration-200
                           dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                placeholder="Ex: João da Silva"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-600 font-medium mb-1" htmlFor="email">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-neutral-100 border border-neutral-300 text-neutral-900 placeholder-neutral-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-600 transition duration-200
                           dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                placeholder="Ex: joao.silva@empresa.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-neutral-600 font-medium mb-1" htmlFor="cargo">
                Cargo
              </label>
              <input
                type="text"
                id="cargo"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-neutral-100 border border-neutral-300 text-neutral-900 placeholder-neutral-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-600 transition duration-200
                           dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                placeholder="Ex: Desenvolvedor, Gerente, Suporte"
                required
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="flex-1 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-200
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-neutral-900
                           disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  editingId ? 'Atualizar Funcionário' : 'Salvar Funcionário'
                )}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="py-3 px-6 rounded-lg bg-neutral-300 hover:bg-neutral-400 text-neutral-800 font-semibold transition duration-200
                             focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 focus:ring-offset-neutral-900
                             dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-white"
                >
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Funcionários */}
        <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-xl flex flex-col
                        dark:bg-neutral-900 dark:border-neutral-800">
          <h2 className="text-2xl font-bold text-neutral-800 mb-6 flex items-center gap-3
                         dark:text-white">
            <FiUsers className="text-indigo-600 dark:text-indigo-400" /> {/* Ícone colorido */}
            Lista de Funcionários
          </h2>
          <div className="mb-4">
            <label className="sr-only" htmlFor="search">Pesquisar Funcionário</label>
            <div className="relative">
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md bg-neutral-100 border border-neutral-300 text-neutral-900 placeholder-neutral-500
                           focus:outline-none focus:ring-2 focus:ring-indigo-600 transition duration-200
                           dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-500"
                placeholder="Buscar por nome, email ou cargo..."
              />
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-neutral-400" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingList ? (
              // Skeletons para a lista de funcionários
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => ( // 5 itens de esqueleto
                  <div key={i} className="bg-neutral-100 p-4 rounded-md flex justify-between items-center dark:bg-neutral-800">
                    <div className="flex-1">
                      <Skeleton width="70%" height="h-5" className="mb-2" /> {/* Nome */}
                      <Skeleton width="90%" height="h-4" className="mb-1" /> {/* Email */}
                      <Skeleton width="40%" height="h-3" className="rounded-full" /> {/* Cargo */}
                    </div>
                    <div className="flex gap-2">
                      <Skeleton type="avatar" width="w-8" height="h-8" /> {/* Botão de Editar */}
                      <Skeleton type="avatar" width="w-8" height="h-8" /> {/* Botão de Excluir */}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFuncionarios.length === 0 && funcionarios.length > 0 ? (
              <p className="text-neutral-500 text-center py-8">Nenhum funcionário encontrado com este termo de busca.</p>
            ) : funcionarios.length === 0 ? (
              <p className="text-neutral-500 text-center py-8">Nenhum funcionário cadastrado ainda. Use o formulário ao lado para adicionar!</p>
            ) : (
              <div className="space-y-3">
                {filteredFuncionarios.map((func) => (
                  <div
                    key={func.id}
                    className="bg-neutral-100 p-4 rounded-md flex flex-col sm:flex-row justify-between items-start sm:items-center
                               hover:bg-neutral-200 transition duration-200 cursor-pointer
                               dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  >
                    <div className="flex-1 mb-2 sm:mb-0">
                      <p className="text-neutral-900 font-medium text-lg dark:text-white">{func.nome}</p>
                      <p className="text-neutral-600 text-sm dark:text-neutral-400">{func.email}</p>
                      <p className="text-neutral-700 text-xs mt-1 px-2 py-0.5 rounded-full inline-block
                                   bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-400">{func.cargo}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(func)}
                        className="p-2 rounded-full text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 transition duration-200
                                   dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white"
                        aria-label="Editar Funcionário"
                      >
                        <FiEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDelete(func.id)}
                        className="p-2 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700 transition duration-200
                                   dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white"
                        aria-label="Excluir Funcionário"
                      >
                        <FiTrash2 className="text-lg" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
