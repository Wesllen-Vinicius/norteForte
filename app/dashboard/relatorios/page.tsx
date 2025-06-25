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
import { Input } from "@/components/ui/input"
import { DateRangePicker } from "@/components/date-range-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    getMovimentacoesPorPeriodo, getVendasPorPeriodo, getProducoesPorPeriodo, getClientesPorPeriodo,
    getFornecedoresPorPeriodo, getProdutosPorPeriodo, getFuncionariosPorPeriodo, getComprasPorPeriodo,
    getContasAPagarPorPeriodo, getContasAReceberPorPeriodo
} from "@/lib/services/relatorios.services"
import { Badge } from "@/components/ui/badge"
import { useDataStore } from "@/store/data.store"
import { IconFileTypePdf, IconFileTypeXls, IconChevronDown, IconChevronUp } from "@tabler/icons-react"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Movimentacao, Venda, Producao, Cliente, Fornecedor, Produto, Funcionario, Compra, ContaAReceber
} from "@/lib/schemas"

// Estrutura para organizar os relatórios em grupos
const reportGroups = {
  operacional: {
    label: "Operacional",
    reports: { vendas: "Vendas", compras: "Compras", producao: "Produção", movimentacoes: "Estoque" },
  },
  cadastros: {
    label: "Cadastros",
    reports: { clientes: "Clientes", fornecedores: "Fornecedores", produtos: "Produtos", funcionarios: "Funcionários" },
  },
  financeiro: {
    label: "Financeiro",
    reports: { contasAPagar: "Contas a Pagar", contasAReceber: "Contas a Receber" },
  },
};

const allReportLabels = {
    ...reportGroups.operacional.reports,
    ...reportGroups.cadastros.reports,
    ...reportGroups.financeiro.reports,
};

type ReportKey = keyof typeof allReportLabels;
type ExportType = 'pdf' | 'csv';

// Tipos Enriquecidos para exibição na tabela
type EnrichedVenda = Venda & { clienteNome?: string };
type EnrichedProducao = Producao & { responsavelNome?: string; registradoPorNome?: string; };
type EnrichedCompra = Compra & { fornecedorNome?: string };
type EnrichedFuncionario = Funcionario & { cargoNome?: string };
type ContaAPagar = any;
type EnrichedContaAPagar = ContaAPagar & { fornecedorNome?: string };
type EnrichedContaAReceber = ContaAReceber & { clienteNome?: string };

type ReportData = EnrichedVenda | EnrichedCompra | EnrichedProducao | Movimentacao | Cliente | Fornecedor | Produto | EnrichedFuncionario | EnrichedContaAPagar | EnrichedContaAReceber;

interface SummaryProps { summary: { totalProduzido: number; totalPerdas: number; totalBruto: number; rendimento: number }; }
interface SubComponentProps<TData> { row: Row<TData>; }

