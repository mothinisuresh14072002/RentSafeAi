'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, FileText, Activity } from 'lucide-react';
// Assuming basic UI components exist in the project or we can use standard HTML
// If ui components exist in a shared package, we would import them here.
// For now, I'll use standard HTML/Tailwind classes compatible with a Next.js app.

interface VerificationCheck {
  id: string;
  checkType: string;
  status: 'PENDING' | 'NEEDS_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  completedAt: string | null;
}

interface VerificationStatusData {
  propertyStatus: 'ACTIVE' | 'INACTIVE';
  checks: VerificationCheck[];
}

export default function OwnershipVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  
  const [statusData, setStatusData] = useState<VerificationStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  
  // Dummy values for the demo form
  const [documentId, setDocumentId] = useState('doc-123');
  const [registryReference, setRegistryReference] = useState('TN-SANDBOX-123456');

  useEffect(() => {
    fetchStatus();
  }, [propertyId]);

  const fetchStatus = async () => {
    try {
      // Assuming a fetch to our API route proxy or direct backend
      const res = await fetch(`/api/v1/property/${propertyId}/ownership`, {
        // Include auth headers here in a real app
      });
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await fetch(`/api/v1/property/${propertyId}/ownership/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, registryReference }),
      });
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
      } else {
        alert('Verification failed to process.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading verification status...</div>;

  const isActive = statusData?.propertyStatus === 'ACTIVE';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex items-start gap-6">
        <ShieldAlert className={`w-16 h-16 ${isActive ? 'text-emerald-400' : 'text-amber-400'}`} />
        <div>
          <h1 className="text-3xl font-bold mb-2">Ownership Verification</h1>
          <p className="text-slate-300">
            {isActive 
              ? 'Your property is active and verified. You can now create public listings.'
              : 'Your property claim is inactive. We must verify legal ownership against authoritative registries.'}
          </p>
        </div>
      </div>

      {!isActive && (
        <form onSubmit={handleVerify} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-semibold mb-4">Run Verification Simulation</h2>
          <div className="grid gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Uploaded Document ID</label>
              <input 
                type="text" 
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Registry Reference</label>
              <input 
                type="text" 
                value={registryReference}
                onChange={(e) => setRegistryReference(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg font-mono text-sm"
                required
              />
              <p className="text-xs text-slate-500 mt-1">Use TN-SANDBOX-123456 to simulate success.</p>
            </div>
          </div>
          <button 
            type="submit" 
            disabled={verifying}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {verifying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />}
            Run Verification
          </button>
        </form>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Verification Checks</h2>
        {statusData?.checks && statusData.checks.length > 0 ? (
          <div className="grid gap-3">
            {statusData.checks.map(check => (
              <div key={check.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <span className="font-medium">{check.checkType}</span>
                </div>
                <div>
                  {check.status === 'VERIFIED' && <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-medium"><CheckCircle2 className="w-4 h-4"/> Verified</span>}
                  {check.status === 'REJECTED' && <span className="flex items-center gap-1 text-red-600 bg-red-50 px-3 py-1 rounded-full text-sm font-medium"><AlertCircle className="w-4 h-4"/> Rejected</span>}
                  {check.status === 'NEEDS_REVIEW' && <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium"><AlertCircle className="w-4 h-4"/> Needs Review</span>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No verification checks run yet.</p>
        )}
      </div>
      
      {isActive && (
        <button 
          onClick={() => router.push('/owner/listings/new')}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg"
        >
          Proceed to Create Listing
        </button>
      )}
    </div>
  );
}
