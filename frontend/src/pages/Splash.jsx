import { useNavigate } from 'react-router-dom'

// The three numbers behind C.Stroud's 2023 decomposition (see Home.jsx) -- reused
// here purely as decorative background type, not as a data display, so this page
// doesn't need its own fetch or loading state. If the model is ever retrained,
// these can drift slightly out of sync with the real numbers without breaking
// anything -- it's set dressing, not a claim.
const BACKDROP_NUMBERS = ['+0.041', '-0.112', '+0.184', '0.113']

export default function Splash() {
  const navigate = useNavigate()

  return (
    <main className="relative min-h-screen overflow-hidden flex items-center justify-center px-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 800px 500px at 50% 40%, rgba(245, 166, 35, 0.14), transparent 70%)',
        }}
      />

      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.06]">
        <div className="flex flex-wrap gap-12 -rotate-6 scale-125 -translate-x-10 -translate-y-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <span
              key={i}
              className="font-(family-name:--font-display) text-5xl font-bold text-(--color-text-primary) whitespace-nowrap"
            >
              {BACKDROP_NUMBERS[i % BACKDROP_NUMBERS.length]}
            </span>
          ))}
        </div>
      </div>

      <div className="relative z-10 text-center max-w-[720px]">
        <p className="font-(family-name:--font-body) text-xs tracking-[0.2em] uppercase text-(--color-qb) mb-6">
          2019 &ndash; 2025 &middot; 250+ Qualifying QB-Seasons
        </p>

        <h1 className="font-(family-name:--font-display) text-4xl md:text-6xl font-bold uppercase leading-[1.05] text-(--color-text-primary)">
          QB True
          <br />
          Value
        </h1>

        <div className="mx-auto mt-6 w-16 h-0.5 bg-(--color-qb)" />

        <p className="mt-6 font-(family-name:--font-body) text-lg text-(--color-text-secondary) leading-relaxed">
          Every quarterback's stat line is really three numbers stacked together: a
          league baseline, what his supporting cast handed him, and what he created
          on his own. We pull them apart for every qualifying QB-season since 2019.
        </p>

        <button
          onClick={() => navigate('/home')}
          className="inline-block mt-10 px-10 py-4 rounded-(--radius-md) bg-(--color-qb) text-(--color-bg) font-(family-name:--font-display) font-bold text-lg uppercase tracking-wider hover:bg-(--color-qb-hover) hover:-translate-y-px"
        >
          Enter the App
        </button>

        <p className="mt-6 font-(family-name:--font-body) text-xs text-(--color-text-muted)">
          Built on public NFL play-by-play data &middot; fully open-source &middot; no black-box scores
        </p>
      </div>
    </main>
  )
}
