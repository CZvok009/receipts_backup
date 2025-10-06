// src/app/api/receipts/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Ensure no caching and dynamic execution for fresh data
export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface Item {
  name: string;
  price: number;
  quantity: number;
}

interface TotalsDetails {
  total: number;
  subtotal: number;
  tax_amount: number;
}

interface Receipt {
  id: number;
  date: string;
  company: string;
  total: number;
  currency: string;
  items: Item[];
  totals_details: TotalsDetails;
  file_url: string;
}

function safeJsonParse<T>(value: string | undefined | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('[DELETE /api/receipts] Incoming request');
    // Derive user from token
    const authHeader = req.headers.get('authorization');
    let userId: number | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Ask our verify endpoint to decode
      const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (verifyRes.ok) {
        const v = await verifyRes.json();
        userId = v.user?.id ?? null;
      }
    }

    if (!userId) {
      console.warn('[DELETE /api/receipts] Unauthorized: missing/invalid user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body to get receipt IDs to delete
    const body = await req.json();
    const { receiptIds } = body;

    if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
      console.warn('[DELETE /api/receipts] Bad request: no receiptIds provided', body);
      return NextResponse.json({ error: 'No receipt IDs provided' }, { status: 400 });
    }

    // Build Supabase query to set user_id to NULL for selected receipts
    const SUPABASE_URL = 'https://ktjtsujwisqlcibwcwkf.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0anRzdWp3aXNxbGNpYndjd2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDczMDQsImV4cCI6MjA3MzE4MzMwNH0.pLJO2j9vJn3c_0FTi9eoeLcoyXx4M5wfBTteoBTADjw';
    const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE;
    const AUTH_KEY = SUPABASE_SERVICE || SUPABASE_ANON;
    const keyLooksAscii = AUTH_KEY ? !/[^A-Za-z0-9._-]/.test(AUTH_KEY) : false;
    const AUTH_KEY_SAFE = keyLooksAscii ? AUTH_KEY : SUPABASE_ANON;
    console.log('[DELETE /api/receipts] Using key', { service: Boolean(SUPABASE_SERVICE), ascii: keyLooksAscii });
    if (!keyLooksAscii) {
      console.warn('[DELETE /api/receipts] SUPABASE_SERVICE_ROLE contains non-ASCII characters; falling back to anon for request headers');
    }
    
    // Create filter for receipt IDs
    const idFilter = receiptIds.map(id => `id.eq.${id}`).join(',');
    const url = `${SUPABASE_URL}/rest/v1/receipt_data?id=in.(${receiptIds.join(',')})`;
    console.log('[DELETE /api/receipts] Preflight select', { url, receiptIds });
    // Preflight: verify rows exist
    const selectUrl = `${SUPABASE_URL}/rest/v1/receipt_data?id=in.(${receiptIds.join(',')})&select=id,user_id,company_name`;
    const preRes = await fetch(selectUrl, {
      headers: {
        // Use anon for preflight to avoid header charset issues and to match GET behavior
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
      },
    });
    if (!preRes.ok) {
      const t = await preRes.text();
      console.error('[DELETE /api/receipts] Preflight select failed', { status: preRes.status, t });
    } else {
      const found = await preRes.json();
      console.log('[DELETE /api/receipts] Preflight found', found);
      if (!Array.isArray(found) || found.length === 0) {
        console.warn('[DELETE /api/receipts] No rows matched these ids, aborting update');
        return NextResponse.json({ success: false, deletedCount: 0, message: 'No rows matched provided IDs' });
      }
    }

    console.log('[DELETE /api/receipts] Updating Supabase', { url, receiptIds });
    
    // Update user_id to a sentinel value for the selected receipts
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'apikey': AUTH_KEY_SAFE,
        'Authorization': `Bearer ${AUTH_KEY_SAFE}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: null
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DELETE /api/receipts] Supabase update failed', { status: response.status, errorText });
      return NextResponse.json({ error: `Failed to delete receipts: ${errorText}` }, { status: 500 });
    }

    const updatedRecords = await response.json();
    console.log('[DELETE /api/receipts] Supabase update ok', { updatedCount: Array.isArray(updatedRecords) ? updatedRecords.length : 'n/a' });
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: updatedRecords.length,
      message: `Successfully deleted ${updatedRecords.length} receipt(s)` 
    });

  } catch (error: any) {
    console.error('[DELETE /api/receipts] Unexpected error', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to delete receipts' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Derive user from token
    const authHeader = req.headers.get('authorization');
    let userId: number | null = null;
    let username: string | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Ask our verify endpoint to decode
      const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
    if (verifyRes.ok) {
        const v = await verifyRes.json();
        userId = v.user?.id ?? null;
        username = v.user?.username ?? null;
      }
    }

    // Build Supabase query: filter by user when available, otherwise return recent rows
    const SUPABASE_URL = 'https://ktjtsujwisqlcibwcwkf.supabase.co';
    const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0anRzdWp3aXNxbGNpYndjd2tmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MDczMDQsImV4cCI6MjA3MzE4MzMwNH0.pLJO2j9vJn3c_0FTi9eoeLcoyXx4M5wfBTteoBTADjw';
    const base = `${SUPABASE_URL}/rest/v1/receipt_data`;

    // Prefer strict user_id filter; if it returns no rows, fall back to company_name ~ username
    if (!userId && !username) {
      return NextResponse.json([], { status: 200 });
    }

    const fetchSupabase = async (params: URLSearchParams): Promise<any[] | null> => {
      const url = `${base}?${params.toString()}`;
      const res = await fetch(url, {
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
      });
      if (!res.ok) return null;
      return (await res.json()) as any[];
    };

    // Collect matches from multiple strategies and merge
    const collected: any[][] = [];

    // Strategy 1: exact user_id match (new records) - exclude deleted records (user_id = -1)
    if (userId !== null) {
      const p = new URLSearchParams();
      p.set('user_id', `eq.${userId}`);
      p.set('order', 'processed_at.desc');
      p.set('limit', '100');
      const r = await fetchSupabase(p);
    if (r) {
        // Filter out deleted records (user_id = "-1" as text)
        const filtered = r.filter((record) => String(record.user_id) !== '-1');
        if (filtered.length > 0) collected.push(filtered);
    }
    }

    // Strategy 2: company_name contains username (legacy records without user_id)
    if (username) {
      const p2 = new URLSearchParams();
      p2.set('company_name', `ilike.*${username}*`);
      p2.set('order', 'processed_at.desc');
      p2.set('limit', '100');
      const r2 = await fetchSupabase(p2);
      if (r2) collected.push(r2);
    }

    // Strategy 3: explicit alias (test -> Togher)
    if (username && username.toLowerCase() === 'test') {
      const alias = 'Togher';
      const p3 = new URLSearchParams();
      p3.set('company_name', `ilike.*${alias}*`);
      p3.set('order', 'processed_at.desc');
      p3.set('limit', '100');
      const r3 = await fetchSupabase(p3);
      if (r3) collected.push(r3);
    }

    // Merge and deduplicate by id; then sort by processed_at desc
    const seen = new Set<number>();
    let rows: any[] = [];
    for (const arr of collected) {
      for (const row of arr) {
        const rid = Number(row.id);
        if (!seen.has(rid)) {
          seen.add(rid);
          rows.push(row);
        }
      }
    }
    rows.sort((a, b) => (new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()));
    // Helper: extract a usable file URL from a Supabase row with many possible shapes
    const looksLikeAbsoluteUrl = (s: string) => /^https?:\/\//i.test(s) || s.startsWith('data:');
    const looksLikeFilePath = (s: string) => /\.(pdf|png|jpe?g|webp|gif)(\?|#|$)/i.test(s) || s.startsWith('/storage/');
    function extractUrlLike(input: any): string | null {
      if (!input) return null;
      const candidates: string[] = [];
      const pushIfString = (v: unknown) => {
        if (typeof v === 'string') candidates.push(v);
      };
      if (typeof input === 'string') {
        candidates.push(input);
      } else if (Array.isArray(input)) {
        for (const el of input) {
          const r = extractUrlLike(el);
          if (r) candidates.push(r);
        }
      } else if (typeof input === 'object') {
        for (const [k, v] of Object.entries(input)) {
          if (/url|path|file|document|image/i.test(k)) {
            const r = extractUrlLike(v);
            if (r) candidates.push(r);
          } else {
            pushIfString(v);
          }
        }
      }
      for (const c of candidates) {
        if (looksLikeAbsoluteUrl(c)) return c;
      }
      for (const c of candidates) {
        if (looksLikeFilePath(c)) return c;
      }
      return null;
    }

    function getFileUrl(row: any): string {
      const directFields = [
        'file_url', 'document_url', 'image_url', 'source_url', 'public_url',
        'url', 'storage_url', 'file', 'image', 'document', 'path', 'storage_path',
        's3_url', 'gcs_url', 'original_url', 'thumbnail_url'
      ];
      for (const f of directFields) {
        const v = (row as any)[f];
        const u = extractUrlLike(v);
        if (u) return u;
      }
      const collectionFields = ['attachments', 'files', 'images', 'documents'];
      for (const f of collectionFields) {
        const v = (row as any)[f];
        const u = extractUrlLike(v);
        if (u) return u;
      }
      return '';
    }

    // Map to UI Receipt shape
    const receipts: Receipt[] = rows.map((row) => {
      const items = (row.items || []).map((it: any) => ({
        name: it.name ?? 'Item',
        price: Number(it.total_price ?? it.unit_price ?? 0),
        quantity: Number(it.quantity ?? 1),
      }));

      const totals = row.total || {};
      const subtotal = row.subtotal || {};
      const taxArray = row.tax_vat || [];
      const taxAmount = Array.isArray(taxArray) && taxArray.length > 0 ? Number(taxArray[0]?.amount ?? 0) : 0;

      const date = row.processed_at;

      return {
        id: Number(row.id),
        date,
        company: row.company_name || row.merchant_name || 'Unknown',
        total: Number(totals.amount ?? 0),
        currency: (row.currencies && row.currencies[0]) || 'USD',
        items,
        totals_details: {
          total: Number(totals.amount ?? 0),
          subtotal: Number(subtotal.amount ?? 0),
          tax_amount: taxAmount,
        },
        file_url: getFileUrl(row) || '',
      };
    });

    return NextResponse.json(receipts);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Failed to load receipts' }, { status: 500 });
  }
}


