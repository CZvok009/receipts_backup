// src/components/SearchBar.tsx

'use client';

import React from 'react';

interface SearchBarProps {
  onSearch: (term: string) => void;
  className?: string;
}

export default function SearchBar({ onSearch, className = '' }: SearchBarProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch(e.target.value);
  };
  
  return (
    <div className={`relative ${className}`}>
      <input
        type="search"
        placeholder="Search..."
        onChange={handleChange}
        className="h-8 ps-8 pe-2 w-72 md:w-80 rounded-md border border-neutral-700 bg-neutral-900 text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
      >
        <path
          d="M21 21l-4.3-4.3m1.3-5.2a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}