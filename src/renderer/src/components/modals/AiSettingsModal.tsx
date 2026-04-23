import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bot,
  Check,
  RotateCcw,
  Save,
  Sparkles,
  X
} from 'lucide-react'
import { useBookStore } from '@/stores/book-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import type { AiSkillOverride, AiSkillTemplate, AiWorkProfile } from '@/utils/ai/assistant-workflow'

type Tab = 'profile' | 'skills'

type AiAccount = {
  id: number
  name: string
  provider: string
  api_endpoint: string
  model: string
  has_secret: number
  is_default: number
  status: string
}

type SkillDraft = Partial<AiSkillTemplate & AiSkillOverride>

const EMPTY_PROFILE: AiWorkProfile = {
  id: 0,
  book_id: 0,
  default_account_id: null,
  style_guide: '',
  genre_rules: '',
  content_boundaries: '',
  asset_rules: '',
  rhythm_rules: '',
  context_policy: 'smart_minimal',
  created_at: '',
  updated_at: ''
}

function createSkillDraft(
  selectedSkill: AiSkillTemplate,
  selectedOverride: AiSkillOverride | null,
  useOverride: boolean
): SkillDraft {
  const source = useOverride && selectedOverride ? selectedOverride : selectedSkill
  return {
    name: source.name || selectedSkill.name,
    description: source.description || selectedSkill.description,
    system_prompt: source.system_prompt || selectedSkill.system_prompt,
    user_prompt_template: source.user_prompt_template || selectedSkill.user_prompt_template,
    context_policy: source.context_policy || selectedSkill.context_policy,
    output_contract: source.output_contract || selectedSkill.output_contract,
    enabled_surfaces: source.enabled_surfaces || selectedSkill.enabled_surfaces
  }
}

