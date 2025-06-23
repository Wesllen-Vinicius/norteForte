"use client"

import React, { useState, useMemo, useEffect } from "react"
import { ColumnDef, Row, CellContext } from "@tanstack/react-table"
import { DateRange } from "react-day-picker"
import { toast } from "sonner"
import { format } from "date-fns"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { saveAs } from "file-saver"
import { GenericTable } from "@/components/generic-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { DateRangePicker } from "@/components/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getMovimentacoesPorPeriodo, getVendasPorPeriodo, getProducoesPorPeriodo } from "@/lib/services/relatorios.services"
import { Badge } from "@/components/ui/badge"
import { useDataStore } from "@/store/data.store"
import { IconFileTypePdf, IconFileTypeXls, IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { Progress } from "@/components/ui/progress"
import { Movimentacao } from "@/lib/services/estoque.services"
import { Venda } from "@/lib/schemas"
import { Producao } from "@/lib/services/producao.services"

type ReportType = 'movimentacoes' | 'vendas' | 'producao';
type ExportType = 'pdf' | 'csv';

type EnrichedVenda = Venda & { clienteNome: string };
type EnrichedProducao = Producao & { responsavelNome: string; registradoPorNome: string; };
type ReportData = EnrichedVenda | EnrichedProducao | Movimentacao;

interface SummaryProps {
    summary: { totalProduzido: number; totalPerdas: number; totalBruto: number; rendimento: number };
}
interface SubComponentProps<TData> {
    row: Row<TData>;
}

const ProductionReportSummary = ({ summary }: SummaryProps) => (
    <div className="mb-6 space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">Total Produzido</p><p className="text-xl font-bold text-green-500">{summary.totalProduzido.toFixed(2)} kg</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">Total de Perdas</p><p className="text-xl font-bold text-destructive">{summary.totalPerdas.toFixed(2)} kg</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">Peso Total (Bruto)</p><p className="text-xl font-bold">{summary.totalBruto.toFixed(2)} kg</p></div>
        </div>
        <div>
            <div className="flex justify-between mb-1"><span className="text-base font-medium text-muted-foreground">Rendimento Geral do Período</span><span className="text-base font-bold text-primary">{summary.rendimento.toFixed(1)}%</span></div>
            <Progress value={summary.rendimento} className="h-3" />
        </div>
    </div>
);

const renderSubComponentProducao = ({ row }: SubComponentProps<EnrichedProducao>) => {
    const { unidades, produtos } = useDataStore.getState();
    return (
        <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95">
            <h4 className="font-semibold text-sm mb-2">Produtos do Lote: {row.original.lote}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {row.original.produtos.map((p, i) => {
                    const produtoInfo = produtos.find(prod => prod.id === p.produtoId);
                    const unidadeNome = produtoInfo?.tipoProduto === 'VENDA' ? unidades.find(u => u.id === produtoInfo.unidadeId)?.sigla || 'un' : 'un';
                    return (
                        <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm">
                            <p className="font-bold text-sm mb-1">{p.produtoNome}</p>
                            <p><strong>Produzido:</strong> {p.quantidade.toFixed(2)} {unidadeNome}</p>
                            <p className="text-destructive/80"><strong>Perda:</strong> {(p.perda || 0).toFixed(2)} {unidadeNome}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const renderSubComponentVendas = ({ row }: SubComponentProps<EnrichedVenda>) => {
    return (
         <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95">
            <h4 className="font-semibold text-sm mb-2">Itens da Venda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                 {row.original.produtos.map((p, i) => (
                    <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm">
                        <p className="font-bold text-sm mb-1">{p.produtoNome}</p>
                        <p><strong>Quantidade:</strong> {p.quantidade}</p>
                        <p><strong>Preço Un.:</strong> R$ {p.precoUnitario.toFixed(2)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function RelatoriosPage() {
    const [date, setDate] = useState<DateRange | undefined>();
    const [reportType, setReportType] = useState<ReportType>('movimentacoes');
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportType, setExportType] = useState<ExportType | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({});
    const { clientes, funcionarios, users } = useDataStore();

    const enrichedData = useMemo((): ReportData[] => {
        if (!reportData.length) return [];
        switch (reportType) {
            case 'vendas':
                return (reportData as Venda[]).map((v): EnrichedVenda => ({ ...v, clienteNome: clientes.find(c => c.id === v.clienteId)?.nome || 'N/A' }));
            case 'producao':
                 return (reportData as Producao[]).map((p): EnrichedProducao => ({
                    ...p,
                    responsavelNome: funcionarios.find(f => f.id === p.responsavelId)?.nomeCompleto || 'N/A',
                    registradoPorNome: p.registradoPor.nome || users.find(u => u.uid === p.registradoPor.uid)?.displayName || 'N/A',
                }));
            default:
                return reportData as Movimentacao[];
        }
    }, [reportData, reportType, clientes, funcionarios, users]);

    const productionSummary = useMemo(() => {
        if (reportType !== 'producao' || !enrichedData.length) return null;
        const data = enrichedData as EnrichedProducao[];
        let totalProduzido = 0;
        let totalPerdas = 0;
        data.forEach(p => {
            if (p.produtos && Array.isArray(p.produtos)) {
                p.produtos.forEach(item => {
                    totalProduzido += Number(item.quantidade) || 0;
                    totalPerdas += Number(item.perda) || 0;
                });
            }
        });
        const totalBruto = totalProduzido + totalPerdas;
        const rendimento = totalBruto > 0 ? (totalProduzido / totalBruto) * 100 : 0;
        return { totalProduzido, totalPerdas, totalBruto, rendimento };
    }, [enrichedData, reportType]);

    const availableColumns = useMemo<ColumnDef<ReportData>[]>(() => {
        const expanderColumn: ColumnDef<ReportData> = {
            id: 'expander',
            header: () => null,
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => row.toggleExpanded()} className="h-8 w-8">
                    {row.getIsExpanded() ? <IconChevronUp className="h-4 w-4" /> : <IconChevronDown className="h-4 w-4" />}
                </Button>
            ),
        };
        const baseColumns: ColumnDef<ReportData>[] = [
            { id: 'data', header: "Data", accessorKey: "data", cell: ({ row }) => row.original.data ? format(row.original.data, "dd/MM/yyyy HH:mm") : 'N/A' },
        ];
        switch (reportType) {
            case 'vendas':
                return [
                    expanderColumn, ...baseColumns,
                    { id: 'clienteNome', header: "Cliente", accessorKey: "clienteNome" },
                    { id: 'itens', header: "Nº Itens", cell: ({ row }) => (row.original as EnrichedVenda).produtos.length },
                    { id: 'condicaoPagamento', header: "Cond. Pagamento", accessorKey: "condicaoPagamento" },
                    { id: 'valorTotal', header: "Valor Total", accessorKey: "valorTotal", cell: ({ row }) => `R$ ${(row.original as EnrichedVenda).valorTotal.toFixed(2)}` }
                ] as ColumnDef<ReportData>[];
            case 'producao':
                 return [
                    expanderColumn, ...baseColumns,
                    { id: 'lote', header: "Lote", accessorKey: "lote" },
                    { id: 'responsavelNome', header: "Responsável", accessorKey: "responsavelNome" },
                    { id: 'registradoPorNome', header: "Registrado Por", accessorKey: "registradoPorNome"},
                    { id: 'produtos', header: "Nº Produtos", cell: ({ row }) => (row.original as EnrichedProducao).produtos.length },
                ] as ColumnDef<ReportData>[];
            case 'movimentacoes':
            default:
                 return [
                    ...baseColumns,
                    { id: 'produtoNome', header: "Produto", accessorKey: "produtoNome" },
                    { id: 'tipo', header: "Tipo", accessorKey: 'tipo', cell: ({ row }) => <Badge variant={(row.original as Movimentacao).tipo === 'entrada' ? 'default' : 'destructive'} className="capitalize">{(row.original as Movimentacao).tipo}</Badge> },
                    { id: 'quantidade', header: "Quantidade", accessorKey: "quantidade" },
                    { id: 'motivo', header: "Motivo", accessorKey: "motivo" },
                ] as ColumnDef<ReportData>[];
        }
    }, [reportType]);

    useEffect(() => {
        const initialSelection: Record<string, boolean> = {};
        availableColumns.forEach(col => {
            if (col.id && 'header' in col && typeof col.header === 'string') {
                initialSelection[col.id] = true;
            }
        });
        setSelectedColumns(initialSelection);
    }, [availableColumns]);

    const renderSubComponent = useMemo(() => {
        switch(reportType) {
            case 'producao': return renderSubComponentProducao as (props: SubComponentProps<ReportData>) => React.ReactElement;
            case 'vendas': return renderSubComponentVendas as (props: SubComponentProps<ReportData>) => React.ReactElement;
            default: return undefined;
        }
    }, [reportType]);

    const handleGenerateReport = async () => {
        if (!date?.from || !date?.to) { return toast.error("Por favor, selecione um período de início e fim."); }
        setIsLoading(true);
        setReportData([]);
        try {
            const reportFetchers = {
                'vendas': getVendasPorPeriodo,
                'producao': getProducoesPorPeriodo,
                'movimentacoes': getMovimentacoesPorPeriodo,
            };
            const data = await reportFetchers[reportType](date.from, date.to);
            setReportData(data as ReportData[]);
            if (data.length === 0) toast.info("Nenhum dado encontrado para os filtros selecionados.");
        } catch {
            toast.error("Erro ao gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };

    // CORREÇÃO APLICADA AQUI
    const getExportValue = (row: ReportData, column: ColumnDef<ReportData>): string => {
        if ('accessorKey' in column && column.accessorKey) {
            const accessorKey = column.accessorKey as keyof ReportData;
            const value = (row as any)[accessorKey];

            if (column.cell && typeof column.cell === 'function') {
                // Criamos um contexto mock, passando a estrutura que a célula espera
                const cellContext = {
                    row: { original: row }
                } as CellContext<ReportData, unknown>;

                const renderedOutput = column.cell(cellContext);

                if (renderedOutput === null || renderedOutput === undefined) return '';

                if (React.isValidElement(renderedOutput)) {
                    // Tipamos as props para acessar 'children' de forma segura
                    const props = renderedOutput.props as { children?: React.ReactNode };
                    return props.children ? String(props.children) : '';
                }
                return String(renderedOutput);
            }
            return String(value ?? '');
        }
        return '';
    };

    const handleConfirmExport = () => {
        const columnsToExport = availableColumns.filter(col => col.id && 'header' in col && col.header && selectedColumns[col.id]);
        if (columnsToExport.length === 0) return toast.error("Selecione pelo menos uma coluna para exportar.");
        const headers = columnsToExport.map(col => String('header' in col ? col.header : ''));
        const data = enrichedData.map(row =>
            columnsToExport.map(col => getExportValue(row, col))
        );
        if (exportType === 'pdf') {
            const doc = new jsPDF();
            autoTable(doc, { head: [headers], body: data });
            doc.save(`relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
        } else {
            const escapeCsv = (str: string) => `"${String(str).replace(/"/g, '""')}"`;
            const csvContent = [
                headers.join(','),
                ...data.map(row => row.map(escapeCsv).join(','))
            ].join('\n');
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.csv`);
        }
        setIsExportDialogOpen(false);
    };

    const openExportDialog = (type: ExportType) => {
        if (!enrichedData.length) return toast.error("Não há dados para exportar.");
        setExportType(type);
        setIsExportDialogOpen(true);
    };

    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Selecionar Colunas para Exportação</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {availableColumns.filter(c => 'header' in c && typeof c.header === 'string').map(col => {
                            const key = col.id as string;
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <Checkbox id={key} checked={!!selectedColumns[key]} onCheckedChange={(checked) => setSelectedColumns(p => ({...p, [key]: !!checked}))} />
                                    <Label htmlFor={key} className="font-normal">{String('header' in col ? col.header : '')}</Label>
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                        <Button type="button" onClick={handleConfirmExport}>Confirmar Exportação</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                 <CardHeader>
                    <CardTitle>Gerador de Relatórios</CardTitle>
                    <CardDescription>Selecione o tipo de relatório e o período desejado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row md:items-end gap-4">
                         <div className="grid gap-2">
                            <span className="text-sm font-medium">Tipo de Relatório</span>
                            <Select value={reportType} onValueChange={(v) => { setReportType(v as ReportType); setReportData([]); }}>
                                <SelectTrigger className="w-full md:w-[250px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="movimentacoes">Movimentações de Estoque</SelectItem>
                                    <SelectItem value="vendas">Vendas</SelectItem>
                                    <SelectItem value="producao">Produção</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <span className="text-sm font-medium">Período</span>
                            <DateRangePicker date={date} onDateChange={setDate} />
                        </div>
                        <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full md:w-auto">
                            {isLoading ? "Gerando..." : "Gerar Relatório"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData.length > 0 && (
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                       <div>
                         <CardTitle>Resultados da Busca</CardTitle>
                         <CardDescription>Foram encontrados {enrichedData.length} registros.</CardDescription>
                       </div>
                       <div className="flex gap-2">
                           <Button onClick={() => openExportDialog('pdf')} variant="outline" size="sm"><IconFileTypePdf className="mr-2 h-4 w-4"/>Exportar PDF</Button>
                           <Button onClick={() => openExportDialog('csv')} variant="outline" size="sm"><IconFileTypeXls className="mr-2 h-4 w-4"/>Exportar para Excel (CSV)</Button>
                       </div>
                    </CardHeader>
                    <CardContent>
                        {reportType === 'producao' && productionSummary && <ProductionReportSummary summary={productionSummary} />}
                        <GenericTable<ReportData>
                            columns={availableColumns}
                            data={enrichedData}
                            renderSubComponent={renderSubComponent}
                            filterPlaceholder="Filtrar..."
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
