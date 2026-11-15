import { useState, useEffect } from 'react'
import {
  ShieldAlert,
  Activity,
  ScanLine,
  ClipboardList,
  Info,
  Sparkles,
  ArrowRight,
  WifiOff,
  RefreshCw,
  Cpu,
  Layers,
  CheckCircle,
} from 'lucide-react'
import Navbar from './components/Navbar'
import DisclaimerModal from './components/DisclaimerModal'
import ScreeningForm from './components/ScreeningForm'
import ResultCard from './components/ResultCard'
import HistoryList from './components/HistoryList'
import ResearchMetricsDrawer from './components/ResearchMetricsDrawer'
import { checkBackendHealth } from './services/api'

export default function App() {
  const [activeTab, setActiveTab] = useState('home')
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const [backendStatus, setBackendStatus] = useState({ online: true, checked: false })
  const [checkingBackend, setCheckingBackend] = useState(false)

  // Current Screening Result State
  const [currentResult, setCurrentResult] = useState(null)
  const [contextData, setContextData] = useState(null)

  // Check consent from localStorage
  useEffect(() => {
    const consent = localStorage.getItem('clinical_consent_accepted')
    if (consent === 'true') {
      setDisclaimerAccepted(true)
    }
  }, [])

  // Check backend connectivity on mount
  const verifyBackend = async () => {
    setCheckingBackend(true)
    const data = await checkBackendHealth()
    setBackendStatus({ online: Boolean(data), checked: true })
    setCheckingBackend(false)
  }

  useEffect(() => {
    verifyBackend()
  }, [])

  const handleAcceptDisclaimer = () => {
    localStorage.setItem('clinical_consent_accepted', 'true')
    setDisclaimerAccepted(true)
  }

  const handleAnalysisComplete = (result, ctx) => {
    setCurrentResult(result)
    setContextData(ctx)
  }

  const handleResetScreening = () => {
    setCurrentResult(null)
    setContextData(null)
  }

  return (
    <div className="min-h-screen bg-navy-400 text-white flex flex-col font-sans selection:bg-teal-medical selection:text-navy-300">
      {/* Centered Mobile-First Frame */}
      <main className="w-full max-w-md mx-auto min-h-screen flex flex-col px-4 pt-4 pb-20 relative shadow-2xl bg-navy-300">
        {/* Top App Header */}
        <header className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-dark via-teal-medical to-teal-light flex items-center justify-center shadow-[0_0_12px_rgba(18,201,193,0.5)]">
              <Activity size={18} className="text-navy-300 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white block leading-tight">
                MSPE-DeiT
              </span>
              <span className="text-[10px] text-teal-medical font-medium uppercase tracking-wider block">
                Multimodal Screening
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {backendStatus.checked && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  backendStatus.online
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    backendStatus.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`}
                />
                {backendStatus.online ? 'API Online' : 'Offline'}
              </span>
            )}
          </div>
        </header>

        {/* Backend Offline Warning Banner */}
        {backendStatus.checked && !backendStatus.online && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-between text-xs text-rose-200 animate-fade-in">
            <div className="flex items-center gap-2">
              <WifiOff size={15} className="text-rose-400 flex-shrink-0" />
              <span>Backend not detected on port 8001</span>
            </div>
            <button
              onClick={verifyBackend}
              disabled={checkingBackend}
              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-[10px] font-bold flex items-center gap-1"
            >
              <RefreshCw size={10} className={checkingBackend ? 'animate-spin' : ''} />
              Retry
            </button>
          </div>
        )}

        {/* Tab 1: Home Dashboard */}
        {activeTab === 'home' && (
          <div className="space-y-4 pb-20 animate-fade-in">
            {/* Hero Card */}
            <div className="glass-card p-5 border border-teal-medical/30 bg-gradient-to-br from-teal-950/30 to-navy-100 relative overflow-hidden space-y-3">
              <div className="h-1 bg-gradient-to-r from-teal-dark via-teal-medical to-teal-light absolute top-0 left-0 right-0" />
              <div className="flex items-center gap-2 text-teal-medical text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} />
                <span>AI Clinical Decision Support</span>
              </div>
              <h1 className="text-lg font-bold text-white leading-tight">
                Multimodal Skin Cancer Screening
              </h1>
              <p className="text-xs text-white/70 leading-relaxed">
                Empowered by MSPE-DeiT Vision Transformer and dual clinical tabular classifiers
                (XGBoost + ANN) fused via equal-weighted soft voting.
              </p>
              <button
                onClick={() => setActiveTab('screening')}
                className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(18,201,193,0.35)]"
              >
                <span>Start New Screening</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Quick Metrics Glance */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="glass-card p-3.5 space-y-1">
                <span className="text-xl font-extrabold text-teal-medical tracking-tight">91.76%</span>
                <p className="text-[11px] font-semibold text-white/90">Diagnostic Accuracy</p>
                <p className="text-[9px] text-white/50">ISIC benchmark evaluation</p>
              </div>
              <div className="glass-card p-3.5 space-y-1">
                <span className="text-xl font-extrabold text-teal-light tracking-tight">0.953</span>
                <p className="text-[11px] font-semibold text-white/90">AUROC Discrimination</p>
                <p className="text-[9px] text-white/50">Dermoscopy & 3D-TBP</p>
              </div>
            </div>

            {/* Fast Navigation Tiles */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider block text-white/60">
                Core Modules
              </span>
              <button
                onClick={() => setActiveTab('screening')}
                className="w-full glass-card p-3.5 flex items-center justify-between text-left hover:border-teal-medical/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-medical/15 border border-teal-medical/30 flex items-center justify-center text-teal-medical">
                    <ScanLine size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-teal-medical transition-colors">
                      Lesion Assessment
                    </h3>
                    <p className="text-[10px] text-white/50">Upload dermoscopy or 3D-TBP crop</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-white/30 group-hover:text-teal-medical group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className="w-full glass-card p-3.5 flex items-center justify-between text-left hover:border-teal-medical/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      Assessment History
                    </h3>
                    <p className="text-[10px] text-white/50">Review previous screenings & download PDFs</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-white/30 group-hover:text-cyan-300 group-hover:translate-x-1 transition-all" />
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className="w-full glass-card p-3.5 flex items-center justify-between text-left hover:border-teal-medical/40 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Info size={18} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      Research Architecture
                    </h3>
                    <p className="text-[10px] text-white/50">IEEE Access paper specifications & weights</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-white/30 group-hover:text-amber-300 group-hover:translate-x-1 transition-all" />
              </button>
            </div>

            {/* Prototype Notice */}
            <div className="glass-card p-3.5 border-l-4 border-amber-400 text-xs text-white/80 space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <ShieldAlert size={13} />
                Academic Screening Prototype
              </span>
              <p className="text-[11px] text-white/60 leading-relaxed">
                For research and academic evaluation. Always correlate findings with professional
                dermatological assessment and histopathological biopsy.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Screening Flow */}
        {activeTab === 'screening' && (
          <div>
            {currentResult ? (
              <ResultCard
                result={currentResult}
                contextData={contextData}
                onReset={handleResetScreening}
              />
            ) : (
              <ScreeningForm onAnalysisComplete={handleAnalysisComplete} />
            )}
          </div>
        )}

        {/* Tab 3: History */}
        {activeTab === 'history' && (
          <HistoryList
            onSelectAssessment={(assessment) => {
              setCurrentResult(assessment.prediction)
              setContextData(assessment)
              setActiveTab('screening')
            }}
          />
        )}

        {/* Tab 4: About / Research Metrics */}
        {activeTab === 'about' && <ResearchMetricsDrawer />}

        {/* Bottom Tab Bar Navigation */}
        <Navbar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Mandatory Medical Disclaimer Modal on First Visit */}
        {!disclaimerAccepted && (
          <DisclaimerModal onAccept={handleAcceptDisclaimer} />
        )}
      </main>
    </div>
  )
}

