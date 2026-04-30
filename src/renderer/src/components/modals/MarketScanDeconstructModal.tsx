import { useMemo, useState } from 'react'
import { AlertCircle, BookOpen, Copy, Loader2, Search, ShieldCheck, X } from 'lucide-react'
import { SkillFeedbackForm } from '@/components/ai/SkillFeedbackForm'
import { useBookStore } from '@/stores/book-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import {
  DECONSTRUCT_SKILL_ID,
  MARKET_SCAN_SKILL_ID,
  buildDeconstructInput,
  buildMarketScanInput,
  formatReferenceDraft,
  type DeconstructFocus,
  type WebnovelSourceType
} from '@/utils/market-scan-deconstruct'

type TabId = 'market' | 'deconstruct'

interface MarketScanOutput {
  sampleSize?: number
  clusters?: Array<{
    label: string
    count: number
    keywords?: string[]
    representativeTitles?: string[]
    opportunity?: string
    saturationRisk?: string
  }>
  signals?: Array<{
    type: string
    label: string
    count: number
    evidenceTitles?: string[]
  }>
  opportunities?: Array<{
    angle: string
    rationale: string
    suggestedOpening: string
    risk: string
  }>
  cautions?: string[]
  referencePackDraft?: unknown
}

interface DeconstructOutput {
  sampleSize?: number
  openingHook?: {
    type: string
    strength: string
    evidence: string
    suggestion: string
  }
  beats?: Array<{
    chapterId: string
    order: number
    label: string
    summary: string
    retentionIntent: string
  }>
  readerPromises?: Array<{
    promise: string
    evidence: string
    status: string
  }>
  retentionRisks?: Array<{
    chapterId?: string
    severity: string
    message: string
  }>
  craftMoves?: Array<{
    label: string
    whyItWorks: string
    adaptForOwnWork: string
  }>
  referencePackDraft?: unknown
}

interface ResultState {
  skillId: string
  output: MarketScanOutput | DeconstructOutput
}

const FOCUS_OPTIONS: Array<{ id: DeconstructFocus; label: string }> = [
  { id: 'hook', label: '钩子' },
  { id: 'pacing', label: '节奏' },
  { id: 'trope', label: '套路' },
  { id: 'character', label: '人物' },
  { id: 'retention', label: '留存' }
]

const MARKET_PLACEHOLDER = [
  '书名\t题材\t标签\t简介\t排名',
  '灵气复苏后我开武馆\t都市高武\t灵气复苏|高武|经营\t主角觉醒训练面板后重建武馆\t1',
  '退婚后我成了制片人\t女强\t退婚|事业线|打脸\t女主接手烂尾剧组完成反击\t2',
  '规则怪谈副本里的灯\t无限流\t规则怪谈|副本\t主角在公寓副本里判断假规则\t3'
].join('\n')

const DECONSTRUCT_PLACEHOLDER = [
  '### 第一章 退婚当日',
  '粘贴已授权章节样本正文。系统只分析这里的文本，不提供抓取入口，也不会自动写入正文或设定库。',
  '',
  '### 第二章 第一笔反击',
  '可用 Markdown 标题、--- 分隔，或直接粘贴单章全文。'
].join('\n')

