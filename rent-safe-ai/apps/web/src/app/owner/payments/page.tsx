'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';

export default function OwnerPaymentsPage() { const [items, setItems] = useState<any[]>([]); useEffect(() => { apiClient('/payments/owner/summary').then(setItems).catch(() => setItems([])); }, []); return <Card><CardHeader><h1 className="text-xl font-semibold">Payment activity</h1></CardHeader><CardBody><p className="text-sm text-slate-500 mb-4">Tenant payment secrets are never shown here.</p>{items.map(item => <div key={item.id} className="border-b py-3"><div>TEST/SANDBOX PAYMENT · {item.status}</div><div className="text-sm text-slate-500">{item.amount} {item.currency} · {item.listingId}</div></div>)}</CardBody></Card>; }
