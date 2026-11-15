import { useEffect, useState } from 'react'
import {
  ClipboardList,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  ChevronRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { fetchScreenings, downloadPdfReport } from '../services/api'

export default function HistoryList({ onSelectAssessment }) {
  const [assessments, setAssessments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterModality, setFilterModality] = useState('all')

  const loadHistory = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchScreenings()
      setAssessments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError('Could not load screening history. Backend may be offline or no token.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const filtered = assessments.filter((item) => {
    const matchesSearch =
      String(item.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(item.modality || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMod =
      filterModality === 'all' ||
      String(item.modality || '').toLowerCase().includes(filterModality.toLowerCase())
    return matchesSearch && matchesMod
  })

  return (
    <div className="space-y-4 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Assessment History</h1>
          <p className="text-xs text-teal-medical font-medium">Previous Patient Screenings</p>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="glass-card p-3 space-y-2.5">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by ID or modality..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9 py-2 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-[10px] text-white/40 flex items-center gap-1">
            <Filter size={11} /> Modality:
          </span>
          {['all', 'dermoscopy', 'tbp'].map((mod) => (
            <button
              key={mod}
              onClick={() => setFilterModality(mod)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                filterModality === mod
                  ? 'bg-teal-medical border-teal-medical text-navy-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              {mod === 'all' ? 'All' : mod.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="glass-card p-8 text-center space-y-2">
          <RefreshCw size={24} className="animate-spin text-teal-medical mx-auto" />
          <p className="text-xs text-white/60">Loading assessments from database...</p>
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center space-y-3 border-rose-500/30">
          <AlertCircle size={24} className="text-rose-400 mx-auto" />
          <p className="text-xs text-rose-200">{error}</p>
          <button
            onClick={loadHistory}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white"
          >
            Retry Connection
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-3">
          <ClipboardList size={32} className="text-white/20 mx-auto" />
          <p className="text-xs font-semibold text-white/70">No screening assessments found</p>
          <p className="text-[11px] text-white/40 max-w-xs mx-auto">
            Run a new screening using the Screening tab to view historical predictions and generated reports here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => {
            const pred = item.prediction
            const score = pred ? (pred.ensemble_probability * 100).toFixed(1) : null
            const isHigh = pred && pred.ensemble_probability > 0.65
            const isMod = pred && pred.ensemble_probability >= 0.30 && pred.ensemble_probability <= 0.65
            const riskClass = isHigh
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : isMod
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'

            return (
              <div
                key={item.id}
                className="glass-card p-3.5 space-y-2 hover:border-teal-medical/40 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-white/40 block">
                      Screening #{item.id}
                    </span>
                    <p className="text-xs font-bold text-white capitalize">
                      {(item.modality || 'dermoscopy').replace('_', ' ')}
                    </p>
                  </div>
                  {pred ? (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${riskClass}`}>
                      {score}% Risk
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-white/40">
                      {item.status || 'Draft'}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/5">
                  <span className="flex items-center gap-1">
                    <Calendar size={11} />
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadPdfReport(item.id)}
                      className="flex items-center gap-1 text-teal-medical hover:underline text-[11px] font-medium"
                    >
                      <Download size={12} />
                      PDF Report
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

