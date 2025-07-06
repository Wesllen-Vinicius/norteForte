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

interface GenericTableProps<TData extends object> {
    data: TData[];
    columns: ColumnDef<TData, any>[];
    filterPlaceholder?: string;
    filterColumnId?: keyof TData;
    renderSubComponent?: (props: { row: Row<TData> }) => React.ReactElement;
    tableControlsComponent?: React.ReactNode;
}

export function GenericTable<TData extends object>({
  columns,
  data,
  filterPlaceholder,
  filterColumnId,
  renderSubComponent,
  tableControlsComponent,
}: GenericTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const tableColumns = React.useMemo<ColumnDef<TData>[]>(() => {
    if (!renderSubComponent) return columns;

    const expanderColumn: ColumnDef<TData> = {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={row.getToggleExpandedHandler()}
          className="h-8 w-8"
        >
          {row.getIsExpanded() ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </Button>
      ),
    };
    return [expanderColumn, ...columns];
  }, [columns, renderSubComponent]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      expanded,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => !!renderSubComponent,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center">
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
                            {cell.column.id !== 'actions' && cell.column.id !== 'expander' ? (
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
                            <TableCell colSpan={row.getVisibleCells().length} className="p-0 bg-muted/20">
                                {renderSubComponent({ row })}
                            </TableCell>
                        </TableRow>
                    )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (renderSubComponent ? 1 : 0)}
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
