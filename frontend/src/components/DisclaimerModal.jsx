import { useState } from 'react'
import { AlertTriangle, CheckCircle2, X, Shield } from 'lucide-react'

export default function DisclaimerModal({ onAccept }) {
  const [agreed, setAgreed] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-navy-100 rounded-t-3xl sm:rounded-3xl border border-white/10 shadow-2xl animate-slide-up sm:animate-fade-in overflow-hidden">
        {/* Header gradient */}
        <div className="h-1.5 bg-gradient-to-r from-teal-dark via-teal-medical to-teal-light" />

        <div className="p-6 pb-8">
          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                AI-Assisted Screening
              </h2>
              <p className="text-sm font-semibold text-teal-medical">
                Research Prototype
              </p>
            </div>
          </div>

          {/* Disclaimer blocks */}
          <div className="space-y-3 mb-6 text-sm text-white/80 leading-relaxed">
            <div className="glass-card p-3 border-l-4 border-amber-400">
              <p>
                <span className="font-semibold text-amber-300">⚠ NOT a diagnostic tool.</span>{' '}
                This system is a <em>research prototype</em> and does <strong>not</strong> provide
                medical diagnoses. Results must not replace professional dermatological evaluation.
              </p>
            </div>

            <div className="glass-card p-3">
              <p>
                <Shield size={14} className="inline mr-1 text-teal-medical" />
                All uploaded images are processed locally and are not shared with third parties.
                Assessments are for research purposes only.
              </p>
            </div>

            <ul className="list-disc list-inside space-y-1 text-white/70 pl-1">
              <li>Results reflect probabilistic model outputs, not clinical verdicts.</li>
              <li>Always consult a licensed dermatologist for any skin concern.</li>
              <li>Model performance: 91.76% accuracy on ISIC benchmark data.</li>
            </ul>

            <p className="text-xs text-white/50">
              This tool uses the MSPE-DeiT multimodal ensemble framework. By proceeding you
              acknowledge that you are using this application for research or educational
              purposes only.
            </p>
          </div>

          {/* Consent checkbox */}
          <label className="flex items-start gap-3 cursor-pointer mb-6 group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-md border-2 transition-all duration-150 flex items-center justify-center ${
                  agreed
                    ? 'bg-teal-medical border-teal-medical'
                    : 'bg-transparent border-white/30 group-hover:border-teal-medical/60'
                }`}
              >
                {agreed && <CheckCircle2 size={12} className="text-navy-300" />}
              </div>
            </div>
            <span className="text-sm text-white/80 leading-snug">
              I understand this is a research prototype and not a medical diagnostic tool.
              I agree to use this application responsibly.
            </span>
          </label>

          {/* CTA */}
          <button
            onClick={onAccept}
            disabled={!agreed}
            className="btn-primary w-full text-base"
          >
            <CheckCircle2 size={18} />
            Proceed to Application
          </button>
        </div>
      </div>
    </div>
  )
}
