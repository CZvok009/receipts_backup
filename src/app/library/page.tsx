// src/app/library/page.tsx

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import LibraryTable from '../../components/LibraryTable';
import ReceiptDetailModal from '../../components/ReceiptDetailModal';
import SearchBar from '../../components/SearchBar';
import { initialReceipts, Receipt } from '../../data/receipts';
import { useAuth } from '../../hooks/useAuth';

export default function LibraryPage() {
  const { user, isAuthenticated, logout, loading: authLoading } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortState, setSortState] = useState<{ key: keyof Receipt; direction: 'asc' | 'desc' }>({ key: 'id', direction: 'asc' });
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [selectedReceipts, setSelectedReceipts] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'processed' | 'in_process'>('all');

  const handleSort = (key: keyof Receipt, direction: 'asc' | 'desc') => {
    if (sortState.key === key && sortState.direction === direction) {
      return;
    }
    
    const sortedReceipts = [...filteredReceipts].sort((a, b) => {
      const aValue = a[key];
      const bValue = b[key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return 0;
    });

    setFilteredReceipts(sortedReceipts);
    setSortState({ key, direction });
  };

  const handleViewDetails = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
  };

  const handleCloseModal = () => {
    setSelectedReceipt(null);
  };

  const handleReceiptSelect = (receiptId: number, selected: boolean) => {
    setSelectedReceipts(prev => {
      if (selected) {
        return [...prev, receiptId];
      } else {
        return prev.filter(id => id !== receiptId);
      }
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedReceipts.length === 0) return;

    setIsDeleting(true);
    try {
      // Lokální mazání: vyfiltrujeme z `receipts` i `filteredReceipts`
      setReceipts(prev => prev.filter(r => !selectedReceipts.includes(r.id)));
      setFilteredReceipts(prev => prev.filter(r => !selectedReceipts.includes(r.id)));
      setSelectedReceipts([]);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  const getStatus = (r: Receipt): 'Processed' | 'In process' => {
    const hasTotal = Number(r.total || 0) > 0;
    const hasFile = !!(r.file_url && r.file_url.length > 0);
    return hasTotal && hasFile ? 'Processed' : 'In process';
  };

  const currencyToCzkRate: Record<string, number> = {
    USD: 24.0,
    EUR: 25.0,
    GBP: 29.0,
    CZK: 1,
  };

  const normalizeCurrencyCode = (raw: string): keyof typeof currencyToCzkRate | 'USD' => {
    const c = (raw || '').trim();
    if (!c) return 'USD';
    // Map common symbols to ISO codes
    if (c === '€') return 'EUR';
    if (c === '$') return 'USD';
    if (c === '£') return 'GBP';
    if (/^kč$/i.test(c)) return 'CZK';
    const up = c.toUpperCase();
    if (up in currencyToCzkRate) return up as keyof typeof currencyToCzkRate;
    // Accept known 3-letter codes
    if (/^[A-Z]{3}$/.test(up)) return (up as any);
    return 'USD';
  };

  const formatMoneyWithCZK = (amount: number, currency: string) => {
    const iso = normalizeCurrencyCode(currency);
    const original = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: iso }).format(amount || 0);
    const rate = currencyToCzkRate[iso] || 1;
    const czkValue = amount * rate;
    const czk = new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK' }).format(czkValue || 0);
    if (!rate || rate === 1) return original;
    return `${original} (${czk})`;
  };

  const applyFilters = (base: Receipt[], term: string, from: string, to: string, status: 'all' | 'processed' | 'in_process') => {
    const q = term.trim().toLowerCase();
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const filtered = base.filter((r) => {
      const matchesSearch = q
        ? (
            r.company.toLowerCase().includes(q) ||
            r.date.toLowerCase().includes(q) ||
            r.currency.toLowerCase().includes(q) ||
            (Array.isArray(r.items) && r.items.some((it) => (it.name || '').toLowerCase().includes(q)))
          )
        : true;

      const d = new Date(r.date);
      const afterFrom = fromDate ? d >= fromDate : true;
      const beforeTo = toDate ? d <= toDate : true;
      const matchesDate = afterFrom && beforeTo;

      const s = getStatus(r);
      const matchesStatus = status === 'all' ? true : status === 'processed' ? s === 'Processed' : s === 'In process';

      return matchesSearch && matchesDate && matchesStatus;
    });
    setFilteredReceipts(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    applyFilters(receipts, term, dateFrom, dateTo, statusFilter);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        const res = await fetch('/api/receipts?ts=' + Date.now(), {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) return;
        const data: Receipt[] = await res.json();
        setReceipts(data);
        setFilteredReceipts(data);
      } catch {}
      finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    applyFilters(receipts, searchQuery, dateFrom, dateTo, statusFilter);
  }, [receipts, searchQuery, dateFrom, dateTo, statusFilter]);

  return (
    <div className="relative min-h-screen bg-neutral-950">
      {/* Header bar */}
      <header className="border-b border-neutral-800 px-6">
        <div className="grid h-16 grid-cols-3 items-center gap-4">
          {/* Left cluster */}
          <div className="flex items-center gap-4">
            <SearchBar onSearch={handleSearch} className="max-md:flex-1" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2 py-1 text-sm"
              />
              <span className="text-neutral-500 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2 py-1 text-sm"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2 py-1 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="processed">Processed</option>
              <option value="in_process">In process</option>
            </select>
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('all'); setSearchQuery(''); setFilteredReceipts(receipts); }}
              className="text-neutral-300 hover:text-white text-sm px-2 py-1 border border-neutral-800 rounded"
            >
              Clear
            </button>
          </div>
          {/* Center title */}
          <div className="flex items-center justify-center">
            <h1 className="text-neutral-100 text-lg font-semibold tracking-tight">Your Library</h1>
          </div>
          {/* Right cluster */}
          <div className="flex items-center justify-end gap-4">
            {isAuthenticated && user ? (
              <UserMenu username={user.username} onLogout={logout} />
            ) : (
              <Link
                href="/login"
                className="text-neutral-300 hover:text-white px-3 py-1.5 rounded-md"
              >
                Sign In
              </Link>
            )}
            <Link
              href="/aura-ocr"
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500"
            >
              Create expense
            </Link>
          </div>
        </div>
      </header>

      {/* Hlavní obsah stránky Library */}
      <div className="relative flex flex-col items-center justify-start min-h-screen pt-4 z-20 px-8">

        {/* Loading State */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-xl text-neutral-400">Loading receipts...</span>
          </div>
        ) : (
          <LibraryTable 
            receipts={filteredReceipts} 
            handleSort={handleSort} 
            sortState={sortState} 
            onDetailClick={handleViewDetails} 
            formatDate={formatDate}
            getStatus={getStatus}
            formatMoneyWithCZK={formatMoneyWithCZK}
            selectedReceipts={selectedReceipts}
            onReceiptSelect={handleReceiptSelect}
            onDeleteSelected={handleDeleteSelected}
            isDeleting={isDeleting}
          />
        )}
      </div>
      <ReceiptDetailModal receipt={selectedReceipt} onClose={handleCloseModal} />
    </div>
  );
}

function UserMenu({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-neutral-700 text-neutral-200 hover:bg-neutral-800"
      >
        <span className="font-medium">{username}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-md border border-neutral-800 bg-neutral-900 text-neutral-200 shadow-lg z-50">
          <button
            onClick={() => { window.location.href = '/login'; }}
            className="w-full text-left px-3 py-2 hover:bg-neutral-800"
          >
            Switch users
          </button>
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-red-300"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}