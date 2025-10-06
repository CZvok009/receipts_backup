// src/components/ReceiptDetailModal.tsx

'use client';

import React from 'react';
import Image from 'next/image';
import { Receipt } from '@/data/receipts';

interface ReceiptDetailModalProps {
  receipt: Receipt | null;
  onClose: () => void;
}

export default function ReceiptDetailModal({ receipt, onClose }: ReceiptDetailModalProps) {
  if (!receipt) {
    return null;
  }

  const status: 'Processed' | 'In process' = (() => {
    const hasTotal = Number(receipt.total || 0) > 0;
    const hasFile = !!(receipt.file_url && receipt.file_url.length > 0);
    return hasTotal && hasFile ? 'Processed' : 'In process';
  })();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 text-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Tlačítko pro zavření modálního okna */}
        <button onClick={onClose} className="absolute top-4 right-4 text-white text-2xl font-bold">
          &times;
        </button>

        <h2 className="text-3xl font-bold mb-4">{receipt.company}</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-gray-400">ID:</p>
            <p className="text-lg">{receipt.id}</p>
          </div>
          <div>
            <p className="text-gray-400">DATE:</p>
            <p className="text-lg">{receipt.date}</p>
          </div>
          <div>
            <p className="text-gray-400">TOTAL:</p>
            <p className="text-lg">{receipt.total} {receipt.currency}</p>
          </div>
          <div>
            <p className="text-gray-400">SUBTOTAL:</p>
            <p className="text-lg">{receipt.totals_details.subtotal} {receipt.currency}</p>
          </div>
          <div>
            <p className="text-gray-400">TAX AMOUNT:</p>
            <p className="text-lg">{receipt.totals_details.tax_amount} {receipt.currency}</p>
          </div>
          <div>
            <p className="text-gray-400">STATUS:</p>
            <p className="text-lg">
              <span className={`inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs border ${status === 'Processed' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-purple-900/30 text-purple-300 border-purple-800'}`}>
                <span className={`inline-block w-2 h-2 rounded-full ${status === 'Processed' ? 'bg-green-400' : 'bg-purple-400'}`}></span>
                {status}
              </span>
            </p>
          </div>
        </div>

        {/* Sekce pro položky */}
        <h3 className="text-xl font-semibold mb-2">Items</h3>
        <ul className="list-disc list-inside mb-6">
          {receipt.items.map((item, index) => (
            <li key={index}>
              {item.name} - {item.quantity}x - {item.price} {receipt.currency}
            </li>
          ))}
        </ul>

        {/* Náhled obrázku */}
        <h3 className="text-xl font-semibold mb-2">Receipt Image</h3>
        <div className="bg-gray-900 p-4 rounded-lg">
          {receipt.file_url ? (
            <img src={receipt.file_url} alt="Receipt Preview" className="max-w-full h-auto" />
          ) : (
            <p className="text-gray-400">No image available</p>
          )}
        </div>
      </div>
    </div>
  );
}