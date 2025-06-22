"use client"

import React, { useState, useMemo, useEffect } from "react"
import { ColumnDef, Row } from "@tanstack/react-table"
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

type ReportType = 'movimentacoes' | 'vendas' | 'producao';
type ExportType = 'pdf' | 'csv';

// Componente para o resumo do relatório de produção
const ProductionReportSummary = ({ summary }: { summary: any }) => (
    <div className="mb-6 space-y-4 rounded-lg border bg-muted/50 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">Total Produzido</p>
                <p className="text-xl font-bold text-green-500">{summary.totalProduzido.toFixed(2)} kg</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">Total de Perdas</p>
                <p className="text-xl font-bold text-destructive">{summary.totalPerdas.toFixed(2)} kg</p>
            </div>
             <div className="rounded-lg border bg-card p-3">
                <p className="text-sm text-muted-foreground">Peso Total (Bruto)</p>
                <p className="text-xl font-bold">{summary.totalBruto.toFixed(2)} kg</p>
            </div>
        </div>
        <div>
            <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-muted-foreground">Rendimento Geral do Período</span>
                 <span className="text-base font-bold text-primary">{summary.rendimento.toFixed(1)}%</span>
            </div>
            <Progress value={summary.rendimento} className="h-3" />
        </div>
    </div>
);

