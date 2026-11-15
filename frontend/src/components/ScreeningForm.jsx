import { useState, useRef } from 'react'
import {
  UploadCloud,
  Camera,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Info,
  ChevronRight,
  Sliders,
} from 'lucide-react'
import { analyzeScreening } from '../services/api'

const PRECONFIGURED_SAMPLES = [
  {
    name: 'Sample 1: Benign Nevus',
    badge: 'Benign Profile',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    modality: 'dermoscopy',
    clinical: {
      age: 28,
      sex: 'male',
      anatomical_site: 'torso',
      lesion_diameter_mm: 3.2,
      evolution_history: false,
      family_history: false,
      itch_bleed: false,
      fitzpatrick_skin_type: 'II',
    },
    sampleColor: 'from-amber-700 to-amber-900',
  },
  {
    name: 'Sample 2: Dysplastic Lesion',
    badge: 'Borderline Profile',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    modality: '3d_tbp',
    clinical: {
      age: 46,
      sex: 'female',
      anatomical_site: 'upper extremity',
      lesion_diameter_mm: 5.8,
      evolution_history: true,
      family_history: false,
      itch_bleed: false,
      fitzpatrick_skin_type: 'III',
    },
    sampleColor: 'from-stone-600 to-stone-800',
  },
  {
    name: 'Sample 3: Suspicious Melanoma',
    badge: 'High-Risk Profile',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    modality: 'dermoscopy',
    clinical: {
      age: 64,
      sex: 'male',
      anatomical_site: 'head/neck',
      lesion_diameter_mm: 9.4,
      evolution_history: true,
      family_history: true,
      itch_bleed: true,
      fitzpatrick_skin_type: 'I',
    },
    sampleColor: 'from-neutral-900 via-rose-950 to-black',
  },
]

