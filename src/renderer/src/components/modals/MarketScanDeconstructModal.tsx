import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  FileText,
  History,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  X
} from 'lucide-react'
import { SkillFeedbackForm } from '@/components/ai/SkillFeedbackForm'
import { useBookStore } from '@/stores/book-store'
import { useToastStore } from '@/stores/toast-store'
import { useUIStore } from '@/stores/ui-store'
import {
  DECONSTRUCT_SKILL_ID,
  MARKET_SCAN_SKILL_ID,
  buildDeconstructInput,
  buildMarketScanInput,
  buildReferenceApplicationPatch,
  collectDeconstructEvidence,
  extractCraftCards,
  formatReferenceDraft,
  hashDeconstructSource,
  type DeconstructAnalysisDepth,
  type DeconstructCraftCard,
  type DeconstructFocus,
  type DeconstructGenreTemplate,
  type WebnovelSourceType
} from '@/utils/market-scan-deconstruct'
import type {
  AiDeconstructionReport,
  AiDeconstructionReportSummary
} from '../../../../shared/deconstruction-report'

type TabId = 'market' | 'deconstruct'
type StepId = 'source' | 'goals' | 'results'
type ResultTabId = 'overview' | 'structure' | 'character' | 'emotion' | 'cards' | 'reference'

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

interface EvidenceItem {
  chapterId?: string
  chapterTitle?: string
  quote: string
  reason?: string
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
  version?: 'webnovel-deconstruct.v0.2'
  status?: 'complete' | 'partial' | 'needs_more_source'
  sourceCoverage?: {
    chapterCount: number
    totalChars: number
    analysisDepth: DeconstructAnalysisDepth
    focus: DeconstructFocus[]
    limitations: string[]
  }
  overview?: {
    summary: string
    primaryHook: string
    mainTropes: string[]
    learningTakeaways: string[]
  }
  structureMap?: {
    opening?: {
      hookType: string
      strength: string
      suggestion: string
      evidence: EvidenceItem[]
    }
    chapters?: Array<{
      chapterId: string
      order: number
      label: string
      summary: string
      conflict: string
      turningPoint: string
      endingHook: string
      evidence: EvidenceItem[]
      confidence: number
    }>
    hookChain?: Array<{
      chapterId?: string
      opened: string
      paidOff?: string
      newHook?: string
      status: string
      evidence: EvidenceItem[]
    }>
  }
  characterMap?: {
    roles: Array<{
      name: string
      function: string
      agency: string
      readerAttachment: string
      evidence: EvidenceItem[]
      confidence: number
    }>
    risks: string[]
  }
  emotionRetentionMap?: {
    beats: Array<{
      chapterId: string
      emotion: string
      thrillPoint: string
      pressure: string
      retentionDevice: string
      evidence: EvidenceItem[]
      confidence: number
    }>
    risks: string[]
  }
  craftCards?: DeconstructCraftCard[]
  qualityReport?: {
    evidenceCoverage: string
    confidence: number
    faithfulnessWarnings: string[]
    copyRiskWarnings: string[]
    missingSignals: string[]
  }
}

interface ResultState {
  skillId: string
  output: MarketScanOutput | DeconstructOutput
  runId?: string
}

const FOCUS_OPTIONS: Array<{ id: DeconstructFocus; label: string }> = [
  { id: 'hook', label: '开篇钩子' },
  { id: 'pacing', label: '章节节奏' },
  { id: 'character', label: '人物功能' },
  { id: 'emotion', label: '情绪爽点' },
  { id: 'promise', label: '期待管理' },
  { id: 'retention', label: '留存风险' },
  { id: 'craft', label: '可迁移技法' },
  { id: 'trope', label: '题材套路' }
]

const STEP_OPTIONS: Array<{ id: StepId; label: string; icon: typeof FileText }> = [
  { id: 'source', label: '样本与授权', icon: FileText },
  { id: 'goals', label: '拆解目标', icon: Target },
  { id: 'results', label: '结构化结果', icon: CheckCircle2 }
]

