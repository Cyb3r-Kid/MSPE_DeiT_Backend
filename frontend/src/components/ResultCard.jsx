import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Share2,
  RefreshCcw,
  ShieldAlert,
  Sliders,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import confetti from 'canvas-confetti'
import { downloadPdfReport } from '../services/api'

export default function ResultCard({ result, contextData, onReset }) {
  const [downloading, setDownloading] = useState(false)
  const [downloadSuccess, setDownloadSuccess] = useState(false)

  const probability = result?.ensemble_probability ?? 0.0
  const percentage = (probability * 100).toFixed(1)
  const riskLevel = result?.risk_level || 'Unknown'
  const rec = result?.recommendation || 'Consult a certified dermatologist.'
  const models = result?.model_probabilities || {}
  const mspeScore = ((models.mspe_deit ?? 0.0) * 100).toFixed(1)
  const xgbScore = ((models.xgboost ?? 0.0) * 100).toFixed(1)
  const annScore = ((models.ann ?? 0.0) * 100).toFixed(1)
  const modalityUsed = result?.modality_used || contextData?.modality || 'dermoscopy'

  // Trigger confetti if low risk
  useEffect(() => {
    if (probability < 0.30) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#12C9C1', '#10B981', '#34D399'],
        })
      } catch (e) {
        // Safe confetti fallback
      }
    }
  }, [probability])

  // Risk color theme configuration
  const getTheme = () => {
    if (probability < 0.30) {
      return {
        bg: 'from-emerald-950/40 to-teal-950/30',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        meterColor: '#10B981',
      }
    } else if (probability <= 0.65) {
      return {
        bg: 'from-amber-950/40 to-orange-950/30',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        meterColor: '#F59E0B',
      }
    } else {
      return {
        bg: 'from-rose-950/50 to-red-950/40',
        border: 'border-rose-500/50',
        text: 'text-rose-400',
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        meterColor: '#DC2626',
      }
    }
  }

  const theme = getTheme()

  const handleDownload = async () => {
    const id = result?.database_id || result?.id
    if (!id) return
    setDownloading(true)
    try {
      await downloadPdfReport(id)
      setDownloadSuccess(true)
      setTimeout(() => setDownloadSuccess(false), 3000)
    } catch (e) {
      alert('Could not download PDF report. Ensure backend is running.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Screening Assessment</h1>
          <p className="text-xs text-teal-medical font-medium">Multimodal Decision Support</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-semibold transition-all"
        >
          <RefreshCcw size={13} />
          New Screening
        </button>
      </div>

      {/* Main Result Card */}
      <div className={`glass-card p-5 border ${theme.border} bg-gradient-to-b ${theme.bg} space-y-5 shadow-2xl`}>
        {/* Risk Badge & ID */}
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border tracking-wide uppercase ${theme.badgeBg}`}>
            {riskLevel}
          </span>
          <span className="text-[10px] font-mono text-white/40">
            ID: {String(result?.id || 'RES-001').slice(0, 8)}
          </span>
        </div>

        {/* Circular Probability Gauge */}
        <div className="flex flex-col items-center justify-center py-2">
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* SVG Meter */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={theme.meterColor}
                strokeWidth="10"
                strokeDasharray={251.2}
                strokeDashoffset={251.2 * (1 - probability)}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-white tracking-tight">{percentage}%</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Malignancy Risk</span>
            </div>
          </div>
          <p className="text-xs text-white/60 text-center mt-2 max-w-xs">
            Fused soft-voting ensemble probability across 3 calibrated models
          </p>
        </div>

        {/* Clinical Decision Support Recommendation */}
        <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
            <AlertTriangle size={14} className={theme.text} />
            <span>Clinical Recommendation</span>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">{rec}</p>
        </div>

        {/* 3 Model Branches Breakdown */}
        <div className="space-y-3 pt-2 border-t border-white/10">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers size={13} className="text-teal-medical" />
            Model Branch Probabilities
          </span>

          <div className="space-y-2.5">
            {/* MSPE-DeiT */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/80 font-medium">1. MSPE-DeiT (Vision Transformer)</span>
                <span className="font-bold text-teal-medical">{mspeScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-teal-medical rounded-full transition-all duration-700"
                  style={{ width: `${mspeScore}%` }}
                />
              </div>
              <span className="text-[9px] text-white/40 block">Input: Lesion crop ({modalityUsed.replace('_', ' ')})</span>
            </div>

            {/* XGBoost */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/80 font-medium">2. XGBoost Clinical Classifier</span>
                <span className="font-bold text-amber-400">{xgbScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-700"
                  style={{ width: `${xgbScore}%` }}
                />
              </div>
              <span className="text-[9px] text-white/40 block">Input: 14-dim engineered tabular features</span>
            </div>

            {/* ANN */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-white/80 font-medium">3. 3-Dense-Block ANN</span>
                <span className="font-bold text-cyan-400">{annScore}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-700"
                  style={{ width: `${annScore}%` }}
                />
              </div>
              <span className="text-[9px] text-white/40 block">Input: Normalized tabular patient representation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: PDF Report & New Screening */}
      <div className="space-y-2.5">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-primary w-full py-3.5 text-sm font-bold shadow-[0_0_20px_rgba(18,201,193,0.3)] flex items-center justify-center gap-2"
        >
          <Download size={16} />
          {downloading ? 'Generating Report...' : downloadSuccess ? 'Report Downloaded!' : 'Download Clinical PDF Report'}
        </button>

        <button
          onClick={onReset}
          className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all flex items-center justify-center gap-2"
        >
          <RefreshCcw size={14} />
          Perform Another Screening
        </button>
      </div>

      {/* Academic Safety Disclaimer */}
      <div className="glass-card p-4 border border-rose-500/20 space-y-2">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
          <ShieldAlert size={15} />
          <span>Research Prototype Disclaimer</span>
        </div>
        <p className="text-[11px] text-white/70 leading-relaxed">
          This system is an AI-assisted screening research tool based on the IEEE Access paper.
          It does not provide definitive medical diagnoses. Regardless of the risk score, any changing,
          bleeding, or atypical skin lesion must be evaluated by a licensed dermatologist for clinical dermoscopy
          and histological correlation.
        </p>
      </div>
    </div>
  )
}

