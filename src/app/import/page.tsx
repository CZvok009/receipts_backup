// src/app/import/page.tsx

'use client';

import React from 'react';
import Link from 'next/link';

export default function ImportPage() {
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
        <source src="/library-background.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Dark overlay */}
      <div className="absolute inset-0 z-10 bg-black opacity-60 pointer-events-none"></div>

      {/* Removed Home button */}

      {/* Main content */}
      <div className="relative z-20 flex flex-col items-center justify-center min-h-screen px-6">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold mb-5">Import & Export</h1>
          <p className="text-xl text-gray-300 mb-10">Manage your receipt data</p>
        </div>

        {/* Feature cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📥</div>
            <h3 className="text-xl font-semibold mb-3">Import Data</h3>
            <p className="text-gray-300 text-base">Import receipt data from CSV files or other sources</p>
          </div>
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">📤</div>
            <h3 className="text-xl font-semibold mb-3">Export Data</h3>
            <p className="text-gray-300 text-base">Export your processed receipts to various formats</p>
          </div>
        </div>

        {/* Coming Soon */}
        <div className="mt-14 text-center">
          <div className="bg-gray-800 bg-opacity-50 rounded-xl p-10 max-w-4xl">
            <h2 className="text-2xl font-bold mb-5">Coming Soon</h2>
            <p className="text-gray-300 text-lg mb-6">
              Advanced import and export features are currently in development. 
              For now, use the Upload feature to process receipts with our advanced OCR tool.
            </p>
            <Link href="/aura-ocr" className="inline-block mt-6 px-7 py-4 bg-purple-600 text-white text-lg rounded-lg hover:bg-purple-700 transition-colors">
              Go to Upload
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}