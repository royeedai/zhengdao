import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ModalStackLayer } from '../ModalManager'

describe('ModalManager stack rendering', () => {
  it('keeps stacked modals mounted without letting their fixed z-index cover the active modal', () => {
    const html = renderToString(
      <ModalStackLayer>
        <div className="fixed inset-0 z-[120]">写作情报</div>
      </ModalStackLayer>
    )

    expect(html).toContain('hidden=""')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('pointer-events-none')
    expect(html).toContain('写作情报')
  })
})