export default function MarketScanDeconstructModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const bookId = useBookStore((s) => s.currentBookId)
  const addToast = useToastStore((s) => s.addToast)

  const [tab, setTab] = useState<TabId>('market')
  const [sourceType, setSourceType] = useState<WebnovelSourceType>('manual')
  const [sourceNote, setSourceNote] = useState('')
  const [datasetName, setDatasetName] = useState('')
  const [marketRaw, setMarketRaw] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [deconstructRaw, setDeconstructRaw] = useState('')
  const [focus, setFocus] = useState<DeconstructFocus[]>(['hook', 'pacing', 'trope', 'retention'])
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)
  const [feedbackRunId, setFeedbackRunId] = useState<string | null>(null)

  const marketBuild = useMemo(
    () =>
      buildMarketScanInput({
        projectId: bookId ?? '',
        sourceType,
        sourceNote,
        datasetName,
        raw: marketRaw
      }),
    [bookId, datasetName, marketRaw, sourceNote, sourceType]
  )
  const deconstructBuild = useMemo(
    () =>
      buildDeconstructInput({
        projectId: bookId ?? '',
        sourceType,
        sourceNote,
        workTitle,
        raw: deconstructRaw,
        focus
      }),
    [bookId, deconstructRaw, focus, sourceNote, sourceType, workTitle]
  )

  const activeErrors = tab === 'market' ? marketBuild.errors : deconstructBuild.errors
  const canSubmit = bookId != null && activeErrors.length === 0 && !running
  const referenceDraft = result?.output.referencePackDraft

  const handleRun = async () => {
    if (!bookId || running) return
    const build = tab === 'market' ? marketBuild : deconstructBuild
    if (!build.input || build.errors.length > 0) {
      addToast('error', build.errors[0] ?? '请先补齐样本和授权说明')
      return
    }

    const skillId = tab === 'market' ? MARKET_SCAN_SKILL_ID : DECONSTRUCT_SKILL_ID
    setRunning(true)
    setResult(null)
    setFeedbackRunId(null)
    try {
      const response = await window.api.aiExecuteSkill(
        skillId,
        build.input as unknown as Record<string, unknown>,
        { modelHint: 'balanced' }
      )
      if (response.error) {
        const msg =
          response.code === 'GENRE_PACK_REQUIRED'
            ? '网文题材包未订阅，无法使用该 Skill。'
            : response.code === 'PRO_REQUIRED'
              ? '该 Skill 需要 Pro 权限。'
              : response.code === 'SKILL_TIMEOUT'
                ? '分析超时，请减少样本量后再试。'
                : response.error
        addToast('error', msg)
        return
      }
      setResult({
        skillId,
        output: response.output as MarketScanOutput | DeconstructOutput
      })
      setFeedbackRunId(response.runId || null)
      addToast('success', tab === 'market' ? '扫榜样本分析完成' : '授权样本拆文完成')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Skill 调用失败')
    } finally {
      setRunning(false)
    }
  }

  const handleCopyReferenceDraft = async () => {
    if (!referenceDraft) return
    try {
      await navigator.clipboard.writeText(formatReferenceDraft(referenceDraft))
      addToast('success', '参考草稿已复制')
    } catch {
      addToast('error', '复制失败，请手动选中内容复制')
    }
  }

  const toggleFocus = (id: DeconstructFocus) => {
    setFocus((current) => {
      if (current.includes(id)) {
        return current.length > 1 ? current.filter((item) => item !== id) : current
      }
      return [...current, id]
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <Search size={18} className="text-[var(--accent-secondary)]" />
            网文扫榜 / 授权拆文
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-y-auto p-5">
            <div className="space-y-4">
              <section className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-surface)] p-3 text-xs text-[var(--warning-primary)]">
                <div className="flex gap-2">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                  <div>
                    仅粘贴用户本人、授权导出或可合法分析的数据。V1 不提供公开站抓取、链接访问、浏览器自动化或平台爬虫能力，结果只作为结构参考，不会自动写入正文或设定库。
                  </div>
                </div>
              </section>

              <div className="flex gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-1">
                <button
                  type="button"
                  onClick={() => setTab('market')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition ${
                    tab === 'market'
                      ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Search size={14} />
                  扫榜分析
                </button>
                <button
                  type="button"
                  onClick={() => setTab('deconstruct')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition ${
                    tab === 'deconstruct'
                      ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <BookOpen size={14} />
                  拆文分析
                </button>
              </div>

              <section className="grid gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 md:grid-cols-[180px_minmax(0,1fr)]">
                <label className="block text-xs">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                    数据类型
                  </span>
                  <select
                    value={sourceType}
                    onChange={(event) => setSourceType(event.target.value as WebnovelSourceType)}
                    className="field text-xs"
                  >
                    <option value="manual">手动整理</option>
                    <option value="authorized_export">授权导出</option>
                  </select>
                </label>
                <label className="block text-xs">
                  <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
                    来源 / 授权说明
                  </span>
                  <input
                    value={sourceNote}
                    onChange={(event) => setSourceNote(event.target.value)}
                    placeholder="例如：作者授权导出的样本，仅用于本地拆文学习"
                    className="field text-xs"
                  />
                </label>
              </section>

              {tab === 'market' ? (
                <MarketInputSection
                  datasetName={datasetName}
                  raw={marketRaw}
                  onDatasetNameChange={setDatasetName}
                  onRawChange={setMarketRaw}
                />
              ) : (
                <DeconstructInputSection
                  workTitle={workTitle}
                  raw={deconstructRaw}
                  focus={focus}
                  onWorkTitleChange={setWorkTitle}
                  onRawChange={setDeconstructRaw}
                  onToggleFocus={toggleFocus}
                />
              )}

              {activeErrors.length > 0 && (
                <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-xs text-[var(--danger-primary)]">
                  <div className="mb-1 flex items-center gap-1 font-bold">
                    <AlertCircle size={13} />
                    需要补齐
                  </div>
                  <ul className="list-disc space-y-1 pl-5">
                    {activeErrors.slice(0, 5).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] text-[var(--text-muted)]">
                  {tab === 'market'
                    ? `已解析 ${marketBuild.input?.entries.length ?? 0} 条榜单样本`
                    : `已解析 ${deconstructBuild.input?.chapters.length ?? 0} 章授权样本`}
                </div>
                <button
                  type="button"
                  onClick={() => void handleRun()}
                  disabled={!canSubmit}
                  className="inline-flex items-center gap-1 rounded bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)] disabled:opacity-40"
                >
                  {running ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  {running ? '分析中...' : tab === 'market' ? '开始扫榜分析' : '开始拆文分析'}
                </button>
              </div>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">结构化结果</div>
                <div className="text-[11px] text-[var(--text-muted)]">只显示在当前窗口；应用前请自行确认。</div>
              </div>
              {referenceDraft != null && (
                <button
                  type="button"
                  onClick={() => void handleCopyReferenceDraft()}
                  className="inline-flex items-center gap-1 rounded border border-[var(--border-primary)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Copy size={12} />
                  复制参考草稿
                </button>
              )}
            </div>

            {!result ? (
              <div className="rounded-lg border border-dashed border-[var(--border-primary)] p-4 text-xs leading-6 text-[var(--text-muted)]">
                扫榜会输出题材聚类、热词/设定信号、机会角度和同质化风险。拆文会输出开篇钩子、beat、期待管理、留存风险和可复制的 Reference Pack 草稿。
              </div>
            ) : result.skillId === MARKET_SCAN_SKILL_ID ? (
              <MarketResult output={result.output as MarketScanOutput} />
            ) : (
              <DeconstructResult output={result.output as DeconstructOutput} />
            )}

            {referenceDraft != null && (
              <section className="mt-4">
                <div className="mb-1 text-xs font-bold text-[var(--text-primary)]">Canon / Reference Pack 草稿</div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-[11px] leading-5 text-[var(--text-primary)]">
                  {formatReferenceDraft(referenceDraft)}
                </pre>
              </section>
            )}

            {feedbackRunId && result && (
              <SkillFeedbackForm
                runId={feedbackRunId}
                skillId={result.skillId}
                surface="desktop-skill-dialog"
                className="mt-4"
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function MarketInputSection(props: {
  datasetName: string
  raw: string
  onDatasetNameChange: (value: string) => void
  onRawChange: (value: string) => void
}) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          样本名称
        </span>
        <input
          value={props.datasetName}
          onChange={(event) => props.onDatasetNameChange(event.target.value)}
          placeholder="例如：都市高武榜单样本"
          className="field text-xs"
        />
      </label>
      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          榜单样本（JSON / TSV / CSV）
        </span>
        <textarea
          value={props.raw}
          onChange={(event) => props.onRawChange(event.target.value)}
          placeholder={MARKET_PLACEHOLDER}
          className="field min-h-[260px] resize-vertical font-mono text-xs leading-5"
        />
      </label>
    </section>
  )
}

function DeconstructInputSection(props: {
  workTitle: string
  raw: string
  focus: DeconstructFocus[]
  onWorkTitleChange: (value: string) => void
  onRawChange: (value: string) => void
  onToggleFocus: (id: DeconstructFocus) => void
}) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          样本作品名 / 内部标识
        </span>
        <input
          value={props.workTitle}
          onChange={(event) => props.onWorkTitleChange(event.target.value)}
          placeholder="例如：授权样本 A"
          className="field text-xs"
        />
      </label>
      <div>
        <div className="mb-1 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">拆解维度</div>
        <div className="flex flex-wrap gap-1">
          {FOCUS_OPTIONS.map((option) => {
            const active = props.focus.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => props.onToggleFocus(option.id)}
                className={`rounded border px-2 py-1 text-xs transition ${
                  active
                    ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                    : 'border-[var(--border-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </div>
      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          授权章节样本
        </span>
        <textarea
          value={props.raw}
          onChange={(event) => props.onRawChange(event.target.value)}
          placeholder={DECONSTRUCT_PLACEHOLDER}
          className="field min-h-[300px] resize-vertical text-xs leading-5"
        />
      </label>
    </section>
  )
}

function MarketResult({ output }: { output: MarketScanOutput }) {
  return (
    <div className="space-y-4">
      <SummaryLine label="样本数" value={String(output.sampleSize ?? 0)} />
      <ResultList
        title="题材聚类"
        items={(output.clusters ?? []).map((cluster) => ({
          title: `${cluster.label} · ${cluster.count} 条 · ${cluster.saturationRisk ?? 'unknown'}`,
          body: cluster.opportunity ?? '',
          meta: [...(cluster.keywords ?? []), ...(cluster.representativeTitles ?? [])].join(' / ')
        }))}
      />
      <ResultList
        title="热词 / 设定信号"
        items={(output.signals ?? []).map((signal) => ({
          title: `${signal.label} · ${signal.count} 条`,
          body: signal.evidenceTitles?.join('、') ?? '',
          meta: signal.type
        }))}
      />
      <ResultList
        title="机会角度"
        items={(output.opportunities ?? []).map((item) => ({
          title: item.angle,
          body: `${item.rationale}\n${item.suggestedOpening}`,
          meta: item.risk
        }))}
      />
      {output.cautions && output.cautions.length > 0 && (
        <ResultList
          title="风险提示"
          items={output.cautions.map((item) => ({ title: item, body: '', meta: '' }))}
        />
      )}
    </div>
  )
}

function DeconstructResult({ output }: { output: DeconstructOutput }) {
  return (
    <div className="space-y-4">
      <SummaryLine label="样本章数" value={String(output.sampleSize ?? 0)} />
      {output.openingHook && (
        <section>
          <div className="mb-2 text-xs font-bold text-[var(--text-primary)]">开篇钩子</div>
          <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs">
            <div className="font-semibold text-[var(--text-primary)]">
              {output.openingHook.type} · {output.openingHook.strength}
            </div>
            <div className="mt-1 text-[var(--text-secondary)]">{output.openingHook.evidence}</div>
            <div className="mt-2 text-[var(--text-muted)]">{output.openingHook.suggestion}</div>
          </div>
        </section>
      )}
      <ResultList
        title="节奏 Beat"
        items={(output.beats ?? []).map((beat) => ({
          title: `${beat.label} · ${beat.chapterId}`,
          body: `${beat.summary}\n${beat.retentionIntent}`,
          meta: `order ${beat.order}`
        }))}
      />
      <ResultList
        title="期待管理"
        items={(output.readerPromises ?? []).map((item) => ({
          title: `${item.promise} · ${item.status}`,
          body: item.evidence,
          meta: ''
        }))}
      />
      <ResultList
        title="留存风险"
        items={(output.retentionRisks ?? []).map((item) => ({
          title: `${item.severity}${item.chapterId ? ` · ${item.chapterId}` : ''}`,
          body: item.message,
          meta: ''
        }))}
      />
      <ResultList
        title="可迁移技法"
        items={(output.craftMoves ?? []).map((item) => ({
          title: item.label,
          body: `${item.whyItWorks}\n${item.adaptForOwnWork}`,
          meta: ''
        }))}
      />
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-2 text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  )
}

function ResultList(props: {
  title: string
  items: Array<{ title: string; body: string; meta: string }>
}) {
  if (props.items.length === 0) return null
  return (
    <section>
      <div className="mb-2 text-xs font-bold text-[var(--text-primary)]">{props.title}</div>
      <div className="space-y-2">
        {props.items.map((item, index) => (
          <div
            key={`${props.title}-${index}-${item.title}`}
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs"
          >
            <div className="font-semibold text-[var(--text-primary)]">{item.title}</div>
            {item.body && <div className="mt-1 whitespace-pre-line text-[var(--text-secondary)]">{item.body}</div>}
            {item.meta && <div className="mt-2 text-[11px] text-[var(--text-muted)]">{item.meta}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
