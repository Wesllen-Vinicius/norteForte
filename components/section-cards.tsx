import { IconUsersGroup, IconShoppingCart, IconBox, IconUsers, IconTrendingUp, IconFileDollar, IconCashBanknote } from "@tabler/icons-react";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface SectionCardsProps {
  stats: {
    totalFuncionarios: number;
    totalProdutos: number;
    totalClientes: number;
    totalVendasMes: number;
    lucroBrutoMes: number;
    totalAPagar: number;
    totalAReceber: number;
  };
}

export function SectionCards({ stats }: SectionCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 lg:px-6">
      <Card>
        <CardHeader>
          <CardDescription>Lucro Bruto (Mês)</CardDescription>
          <CardTitle className="text-2xl font-semibold text-green-600">
            R$ {stats.lucroBrutoMes.toFixed(2).replace('.', ',')}
          </CardTitle>
        </CardHeader>
        <CardFooter><IconTrendingUp className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Vendas (Mês)</CardDescription>
          <CardTitle className="text-2xl font-semibold">
            R$ {stats.totalVendasMes.toFixed(2).replace('.', ',')}
          </CardTitle>
        </CardHeader>
        <CardFooter><IconShoppingCart className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>A Receber (Pendente)</CardDescription>
          <CardTitle className="text-2xl font-semibold text-blue-500">
            R$ {stats.totalAReceber.toFixed(2).replace('.', ',')}
          </CardTitle>
        </CardHeader>
        <CardFooter><IconCashBanknote className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>A Pagar (Pendente)</CardDescription>
          <CardTitle className="text-2xl font-semibold text-destructive">
            R$ {stats.totalAPagar.toFixed(2).replace('.', ',')}
          </CardTitle>
        </CardHeader>
        <CardFooter><IconFileDollar className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Clientes</CardDescription>
          <CardTitle className="text-2xl font-semibold">{stats.totalClientes}</CardTitle>
        </CardHeader>
        <CardFooter><IconUsersGroup className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
       <Card>
        <CardHeader>
          <CardDescription>Produtos</CardDescription>
          <CardTitle className="text-2xl font-semibold">{stats.totalProdutos}</CardTitle>
        </CardHeader>
        <CardFooter><IconBox className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Funcionários</CardDescription>
          <CardTitle className="text-2xl font-semibold">{stats.totalFuncionarios}</CardTitle>
        </CardHeader>
        <CardFooter><IconUsers className="size-4 text-muted-foreground" /></CardFooter>
      </Card>
    </div>
  );
}
