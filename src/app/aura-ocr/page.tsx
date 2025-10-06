// src/app/aura-ocr/page.tsx

'use client';

import React, { useEffect, useRef, useState } from 'react';
import Tesseract from 'tesseract.js';
import { useAuth } from '../../hooks/useAuth';
import Link from 'next/link';

interface Item {
  name: string;
  quantity: number;
  total_price: number;
  unit_price: number;
}

// Basic parser to convert OCR text into structured receipt-like data
function parseReceiptText(text: string) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const merchantName = lines[0] || '';

  const dateRegex = /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/;
  const timeRegex = /(\d{1,2}:\d{2})/;
  const dateMatch = text.match(dateRegex);
  const timeMatch = text.match(timeRegex);

  const currencySymbols = text.match(/[£$€]/g);
  let currency = 'EUR';
  if (currencySymbols && currencySymbols.length > 0) {
    const s = currencySymbols[0];
    if (s === '£') currency = 'GBP';
    if (s === '$') currency = 'USD';
    if (s === '€') currency = 'EUR';
  }

  const num = (s?: string) => (s ? s.replace(',', '.').trim() : '');
  const totalMatch = text.match(/total[:\s]*[£$€]?\s*(\d+[.,]\d{2})/i);
  const subtotalMatch = text.match(/subtotal[:\s]*[£$€]?\s*(\d+[.,]\d{2})/i);
  const taxMatch = text.match(/(?:tax|vat)[:\s]*[£$€]?\s*(\d+[.,]\d{2})/i);

  const items: Array<{ name: string; price: string }> = [];
  const itemRegex = /(.+?)\s+[£$€]?(\d+[.,]\d{2})$/;
  for (const line of lines) {
    if (/total|subtotal|tax|vat|change|paid/i.test(line)) continue;
    const m = line.match(itemRegex);
    if (m) {
      const name = m[1].trim();
      const price = num(m[2]);
      if (name.length > 2 && !/^[\d\s]+$/.test(name)) items.push({ name, price });
    }
  }

  // Heuristic for address
  const addressLines = lines
    .slice(1, 5)
    .filter((l) => /\d/.test(l) && (l.length > 10 || /street|road|lane|avenue|st\b|rd\b/i.test(l)));

  return {
    company_name: merchantName,
    merchant_name: merchantName,
    address: addressLines.join(', '),
    date: dateMatch ? dateMatch[1] : '',
    dates: dateMatch ? [dateMatch[1]] : [],
    time: timeMatch ? timeMatch[1] : '',
    times: timeMatch ? [timeMatch[1]] : [],
    currency,
    currencies: [currency],
    items,
    subtotal: num(subtotalMatch?.[1]),
    subtotal_amount: num(subtotalMatch?.[1]),
    tax_amount: num(taxMatch?.[1]),
    total: num(totalMatch?.[1]),
    total_amount: num(totalMatch?.[1]),
    amount_paid: num(totalMatch?.[1]),
    change: '0.00',
    raw_text: text,
  } as any;
}

