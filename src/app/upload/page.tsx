// src/app/upload/page.tsx

'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';

export default function UploadPage() {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-300 mb-6">You need to be logged in to access this page.</p>
          <Link href="/login" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover"
      >
        <source src="/import-background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-black opacity-60"></div>

      {/* Removed Home button */}

      {/* User info */}
      {user && (
        <div className="absolute top-8 right-8 z-20">
          <div className="text-lg text-gray-300">
            Welcome, <span className="font-semibold text-white">{user.username}</span>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-5">Upload Receipts</h1>
          <p className="text-xl text-gray-300 mb-10">Advanced OCR processing with Aura</p>
        </div>

        {/* Open Aura OCR */}
        <div className="text-center">
          <a 
            href="/aura-ocr" 
            className="inline-block px-10 py-5 text-xl font-semibold text-white rounded-lg shadow-lg transition-colors duration-200 hover:bg-opacity-90"
            style={{ backgroundColor: '#8a2be2' }}
          >
            Open Aura OCR Tool
          </a>
          <p className="mt-5 text-gray-400 text-base">
            Advanced receipt processing interface
          </p>
        </div>

        {/* Feature cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-xl font-semibold mb-3">OCR Processing</h3>
            <p className="text-gray-300 text-base">Advanced text extraction from receipt images</p>
          </div>
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-xl font-semibold mb-3">Data Extraction</h3>
            <p className="text-gray-300 text-base">Automatic parsing of items, prices, and details</p>
          </div>
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">💾</div>
            <h3 className="text-xl font-semibold mb-3">Database Storage</h3>
            <p className="text-gray-300 text-base">Automatic saving to Supabase database</p>
          </div>
        </div>
      </div>
    </div>
  );
}