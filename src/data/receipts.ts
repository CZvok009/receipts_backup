// src/data/receipts.ts

export interface Item {
  name: string;
  price: number;
  quantity: number;
}

export interface TotalsDetails {
  total: number;
  subtotal: number;
  tax_amount: number;
}

export interface Receipt {
  id: number;
  date: string;
  company: string;
  total: number;
  currency: string;
  items: Item[];
  totals_details: TotalsDetails;
  file_url: string;
}

export const initialReceipts: Receipt[] = [
  {
    id: 466,
    date: '2025-09-10',
    company: 'OpenAI, LLC',
    total: 12.1,
    currency: 'USD',
    items: [{ name: 'OpenAI APl usage credit', price: 10, quantity: 1 }],
    totals_details: { total: 12.1, subtotal: 10.0, tax_amount: 2.1 },
    file_url: 'https://ams3.digitaloceanspaces.com/suitsbooks/ded3d471-ddaf-4cc1-8d42-16346c05d5ac/Receipt-2037-0656.pdf',
  },
  {
    id: 465,
    date: '2025-09-10',
    company: 'PLUS Schouteten',
    total: 13.99,
    currency: 'EUR',
    items: [
      { name: 'ENERGYDRINK 8-PACK', price: 12.79, quantity: 1 },
      { name: 'Statiegeld', price: 1.2, quantity: 1 },
    ],
    totals_details: { total: 13.99, subtotal: 12.79, tax_amount: 1.06 },
    file_url: 'https://ams3.digitaloceanspaces.com/suitsbooks/ded3d471-ddaf-4cc1-8d42-16346c05d5ac/IMG_2930.jpeg',
  },
  {
    id: 464,
    date: '2025-09-09',
    company: 'Action Nederland ĐV',
    total: 14.21,
    currency: 'EUR',
    items: [
      { name: 'nxt. level pre-workout', price: 7.98, quantity: 1 },
      { name: 'draagtas action poly.', price: 0.29, quantity: 1 },
      { name: 'red bull energy', price: 2.67, quantity: 2 },
    ],
    totals_details: { total: 14.21, subtotal: 14.21, tax_amount: 0.0 },
    file_url: 'https://ams3.digitaloceanspaces.com/suitsbooks/ded3d471-ddaf-4cc1-8d42-16346c05d5ac/08dd4355-7fcb-43d3-94da-b42ce3c03fe2.jpg',
  },
];