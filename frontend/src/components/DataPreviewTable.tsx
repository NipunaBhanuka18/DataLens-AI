"use client";

import React, { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { ColumnMetadata } from "@/types/api";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Table as TableIcon } from "lucide-react";

interface DataPreviewTableProps {
  columns: ColumnMetadata[];
  data: Record<string, any>[];
}

export function DataPreviewTable({ columns, data }: DataPreviewTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const tableColumns = useMemo<ColumnDef<Record<string, any>>[]>(() => {
    return columns.map((col) => ({
      accessorKey: col.name,
      header: ({ column }) => {
        const isSorted = column.getIsSorted();
        return (
          <button
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="flex items-center gap-1.5 font-bold text-slate-200 hover:text-white transition"
          >
            <span>{col.name}</span>
            {isSorted === "asc" && <ArrowUp className="w-3.5 h-3.5 text-[#22C55E]" />}
            {isSorted === "desc" && <ArrowDown className="w-3.5 h-3.5 text-[#22C55E]" />}
            {!isSorted && <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100 text-slate-400" />}
          </button>
        );
      },
      cell: (info) => {
        const val = info.getValue();
        if (val === null || val === undefined) {
          return <span className="text-slate-500 italic">null</span>;
        }
        if (typeof val === "boolean") {
          return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${val ? "bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30" : "bg-rose-500/15 text-rose-400 border border-rose-500/30"}`}>
              {val ? "TRUE" : "FALSE"}
            </span>
          );
        }
        return <span className="text-slate-200 font-medium">{String(val)}</span>;
      },
    }));
  }, [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const getBadgeColor = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("int") || t.includes("float")) return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
    if (t.includes("str") || t.includes("string") || t.includes("cat")) return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    if (t.includes("bool")) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  };

  return (
    <div className="dark-surface-card rounded-2xl p-6 shadow-2xl my-6 border border-white/[0.08]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] rounded-xl">
            <TableIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">Interactive Data Preview</h3>
              <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30">
                First {data.length} Rows
              </span>
            </div>
            <p className="text-xs text-slate-400">Click headers to sort or filter dataset rows</p>
          </div>
        </div>

        {/* Global Filter Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search rows..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-500 focus:outline-none focus:border-[#22C55E] transition"
          />
        </div>
      </div>

      {/* Column Data Type Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        {columns.map((col) => (
          <div key={col.name} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs">
            <span className="font-semibold text-slate-300">{col.name}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${getBadgeColor(col.data_type)}`}>
              {col.data_type}
            </span>
          </div>
        ))}
      </div>

      {/* Scrollable Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[380px] rounded-xl border border-white/[0.08] bg-[#0B0F19]/60">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-[#131B2E] backdrop-blur z-10 border-b border-white/[0.08]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="p-3.5 font-bold text-slate-300 whitespace-nowrap">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-[#22C55E]/5 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-3.5 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center text-slate-500 italic">
                  No matching dataset records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
