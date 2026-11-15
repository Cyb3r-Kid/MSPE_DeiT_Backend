import {
  BookOpen,
  Award,
  Layers,
  Cpu,
  Database,
  BarChart2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'

export default function ResearchMetricsDrawer() {
  const metrics = [
    { label: 'Overall Accuracy', value: '91.76%', sub: 'Balanced multi-class accuracy' },
    { label: 'AUROC', value: '0.953', sub: 'Area Under Receiver Operating Characteristic' },
    { label: 'Specificity', value: '91.77%', sub: 'True negative benign discrimination' },
    { label: 'Sensitivity (Recall)', value: '84.81%', sub: 'Malignancy detection rate' },
  ]

  const components = [
    {
      title: '1. MSPE-DeiT (Vision Transformer)',
      desc: 'DeiT-Tiny backbone (192-dim, 12 attention heads) with dual Modality-Specific Patch Embedding projection layers routing Dermoscopy and 3D Total Body Photography.',
      icon: Cpu,
    },
    {
      title: '2. XGBoost Classifier',
      desc: 'Gradient boosted decision trees trained on 14-dimensional engineered clinical tabular features, capturing non-linear patient risk patterns.',
      icon: BarChart2,
    },
    {
      title: '3. 3-Dense-Block ANN',
      desc: 'Deep neural network (Linear -> LayerNorm -> ReLU -> Dropout) learning continuous embeddings from clinical patient metadata.',
      icon: Layers,
    },
    {
      title: '4. Soft-Voting Ensemble Fusion',
      desc: 'Calibrated late-fusion taking equal-weighted probability average: P_final = (P_MSPE + P_XGB + P_ANN) / 3.',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="space-y-5 pb-24 animate-fade-in">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Research Foundation</h1>
        <p className="text-xs text-teal-medical font-medium">IEEE Access Paper Architecture</p>
      </div>

      {/* Paper Citation Card */}
      <div className="glass-card p-4 border border-teal-medical/30 bg-gradient-to-br from-teal-950/20 to-navy-100 space-y-2">
        <div className="flex items-center gap-1.5 text-teal-medical text-xs font-bold uppercase tracking-wider">
          <BookOpen size={14} />
          <span>Peer-Reviewed Publication</span>
        </div>
        <h2 className="text-sm font-bold text-white leading-snug">
          MSPE-DeiT: A Vision Transformer-Based Multimodal Framework for Skin Cancer Diagnosis
        </h2>
        <p className="text-[11px] text-white/60">
          Published in <em>IEEE Access</em>. Addresses clinical challenges in dermatological screening
          by dynamically fusing dermatological imagery and patient metadata.
        </p>
      </div>

      {/* Benchmark Metrics Grid */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Award size={13} className="text-teal-medical" />
          Benchmark Performance (ISIC Dataset)
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          {metrics.map((m, idx) => (
            <div key={idx} className="glass-card p-3 space-y-1">
              <span className="text-2xl font-black text-white tracking-tight text-teal-light">
                {m.value}
              </span>
              <p className="text-xs font-semibold text-white/90 leading-tight">{m.label}</p>
              <p className="text-[9px] text-white/50 leading-tight">{m.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Breakdown */}
      <div className="space-y-2.5">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Layers size={13} className="text-teal-medical" />
          Multimodal Pipeline Architecture
        </span>

        <div className="space-y-2">
          {components.map((c, idx) => {
            const Icon = c.icon
            return (
              <div key={idx} className="glass-card p-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-medical/10 border border-teal-medical/20 flex items-center justify-center text-teal-medical flex-shrink-0 mt-0.5">
                  <Icon size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white">{c.title}</h3>
                  <p className="text-[11px] text-white/70 leading-relaxed mt-0.5">{c.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Dataset & Methodology */}
      <div className="glass-card p-4 space-y-2">
        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Database size={13} className="text-teal-medical" />
          Dataset & Validation Protocol
        </span>
        <ul className="space-y-1.5 text-[11px] text-white/70">
          <li className="flex items-start gap-1.5">
            <CheckCircle2 size={13} className="text-teal-medical flex-shrink-0 mt-0.5" />
            <span>Trained and evaluated on standardized International Skin Imaging Collaboration (ISIC) cohorts.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 size={13} className="text-teal-medical flex-shrink-0 mt-0.5" />
            <span>Isotonic calibration applied to align probability branches before soft-voting fusion.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <CheckCircle2 size={13} className="text-teal-medical flex-shrink-0 mt-0.5" />
            <span>Deterministic offline mode ensures reliable viva examinations and client verification.</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