const RESULT_TABS: Array<{ id: ResultTabId; label: string }> = [
  { id: 'overview', label: '总览' },
  { id: 'structure', label: '结构' },
  { id: 'character', label: '人物' },
  { id: 'emotion', label: '情绪/留存' },
  { id: 'cards', label: '可迁移卡片' },
  { id: 'reference', label: '参考草稿' }
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

  const [tab, setTab] = useState<TabId>('deconstruct')
  const [step, setStep] = useState<StepId>('source')
  const [resultTab, setResultTab] = useState<ResultTabId>('overview')
  const [sourceType, setSourceType] = useState<WebnovelSourceType>('manual')
  const [sourceNote, setSourceNote] = useState('')
  const [datasetName, setDatasetName] = useState('')
  const [marketRaw, setMarketRaw] = useState('')
  const [workTitle, setWorkTitle] = useState('')
  const [deconstructRaw, setDeconstructRaw] = useState('')
  const [focus, setFocus] = useState<DeconstructFocus[]>([
    'hook',
    'pacing',
    'character',
    'emotion',
    'promise',
    'retention',
    'craft'
  ])
  const [analysisDepth, setAnalysisDepth] = useState<DeconstructAnalysisDepth>('standard')
  const [platform, setPlatform] = useState('')
  const [genreTemplate, setGenreTemplate] = useState<DeconstructGenreTemplate>('other')
  const [learningGoal, setLearningGoal] = useState('')
  const [targetPremise, setTargetPremise] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [targetProblem, setTargetProblem] = useState('')
  const [running, setRunning] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [applyingReference, setApplyingReference] = useState(false)
  const [result, setResult] = useState<ResultState | null>(null)
  const [feedbackRunId, setFeedbackRunId] = useState<string | null>(null)
  const [lastDeconstructInput, setLastDeconstructInput] = useState<ReturnType<typeof buildDeconstructInput>['input']>(null)
  const [selectedCraftCards, setSelectedCraftCards] = useState<number[]>([])
  const [reports, setReports] = useState<AiDeconstructionReportSummary[]>([])

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
        focus,
        analysisDepth,
        platform,
        genreTemplate,
        learningGoal,
        targetProject: {
          premise: targetPremise,
          audience: targetAudience,
          currentProblem: targetProblem
        }
      }),
    [
      analysisDepth,
      bookId,
      deconstructRaw,
      focus,
      genreTemplate,
      learningGoal,
      platform,
      sourceNote,
      sourceType,
      targetAudience,
      targetPremise,
      targetProblem,
      workTitle
    ]
  )

  const activeErrors = tab === 'market' ? marketBuild.errors : deconstructBuild.errors
  const canSubmit = bookId != null && activeErrors.length === 0 && !running
  const referenceDraft = result?.output.referencePackDraft
  const deconstructOutput =
    result?.skillId === DECONSTRUCT_SKILL_ID ? (result.output as DeconstructOutput) : null

  const loadReports = useCallback(async () => {
    if (!bookId) return
    try {
      const rows = await window.api.aiListDeconstructionReports(bookId)
      setReports(rows)
    } catch {
      setReports([])
    }
  }, [bookId])

  useEffect(() => {
    if (tab === 'deconstruct') void loadReports()
  }, [loadReports, tab])

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
    setSelectedCraftCards([])
    try {
      const response = await window.api.aiExecuteSkill(
        skillId,
        build.input as unknown as Record<string, unknown>,
        { modelHint: tab === 'deconstruct' && analysisDepth === 'quick' ? 'fast' : 'balanced' }
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
        output: response.output as MarketScanOutput | DeconstructOutput,
        runId: response.runId || undefined
      })
      setFeedbackRunId(response.runId || null)
      if (skillId === DECONSTRUCT_SKILL_ID) {
        setLastDeconstructInput(build.input as typeof deconstructBuild.input)
        setStep('results')
        setResultTab('overview')
      }
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

  const handleSaveReport = async () => {
    if (!bookId || !deconstructOutput || !lastDeconstructInput || savingReport) return
    setSavingReport(true)
    try {
      await window.api.aiCreateDeconstructionReport({
        book_id: bookId,
        work_title: lastDeconstructInput.workTitle,
        source_type: lastDeconstructInput.sourceType,
        source_note: lastDeconstructInput.sourceNote,
        input_hash: hashDeconstructSource(lastDeconstructInput),
        focus: lastDeconstructInput.focus,
        run_id: result?.runId || feedbackRunId || '',
        output: deconstructOutput,
        evidence: collectDeconstructEvidence(deconstructOutput)
      })
      await loadReports()
      addToast('success', '拆文报告已保存')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '保存报告失败')
    } finally {
      setSavingReport(false)
    }
  }

  const handleLoadReport = async (reportId: number) => {
    try {
      const report = await window.api.aiGetDeconstructionReport(reportId) as AiDeconstructionReport | null
      if (!report) {
        addToast('error', '报告不存在或已删除')
        return
      }
      setTab('deconstruct')
      setStep('results')
      setResultTab('overview')
      setSelectedCraftCards([])
      setResult({
        skillId: DECONSTRUCT_SKILL_ID,
        output: report.output as DeconstructOutput,
        runId: report.run_id
      })
      setFeedbackRunId(null)
      addToast('success', '已载入历史报告')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '载入报告失败')
    }
  }

  const handleDeleteReport = async (reportId: number) => {
    if (!window.confirm('删除这份本地拆文报告？')) return
    try {
      await window.api.aiDeleteDeconstructionReport(reportId)
      await loadReports()
      addToast('success', '报告已删除')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '删除报告失败')
    }
  }

  const handleApplyReference = async () => {
    if (!bookId || !deconstructOutput || selectedCraftCards.length === 0 || applyingReference) {
      addToast('error', '请先勾选至少一张可迁移卡片')
      return
    }
    if (!window.confirm('只把已勾选的抽象技法追加到作品参考，不写入正文。确认应用？')) return

    setApplyingReference(true)
    try {
      const profile = await window.api.aiGetWorkProfile(bookId) as {
        genre_rules?: string | null
        rhythm_rules?: string | null
      } | null
      const patch = buildReferenceApplicationPatch(deconstructOutput, selectedCraftCards, profile)
      await window.api.aiSaveWorkProfile(bookId, { ...patch })
      addToast('success', '已追加到作品参考')
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : '应用作品参考失败')
    } finally {
      setApplyingReference(false)
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

  const toggleCraftCard = (index: number) => {
    setSelectedCraftCards((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index]
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5">
          <div className="flex items-center gap-2 font-bold text-[var(--text-primary)]">
            <BookOpen size={18} className="text-[var(--accent-secondary)]" />
            拆书工作台（网文拆文）
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

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="min-h-0 overflow-y-auto p-5">
            <div className="space-y-4">
              <section className="rounded-lg border border-[var(--warning-border)] bg-[var(--warning-surface)] p-3 text-xs text-[var(--warning-primary)]">
                <div className="flex gap-2">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                  <div>
                    仅使用手动粘贴或授权导出的样本；结果只做结构学习和参考，不生成同款正文，也不自动写入作品内容。
                  </div>
                </div>
              </section>

              <div className="flex gap-1 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-1">
                <TabButton
                  active={tab === 'deconstruct'}
                  icon={<BookOpen size={14} />}
                  label="拆文分析"
                  onClick={() => setTab('deconstruct')}
                />
                <TabButton
                  active={tab === 'market'}
                  icon={<Search size={14} />}
                  label="扫榜分析"
                  onClick={() => setTab('market')}
                />
              </div>

              {tab === 'market' ? (
                <>
                  <SourceCard
                    sourceType={sourceType}
                    sourceNote={sourceNote}
                    onSourceTypeChange={setSourceType}
                    onSourceNoteChange={setSourceNote}
                  />
                  <MarketInputSection
                    datasetName={datasetName}
                    raw={marketRaw}
                    onDatasetNameChange={setDatasetName}
                    onRawChange={setMarketRaw}
                  />
                </>
              ) : (
                <>
                  <StepNav step={step} onChange={setStep} />
                  {step === 'source' && (
                    <>
                      <SourceCard
                        sourceType={sourceType}
                        sourceNote={sourceNote}
                        onSourceTypeChange={setSourceType}
                        onSourceNoteChange={setSourceNote}
                      />
                      <DeconstructSourceStep
                        workTitle={workTitle}
                        raw={deconstructRaw}
                        onWorkTitleChange={setWorkTitle}
                        onRawChange={setDeconstructRaw}
                      />
                    </>
                  )}
                  {step === 'goals' && (
                    <DeconstructGoalStep
                      focus={focus}
                      analysisDepth={analysisDepth}
                      platform={platform}
                      genreTemplate={genreTemplate}
                      learningGoal={learningGoal}
                      targetPremise={targetPremise}
                      targetAudience={targetAudience}
                      targetProblem={targetProblem}
                      onToggleFocus={toggleFocus}
                      onAnalysisDepthChange={setAnalysisDepth}
                      onPlatformChange={setPlatform}
                      onGenreTemplateChange={setGenreTemplate}
                      onLearningGoalChange={setLearningGoal}
                      onTargetPremiseChange={setTargetPremise}
                      onTargetAudienceChange={setTargetAudience}
                      onTargetProblemChange={setTargetProblem}
                    />
                  )}
                  {step === 'results' && (
                    <RunSummary
                      chapterCount={deconstructBuild.input?.chapters.length ?? 0}
                      totalChars={deconstructBuild.input?.chapters.reduce((sum, chapter) => sum + chapter.content.length, 0) ?? 0}
                      focus={focus}
                      analysisDepth={analysisDepth}
                    />
                  )}
                </>
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
                <div className="flex items-center gap-2">
                  {tab === 'deconstruct' && step !== 'source' && (
                    <button
                      type="button"
                      onClick={() => setStep(step === 'goals' ? 'source' : 'goals')}
                      className="rounded border border-[var(--border-primary)] px-3 py-2 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      上一步
                    </button>
                  )}
                  {tab === 'deconstruct' && step !== 'results' ? (
                    <button
                      type="button"
                      onClick={() => setStep(step === 'source' ? 'goals' : 'results')}
                      className="rounded bg-[var(--accent-surface)] px-3 py-2 text-xs font-semibold text-[var(--accent-secondary)]"
                    >
                      下一步
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRun()}
                      disabled={!canSubmit}
                      className="inline-flex items-center gap-1 rounded bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)] disabled:opacity-40"
                    >
                      {running ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                      {running ? '分析中...' : tab === 'market' ? '开始扫榜分析' : '开始拆文分析'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <aside className="min-h-0 overflow-y-auto border-t border-[var(--border-primary)] bg-[var(--bg-primary)] p-4 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-[var(--text-primary)]">结构化结果</div>
                <div className="text-[11px] text-[var(--text-muted)]">结论需带证据、置信度和不可照搬提示。</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {referenceDraft != null && (
                  <button
                    type="button"
                    onClick={() => void handleCopyReferenceDraft()}
                    className="inline-flex items-center gap-1 rounded border border-[var(--border-primary)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <Copy size={12} />
                    复制
                  </button>
                )}
                {deconstructOutput && (
                  <button
                    type="button"
                    onClick={() => void handleSaveReport()}
                    disabled={savingReport || !lastDeconstructInput}
                    className="inline-flex items-center gap-1 rounded border border-[var(--border-primary)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-40"
                  >
                    {savingReport ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    保存
                  </button>
                )}
              </div>
            </div>

            {!result ? (
              <div className="rounded-lg border border-dashed border-[var(--border-primary)] p-4 text-xs leading-6 text-[var(--text-muted)]">
                拆文结果会按总览、结构、人物、情绪/留存、可迁移卡片和参考草稿分组展示。
              </div>
            ) : result.skillId === MARKET_SCAN_SKILL_ID ? (
              <MarketResult output={result.output as MarketScanOutput} />
            ) : (
              <DeconstructResult
                output={result.output as DeconstructOutput}
                activeTab={resultTab}
                selectedCraftCards={selectedCraftCards}
                onTabChange={setResultTab}
                onToggleCraftCard={toggleCraftCard}
              />
            )}

            {deconstructOutput && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleApplyReference()}
                  disabled={applyingReference || selectedCraftCards.length === 0}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold text-[var(--accent-contrast)] transition hover:bg-[var(--accent-secondary)] disabled:opacity-40"
                >
                  {applyingReference ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  应用为作品参考
                </button>
              </div>
            )}

            {tab === 'deconstruct' && (
              <ReportHistory reports={reports} onLoad={handleLoadReport} onDelete={handleDeleteReport} />
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

function TabButton(props: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-2 text-xs font-semibold transition ${
        props.active
          ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
          : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {props.icon}
      {props.label}
    </button>
  )
}

function StepNav({ step, onChange }: { step: StepId; onChange: (step: StepId) => void }) {
  return (
    <div className="grid gap-2 md:grid-cols-3">
      {STEP_OPTIONS.map((option, index) => {
        const Icon = option.icon
        const active = step === option.id
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
              active
                ? 'border-[var(--accent-border)] bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon size={14} />
            <span className="font-semibold">{index + 1}. {option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SourceCard(props: {
  sourceType: WebnovelSourceType
  sourceNote: string
  onSourceTypeChange: (value: WebnovelSourceType) => void
  onSourceNoteChange: (value: string) => void
}) {
  return (
    <section className="grid gap-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 md:grid-cols-[180px_minmax(0,1fr)]">
      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          数据类型
        </span>
        <select
          value={props.sourceType}
          onChange={(event) => props.onSourceTypeChange(event.target.value as WebnovelSourceType)}
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
          value={props.sourceNote}
          onChange={(event) => props.onSourceNoteChange(event.target.value)}
          placeholder="例如：作者授权导出的样本，仅用于本地拆文学习"
          className="field text-xs"
        />
      </label>
    </section>
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

function DeconstructSourceStep(props: {
  workTitle: string
  raw: string
  onWorkTitleChange: (value: string) => void
  onRawChange: (value: string) => void
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
      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          授权章节样本
        </span>
        <textarea
          value={props.raw}
          onChange={(event) => props.onRawChange(event.target.value)}
          placeholder={DECONSTRUCT_PLACEHOLDER}
          className="field min-h-[360px] resize-vertical text-xs leading-5"
        />
      </label>
    </section>
  )
}

function DeconstructGoalStep(props: {
  focus: DeconstructFocus[]
  analysisDepth: DeconstructAnalysisDepth
  platform: string
  genreTemplate: DeconstructGenreTemplate
  learningGoal: string
  targetPremise: string
  targetAudience: string
  targetProblem: string
  onToggleFocus: (id: DeconstructFocus) => void
  onAnalysisDepthChange: (value: DeconstructAnalysisDepth) => void
  onPlatformChange: (value: string) => void
  onGenreTemplateChange: (value: DeconstructGenreTemplate) => void
  onLearningGoalChange: (value: string) => void
  onTargetPremiseChange: (value: string) => void
  onTargetAudienceChange: (value: string) => void
  onTargetProblemChange: (value: string) => void
}) {
  return (
    <section className="space-y-4 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3">
      <div>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">拆解维度</div>
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

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            分析深度
          </span>
          <select
            value={props.analysisDepth}
            onChange={(event) => props.onAnalysisDepthChange(event.target.value as DeconstructAnalysisDepth)}
            className="field text-xs"
          >
            <option value="quick">quick</option>
            <option value="standard">standard</option>
            <option value="deep">deep</option>
          </select>
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            平台
          </span>
          <input
            value={props.platform}
            onChange={(event) => props.onPlatformChange(event.target.value)}
            placeholder="番茄 / 起点 / 晋江"
            className="field text-xs"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            题材模板
          </span>
          <select
            value={props.genreTemplate}
            onChange={(event) => props.onGenreTemplateChange(event.target.value as DeconstructGenreTemplate)}
            className="field text-xs"
          >
            <option value="urban">urban</option>
            <option value="xianxia">xianxia</option>
            <option value="mystery">mystery</option>
            <option value="romance">romance</option>
            <option value="other">other</option>
          </select>
        </label>
      </div>

      <label className="block text-xs">
        <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
          学习目标
        </span>
        <input
          value={props.learningGoal}
          onChange={(event) => props.onLearningGoalChange(event.target.value)}
          placeholder="例如：学习前三章钩子链和爽点兑现"
          className="field text-xs"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block text-xs">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            目标作品前提
          </span>
          <input
            value={props.targetPremise}
            onChange={(event) => props.onTargetPremiseChange(event.target.value)}
            placeholder="一句话 premise"
            className="field text-xs"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            目标读者
          </span>
          <input
            value={props.targetAudience}
            onChange={(event) => props.onTargetAudienceChange(event.target.value)}
            placeholder="例如：都市高武男频读者"
            className="field text-xs"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            当前问题
          </span>
          <input
            value={props.targetProblem}
            onChange={(event) => props.onTargetProblemChange(event.target.value)}
            placeholder="例如：开篇留存偏弱"
            className="field text-xs"
          />
        </label>
      </div>
    </section>
  )
}

function RunSummary(props: {
  chapterCount: number
  totalChars: number
  focus: DeconstructFocus[]
  analysisDepth: DeconstructAnalysisDepth
}) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 text-xs">
      <SummaryLine label="样本章数" value={String(props.chapterCount)} />
      <SummaryLine label="样本字符" value={String(props.totalChars)} />
      <SummaryLine label="分析深度" value={props.analysisDepth} />
      <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">已选维度</div>
        <div className="flex flex-wrap gap-1">
          {props.focus.map((item) => (
            <span
              key={item}
              className="rounded border border-[var(--border-primary)] px-2 py-1 text-[var(--text-secondary)]"
            >
              {dimensionLabel(item)}
            </span>
          ))}
        </div>
      </div>
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

function DeconstructResult(props: {
  output: DeconstructOutput
  activeTab: ResultTabId
  selectedCraftCards: number[]
  onTabChange: (tab: ResultTabId) => void
  onToggleCraftCard: (index: number) => void
}) {
  const craftCards = extractCraftCards(props.output)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {RESULT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => props.onTabChange(tab.id)}
            className={`rounded px-2 py-1 text-xs transition ${
              props.activeTab === tab.id
                ? 'bg-[var(--accent-surface)] text-[var(--accent-secondary)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {props.activeTab === 'overview' && <DeconstructOverview output={props.output} />}
      {props.activeTab === 'structure' && <StructureTab output={props.output} />}
      {props.activeTab === 'character' && <CharacterTab output={props.output} />}
      {props.activeTab === 'emotion' && <EmotionTab output={props.output} />}
      {props.activeTab === 'cards' && (
        <CraftCardsTab
          cards={craftCards}
          selected={props.selectedCraftCards}
          onToggle={props.onToggleCraftCard}
        />
      )}
      {props.activeTab === 'reference' && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-[11px] leading-5 text-[var(--text-primary)]">
          {formatReferenceDraft(props.output.referencePackDraft ?? props.output)}
        </pre>
      )}
    </div>
  )
}

function DeconstructOverview({ output }: { output: DeconstructOutput }) {
  return (
    <div className="space-y-3">
      <SummaryLine label="状态" value={output.status ?? 'legacy'} />
      <SummaryLine label="样本章数" value={String(output.sourceCoverage?.chapterCount ?? output.sampleSize ?? 0)} />
      <SummaryLine label="证据覆盖" value={output.qualityReport?.evidenceCoverage ?? 'unknown'} />
      {output.overview && (
        <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs">
          <div className="font-semibold text-[var(--text-primary)]">{output.overview.primaryHook}</div>
          <div className="mt-1 text-[var(--text-secondary)]">{output.overview.summary}</div>
          <TagLine items={output.overview.mainTropes} />
          <BulletList items={output.overview.learningTakeaways} />
        </section>
      )}
      <BulletList title="限制" items={output.sourceCoverage?.limitations ?? []} />
      <BulletList title="忠实度警告" items={output.qualityReport?.faithfulnessWarnings ?? []} />
      <BulletList title="不可照搬" items={output.qualityReport?.copyRiskWarnings ?? []} />
      <BulletList title="缺失信号" items={output.qualityReport?.missingSignals ?? []} />
    </div>
  )
}

function StructureTab({ output }: { output: DeconstructOutput }) {
  if (!output.structureMap) {
    return (
      <DeconstructLegacy output={output} />
    )
  }
  return (
    <div className="space-y-3">
      {output.structureMap.opening && (
        <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs">
          <div className="font-semibold text-[var(--text-primary)]">
            {output.structureMap.opening.hookType} · {output.structureMap.opening.strength}
          </div>
          <div className="mt-1 text-[var(--text-secondary)]">{output.structureMap.opening.suggestion}</div>
          <EvidenceList evidence={output.structureMap.opening.evidence} />
        </section>
      )}
      <ResultList
        title="章节结构"
        items={(output.structureMap.chapters ?? []).map((chapter) => ({
          title: `${chapter.label} · ${chapter.chapterId} · ${confidenceText(chapter.confidence)}`,
          body: [chapter.summary, chapter.conflict, chapter.turningPoint, chapter.endingHook].filter(Boolean).join('\n'),
          meta: evidenceInline(chapter.evidence)
        }))}
      />
      <ResultList
        title="钩子链"
        items={(output.structureMap.hookChain ?? []).map((hook) => ({
          title: `${hook.opened} · ${hook.status}`,
          body: [hook.paidOff, hook.newHook].filter(Boolean).join('\n'),
          meta: evidenceInline(hook.evidence)
        }))}
      />
    </div>
  )
}

function CharacterTab({ output }: { output: DeconstructOutput }) {
  return (
    <div className="space-y-3">
      <ResultList
        title="人物功能"
        items={(output.characterMap?.roles ?? []).map((role) => ({
          title: `${role.name} · ${confidenceText(role.confidence)}`,
          body: [role.function, role.agency, role.readerAttachment].filter(Boolean).join('\n'),
          meta: evidenceInline(role.evidence)
        }))}
      />
      <BulletList title="人物风险" items={output.characterMap?.risks ?? []} />
    </div>
  )
}

function EmotionTab({ output }: { output: DeconstructOutput }) {
  return (
    <div className="space-y-3">
      <ResultList
        title="情绪 / 留存"
        items={(output.emotionRetentionMap?.beats ?? []).map((beat) => ({
          title: `${beat.emotion} · ${beat.chapterId} · ${confidenceText(beat.confidence)}`,
          body: [beat.thrillPoint, beat.pressure, beat.retentionDevice].filter(Boolean).join('\n'),
          meta: evidenceInline(beat.evidence)
        }))}
      />
      <BulletList title="留存风险" items={output.emotionRetentionMap?.risks ?? []} />
    </div>
  )
}

function CraftCardsTab(props: {
  cards: DeconstructCraftCard[]
  selected: number[]
  onToggle: (index: number) => void
}) {
  if (props.cards.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--border-primary)] p-4 text-xs text-[var(--text-muted)]">暂无可迁移卡片。</div>
  }
  return (
    <div className="space-y-2">
      {props.cards.map((card, index) => {
        const checked = props.selected.includes(index)
        return (
          <section
            key={`${card.dimension}-${index}-${card.observation}`}
            className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs"
          >
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => props.onToggle(index)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1">
                <span className="font-semibold text-[var(--text-primary)]">
                  {dimensionLabel(card.dimension)} · {confidenceText(card.confidence)}
                </span>
                <span className="mt-1 block text-[var(--text-secondary)]">{card.observation}</span>
              </span>
            </label>
            <div className="mt-2 space-y-1 pl-5 text-[var(--text-secondary)]">
              <div>{card.whyItWorks}</div>
              <div>{card.adaptForOwnWork}</div>
              <div className="text-[var(--warning-primary)]">{card.doNotCopy}</div>
            </div>
            <EvidenceList evidence={card.evidence} />
          </section>
        )
      })}
    </div>
  )
}

function DeconstructLegacy({ output }: { output: DeconstructOutput }) {
  return (
    <div className="space-y-4">
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

function ReportHistory(props: {
  reports: AiDeconstructionReportSummary[]
  onLoad: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <section className="mt-5">
      <div className="mb-2 flex items-center gap-1 text-xs font-bold text-[var(--text-primary)]">
        <History size={13} />
        本地报告
      </div>
      {props.reports.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-primary)] p-3 text-xs text-[var(--text-muted)]">
          暂无已保存报告。
        </div>
      ) : (
        <div className="space-y-2">
          {props.reports.slice(0, 6).map((report) => (
            <div
              key={report.id}
              className="flex items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-2 text-xs"
            >
              <button
                type="button"
                onClick={() => void props.onLoad(report.id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="truncate font-semibold text-[var(--text-primary)]">{report.work_title}</div>
                <div className="truncate text-[11px] text-[var(--text-muted)]">
                  {report.created_at} · {report.focus.map(dimensionLabelSafe).join(' / ')}
                </div>
              </button>
              <button
                type="button"
                onClick={() => void props.onDelete(report.id)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--danger-primary)]"
                aria-label="删除报告"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
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

function EvidenceList({ evidence }: { evidence?: EvidenceItem[] }) {
  if (!evidence || evidence.length === 0) return null
  return (
    <div className="mt-2 space-y-1 border-t border-[var(--border-primary)] pt-2 text-[11px] text-[var(--text-muted)]">
      {evidence.slice(0, 3).map((item, index) => (
        <div key={`${item.chapterId ?? 'e'}-${index}`}>
          {item.chapterTitle || item.chapterId || '样本'} · {item.quote}
          {item.reason ? ` · ${item.reason}` : ''}
        </div>
      ))}
    </div>
  )
}

function BulletList({ title, items }: { title?: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <section className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 text-xs">
      {title && <div className="mb-1 font-semibold text-[var(--text-primary)]">{title}</div>}
      <ul className="list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function TagLine({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded border border-[var(--border-primary)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function evidenceInline(evidence?: EvidenceItem[]): string {
  if (!evidence || evidence.length === 0) return ''
  return evidence
    .slice(0, 2)
    .map((item) => `${item.chapterTitle || item.chapterId || '样本'}: ${item.quote}`)
    .join(' / ')
}

function confidenceText(confidence: number | undefined): string {
  if (typeof confidence !== 'number') return '置信度 unknown'
  return `置信度 ${Math.round(confidence * 100)}%`
}

function dimensionLabel(dimension: DeconstructFocus): string {
  const labels: Record<DeconstructFocus, string> = {
    hook: '开篇钩子',
    pacing: '章节节奏',
    trope: '题材套路',
    character: '人物功能',
    emotion: '情绪爽点',
    promise: '期待管理',
    retention: '留存风险',
    craft: '可迁移技法'
  }
  return labels[dimension]
}

function dimensionLabelSafe(dimension: string): string {
  return dimensionLabel(dimension as DeconstructFocus) || dimension
}