// Componentes Auxiliares
const ProductionReportSummary = ({ summary }: SummaryProps) => ( <div className="mb-6 space-y-4 rounded-lg border bg-muted/50 p-4"> <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center"> <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">Total Produzido</p><p className="text-xl font-bold text-green-500">{summary.totalProduzido.toFixed(2)} kg</p></div> <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">Total de Perdas</p><p className="text-xl font-bold text-destructive">{summary.totalPerdas.toFixed(2)} kg</p></div> <div className="rounded-lg border bg-card p-3"><p className="text-sm text-muted-foreground">Peso Total (Bruto)</p><p className="text-xl font-bold">{summary.totalBruto.toFixed(2)} kg</p></div> </div> <div> <div className="flex justify-between mb-1"><span className="text-base font-medium text-muted-foreground">Rendimento Geral do Período</span><span className="text-base font-bold text-primary">{summary.rendimento.toFixed(1)}%</span></div> <Progress value={summary.rendimento} className="h-3" /> </div> </div> );
const renderSubComponentProducao = ({ row }: SubComponentProps<EnrichedProducao>) => { const { unidades, produtos } = useDataStore.getState(); return ( <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95"> <h4 className="font-semibold text-sm mb-2">Produtos do Lote: {row.original.lote}</h4> <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {row.original.produtos.map((p, i) => { const produtoInfo = produtos.find(prod => prod.id === p.produtoId); const unidadeNome = produtoInfo?.tipoProduto === 'VENDA' ? unidades.find(u => u.id === produtoInfo.unidadeId)?.sigla || 'un' : 'un'; return ( <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm"> <p className="font-bold text-sm mb-1">{p.produtoNome}</p> <p><strong>Produzido:</strong> {p.quantidade.toFixed(2)} {unidadeNome}</p> <p className="text-destructive/80"><strong>Perda:</strong> {(p.perda || 0).toFixed(2)} {unidadeNome}</p> </div> ); })} </div> </div> ); };
const renderSubComponentVendas = ({ row }: SubComponentProps<EnrichedVenda>) => { return ( <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95"> <h4 className="font-semibold text-sm mb-2">Itens da Venda</h4> <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {row.original.produtos.map((p, i) => ( <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm"> <p className="font-bold text-sm mb-1">{p.produtoNome}</p> <p><strong>Quantidade:</strong> {p.quantidade}</p> <p><strong>Preço Un.:</strong> R$ {p.precoUnitario.toFixed(2)}</p> </div> ))} </div> </div> ); };
const renderSubComponentCompras = ({ row }: SubComponentProps<EnrichedCompra>) => { return ( <div className="p-4 bg-muted/20 animate-in fade-in-50 zoom-in-95"> <h4 className="font-semibold text-sm mb-2">Itens da Compra (NF: {row.original.notaFiscal})</h4> <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"> {row.original.itens.map((p, i) => ( <div key={i} className="text-xs p-2.5 border rounded-lg bg-background shadow-sm"> <p className="font-bold text-sm mb-1">{p.produtoNome}</p> <p><strong>Quantidade:</strong> {p.quantidade}</p> <p><strong>Custo Un.:</strong> R$ {p.custoUnitario.toFixed(2)}</p> </div> ))} </div> </div> ); };


export default function RelatoriosPage() {
    const [date, setDate] = useState<DateRange | undefined>();
    const [selectedCategory, setSelectedCategory] = useState<keyof typeof reportGroups>("operacional");
    const [reportType, setReportType] = useState<ReportKey>('vendas');
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [exportType, setExportType] = useState<ExportType | null>(null);
    const [selectedColumns, setSelectedColumns] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const { clientes, funcionarios, users, fornecedores, cargos } = useDataStore();

    const enrichedData = useMemo((): ReportData[] => {
        if (!reportData.length) return [];
        let dataToEnrich: ReportData[] = reportData;

        switch (reportType) {
            case 'vendas': dataToEnrich = (reportData as Venda[]).map(v => ({ ...v, clienteNome: clientes.find(c => c.id === v.clienteId)?.nome || 'N/A' })); break;
            case 'producao': dataToEnrich = (reportData as Producao[]).map(p => ({ ...p, responsavelNome: funcionarios.find(f => f.id === p.responsavelId)?.nomeCompleto || 'N/A', registradoPorNome: p.registradoPor.nome || users.find(u => u.uid === p.registradoPor.uid)?.displayName || 'N/A' })); break;
            case 'compras': dataToEnrich = (reportData as Compra[]).map(c => ({...c, fornecedorNome: fornecedores.find(f => f.id === c.fornecedorId)?.razaoSocial || 'N/A'})); break;
            case 'funcionarios': dataToEnrich = (reportData as Funcionario[]).map(f => ({...f, cargoNome: cargos.find(c => c.id === f.cargoId)?.nome || 'N/A' })); break;
            case 'contasAPagar': dataToEnrich = (reportData as ContaAPagar[]).map(c => ({...c, fornecedorNome: fornecedores.find(f => f.id === c.fornecedorId)?.razaoSocial || 'N/A' })); break;
            case 'contasAReceber': dataToEnrich = (reportData as ContaAReceber[]).map(conta => ({ ...conta, clienteNome: clientes.find(cliente => cliente.id === conta.clienteId)?.nome || 'N/A' })); break;
        }

        if (searchTerm) { return dataToEnrich.filter(item => JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())); }
        return dataToEnrich;
    }, [reportData, reportType, searchTerm, clientes, funcionarios, users, fornecedores, cargos]);

    const productionSummary = useMemo(() => {
        if (reportType !== 'producao' || !enrichedData.length) return null;
        const data = enrichedData as EnrichedProducao[];
        let totalProduzido = 0; let totalPerdas = 0;
        data.forEach(p => { if (p.produtos && Array.isArray(p.produtos)) { p.produtos.forEach(item => { totalProduzido += Number(item.quantidade) || 0; totalPerdas += Number(item.perda) || 0; }); } });
        const totalBruto = totalProduzido + totalPerdas;
        const rendimento = totalBruto > 0 ? (totalProduzido / totalBruto) * 100 : 0;
        return { totalProduzido, totalPerdas, totalBruto, rendimento };
    }, [enrichedData, reportType]);

    const availableColumns = useMemo<ColumnDef<ReportData>[]>(() => {
        const expanderColumn: ColumnDef<ReportData> = { id: 'expander', header: () => null, cell: ({ row }) => (<Button variant="ghost" size="icon" onClick={() => row.toggleExpanded()} className="h-8 w-8">{row.getIsExpanded() ? <IconChevronUp className="h-4 w-4" /> : <IconChevronDown className="h-4 w-4" />}</Button>) };
        const dataCol = (field: string, header: string): ColumnDef<ReportData> => ({ id: field, header, accessorKey: field, cell: ({ row }: any) => row.original[field] ? format(new Date(row.original[field]), "dd/MM/yyyy") : 'N/A' });
        const dataHoraCol = (field: string, header: string): ColumnDef<ReportData> => ({ id: field, header, accessorKey: field, cell: ({ row }: any) => row.original[field] ? format(new Date(row.original[field]), "dd/MM/yyyy HH:mm") : 'N/A' });

        switch (reportType) {
            case 'vendas': return [expanderColumn, dataHoraCol('data', 'Data'), { id: 'clienteNome', header: "Cliente", accessorKey: "clienteNome" }, { id: 'valorTotal', header: "Valor", cell: ({ row }) => `R$ ${(row.original as EnrichedVenda).valorTotal.toFixed(2)}` }, { id: 'status', header: 'Status', accessorKey: 'status', cell: ({row}) => <Badge variant={(row.original as Venda).status === 'Paga' ? 'default' : 'destructive'}>{(row.original as Venda).status}</Badge> }] as ColumnDef<ReportData>[];
            case 'compras': return [expanderColumn, dataCol('data', 'Data'), {id: 'fornecedorNome', header: 'Fornecedor', accessorKey: 'fornecedorNome'}, {id: 'notaFiscal', header: 'NF', accessorKey: 'notaFiscal'}, { id: 'valorTotal', header: "Valor", cell: ({ row }) => `R$ ${(row.original as EnrichedCompra).valorTotal.toFixed(2)}` }] as ColumnDef<ReportData>[];
            case 'producao': return [expanderColumn, dataCol('data', 'Data'), {id: 'lote', header: 'Lote', accessorKey: 'lote'}, {id: 'responsavelNome', header: 'Responsável', accessorKey: 'responsavelNome'}] as ColumnDef<ReportData>[];
            case 'clientes': return [dataCol('createdAt', 'Data Cadastro'), {id: 'nome', header: 'Nome', accessorKey: 'nome'}, {id: 'documento', header: 'Documento', accessorKey: 'documento'}, {id: 'telefone', header: 'Telefone', accessorKey: 'telefone'}] as ColumnDef<ReportData>[];
            case 'fornecedores': return [dataCol('createdAt', 'Data Cadastro'), {id: 'razaoSocial', header: 'Razão Social', accessorKey: 'razaoSocial'}, {id: 'cnpj', header: 'CNPJ', accessorKey: 'cnpj'}, {id: 'contato', header: 'Contato', accessorKey: 'contato'}] as ColumnDef<ReportData>[];
            case 'produtos': return [dataCol('createdAt', 'Data Cadastro'), {id: 'nome', header: 'Nome', accessorKey: 'nome'}, {id: 'tipoProduto', header: 'Tipo', accessorKey: 'tipoProduto'}, {id: 'quantidade', header: 'Estoque', accessorKey: 'quantidade'}] as ColumnDef<ReportData>[];
            case 'funcionarios': return [dataCol('createdAt', 'Data Cadastro'), {id: 'nomeCompleto', header: 'Nome', accessorKey: 'nomeCompleto'}, {id: 'cargoNome', header: 'Cargo', accessorKey: 'cargoNome'}, {id: 'contato', header: 'Contato', accessorKey: 'contato'}] as ColumnDef<ReportData>[];
            case 'contasAPagar': return [dataCol('dataEmissao', 'Emissão'), dataCol('dataVencimento', 'Vencimento'), {id: 'fornecedorNome', header: 'Fornecedor', accessorKey: 'fornecedorNome'}, { id: 'valor', header: "Valor", cell: ({ row }) => `R$ ${(row.original as EnrichedContaAPagar).valor.toFixed(2)}` }, {id: 'status', header: 'Status', cell: ({row}) => <Badge variant={(row.original as EnrichedContaAPagar).status === 'Paga' ? 'default' : 'destructive'}>{(row.original as EnrichedContaAPagar).status}</Badge> }] as ColumnDef<ReportData>[];
            case 'contasAReceber': return [dataCol('dataEmissao', 'Emissão'), dataCol('dataVencimento', 'Vencimento'), {id: 'clienteNome', header: 'Cliente', accessorKey: 'clienteNome'}, { id: 'valor', header: "Valor", cell: ({ row }) => `R$ ${(row.original as EnrichedContaAReceber).valor.toFixed(2)}` }, {id: 'status', header: 'Status', cell: ({row}) => <Badge variant={(row.original as EnrichedContaAReceber).status === 'Recebida' ? 'default' : 'destructive'}>{(row.original as EnrichedContaAReceber).status}</Badge> }] as ColumnDef<ReportData>[];
            default: return [dataHoraCol('data', 'Data'), { id: 'produtoNome', header: "Produto", accessorKey: "produtoNome" }, { id: 'tipo', header: "Tipo", accessorKey: 'tipo', cell: ({ row }) => <Badge variant={(row.original as Movimentacao).tipo === 'entrada' ? 'default' : 'destructive'} className="capitalize">{(row.original as Movimentacao).tipo}</Badge> }, { id: 'quantidade', header: "Quantidade", accessorKey: "quantidade" }, { id: 'motivo', header: "Motivo", accessorKey: "motivo" }] as ColumnDef<ReportData>[];
        }
    }, [reportType]);

    const renderSubComponent = useMemo(() => {
        switch(reportType) {
            case 'producao': return renderSubComponentProducao as any;
            case 'vendas': return renderSubComponentVendas as any;
            case 'compras': return renderSubComponentCompras as any;
            default: return undefined;
        }
    }, [reportType]);

    const handleGenerateReport = async () => {
        if (!date?.from || !date?.to) { return toast.error("Por favor, selecione um período de início e fim."); }
        setIsLoading(true); setReportData([]);
        try {
            const reportFetchers: Record<ReportKey, (d1: Date, d2: Date) => Promise<any[]>> = {
                vendas: getVendasPorPeriodo, producao: getProducoesPorPeriodo, movimentacoes: getMovimentacoesPorPeriodo,
                compras: getComprasPorPeriodo, clientes: getClientesPorPeriodo, fornecedores: getFornecedoresPorPeriodo,
                produtos: getProdutosPorPeriodo, funcionarios: getFuncionariosPorPeriodo, contasAPagar: getContasAPagarPorPeriodo,
                contasAReceber: getContasAReceberPorPeriodo,
            };
            const data = await reportFetchers[reportType](date.from, date.to);
            setReportData(data);
            if (data.length === 0) toast.info("Nenhum dado encontrado para os filtros selecionados.");
        } catch (e: any) {
            console.error(e);
            toast.error("Erro ao gerar o relatório.", { description: e.message });
        } finally {
            setIsLoading(false);
        }
    };

    // Funções de exportação mantidas
    useEffect(() => { const initialSelection: Record<string, boolean> = {}; availableColumns.forEach(col => { if (col.id && 'header' in col && typeof col.header === 'string') { initialSelection[col.id] = true; } }); setSelectedColumns(initialSelection); }, [availableColumns]);
    const getExportValue = (row: ReportData, column: ColumnDef<ReportData>): string => { if ('accessorKey' in column && column.accessorKey) { const accessorKey = column.accessorKey as keyof ReportData; const value = (row as any)[accessorKey]; if (column.cell && typeof column.cell === 'function') { const cellContext = { row: { original: row } } as CellContext<ReportData, unknown>; const renderedOutput = column.cell(cellContext); if (renderedOutput === null || renderedOutput === undefined) return ''; if (React.isValidElement(renderedOutput)) { const props = renderedOutput.props as { children?: React.ReactNode }; return props.children ? String(props.children) : ''; } return String(renderedOutput); } return String(value ?? ''); } return ''; };
    const handleConfirmExport = () => { const columnsToExport = availableColumns.filter(col => col.id && 'header' in col && col.header && selectedColumns[col.id]); if (columnsToExport.length === 0) return toast.error("Selecione pelo menos uma coluna para exportar."); const headers = columnsToExport.map(col => String('header' in col ? col.header : '')); const data = enrichedData.map(row => columnsToExport.map(col => getExportValue(row, col)) ); if (exportType === 'pdf') { const doc = new jsPDF(); autoTable(doc, { head: [headers], body: data }); doc.save(`relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.pdf`); } else { const escapeCsv = (str: string) => `"${String(str).replace(/"/g, '""')}"`; const csvContent = [ headers.join(','), ...data.map(row => row.map(escapeCsv).join(',')) ].join('\n'); const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); saveAs(blob, `relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.csv`); } setIsExportDialogOpen(false); };
    const openExportDialog = (type: ExportType) => { if (!enrichedData.length) return toast.error("Não há dados para exportar."); setExportType(type); setIsExportDialogOpen(true); };


    return (
        <div className="container mx-auto py-8 px-4 md:px-6 space-y-6">
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Selecionar Colunas para Exportação</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        {availableColumns.filter(c => c.id && 'header' in c && typeof c.header === 'string').map(col => { const key = col.id as string; return ( <div key={key} className="flex items-center space-x-2"> <Checkbox id={key} checked={!!selectedColumns[key]} onCheckedChange={(checked) => setSelectedColumns(p => ({...p, [key]: !!checked}))} /> <Label htmlFor={key} className="font-normal">{String('header' in col ? col.header : '')}</Label> </div> ); })}
                    </div>
                    <DialogFooter> <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose> <Button type="button" onClick={handleConfirmExport}>Confirmar Exportação</Button> </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card>
                 <CardHeader>
                    <CardTitle>Gerador de Relatórios</CardTitle>
                    <CardDescription>Selecione o tipo de relatório e o período desejado.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto] items-end gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="category-select">Categoria do Relatório</Label>
                            <Select value={selectedCategory} onValueChange={(value) => { const newCategory = value as keyof typeof reportGroups; setSelectedCategory(newCategory); const firstReportInNewCategory = Object.keys(reportGroups[newCategory].reports)[0] as ReportKey; setReportType(firstReportInNewCategory); setReportData([]); setSearchTerm(''); }}>
                                <SelectTrigger id="category-select" className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {Object.entries(reportGroups).map(([key, {label}]) => ( <SelectItem key={key} value={key}>{label}</SelectItem> ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="report-select">Relatório Específico</Label>
                             <Select value={reportType} onValueChange={(value) => { setReportType(value as ReportKey); setReportData([]); setSearchTerm(''); }}>
                                <SelectTrigger id="report-select" className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                     {Object.entries(reportGroups[selectedCategory].reports).map(([key, label]) => ( <SelectItem key={key} value={key as ReportKey}>{label}</SelectItem> ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2"><Label>Período</Label><DateRangePicker date={date} onDateChange={setDate} /></div>
                        <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full lg:w-auto">{isLoading ? "Gerando..." : "Gerar Relatório"}</Button>
                    </div>
                </CardContent>
            </Card>

            {(reportData.length > 0 || isLoading) && (
                <Card className="mt-6">
                    <CardHeader className="flex-row items-center justify-between">
                       <div>
                         <CardTitle>Resultados: {allReportLabels[reportType]}</CardTitle>
                         <CardDescription>{isLoading ? "Carregando dados..." : `Foram encontrados ${enrichedData.length} registros para os filtros aplicados.`}</CardDescription>
                       </div>
                       <div className="flex gap-2">
                           <Button onClick={() => openExportDialog('pdf')} variant="outline" size="sm" disabled={isLoading || enrichedData.length === 0}><IconFileTypePdf className="mr-2 h-4 w-4"/>PDF</Button>
                           <Button onClick={() => openExportDialog('csv')} variant="outline" size="sm" disabled={isLoading || enrichedData.length === 0}><IconFileTypeXls className="mr-2 h-4 w-4"/>CSV</Button>
                       </div>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? ( <div className="space-y-2 mt-4"> <div className="flex items-center space-x-4"><Skeleton className="h-8 w-1/3" /><Skeleton className="h-8 w-24" /></div> <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /></div> ) :
                        ( <>
                            {reportType === 'producao' && productionSummary && <ProductionReportSummary summary={productionSummary} />}
                            <Input placeholder="Filtrar resultados na tabela atual..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm mb-4" />
                            <GenericTable<ReportData> columns={availableColumns} data={enrichedData} renderSubComponent={renderSubComponent} />
                          </>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