// Componente para os detalhes da linha (Produção)
const renderSubComponentProducao = ({ row }: { row: Row<any> }) => {
    const { unidades, produtos } = useDataStore.getState();
    return (
        <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95">
            <h4 className="font-semibold text-sm mb-2">Produtos do Lote: {row.original.lote}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {row.original.produtos.map((p: any, i: number) => {
                    const produtoInfo = produtos.find(prod => prod.id === p.produtoId);
                    const unidadeNome = produtoInfo?.tipoProduto === 'VENDA' ? unidades.find(u => u.id === produtoInfo.unidadeId)?.sigla || 'un' : 'un';
                    return (
                        <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm">
                            <p className="font-bold text-sm mb-1">{p.produtoNome}</p>
                            <p><strong>Produzido:</strong> {p.quantidade.toFixed(2)} {unidadeNome}</p>
                            <p className="text-destructive/80"><strong>Perda:</strong> {p.perda.toFixed(2)} {unidadeNome}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Componente para os detalhes da linha (Vendas)
const renderSubComponentVendas = ({ row }: { row: Row<any> }) => {
    return (
         <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95">
            <h4 className="font-semibold text-sm mb-2">Itens da Venda</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                 {row.original.produtos.map((p: any, i: number) => (
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
    const [reportData, setReportData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');

    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportType, setExportType] = useState<ExportType | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({});

    const { clientes, funcionarios, users } = useDataStore();

    const enrichedData = useMemo(() => {
        if (!reportData.length) return [];
        switch (reportType) {
            case 'vendas':
                return reportData.map(v => ({...v, clienteNome: clientes.find(c => c.id === v.clienteId)?.nome || 'N/A' }));
            case 'producao':
                 return reportData.map(p => ({
                    ...p,
                    responsavelNome: funcionarios.find(f => f.id === p.responsavelId)?.nomeCompleto || 'N/A',
                    registradoPorNome: p.registradoPor.nome || users.find(u => u.uid === p.registradoPor.uid)?.displayName || 'N/A',
                }));
            default:
                return reportData;
        }
    }, [reportData, reportType, clientes, funcionarios, users]);

    const productionSummary = useMemo(() => {
        if (reportType !== 'producao' || !enrichedData.length) return null;

        let totalProduzido = 0;
        let totalPerdas = 0;

        enrichedData.forEach(p => {
            if(p.produtos && Array.isArray(p.produtos)) {
                p.produtos.forEach((item: any) => {
                    totalProduzido += Number(item.quantidade) || 0;
                    totalPerdas += Number(item.perda) || 0;
                });
            }
        });

        const totalBruto = totalProduzido + totalPerdas;
        const rendimento = totalBruto > 0 ? (totalProduzido / totalBruto) * 100 : 0;

        return { totalProduzido, totalPerdas, totalBruto, rendimento };
    }, [enrichedData, reportType]);


    const availableColumns = useMemo<ColumnDef<any>[]>(() => {
        const expanderColumn: ColumnDef<any> = {
            id: 'expander',
            header: null,
            cell: ({ row }) => (
                <Button variant="ghost" size="icon" onClick={() => row.toggleExpanded()} className="h-8 w-8">
                    {row.getIsExpanded() ? <IconChevronUp className="h-4 w-4" /> : <IconChevronDown className="h-4 w-4" />}
                </Button>
            ),
        };
        const baseColumns = [
            { id: 'data', header: "Data", accessorKey: "data", cell: ({ row }: any) => format(row.original.data, "dd/MM/yyyy HH:mm") },
        ];
        switch (reportType) {
            case 'vendas':
                return [
                    expanderColumn, ...baseColumns,
                    { id: 'clienteNome', header: "Cliente", accessorKey: "clienteNome" },
                    { id: 'itens', header: "Nº Itens", cell: ({ row }: any) => row.original.produtos.length },
                    { id: 'condicaoPagamento', header: "Cond. Pagamento", accessorKey: "condicaoPagamento" },
                    { id: 'valorTotal', header: "Valor Total", accessorKey: "valorTotal", cell: ({ row }: any) => `R$ ${row.original.valorTotal.toFixed(2)}` }
                ];
            case 'producao':
                 return [
                    expanderColumn, ...baseColumns,
                    { id: 'lote', header: "Lote", accessorKey: "lote" },
                    { id: 'responsavelNome', header: "Responsável", accessorKey: "responsavelNome" },
                    { id: 'registradoPorNome', header: "Registrado Por", accessorKey: "registradoPorNome"},
                    { id: 'produtos', header: "Nº Produtos", cell: ({ row }: any) => row.original.produtos.length },
                ];
            case 'movimentacoes':
            default:
                 return [
                    ...baseColumns,
                    { id: 'produtoNome', header: "Produto", accessorKey: "produtoNome" },
                    { id: 'tipo', header: "Tipo", accessorKey: 'tipo', cell: ({ row }: any) => <Badge variant={row.original.tipo === 'entrada' ? 'default' : 'destructive'} className="capitalize">{row.original.tipo}</Badge> },
                    { id: 'quantidade', header: "Quantidade", accessorKey: "quantidade" },
                    { id: 'motivo', header: "Motivo", accessorKey: "motivo" },
                ];
        }
    }, [reportType]);

    useEffect(() => {
        const initialSelection: Record<string, boolean> = {};
        availableColumns.forEach(col => {
            if(col.id && col.header) initialSelection[col.id] = true;
        });
        setSelectedColumns(initialSelection);
    }, [availableColumns]);

    const renderSubComponent = useMemo(() => {
        switch(reportType) {
            case 'producao': return renderSubComponentProducao;
            case 'vendas': return renderSubComponentVendas;
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
            setReportData(data);
            if (data.length === 0) toast.info("Nenhum dado encontrado para os filtros selecionados.");
        } catch (error) {
            toast.error("Erro ao gerar o relatório.");
        } finally {
            setIsLoading(false);
        }
    };

    const getExportValue = (row: any, column: ColumnDef<any>): string => {
        const accessorKey = (column as any).accessorKey;
        const rawValue = accessorKey ? row[accessorKey] : undefined;

        if (column.cell && typeof column.cell === 'function') {
            const cellContext = {
                row: { original: row },
                getValue: () => rawValue,
            };

            const renderedOutput = column.cell(cellContext as any);

            if (renderedOutput === null || renderedOutput === undefined) return '';

            if (React.isValidElement(renderedOutput)) {
                const children = (renderedOutput as React.ReactElement<{ children?: React.ReactNode }>).props.children;
                return children ? String(children) : '';
            }
            return String(renderedOutput);
        }

        return String(rawValue ?? '');
    };

    const handleConfirmExport = () => {
        const columnsToExport = availableColumns.filter(col => col.header && selectedColumns[col.id!]);
        if (columnsToExport.length === 0) return toast.error("Selecione pelo menos uma coluna para exportar.");

        const headers = columnsToExport.map(col => col.header as string);
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
                        {availableColumns.filter(c => typeof c.header === 'string').map(col => {
                            const key = col.id as string;
                            return (
                                <div key={key} className="flex items-center space-x-2">
                                    <Checkbox id={key} checked={!!selectedColumns[key]} onCheckedChange={(checked) => setSelectedColumns(p => ({...p, [key]: !!checked}))} />
                                    <Label htmlFor={key} className="font-normal">{col.header as string}</Label>
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
                        <GenericTable
                            columns={availableColumns}
                            data={enrichedData}
                            globalFilter={globalFilter}
                            setGlobalFilter={setGlobalFilter}
                            renderSubComponent={renderSubComponent}
                            enableMultiRowExpansion={false}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
