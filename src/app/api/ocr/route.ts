// src/app/api/ocr/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createWorker } from 'tesseract.js';

// Helper function to extract structured data from OCR text
function parseReceiptText(text: string) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  // Extract merchant name (usually first few lines)
  const merchantName = lines[0] || '';
  
  // Extract date (look for date patterns)
  const dateRegex = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/;
  const dateMatch = text.match(dateRegex);
  const date = dateMatch ? dateMatch[1] : '';
  
  // Extract time (look for time patterns)
  const timeRegex = /(\d{1,2}:\d{2})/;
  const timeMatch = text.match(timeRegex);
  const time = timeMatch ? timeMatch[1] : '';
  
  // Extract currency symbols
  const currencySymbols = text.match(/[£$€]/g);
  let currency = 'USD';
  if (currencySymbols) {
    const symbol = currencySymbols[0];
    if (symbol === '£') currency = 'GBP';
    else if (symbol === '€') currency = 'EUR';
    else if (symbol === '$') currency = 'USD';
  }
  
  // Extract total amount (look for "Total", "TOTAL", etc.)
  const totalRegex = /total[:\s]*[£$€]?\s*(\d+[.,]\d{2})/i;
  const totalMatch = text.match(totalRegex);
  const total = totalMatch ? totalMatch[1].replace(',', '.') : '';
  
  // Extract subtotal
  const subtotalRegex = /subtotal[:\s]*[£$€]?\s*(\d+[.,]\d{2})/i;
  const subtotalMatch = text.match(subtotalRegex);
  const subtotal = subtotalMatch ? subtotalMatch[1].replace(',', '.') : '';
  
  // Extract tax/VAT
  const taxRegex = /(?:tax|vat)[:\s]*[£$€]?\s*(\d+[.,]\d{2})/i;
  const taxMatch = text.match(taxRegex);
  const taxAmount = taxMatch ? taxMatch[1].replace(',', '.') : '';
  
  // Extract items (lines with prices)
  const items = [];
  const itemRegex = /(.+?)[£$€]?\s*(\d+[.,]\d{2})/;
  for (const line of lines) {
    // Skip lines that are likely headers or totals
    if (/total|subtotal|tax|vat|change|paid/i.test(line)) continue;
    
    const match = line.match(itemRegex);
    if (match) {
      const name = match[1].trim();
      const price = match[2].replace(',', '.');
      // Filter out very short names or obvious non-items
      if (name.length > 2 && !/^[\d\s]+$/.test(name)) {
        items.push({ name, price });
      }
    }
  }
  
  // Extract address (try to find address-like patterns)
  const addressLines = lines.slice(1, 4).filter(line => 
    /\d/.test(line) && (line.length > 10 || /street|road|lane|avenue|st\b|rd\b/i.test(line))
  );
  const address = addressLines.join(', ');
  
  return {
    company_name: merchantName,
    merchant_name: merchantName,
    address: address,
    phone: '',
    date: date,
    dates: date ? [date] : [],
    time: time,
    times: time ? [time] : [],
    currency: currency,
    currencies: [currency],
    transaction_id: '',
    payment_method: '',
    card_number: '',
    transaction_status: 'Completed',
    items: items,
    subtotal: subtotal,
    subtotal_amount: subtotal,
    tax_amount: taxAmount,
    tax_vat: taxAmount ? [{ amount: taxAmount }] : [],
    total: total,
    total_amount: total,
    amount_paid: total,
    change: '0.00',
    raw_text: text
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log('Processing image with Tesseract.js...');
    
    // Convert File to Buffer for Tesseract
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Create and configure Tesseract worker
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    try {
      // Perform OCR using Tesseract.js
      const { data: { text } } = await worker.recognize(buffer);
      
      console.log('OCR Text extracted:', text);
      
      // Parse the extracted text into structured data
      const parsedData = parseReceiptText(text);
      
      return NextResponse.json({
        success: true,
        data: parsedData
      });
    } finally {
      // Clean up worker
      await worker.terminate();
    }

  } catch (error: any) {
    console.error('OCR processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process image: ' + error.message },
      { status: 500 }
    );
  }
}