export default function ScreeningForm({ onAnalysisComplete }) {
  const fileInputRef = useRef(null)

  // Form State
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [modality, setModality] = useState('dermoscopy')
  const [age, setAge] = useState('42')
  const [sex, setSex] = useState('female')
  const [anatomicalSite, setAnatomicalSite] = useState('upper extremity')
  const [diameter, setDiameter] = useState('6.0')
  const [evolution, setEvolution] = useState(false)
  const [familyHistory, setFamilyHistory] = useState(false)
  const [itchBleed, setItchBleed] = useState(false)
  const [fitzpatrick, setFitzpatrick] = useState('III')

  // UI Flow State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [stepperPhase, setStepperPhase] = useState(0)
  const [errorMessage, setErrorMessage] = useState(null)
  const [isDemoData, setIsDemoData] = useState(false)

  // Handle local image file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file (PNG, JPG, or JPEG).')
      return
    }
    setErrorMessage(null)
    setImageFile(file)
    setIsDemoData(false)
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result)
    reader.readAsDataURL(file)
  }

  // Load one of the 3 pre-configured academic viva test cases
  const loadSample = (sample) => {
    setModality(sample.modality)
    setAge(String(sample.clinical.age))
    setSex(sample.clinical.sex)
    setAnatomicalSite(sample.clinical.anatomical_site)
    setDiameter(String(sample.clinical.lesion_diameter_mm))
    setEvolution(sample.clinical.evolution_history)
    setFamilyHistory(sample.clinical.family_history)
    setItchBleed(sample.clinical.itch_bleed)
    setFitzpatrick(sample.clinical.fitzpatrick_skin_type)
    setIsDemoData(true)
    setErrorMessage(null)

    // Generate synthetic dummy lesion bitmap for instant offline submission
    const canvas = document.createElement('canvas')
    canvas.width = 224
    canvas.height = 224
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#C89A7B' // skin tone background
    ctx.fillRect(0, 0, 224, 224)
    // Draw lesion
    const grad = ctx.createRadialGradient(112, 112, 10, 112, 112, 60)
    if (sample.name.includes('Benign')) {
      grad.addColorStop(0, '#5C3826')
      grad.addColorStop(1, '#8D5B3E')
    } else if (sample.name.includes('Dysplastic')) {
      grad.addColorStop(0, '#382015')
      grad.addColorStop(0.7, '#6E3E26')
      grad.addColorStop(1, '#C89A7B')
    } else {
      grad.addColorStop(0, '#100808')
      grad.addColorStop(0.5, '#421218')
      grad.addColorStop(1, '#803020')
    }
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(112, 112, 50, 42, Math.PI / 6, 0, 2 * Math.PI)
    ctx.fill()

    canvas.toBlob((blob) => {
      const file = new File([blob], `${sample.name.replace(/\s+/g, '_').toLowerCase()}.jpg`, {
        type: 'image/jpeg',
      })
      setImageFile(file)
      setImagePreview(canvas.toDataURL('image/jpeg'))
    }, 'image/jpeg')
  }

  // Run multimodal analysis with visual stepper
  const handleAnalyze = async (e) => {
    e.preventDefault()
    if (!imageFile) {
      setErrorMessage('Please upload a lesion image or select a sample case.')
      return
    }

    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setErrorMessage('Patient age must be between 1 and 120 years.')
      return
    }

    const diamNum = parseFloat(diameter)
    if (isNaN(diamNum) || diamNum <= 0) {
      setErrorMessage('Lesion diameter must be a positive number in mm.')
      return
    }

    setErrorMessage(null)
    setIsAnalyzing(true)
    setStepperPhase(1)

    const clinicalPayload = {
      age: ageNum,
      sex,
      anatomical_site: anatomicalSite,
      lesion_diameter_mm: diamNum,
      evolution_history: evolution,
      family_history: familyHistory,
      itch_bleed: itchBleed,
      fitzpatrick_skin_type: fitzpatrick,
    }

    // Step 2 timer
    const t2 = setTimeout(() => setStepperPhase(2), 500)
    // Step 3 timer
    const t3 = setTimeout(() => setStepperPhase(3), 1100)
    // Step 4 timer
    const t4 = setTimeout(() => setStepperPhase(4), 1600)

    try {
      const result = await analyzeScreening(imageFile, clinicalPayload, modality)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      setStepperPhase(4)
      setTimeout(() => {
        setIsAnalyzing(false)
        onAnalysisComplete(result, {
          imagePreview,
          clinical: clinicalPayload,
          modality,
          isDemoData,
        })
      }, 500)
    } catch (err) {
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
      setIsAnalyzing(false)
      const detail = err.response?.data?.detail || err.message || 'Server connection failed.'
      setErrorMessage(detail)
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {/* Title & Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">New Lesion Screening</h1>
          <p className="text-xs text-teal-medical font-medium">MSPE-DeiT Multimodal Analysis</p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-white/70">
          Step 1 of 2
        </span>
      </div>

      {/* Pre-configured Demo Samples for Viva / Quick Testing */}
      <div className="glass-card p-3.5 space-y-2 border border-teal-medical/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white/90 flex items-center gap-1.5">
            <Sparkles size={13} className="text-teal-medical" />
            Instant Test Cases (Demo / Viva)
          </span>
          <span className="text-[10px] text-white/50">1-click populate</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRECONFIGURED_SAMPLES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => loadSample(sample)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all active:scale-95 group"
            >
              <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold border mb-1 ${sample.badgeColor}`}>
                {sample.badge}
              </span>
              <p className="text-[11px] font-semibold text-white/90 truncate leading-tight">
                {sample.name.split(':')[1]?.trim()}
              </p>
              <p className="text-[9px] text-white/50 capitalize mt-0.5">
                {sample.modality.replace('_', ' ')}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Active Demo Mode Notice */}
      {isDemoData && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
          <span className="flex items-center gap-1.5">
            <Info size={14} className="text-amber-400" />
            Loaded test sample data
          </span>
          <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-300">
            DEMO CASE
          </span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-200 animate-fade-in">
          <AlertCircle size={15} className="text-rose-400 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleAnalyze} className="space-y-4">
        {/* SECTION 1: Image Capture & Modality */}
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} className="text-teal-medical" />
              1. Lesion Imagery
            </label>
            <span className="text-[10px] text-teal-medical font-medium">Required</span>
          </div>

          {/* Modality Selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-white/60">Imaging Modality (routes into MSPE projection):</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModality('dermoscopy')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  modality === 'dermoscopy'
                    ? 'bg-teal-medical/20 border-teal-medical text-teal-light shadow-[0_0_12px_rgba(18,201,193,0.3)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                Dermoscopy
                <span className="block text-[9px] font-normal opacity-70">Close-up epiluminescence</span>
              </button>
              <button
                type="button"
                onClick={() => setModality('3d_tbp')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center ${
                  modality === '3d_tbp'
                    ? 'bg-teal-medical/20 border-teal-medical text-teal-light shadow-[0_0_12px_rgba(18,201,193,0.3)]'
                    : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                }`}
              >
                3D-TBP Crop
                <span className="block text-[9px] font-normal opacity-70">Total Body Photography</span>
              </button>
            </div>
          </div>

          {/* Upload Area / Preview */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-white/20 bg-black/40 group">
              <img
                src={imagePreview}
                alt="Lesion Preview"
                className="w-full h-48 object-contain bg-navy-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3">
                <span className="text-[11px] font-medium text-white/80 truncate">
                  {imageFile?.name || 'lesion_crop.jpg'}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[10px] font-semibold backdrop-blur-sm"
                >
                  Change Image
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 hover:border-teal-medical/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-white/[0.02] hover:bg-white/[0.05]"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-medical/10 border border-teal-medical/20 flex items-center justify-center mx-auto mb-2 text-teal-medical">
                <UploadCloud size={24} />
              </div>
              <p className="text-xs font-semibold text-white/90">
                Click or tap to upload lesion photo
              </p>
              <p className="text-[10px] text-white/50 mt-1">
                Supports JPG, PNG (automatically resized to 224x224)
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: Clinical Metadata */}
        <div className="glass-card p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} className="text-teal-medical" />
              2. Clinical Metadata
            </label>
            <span className="text-[10px] text-white/50">For XGBoost & ANN</span>
          </div>

          {/* Age & Sex */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/70 mb-1">Patient Age</label>
              <input
                type="number"
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="45"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] text-white/70 mb-1">Biological Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="input-field py-2 text-xs"
              >
                <option value="female" className="bg-navy-100">Female</option>
                <option value="male" className="bg-navy-100">Male</option>
                <option value="other" className="bg-navy-100">Other / Unknown</option>
              </select>
            </div>
          </div>

          {/* Anatomical Site & Diameter */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-white/70 mb-1">Anatomical Site</label>
              <select
                value={anatomicalSite}
                onChange={(e) => setAnatomicalSite(e.target.value)}
                className="input-field py-2 text-xs"
              >
                <option value="torso" className="bg-navy-100">Torso / Back</option>
                <option value="upper extremity" className="bg-navy-100">Upper Extremity (Arm)</option>
                <option value="lower extremity" className="bg-navy-100">Lower Extremity (Leg)</option>
                <option value="head/neck" className="bg-navy-100">Head / Neck / Face</option>
                <option value="palms/soles" className="bg-navy-100">Palms / Soles / Acral</option>
                <option value="oral/genital" className="bg-navy-100">Oral / Genital</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-white/70 mb-1">Diameter (mm)</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="50"
                value={diameter}
                onChange={(e) => setDiameter(e.target.value)}
                className="input-field py-2 text-xs"
                placeholder="5.0"
                required
              />
            </div>
          </div>

          {/* Fitzpatrick Skin Type */}
          <div>
            <label className="block text-[11px] text-white/70 mb-1">Fitzpatrick Skin Phototype</label>
            <div className="grid grid-cols-6 gap-1.5">
              {['I', 'II', 'III', 'IV', 'V', 'VI'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFitzpatrick(type)}
                  className={`py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    fitzpatrick === type
                      ? 'bg-teal-medical border-teal-medical text-navy-300'
                      : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Clinical Checkboxes */}
          <div className="space-y-2 pt-1 border-t border-white/10">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/80">
              <input
                type="checkbox"
                checked={evolution}
                onChange={(e) => setEvolution(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-teal-medical focus:ring-0"
              />
              <span>History of Lesion Evolution (ABCDE: Changing size/color)</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/80">
              <input
                type="checkbox"
                checked={familyHistory}
                onChange={(e) => setFamilyHistory(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-teal-medical focus:ring-0"
              />
              <span>Personal or Family History of Melanoma</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white/80">
              <input
                type="checkbox"
                checked={itchBleed}
                onChange={(e) => setItchBleed(e.target.checked)}
                className="rounded border-white/20 bg-white/5 text-teal-medical focus:ring-0"
              />
              <span>Symptoms Present: Pruritus (Itch) or Bleeding</span>
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isAnalyzing || !imageFile}
          className="btn-primary w-full py-3.5 text-sm font-bold shadow-[0_0_20px_rgba(18,201,193,0.35)]"
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <RefreshCw size={16} className="animate-spin" />
              Executing Multimodal Pipeline...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Execute MSPE-DeiT Inference
              <ChevronRight size={16} />
            </span>
          )}
        </button>
      </form>

      {/* Visual Progress Stepper Modal during Analysis */}
      {isAnalyzing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-navy-100 rounded-3xl border border-white/10 p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-teal-medical/20 border border-teal-medical/40 flex items-center justify-center mx-auto text-teal-medical animate-pulse">
                <RefreshCw size={22} className="animate-spin" />
              </div>
              <h3 className="text-base font-bold text-white">Multimodal Fusion</h3>
              <p className="text-xs text-teal-medical">Processing branches simultaneously</p>
            </div>

            {/* Stepper Steps */}
            <div className="space-y-3">
              {[
                { step: 1, label: 'Preprocessing & Normalization', desc: 'Resizing to 224x224, ImageNet mean/std' },
                { step: 2, label: 'MSPE-DeiT Patch Embedding', desc: `Routing to ${modality} patch layer & 12 transformer blocks` },
                { step: 3, label: 'XGBoost & ANN Tabular Inference', desc: 'Engineering 14-dim clinical features vector' },
                { step: 4, label: 'Soft-Voting Ensemble Fusion', desc: 'P_final = (P_MSPE + P_XGB + P_ANN) / 3' },
              ].map(({ step, label, desc }) => {
                const isDone = stepperPhase > step
                const isCurrent = stepperPhase === step
                return (
                  <div key={step} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 flex-shrink-0 transition-all ${
                        isDone
                          ? 'bg-teal-medical text-navy-300'
                          : isCurrent
                          ? 'bg-amber-400 text-navy-300 animate-pulse'
                          : 'bg-white/10 text-white/40'
                      }`}
                    >
                      {isDone ? <CheckCircle size={14} /> : step}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${isDone || isCurrent ? 'text-white' : 'text-white/40'}`}>
                        {label}
                      </p>
                      <p className="text-[10px] text-white/50">{desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

