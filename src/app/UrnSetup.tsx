'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react'

export default function UrnSetup() {
  const [urn, setUrn] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSave = async () => {
    if (!urn.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/auth/linkedin/save-urn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urn: urn.trim() })
      })
      const data = await res.json()
      if (data.success) {
        router.refresh()
      } else {
        setError(data.error || 'Failed to save.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-amber-900 text-base">One more step — Enter your LinkedIn Member ID</h3>
          <p className="text-amber-700 text-sm mt-1">
            LinkedIn connected! We just need your Member ID to post on your behalf.
          </p>
        </div>
      </div>

      {/* step-by-step */}
      <div className="bg-white rounded-lg border border-amber-100 p-4 mb-4 space-y-2 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">How to find your LinkedIn Member ID:</p>
        <ol className="list-decimal ml-4 space-y-1.5 text-slate-600">
          <li>
            Open your LinkedIn profile in a new tab →{' '}
            <a
              href="https://www.linkedin.com/in/me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 font-medium inline-flex items-center gap-0.5 hover:underline"
            >
              linkedin.com/in/me <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Right-click anywhere on the page and choose <strong>View Page Source</strong></li>
          <li>Press <kbd className="bg-slate-100 px-1 rounded text-xs font-mono">Ctrl+F</kbd> and search for <code className="bg-slate-100 px-1 rounded text-xs font-mono">&quot;currentMember&quot;</code></li>
          <li>
            Look for a value like <code className="bg-slate-100 px-1 rounded text-xs font-mono">&quot;currentMemberId&quot;:&quot;AbCdEfGhIjK&quot;</code> —
            copy just the alphanumeric part (e.g. <code className="bg-slate-100 px-1 rounded text-xs font-mono">AbCdEfGhIjK</code>)
          </li>
        </ol>
        <p className="text-slate-500 text-xs pt-1">
          Alternatively, go to <a href="https://www.linkedin.com/developers/tools/oauth/token-inspector" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">LinkedIn Token Inspector</a>, paste your access token, and copy the <strong>sub</strong> value.
        </p>
      </div>

      {/* input */}
      <div className="flex gap-3">
        <input
          type="text"
          value={urn}
          onChange={(e) => setUrn(e.target.value)}
          placeholder="Paste your Member ID here (e.g. AbCdEfGhIjK)"
          className="flex-1 px-4 py-2.5 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-slate-900 text-sm bg-white"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button
          onClick={handleSave}
          disabled={!urn.trim() || saving}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Save & Continue
        </button>
      </div>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  )
}
