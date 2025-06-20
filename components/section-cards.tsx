import { IconUsersGroup, IconShoppingCart, IconBox, IconUsers, IconTrendingUp } from "@tabler/icons-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardsProps {
  stats: {
    totalFuncionarios: number;
    totalProdutos: number;
    totalClientes: number;
    totalVendasMes: number;
    lucroBrutoMes: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-5 lg:px-6">
      <Card>
        <CardHeader>
          <CardDescription>Lucro Bruto no Mês</CardDescription>
          <CardTitle className="text-3xl font-semibold text-green-600">
            R$ {stats.lucroBrutoMes.toFixed(2).replace('.', ',')}
          </CardTitle>
        </CardHeader>
        <CardFooter><IconTrendingUp className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Vendas no Mês</CardDescription>
          <CardTitle className="text-3xl font-semibold">
            R$ {stats.totalVendasMes.toFixed(2).replace('.', ',')}
          </CardTitle>
        </CardHeader>
        <CardFooter><IconShoppingCart className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Clientes Cadastrados</CardDescription>
          <CardTitle className="text-3xl font-semibold">{stats.totalClientes}</CardTitle>
        </CardHeader>
        <CardFooter><IconUsersGroup className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
       <Card>
        <CardHeader>
          <CardDescription>Produtos em Estoque</CardDescription>
          <CardTitle className="text-3xl font-semibold">{stats.totalProdutos}</CardTitle>
        </CardHeader>
        <CardFooter><IconBox className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Total de Prestadores</CardDescription>
          <CardTitle className="text-3xl font-semibold">{stats.totalFuncionarios}</CardTitle>
        </CardHeader>
        <CardFooter><IconUsers className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
    </div>
  );
}
