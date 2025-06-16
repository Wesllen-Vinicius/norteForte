// components/section-cards.tsx
import { IconArrowRight, IconBox, IconUsers, IconArrowsExchange } from "@tabler/icons-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardsProps {
  stats: {
    totalFuncionarios: number;
    totalProdutos: number;
    totalMovimentacoes: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card>
        <CardHeader>
          <CardDescription>Total de Funcionários</CardDescription>
          <CardTitle className="text-3xl font-semibold">{stats.totalFuncionarios}</CardTitle>
        </CardHeader>
        <CardFooter><IconUsers className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Produtos Cadastrados</CardDescription>
          <CardTitle className="text-3xl font-semibold">{stats.totalProdutos}</CardTitle>
        </CardHeader>
        <CardFooter><IconBox className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
       <Card>
        <CardHeader>
          <CardDescription>Movimentações no Mês</CardDescription>
          <CardTitle className="text-3xl font-semibold">{stats.totalMovimentacoes}</CardTitle>
        </CardHeader>
        <CardFooter><IconArrowsExchange className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card className="bg-primary/5">
        <CardHeader>
          <CardDescription>Ver Relatórios</CardDescription>
          <CardTitle>Análise Completa</CardTitle>
        </CardHeader>
        <CardFooter><IconArrowRight className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
    </div>
  );
}
