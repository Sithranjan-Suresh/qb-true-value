import { act, render } from '@testing-library/react'
import { expect, it } from 'vitest'
import WhatIfPanel from './WhatIfPanel'

// Hits the real local backend (uvicorn on 127.0.0.1:8000) -- not mocked -- to verify
// the interpretation sentence and delta indicator actually update when a slider
// moves, using C.Stroud 2023's real recorded values.
const FEATURE_RANGES = {
  avg_separation: [2.186, 3.84],
  time_to_throw: [2.3, 3.24],
  pass_block_win_rate: [0.41, 0.76],
  opponent_def_epa: [-0.059, 0.076],
}
const INITIAL_VALUES = {
  avg_separation: 2.986,
  time_to_throw: 3.04,
  pass_block_win_rate: 0.53,
  opponent_def_epa: -0.054,
}

it('updates the interpretation sentence and delta when a slider moves', async () => {
  let panel
  await act(async () => {
    panel = render(
      <WhatIfPanel
        qbId="00-0039163"
        season={2023}
        featureRanges={FEATURE_RANGES}
        initialValues={INITIAL_VALUES}
        onResult={() => {}}
        qbName="C.Stroud"
        actualEpaPerPlay={0.113}
        actualQbComponent={0.184}
      />,
    )
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 1000)) // initial mount-time request
  })

  const initialText = panel.container.textContent
  expect(initialText).toContain('With these support conditions, C.Stroud would be expected to post')
  // Even at his real recorded feature values, predicted_epa (-0.071, under the
  // two-step model) differs from his actual epa_per_play (0.113) -- that gap is
  // qb_component by definition, so the delta here is correctly -0.184, not 0.
  expect(initialText).toContain('-0.184 vs. actual conditions')

  const sliders = panel.container.querySelectorAll('input[type="range"]')
  const pbwrSlider = sliders[2] // pass_block_win_rate

  await act(async () => {
    Object.defineProperty(pbwrSlider, 'value', { value: '0.76', configurable: true })
    pbwrSlider.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 600)) // 200ms debounce + real network round-trip
  })

  const updatedText = panel.container.textContent
  expect(updatedText).not.toBe(initialText)
  // Raising pass-block win rate to its max should raise predicted_epa, which should
  // shrink (not grow) his QB-created contribution -- the inverse relationship the
  // interpretation text exists to explain.
  expect(updatedText).toMatch(/smaller than his actual 0\.184/)
})
