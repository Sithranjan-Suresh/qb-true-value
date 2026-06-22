import { act, render } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import WhatIfPanel from './WhatIfPanel'
import * as api from '../lib/api'

afterEach(() => {
  vi.restoreAllMocks()
})

const FEATURE_RANGES = {
  avg_separation: [2, 4],
  time_to_throw: [2, 3.5],
  pass_block_win_rate: [0.4, 0.8],
  opponent_def_epa: [-0.1, 0.1],
}
const INITIAL_VALUES = {
  avg_separation: 3,
  time_to_throw: 2.8,
  pass_block_win_rate: 0.6,
  opponent_def_epa: 0,
}

// Reproduces the exact failure mode the spec calls out: request A fires first (from
// an earlier slider move) but is slow to resolve; request B fires later (a newer
// slider move) and resolves quickly. If A's late response is allowed through, it
// would overwrite B's newer, correct value. The sequence-number guard must discard
// A's response once B has already become the latest in-flight request.
//
// Timeline (call 1 is the automatic mount-time request, fast):
//   t=0    A's slider change -> A's 200ms debounce starts
//   t=200  A's request (call 2) fires, resolves at t=500 (300ms server delay)
//   t=210  B's slider change -> B's 200ms debounce starts
//   t=410  B's request (call 3) fires, resolves at t=410 (0ms server delay)
// So B (call 3) resolves at t=410, then A (call 2) resolves later at t=500 -- the
// late/stale case the guard exists for.
it('discards a stale response that resolves after a newer request', async () => {
  let callCount = 0
  const onResult = vi.fn()

  vi.spyOn(api, 'postWhatIf').mockImplementation(() => {
    callCount += 1
    const thisCall = callCount
    const delay = thisCall === 2 ? 300 : 0
    return new Promise((resolve) => {
      setTimeout(
        () =>
          resolve({
            predicted_epa: thisCall,
            qb_component_counterfactual: thisCall,
            support_component_counterfactual: thisCall,
          }),
        delay,
      )
    })
  })

  let panel
  await act(async () => {
    panel = render(
      <WhatIfPanel
        qbId="00-1"
        season={2023}
        featureRanges={FEATURE_RANGES}
        initialValues={INITIAL_VALUES}
        onResult={onResult}
      />,
    )
  })
  expect(callCount).toBe(1) // mount-time request fired and resolved (0ms delay)
  onResult.mockClear()

  const slider = panel.container.querySelector('input[type="range"]')

  // A's slider change at t=0
  await act(async () => {
    Object.defineProperty(slider, 'value', { value: '3.1', configurable: true })
    slider.dispatchEvent(new Event('change', { bubbles: true }))
  })

  // Advance to t=210: A's debounce has fired (call 2, in flight), not yet resolved
  await act(async () => {
    await new Promise((r) => setTimeout(r, 210))
  })
  expect(callCount).toBe(2)

  // B's slider change at t=210
  await act(async () => {
    Object.defineProperty(slider, 'value', { value: '3.2', configurable: true })
    slider.dispatchEvent(new Event('change', { bubbles: true }))
  })

  // Advance to t=600: both B (resolves t=410) and A (resolves t=500) have settled
  await act(async () => {
    await new Promise((r) => setTimeout(r, 390))
  })

  expect(callCount).toBe(3)
  // The final, currently-displayed result must be B's (call 3), never overwritten
  // by A's (call 2) late response.
  expect(onResult).toHaveBeenLastCalledWith(expect.objectContaining({ predicted_epa: 3 }))
  expect(onResult).not.toHaveBeenCalledWith(expect.objectContaining({ predicted_epa: 2 }))
})