export default function AiSettingsModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const openModal = useUIStore((s) => s.openModal)
  const bookId = useBookStore((s) => s.currentBookId)!
  const [tab, setTab] = useState<Tab>('profile')
  const [accounts, setAccounts] = useState<AiAccount[]>([])
  const [skills, setSkills] = useState<AiSkillTemplate[]>([])
  const [overrides, setOverrides] = useState<AiSkillOverride[]>([])
  const [profile, setProfile] = useState<AiWorkProfile>(EMPTY_PROFILE)
  const [selectedSkillKey, setSelectedSkillKey] = useState('continue_writing')
  const [useOverride, setUseOverride] = useState(false)

  const selectedSkill = useMemo(
    () => skills.find((skill) => skill.key === selectedSkillKey) || skills[0],
    [skills, selectedSkillKey]
  )
  const selectedOverride = useMemo(
    () => overrides.find((override) => override.skill_key === selectedSkillKey) || null,
    [overrides, selectedSkillKey]
  )
  const loadModalState = useCallback(async () => {
    const [accountRows, skillRows, profileRow, overrideRows] = await Promise.all([
      window.api.aiGetAccounts(),
      window.api.aiGetSkillTemplates(),
      window.api.aiGetWorkProfile(bookId),
      window.api.aiGetSkillOverrides(bookId)
    ])
    return {
      accounts: accountRows as AiAccount[],
      skills: skillRows as AiSkillTemplate[],
      profile: (profileRow as AiWorkProfile) || EMPTY_PROFILE,
      overrides: overrideRows as AiSkillOverride[]
    }
  }, [bookId])

  const refresh = async () => {
    const next = await loadModalState()
    setAccounts(next.accounts)
    setSkills(next.skills)
    setProfile(next.profile)
    setOverrides(next.overrides)
    setUseOverride(Boolean(next.overrides.find((override) => override.skill_key === selectedSkillKey)))
  }

  useEffect(() => {
    let cancelled = false

    const loadInitialState = async () => {
      const next = await loadModalState()
      if (cancelled) return
      setAccounts(next.accounts)
      setSkills(next.skills)
      setProfile(next.profile)
      setOverrides(next.overrides)
      setUseOverride(Boolean(next.overrides.find((override) => override.skill_key === selectedSkillKey)))
    }

    void loadInitialState()
    return () => {
      cancelled = true
    }
  }, [loadModalState, selectedSkillKey])

  const saveProfile = async () => {
    await window.api.aiSaveWorkProfile(bookId, profile)
    useToastStore.getState().addToast('success', '作品 AI 档案已保存')
    await refresh()
  }

  const saveSkill = async (skillDraft: SkillDraft) => {
    if (!selectedSkill) return
    if (useOverride) {
      await window.api.aiUpsertSkillOverride(bookId, selectedSkill.key, skillDraft)
      useToastStore.getState().addToast('success', '本作品能力覆盖已保存')
    } else {
      await window.api.aiUpdateSkillTemplate(selectedSkill.key, skillDraft)
      useToastStore.getState().addToast('success', '全局能力模板已保存')
    }
    await refresh()
  }

  const resetSkillOverride = async () => {
    if (!selectedSkill) return
    await window.api.aiDeleteSkillOverride(bookId, selectedSkill.key)
    setUseOverride(false)
    useToastStore.getState().addToast('success', '已恢复继承全局能力')
    await refresh()
  }

  const selectSkill = (skillKey: string) => {
    setSelectedSkillKey(skillKey)
    setUseOverride(Boolean(overrides.find((override) => override.skill_key === skillKey)))
  }

  const tabs: Array<[Tab, string]> = [
    ['profile', '作品 AI 档案'],
    ['skills', 'AI 能力卡']
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Bot size={18} className="text-emerald-400" />
            <span>AI 能力与作品配置</span>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            title="关闭 AI 配置"
            aria-label="关闭 AI 配置"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex shrink-0 border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-2">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`border-b-2 px-4 py-3 text-xs font-bold transition ${
                tab === key
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'profile' && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-muted)]">
                这里配置 AI 如何理解当前作品，不保存账号密钥。账号、API Key、Gemini CLI 和 Ollama 状态在“应用设置 / AI 全局账号”里统一管理。
              </p>
              <div className="rounded-lg border border-[var(--info-border)] bg-[var(--info-surface)] p-3 text-xs text-[var(--text-primary)]">
                <div className="font-bold text-[var(--info-primary)]">AI 账号已归入应用设置</div>
                <p className="mt-1 text-[var(--text-secondary)]">
                  OpenAI 兼容、Gemini API Key、Gemini CLI、Ollama 和自定义兼容账号属于系统级资源，所有作品共用。
                </p>
                <button
                  type="button"
                  onClick={() => openModal('appSettings', { tab: 'aiAccounts' })}
                  className="mt-2 rounded border border-[var(--info-border)] px-3 py-1.5 text-xs font-semibold text-[var(--info-primary)] hover:bg-[var(--info-surface)]"
                >
                  打开 AI 全局账号
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="默认全局账号">
                  <select
                    value={profile.default_account_id ?? ''}
                    onChange={(event) =>
                      setProfile((current) => ({
                        ...current,
                        default_account_id: event.target.value ? Number(event.target.value) : null
                      }))}
                    className="field"
                  >
                    <option value="">自动选择默认账号</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} / {account.provider}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="上下文策略">
                  <select
                    value={profile.context_policy}
                    onChange={(event) => setProfile((current) => ({ ...current, context_policy: event.target.value }))}
                    className="field"
                  >
                    <option value="smart_minimal">智能最小上下文</option>
                    <option value="manual">手动选择上下文</option>
                    <option value="full">尽可能完整上下文</option>
                  </select>
                </Field>
              </div>
              <TextArea label="文风偏好" value={profile.style_guide} onChange={(value) => setProfile((current) => ({ ...current, style_guide: value }))} />
              <TextArea label="题材规则" value={profile.genre_rules} onChange={(value) => setProfile((current) => ({ ...current, genre_rules: value }))} />
              <TextArea label="写作禁区 / 不允许改动" value={profile.content_boundaries} onChange={(value) => setProfile((current) => ({ ...current, content_boundaries: value }))} />
              <TextArea label="资产生成规则" value={profile.asset_rules} onChange={(value) => setProfile((current) => ({ ...current, asset_rules: value }))} />
              <TextArea label="章节节奏要求" value={profile.rhythm_rules} onChange={(value) => setProfile((current) => ({ ...current, rhythm_rules: value }))} />
              <div className="flex justify-end">
                <button type="button" onClick={() => void saveProfile()} className="primary-btn">
                  <Save size={14} /> 保存作品 AI 档案
                </button>
              </div>
            </div>
          )}

          {tab === 'skills' && selectedSkill && (
            <div className="grid min-h-0 gap-4 md:grid-cols-[260px_1fr]">
              <div className="space-y-2">
                {skills.map((skill) => (
                  <button
                    key={skill.key}
                    type="button"
                    onClick={() => selectSkill(skill.key)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedSkillKey === skill.key
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                        : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-secondary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <Sparkles size={14} /> {skill.name}
                    </div>
                    <div className="mt-1 line-clamp-2 text-[11px] text-[var(--text-muted)]">{skill.description}</div>
                    {overrides.some((override) => override.skill_key === skill.key) && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded border border-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-300">
                        <Check size={10} /> 本作品覆盖
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <SkillDraftEditor
                key={`${selectedSkill.key}:${useOverride ? 'override' : 'global'}:${selectedOverride ? 'custom' : 'inherited'}`}
                selectedSkill={selectedSkill}
                selectedOverride={selectedOverride}
                useOverride={useOverride}
                onUseOverrideChange={setUseOverride}
                onReset={() => void resetSkillOverride()}
                onSave={(skillDraft) => void saveSkill(skillDraft)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SkillDraftEditor({
  selectedSkill,
  selectedOverride,
  useOverride,
  onUseOverrideChange,
  onReset,
  onSave
}: {
  selectedSkill: AiSkillTemplate
  selectedOverride: AiSkillOverride | null
  useOverride: boolean
  onUseOverrideChange: (value: boolean) => void
  onReset: () => void
  onSave: (skillDraft: SkillDraft) => void
}) {
  const [skillDraft, setSkillDraft] = useState<SkillDraft>(() =>
    createSkillDraft(selectedSkill, selectedOverride, useOverride)
  )

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-[var(--text-primary)]">{selectedSkill.name}</div>
          <div className="text-[11px] text-[var(--text-muted)]">{selectedSkill.key}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onUseOverrideChange(false)}
            className={`seg-btn ${!useOverride ? 'seg-active' : ''}`}
          >
            继承/编辑全局
          </button>
          <button
            type="button"
            onClick={() => onUseOverrideChange(true)}
            className={`seg-btn ${useOverride ? 'seg-active' : ''}`}
          >
            本作品覆盖
          </button>
        </div>
      </div>
      <Field label="能力名称">
        <input
          value={String(skillDraft.name || '')}
          onChange={(event) => setSkillDraft((current) => ({ ...current, name: event.target.value }))}
          className="field"
        />
      </Field>
      <TextArea
        label="能力说明"
        rows={2}
        value={String(skillDraft.description || '')}
        onChange={(value) => setSkillDraft((current) => ({ ...current, description: value }))}
      />
      <TextArea
        label="系统提示词"
        rows={5}
        value={String(skillDraft.system_prompt || '')}
        onChange={(value) => setSkillDraft((current) => ({ ...current, system_prompt: value }))}
      />
      <TextArea
        label="用户提示词模板"
        rows={4}
        value={String(skillDraft.user_prompt_template || '')}
        onChange={(value) => setSkillDraft((current) => ({ ...current, user_prompt_template: value }))}
      />
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="上下文策略">
          <input
            value={String(skillDraft.context_policy || '')}
            onChange={(event) => setSkillDraft((current) => ({ ...current, context_policy: event.target.value }))}
            className="field"
          />
        </Field>
        <Field label="启用入口">
          <input
            value={String(skillDraft.enabled_surfaces || '')}
            onChange={(event) => setSkillDraft((current) => ({ ...current, enabled_surfaces: event.target.value }))}
            className="field"
          />
        </Field>
        <Field label="输出要求">
          <input
            value={String(skillDraft.output_contract || '')}
            onChange={(event) => setSkillDraft((current) => ({ ...current, output_contract: event.target.value }))}
            className="field"
          />
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {selectedOverride && (
          <button type="button" onClick={onReset} className="secondary-btn">
            <RotateCcw size={14} /> 恢复全局
          </button>
        )}
        <button type="button" onClick={() => onSave(skillDraft)} className="primary-btn">
          <Save size={14} /> {useOverride ? '保存本作品覆盖' : '保存全局能力'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] uppercase text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  )
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <Field label={label}>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field resize-y"
      />
    </Field>
  )
}
