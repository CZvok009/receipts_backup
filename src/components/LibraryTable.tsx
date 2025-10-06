// src/components/LibraryTable.tsx

'use client';

import React from 'react';
import { Receipt } from '@/data/receipts';

interface LibraryTableProps {
  receipts: Receipt[];
  handleSort: (key: keyof Receipt, direction: 'asc' | 'desc') => void;
  sortState: { key: keyof Receipt; direction: 'asc' | 'desc' };
  onDetailClick?: (receipt: Receipt) => void;
  formatDate?: (dateString: string) => string;
  getStatus?: (receipt: Receipt) => 'Processed' | 'In process';
  formatMoneyWithCZK?: (amount: number, currency: string) => string;
  selectedReceipts?: number[];
  onReceiptSelect?: (receiptId: number, selected: boolean) => void;
  onDeleteSelected?: () => void;
  isDeleting?: boolean;
}

export default function LibraryTable({ 
  receipts, 
  handleSort, 
  sortState, 
  onDetailClick = () => {}, 
  formatDate,
  getStatus,
  formatMoneyWithCZK,
  selectedReceipts = [],
  onReceiptSelect = () => {},
  onDeleteSelected = () => {},
  isDeleting = false
}: LibraryTableProps) {
  const onHeaderClick = (key: keyof Receipt) => {
    const nextDirection = sortState.key === key && sortState.direction === 'asc' ? 'desc' : 'asc';
    handleSort(key, nextDirection);
  };
  
  const renderSortIndicator = (key: keyof Receipt) => {
    if (sortState.key !== key) return null;
    return <span className="ml-1 text-white">{sortState.direction === 'asc' ? '▲' : '▼'}</span>;
  };
  
  const handleSelectAll = () => {
    const allSelected = receipts.every(receipt => selectedReceipts.includes(receipt.id));
    receipts.forEach(receipt => {
      onReceiptSelect(receipt.id, !allSelected);
    });
  };

  const allSelected = receipts.length > 0 && receipts.every(receipt => selectedReceipts.includes(receipt.id));
  const someSelected = selectedReceipts.length > 0;

  const renderMoney = (amount: number, currency: string) => {
    return formatMoneyWithCZK ? formatMoneyWithCZK(amount, currency) : `${amount} ${currency}`;
  };

  return (
    <div className="mt-8 overflow-x-auto">
      {/* Delete button */}
      {someSelected && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={onDeleteSelected}
            disabled={isDeleting}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isDeleting ? 'Deleting...' : `Delete Selected (${selectedReceipts.length})`}
          </button>
        </div>
      )}
      
      <table className="min-w-full bg-neutral-900 text-neutral-200 rounded-lg overflow-hidden border border-neutral-800">
        <thead>
          <tr className="bg-neutral-950">
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 bg-neutral-800 border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
              />
            </th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">
              <div className="flex items-center justify-center space-x-2 cursor-pointer" onClick={() => onHeaderClick('id')}>
                <span>ID</span>
                {renderSortIndicator('id')}
              </div>
            </th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">
              <div className="flex items-center justify-center space-x-2 cursor-pointer" onClick={() => onHeaderClick('date')}>
                <span>DATE</span>
                {renderSortIndicator('date')}
              </div>
            </th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">
              <div className="flex items-center justify-center space-x-2 cursor-pointer" onClick={() => onHeaderClick('company')}>
                <span>COMPANY</span>
                {renderSortIndicator('company')}
              </div>
            </th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">
              <div className="flex items-center justify-center space-x-2 cursor-pointer" onClick={() => onHeaderClick('total')}>
                <span>TOTAL</span>
                {renderSortIndicator('total')}
              </div>
            </th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">SUBTOTAL</th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">TAX</th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">CURR</th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">ITEMS</th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">FILE</th>
            <th className="py-3 px-4 text-center border-r border-neutral-800 font-medium text-neutral-400">STATUS</th>
            <th className="py-3 px-4 text-center">DETAIL</th>
          </tr>
        </thead>
        <tbody>
          {receipts.map((receipt) => (
            <tr key={receipt.id} className="border-t border-neutral-800">
              <td className="py-2 px-4 text-center border-r border-neutral-800">
                <input
                  type="checkbox"
                  checked={selectedReceipts.includes(receipt.id)}
                  onChange={(e) => onReceiptSelect(receipt.id, e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-neutral-800 border-neutral-600 rounded focus:ring-blue-500 focus:ring-2"
                />
              </td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{receipt.id}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{formatDate ? formatDate(receipt.date) : receipt.date}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{receipt.company}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{renderMoney(receipt.total, receipt.currency)}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{renderMoney(receipt.totals_details.subtotal, receipt.currency)}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{renderMoney(receipt.totals_details.tax_amount, receipt.currency)}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{receipt.currency}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">{receipt.items.length}</td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">
                {receipt.file_url ? (
                  <a href={receipt.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">Open</a>
                ) : (
                  <span className="text-neutral-500">No file</span>
                )}
              </td>
              <td className="py-2 px-4 text-center border-r border-neutral-800">
                {(() => {
                  const s = getStatus ? getStatus(receipt) : 'Processed';
                  const isProcessed = s === 'Processed';
                  return (
                    <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs border ${isProcessed ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-purple-900/30 text-purple-300 border-purple-800'}`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${isProcessed ? 'bg-green-400' : 'bg-purple-400'}`}></span>
                      {s}
                    </span>
                  );
                })()}
              </td>
              <td className="py-2 px-4 text-center">
                <button 
                  className="px-4 py-1.5 text-sm text-blue-400 font-medium rounded-md border border-neutral-800 hover:text-white hover:bg-blue-600/20 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                  onClick={() => onDetailClick(receipt)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}