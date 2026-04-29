import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SkillFeedbackForm } from '../SkillFeedbackForm'

describe('SkillFeedbackForm', () => {
  it('renders the collapsed desktop feedback entry point', () => {
    const html = renderToString(
      <SkillFeedbackForm
        runId="00000000-0000-0000-0000-000000000001"
        skillId="layer2.world-consistency"
        surface="desktop-skill-dialog"
      />
    )

    expect(html).toContain('提交反馈')
  })
})
