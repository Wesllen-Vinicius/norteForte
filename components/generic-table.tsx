"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  ExpandedState,
  getExpandedRowModel,
  Row,
  RowSelectionState,
} from "@tanstack/react-table";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "./ui/input";
import { TruncatedCell } from "./ui/truncated-cell";
import { Checkbox } from "./ui/checkbox";

interface GenericTableProps<TData extends object> {
    data: TData[];
    columns: ColumnDef<TData, any>[];
    filterPlaceholder?: string;
    filterColumnId?: keyof TData;
    renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
    tableControlsComponent?: React.ReactNode;
    tableActionsComponent?: (selectedRows: TData[]) => React.ReactNode;
}

export function GenericTable<TData extends object>({
  columns,
  data,
  filterPlaceholder,
  renderSubComponent,
  tableControlsComponent,
  tableActionsComponent,
}: GenericTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const tableColumns = React.useMemo<ColumnDef<TData>[]>(() => {
    const actionColumns: ColumnDef<TData>[] = [];

    if (tableActionsComponent) {
        actionColumns.push({
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Selecionar todas"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Selecionar linha"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        });
    }

    if (renderSubComponent) {
        actionColumns.push({
          id: 'expander',
          header: () => null,
          cell: ({ row }) => (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => row.toggleExpanded(!row.getIsExpanded())}
              className="h-8 w-8"
            >
              {row.getIsExpanded() ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            </Button>
          ),
        });
    }

    return [...actionColumns, ...columns];
  }, [columns, renderSubComponent, tableActionsComponent]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      expanded,
      rowSelection,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => !!renderSubComponent,
  });

  const selectedRowsData = table.getFilteredSelectedRowModel().rows.map(row => row.original);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            {filterPlaceholder && (
                <Input
                    placeholder={filterPlaceholder}
                    value={globalFilter}
                    onChange={(event) => setGlobalFilter(String(event.target.value))}
                    className="max-w-sm"
                />
            )}
            {tableControlsComponent}
        </div>
        {tableActionsComponent && selectedRowsData.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in-50">
                <span className="text-sm text-muted-foreground">{selectedRowsData.length} selecionado(s)</span>
                {tableActionsComponent(selectedRowsData)}
            </div>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                    <TableRow data-state={row.getIsSelected() && "selected"}>
                        {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="max-w-[250px]">
                            {cell.column.id !== 'actions' && cell.column.id !== 'expander' && cell.column.id !== 'select' ? (
                                <TruncatedCell>
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </TruncatedCell>
                            ) : (
                                flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                )
                            )}
                        </TableCell>
                        ))}
                    </TableRow>
                    {row.getIsExpanded() && renderSubComponent && (
                        <TableRow>
                            <TableCell colSpan={table.getAllColumns().length} className="p-0 bg-muted/20">
                                {renderSubComponent({ row })}
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  Nenhum resultado para os filtros aplicados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}