export default function AuraOcrPage() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [itemCounter, setItemCounter] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    merchant: '',
    address: '',
    phone: '',
    date: '',
    time: '',
    currency: 'EUR',
    transactionId: '',
    paymentMethod: '',
    cardNumber: '',
    transactionStatus: '',
    subtotal: '',
    taxAmount: '',
    totalAmount: '',
    amountPaid: '',
    change: ''
  });

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
          <a href="/login" className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showMessage('Please select a valid image file.', 'error');
      return;
    }
    setSelectedFile(file);
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const addItem = () => {
    const newItem: Item = {
      name: '',
      quantity: 1,
      total_price: 0,
      unit_price: 0
    };
    setItems([...items, newItem]);
    setItemCounter(itemCounter + 1);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Auto-calculate totals
    if (field === 'quantity' || field === 'unit_price') {
      const qty = field === 'quantity' ? Number(value) : updatedItems[index].quantity;
      const unit = field === 'unit_price' ? Number(value) : updatedItems[index].unit_price;
      updatedItems[index].total_price = qty * unit;
    } else if (field === 'total_price') {
      const total = Number(value);
      const qty = updatedItems[index].quantity;
      if (qty > 0) {
        updatedItems[index].unit_price = total / qty;
      }
    }
    
    setItems(updatedItems);
  };

  const populateFields = (data: any) => {
    setFormData({
      merchant: data.company_name || data.merchant_name || '',
      address: data.address || '',
      phone: data.phone || '',
      date: data.dates?.[0] ? new Date(data.dates[0]).toISOString().split('T')[0] : data.date ? new Date(data.date).toISOString().split('T')[0] : '',
      time: data.times?.[0] || data.time || '',
      currency: data.currencies?.[0] || data.currency || 'EUR',
      transactionId: data.transaction_id || '',
      paymentMethod: data.payment_method || '',
      cardNumber: data.card_number || '',
      transactionStatus: data.transaction_status || '',
      subtotal: data.subtotal?.amount || data.subtotal || data.subtotal_amount || '',
      taxAmount: data.tax_vat?.[0]?.amount || data.tax_vat?.[0]?.rate || data.tax_amount || data.tax || data.vat_amount || '',
      totalAmount: data.total?.amount || data.total_amount || data.total || data.total_sum || '',
      amountPaid: data.amount_paid || data.paid_amount || '',
      change: data.change || data.change_amount || ''
    });

    // Populate items
    if (data.items && Array.isArray(data.items)) {
      const populatedItems: Item[] = data.items.map((item: any) => {
        const priceMatch = item.price ? item.price.match(/(\d+\.?\d*)/) : null;
        const price = priceMatch ? parseFloat(priceMatch[1]) : 0;
        const qtyMatch = item.name ? item.name.match(/(\d+)x/) : null;
        const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        const unitPrice = qty > 0 ? price / qty : price;
        
        return {
          name: item.name || '',
          quantity: qty,
          total_price: price,
          unit_price: unitPrice
        };
      });
      setItems(populatedItems);
      setItemCounter(populatedItems.length);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile) {
      showMessage('Please select an image first', 'error');
      return;
    }

    setIsProcessing(true);
    setMessage({ text: '', type: '' });

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            setMessage({ text: `Processing OCR... ${pct}%`, type: 'success' });
          }
        }
      });

      const parsed = parseReceiptText(text);
      const payload = { success: true, data: parsed } as any;
      setExtractedData(payload);
      populateFields(parsed);
      showMessage('✅ Receipt processed successfully!', 'success');
    } catch (error: any) {
      showMessage('OCR error: ' + error.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    if (!extractedData) {
      showMessage('No data to save. Please process a receipt first.', 'error');
      return;
    }

    const saveData = {
      ...formData,
      items: items
    };

    console.log('Saving receipt data:', saveData);
    showMessage('Receipt data saved successfully!', 'success');
  };

  const handleReset = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setItems([]);
    setItemCounter(0);
    setFormData({
      merchant: '',
      address: '',
      phone: '',
      date: '',
      time: '',
      currency: 'EUR',
      transactionId: '',
      paymentMethod: '',
      cardNumber: '',
      transactionStatus: '',
      subtotal: '',
      taxAmount: '',
      totalAmount: '',
      amountPaid: '',
      change: ''
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setMessage({ text: '', type: '' });
  };

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to right, #000000 0%, #471F7A 100%)' }}>
      {/* Header (same layout as library) */}
      <header className="border-b border-neutral-800 px-6 bg-black/40 backdrop-blur-sm">
        <div className="grid h-16 grid-cols-3 items-center gap-4">
          {/* Left cluster */}
          <div className="flex items-center gap-4"></div>
          {/* Center title */}
          <div className="flex items-center justify-center">
            <h1 className="text-neutral-100 text-lg font-semibold tracking-tight">Aura OCR</h1>
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
              href="/library"
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-500"
            >
              Library
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {!selectedFile ? (
        /* Upload-only view - shown when no file is selected */
        <div className="flex items-center justify-center min-h-screen pt-10 px-8">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-2xl w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">UPLOAD RECEIPT IMAGE</h3>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-3 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-300 hover:border-purple-500'
              }`}
              style={{ minHeight: '20rem' }}
            >
              <div className="text-xl text-gray-600 mb-2">Upload Receipt Image</div>
              <div className="text-sm text-gray-500 mb-2">Supported formats: JPG, PNG, GIF, WEBP</div>
              <div className="text-sm text-gray-500">Drag & drop or click to select</div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      ) : !extractedData ? (
        /* Image preview + Process button - shown after upload but before processing */
        <div className="flex items-center justify-center min-h-screen pt-10 px-8">
          <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-2xl w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">RECEIPT IMAGE</h3>
            <div className="border-2 border-gray-200 rounded-2xl p-4 text-center overflow-hidden mb-6" style={{ minHeight: '20rem' }}>
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Uploaded receipt" 
                  className="max-w-full max-h-96 rounded-lg object-contain mx-auto" 
                />
              )}
            </div>
            
            <div className="space-y-4">
              <button
                onClick={handleProcess}
                disabled={isProcessing}
                className="w-full bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-sans hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Process Receipt'}
              </button>
              
              {isProcessing && (
                <div className="text-center">
                  <div className="inline-block w-5 h-5 border-3 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              )}
              
              {message.text && (
                <div className={`p-4 rounded-lg text-center ${
                  message.type === 'error' 
                    ? 'bg-red-100 text-red-800 border border-red-300' 
                    : 'bg-green-100 text-green-800 border border-green-300'
                }`}>
                  {message.text}
                </div>
              )}
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg text-base font-sans hover:bg-gray-700 transition-colors"
              >
                Change Image
              </button>
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="image/*"
              className="hidden"
            />
          </div>
        </div>
      ) : (
        /* Full form view - shown after processing */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto pt-10 px-8">
        {/* Left Panel - Form */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          {/* Merchant Information */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">MERCHANT INFORMATION</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Merchant:</label>
                     <input
                       type="text"
                       value={formData.merchant}
                       onChange={(e) => updateFormData('merchant', e.target.value)}
                       placeholder="Enter merchant name"
                       className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                     />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Address:</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateFormData('address', e.target.value)}
                  placeholder="Enter address"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Phone:</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">TRANSACTION DETAILS</h3>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Date:</label>
                       <input
                         type="date"
                         value={formData.date}
                         onChange={(e) => updateFormData('date', e.target.value)}
                         className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-mono focus:border-purple-600 focus:outline-none text-gray-900"
                       />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Time:</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => updateFormData('time', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
            </div>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Currency:</label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => updateFormData('currency', e.target.value)}
                  placeholder="EUR"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Transaction ID:</label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={(e) => updateFormData('transactionId', e.target.value)}
                  placeholder="Enter transaction ID"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-mono focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">ITEMS</h3>
            <button
              onClick={addItem}
              className="bg-green-600 text-white px-5 py-3 rounded-lg text-base font-mono hover:bg-green-700 transition-colors mb-5"
            >
              + Add Item
            </button>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                             <input
                               type="text"
                               value={item.name}
                               onChange={(e) => updateItem(index, 'name', e.target.value)}
                               placeholder="Item name"
                               className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-sans text-gray-900"
                             />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 min-w-12">Qty:</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                          min="1"
                          step="1"
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm font-sans text-gray-900"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={item.total_price}
                        onChange={(e) => updateItem(index, 'total_price', Number(e.target.value))}
                        placeholder="0.00"
                        step="0.01"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-sans text-gray-900"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 min-w-20">Unit price:</span>
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', Number(e.target.value))}
                          placeholder="0.00"
                          step="0.01"
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm font-sans text-gray-900"
                        />
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                      >
                        Remove Item
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Information */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">PAYMENT INFORMATION</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Payment Method:</label>
                     <input
                       type="text"
                       value={formData.paymentMethod}
                       onChange={(e) => updateFormData('paymentMethod', e.target.value)}
                       placeholder="e.g., MAESTRO, VISA"
                     className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                     />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Card Number:</label>
                <input
                  type="text"
                  value={formData.cardNumber}
                  onChange={(e) => updateFormData('cardNumber', e.target.value)}
                  placeholder="Last 4 digits"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Transaction Status:</label>
                <input
                  type="text"
                  value={formData.transactionStatus}
                  onChange={(e) => updateFormData('transactionStatus', e.target.value)}
                  placeholder="e.g., Completed, Pending"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">FINANCIAL SUMMARY</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Subtotal:</label>
                     <input
                       type="number"
                       value={formData.subtotal}
                       onChange={(e) => updateFormData('subtotal', e.target.value)}
                       step="0.01"
                       placeholder="0.00"
                       className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-mono focus:border-purple-600 focus:outline-none text-gray-900"
                     />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Tax Amount:</label>
                <input
                  type="number"
                  value={formData.taxAmount}
                  onChange={(e) => updateFormData('taxAmount', e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-sans focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Total Amount:</label>
                <input
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => updateFormData('totalAmount', e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-mono focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Amount Paid:</label>
                <input
                  type="number"
                  value={formData.amountPaid}
                  onChange={(e) => updateFormData('amountPaid', e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-mono focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Change:</label>
                <input
                  type="number"
                  value={formData.change}
                  onChange={(e) => updateFormData('change', e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-base font-mono focus:border-purple-600 focus:outline-none text-gray-900"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              disabled={!extractedData}
              className="bg-purple-600 text-white px-8 py-4 rounded-lg text-lg font-sans hover:bg-purple-700 disabled:bg-gray-400 transition-colors"
            >
              Save Receipt
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-600 text-white px-8 py-4 rounded-lg text-lg font-sans hover:bg-gray-700 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Right Panel - Image Preview and JSON Output */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Image Preview */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">RECEIPT IMAGE</h3>
            <div className="border-2 border-gray-200 rounded-2xl p-4 text-center overflow-hidden" style={{ maxHeight: '15rem' }}>
              {previewUrl && (
                <img 
                  src={previewUrl} 
                  alt="Uploaded receipt" 
                  className="max-w-full max-h-52 rounded-lg object-contain mx-auto" 
                />
              )}
            </div>
          </div>

          {/* JSON Output */}
          <div className="mb-6 flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-5 pb-2 border-b-2 border-gray-100">EXTRACTED DATA</h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 h-full font-mono text-sm overflow-y-auto">
              <div className="opacity-70 text-gray-900">
                {extractedData ? JSON.stringify(extractedData, null, 2) : 'No data extracted yet'}
              </div>
            </div>
          </div>

          {/* Message */}
          {message.text && (
            <div className={`p-4 rounded-lg text-center mb-4 ${
              message.type === 'error' 
                ? 'bg-red-100 text-red-800 border border-red-300' 
                : 'bg-green-100 text-green-800 border border-green-300'
            }`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
      )}
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
