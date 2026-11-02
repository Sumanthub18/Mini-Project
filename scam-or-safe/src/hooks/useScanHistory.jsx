import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  saveScan,
  getUserScans,
  deleteScan as deleteScanApi,
} from '../services/scanDatabaseService.js'

const ScanHistoryContext = createContext(null)

export function ScanHistoryProvider({ children }) {
  const { user, isConfigured } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch scans from Supabase whenever user changes
  const fetchScans = useCallback(async () => {
    if (!isConfigured || !user?.id) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await getUserScans(user.id, { limit: 100 })
      if (err) throw err

      // Format records to match UI expectations
      const mapped = (data || []).map(row => ({
        id: row.id,
        type: row.scan_type?.toUpperCase(),
        input: row.summary || 'Scan query',
        timestamp: row.created_at,
        result: {
          score: row.risk_score,
          level: row.risk_level?.toUpperCase(),
          summary: row.summary,
          warnings: row.scan_findings || [],
          sources: row.evidence_sources || [],
        },
        findings: row.scan_findings || [],
        evidence: row.evidence_sources || [],
        rawRow: row,
      }))

      setHistory(mapped)
    } catch (err) {
      console.error('Failed to load scan history:', err)
      setError(err.message || 'Failed to fetch scan history')
    } finally {
      setLoading(false)
    }
  }, [user?.id, isConfigured])

  useEffect(() => {
    if (user?.id) {
      fetchScans()
    } else {
      setHistory([])
    }
  }, [user?.id, fetchScans])

  // Add scan to Supabase and state
  const addScan = useCallback(
    async (scan) => {
      // Create local item immediately for instant feedback
      const localItem = {
        id: 'scan-' + Date.now(),
        timestamp: new Date().toISOString(),
        ...scan,
      }
      setHistory(prev => [localItem, ...prev])

      if (isConfigured && user?.id) {
        // Prepare findings & evidence sources for relational insertion
        const findings = []
        if (scan.result?.warnings && Array.isArray(scan.result.warnings)) {
          scan.result.warnings.forEach(w => {
            findings.push({
              finding_type: 'warning',
              title: typeof w === 'string' ? w : w.phrase || w.title || 'Risk Flag',
              description: typeof w === 'string' ? w : w.reason || w.description || 'Threat flag detected',
              severity: scan.result?.level || 'medium',
            })
          })
        }

        const evidence = []
        if (scan.result?.sources && Array.isArray(scan.result.sources)) {
          scan.result.sources.forEach(s => {
            evidence.push({
              title: typeof s === 'string' ? s : s.name || s.title || 'Reference Source',
              publisher: s.publisher || 'Verified Authority',
              source_url: s.url || s.source_url || 'https://google.com',
              published_at: s.published_at || new Date().toISOString(),
              evidence_summary: s.summary || 'Evidence source supporting scan verification',
            })
          })
        }

        const { data: savedRow, error: saveErr } = await saveScan({
          userId: user.id,
          scanType: scan.type?.toLowerCase() || 'scam',
          summary: scan.input || scan.result?.summary || 'User submission',
          riskScore: scan.result?.score ?? null,
          riskLevel: scan.result?.level?.toLowerCase() || 'low',
          resultStatus: 'completed',
          findings,
          evidenceSources: evidence,
        })

        if (!saveErr && savedRow?.id) {
          // Update the local item ID with the true Supabase UUID
          setHistory(prev =>
            prev.map(item =>
              item.id === localItem.id ? { ...item, id: savedRow.id, rawRow: savedRow } : item
            )
          )
        }
      }

      return localItem
    },
    [user?.id, isConfigured]
  )

  // Delete a specific scan item
  const deleteScanItem = useCallback(
    async (scanId) => {
      setHistory(prev => prev.filter(item => item.id !== scanId))

      if (isConfigured && user?.id && !String(scanId).startsWith('scan-')) {
        await deleteScanApi(scanId, user.id)
      }
    },
    [user?.id, isConfigured]
  )

  // Clear all history
  const clearHistory = useCallback(async () => {
    const toDelete = [...history]
    setHistory([])

    if (isConfigured && user?.id) {
      for (const item of toDelete) {
        if (!String(item.id).startsWith('scan-')) {
          await deleteScanApi(item.id, user.id)
        }
      }
    }
  }, [history, user?.id, isConfigured])

  return (
    <ScanHistoryContext.Provider
      value={{
        history,
        loading,
        error,
        addScan,
        deleteScanItem,
        clearHistory,
        refreshHistory: fetchScans,
      }}
    >
      {children}
    </ScanHistoryContext.Provider>
  )
}

export function useScanHistory() {
  const ctx = useContext(ScanHistoryContext)
  if (!ctx) throw new Error('useScanHistory must be used within ScanHistoryProvider')
  return ctx
}
