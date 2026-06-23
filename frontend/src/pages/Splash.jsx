import { useNavigate } from 'react-router-dom'

const STAT_PILLS = ['250+ QB Seasons Analyzed', '2019–2025 Coverage', 'XGBoost + OLS Model']

export default function Splash() {
  const navigate = useNavigate()

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6 py-24">
      {/* Faint analytics grid -- replaces the old cluttered floating-numbers backdrop */}
      <div className="absolute inset-0 pointer-events-none splash-grid-overlay" />

      {/* Sparse gold dot field with a slow drift -- the "data points" motif, kept subtle */}
      <div className="absolute inset-0 pointer-events-none splash-dots" />

      {/* Centered gold glow behind the title, gives depth without noise */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 900px 600px at 50% 38%, rgba(245, 166, 35, 0.08), transparent 70%)',
        }}
      />

      <div className="relative z-10 text-center max-w-[720px] py-12">
        <p className="font-(family-name:--font-body) text-xs tracking-[0.3em] uppercase text-(--color-qb) mb-8">
          2019 &ndash; 2025 &middot; 250+ QB-Seasons
        </p>

        <h1 className="font-(family-name:--font-hero) text-[clamp(56px,14vw,120px)] leading-[0.95] tracking-tight text-(--color-text-primary)">
          QB
          <br />
          <span className="splash-title-gradient">True Value</span>
        </h1>

        <div className="mx-auto mt-8 w-16 h-0.5 bg-(--color-qb)" />

        <p className="mt-8 mx-auto max-w-[600px] font-(family-name:--font-body) text-[18px] text-(--color-text-secondary) leading-relaxed">
          Every quarterback's stat line is really three numbers stacked together: a
          league baseline, what his supporting cast handed him, and what he created
          on his own. We pull them apart for every qualifying QB-season since 2019.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {STAT_PILLS.map((pill) => (
            <span key={pill} className="splash-pill">
              {pill}
            </span>
          ))}
        </div>

        <button
          onClick={() => navigate('/home')}
          className="splash-cta inline-flex items-center gap-2 mt-12 px-12 py-5 rounded-(--radius-md) bg-(--color-qb) text-(--color-bg) font-(family-name:--font-display) font-bold text-lg uppercase tracking-wider hover:bg-(--color-qb-hover)"
        >
          Enter the App
          <span className="splash-cta-arrow">&rarr;</span>
        </button>

        <div className="mx-auto mt-10 w-24 h-px bg-(--color-qb-dim)" />
        <p className="mt-4 font-(family-name:--font-body) text-xs text-(--color-text-secondary) opacity-80">
          Built on public NFL play-by-play data &middot; fully open-source &middot; no black-box scores
        </p>
      </div>
    </main>
  )
}
