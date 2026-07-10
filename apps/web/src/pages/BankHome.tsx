import type { WorkspaceSection } from '../components/BankWorkspace'
import type {
  BankStatistics,
  PracticeOrder,
  PracticeSession,
  PracticeSettings,
  PracticeSource,
  Question,
  QuestionBank,
} from '../types/quiz'
import { formatDate } from '../utils/date'
import { getPracticeSessionProgress } from '../utils/practice'

const sourceLabels: Record<PracticeSource, string> = {
  all: '全部题目',
  unpracticed: '未练习题',
  mistakes: '错题复习',
}

const orderLabels: Record<PracticeOrder, string> = {
  sequential: '顺序练习',
  random: '随机练习',
  'difficulty-ascending': '难度递增',
}

function formatPracticeLabel(settings: PracticeSettings) {
  return `${sourceLabels[settings.source]} · ${orderLabels[settings.order]}`
}

export interface BankHomeProps {
  section: Exclude<WorkspaceSection, 'mistakes'>
  bank: QuestionBank
  questions: Question[]
  statistics: BankStatistics
  settings: PracticeSettings
  availableQuestionCount: number
  activeSession?: PracticeSession
  onSettingsChange: (settings: PracticeSettings) => void
  onStartPractice: () => void
  onContinuePractice: () => void
  onOpenPractice: () => void
  onOpenMistakes: () => void
  onResetPractice: () => void
  onClearMistakes: () => void
  onClearCurrentBankData: () => void
}

export function BankHome({
  section,
  bank,
  questions,
  statistics,
  settings,
  availableQuestionCount,
  activeSession,
  onSettingsChange,
  onStartPractice,
  onContinuePractice,
  onOpenPractice,
  onOpenMistakes,
  onResetPractice,
  onClearMistakes,
  onClearCurrentBankData,
}: BankHomeProps) {
  const chapters = [
    ...new Set(
      questions
        .map((question) => question.chapter)
        .filter((chapter): chapter is string => Boolean(chapter)),
    ),
  ]
  const tags = [...new Set(questions.flatMap((question) => question.tags))]
  const learningProgress =
    statistics.totalQuestions === 0
      ? 0
      : Math.round(
          (statistics.practicedQuestions / statistics.totalQuestions) * 100,
        )
  const activeSessionProgress = activeSession
    ? getPracticeSessionProgress(activeSession)
    : undefined

  function updateSetting<Key extends keyof PracticeSettings>(
    key: Key,
    value: PracticeSettings[Key],
  ) {
    onSettingsChange({ ...settings, [key]: value })
  }

  if (section === 'overview') {
    return (
      <section className="page workspace-page">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">题库概览</p>
            <h1>{bank.name}</h1>
            <p>{bank.description}</p>
          </div>
        </div>

        {activeSession && activeSessionProgress && (
          <section className="resume-panel">
            <div>
              <span className="panel-kicker">未完成练习</span>
              <h2>{formatPracticeLabel(activeSession.settings)}</h2>
              <p>
                已完成 {activeSessionProgress.answeredCount} /{' '}
                {activeSessionProgress.totalCount} 题，进度已自动保存。
              </p>
            </div>
            <button type="button" onClick={onContinuePractice}>
              继续上次练习
            </button>
          </section>
        )}

        <section className="overview-progress" aria-label="题库学习进度">
          <div className="overview-progress-heading">
            <div>
              <h2>学习进度</h2>
              <p>
                已练习 {statistics.practicedQuestions} /{' '}
                {statistics.totalQuestions} 题
              </p>
            </div>
            <strong>{learningProgress}%</strong>
          </div>
          <div
            className="progress-track overview-progress-track"
            role="progressbar"
            aria-label="题库学习进度"
            aria-valuemin={0}
            aria-valuemax={statistics.totalQuestions}
            aria-valuenow={statistics.practicedQuestions}
          >
            <span style={{ width: `${learningProgress}%` }} />
          </div>
          <dl className="overview-facts">
            <div>
              <dt>累计正确率</dt>
              <dd>
                {statistics.attemptCount > 0
                  ? `${statistics.correctRate}%`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>待掌握错题</dt>
              <dd>{statistics.mistakeCount} 道</dd>
            </div>
            <div>
              <dt>最近练习</dt>
              <dd>
                {formatDate(statistics.latestPracticeAt, '暂无练习记录')}
              </dd>
            </div>
          </dl>
        </section>

        <section className="overview-actions" aria-label="题库操作">
          <div className="overview-action-item">
            <div>
              <h2>开始练习</h2>
              <p>
                {formatPracticeLabel(settings)}，当前有{' '}
                {availableQuestionCount} 道题可练习。
              </p>
            </div>
            <button type="button" onClick={onOpenPractice}>
              设置练习范围
            </button>
          </div>

          <div className="overview-action-item">
            <div>
              <h2>错题本</h2>
              <p>
                {statistics.mistakeCount > 0
                  ? `有 ${statistics.mistakeCount} 道错题等待重新掌握。`
                  : '目前没有待掌握错题。'}
              </p>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={onOpenMistakes}
            >
              打开错题本
            </button>
          </div>
        </section>
      </section>
    )
  }

  if (section === 'practice') {
    return (
      <section className="page workspace-page">
        <div className="workspace-heading compact-heading">
          <div>
            <p className="eyebrow">开始练习</p>
            <h1>设置本次练习</h1>
            <p>选择范围与出题顺序，设置会自动保存到当前题库。</p>
          </div>
        </div>

        <section className="settings-panel primary-panel">
          <div className="section-heading section-heading-inline">
            <div>
              <h2>练习范围</h2>
              <p>当前条件下有 {availableQuestionCount} 道可练习题。</p>
            </div>
            <span className="question-count-badge">
              {availableQuestionCount} 题
            </span>
          </div>

          <div className="settings-grid">
            <label>
              题目来源
              <select
                value={settings.source}
                onChange={(event) =>
                  updateSetting(
                    'source',
                    event.target.value as PracticeSource,
                  )
                }
              >
                {Object.entries(sourceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              出题顺序
              <select
                value={settings.order}
                onChange={(event) =>
                  updateSetting(
                    'order',
                    event.target.value as PracticeOrder,
                  )
                }
              >
                {Object.entries(orderLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              章节
              <select
                value={settings.chapter}
                onChange={(event) =>
                  updateSetting('chapter', event.target.value)
                }
              >
                <option value="">全部章节</option>
                {chapters.map((chapter) => (
                  <option key={chapter} value={chapter}>
                    {chapter}
                  </option>
                ))}
              </select>
            </label>

            <label>
              标签
              <select
                value={settings.tag}
                onChange={(event) => updateSetting('tag', event.target.value)}
              >
                <option value="">全部标签</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="start-practice-row">
            <div>
              <strong>{formatPracticeLabel(settings)}</strong>
              <span> · {availableQuestionCount} 道题</span>
            </div>
            <button
              type="button"
              disabled={availableQuestionCount === 0}
              onClick={onStartPractice}
            >
              开始新练习
            </button>
          </div>
        </section>

        {activeSession && activeSessionProgress && (
          <section className="existing-session-note">
            <div>
              <strong>已有未完成练习</strong>
              <span>
                {activeSessionProgress.answeredCount} /{' '}
                {activeSessionProgress.totalCount} 题
              </span>
            </div>
            <button
              className="secondary-button"
              type="button"
              onClick={onContinuePractice}
            >
              继续原练习
            </button>
          </section>
        )}
      </section>
    )
  }

  return (
    <section className="page workspace-page">
      <div className="workspace-heading compact-heading">
        <div>
          <p className="eyebrow">设置与数据</p>
          <h1>本地数据管理</h1>
          <p>这里只管理当前题库的数据，其他题库不会受到影响。</p>
        </div>
      </div>

      <section className="data-panel">
        <div className="section-heading">
          <h2>当前题库数据</h2>
          <p>这些操作只影响“{bank.name}”，不会删除示例题库内容。</p>
        </div>
        <dl className="data-summary">
          <div>
            <dt>累计作答</dt>
            <dd>{statistics.attemptCount} 次</dd>
          </div>
          <div>
            <dt>错题记录</dt>
            <dd>
              {statistics.mistakeCount + statistics.masteredMistakeCount} 道
            </dd>
          </div>
          <div>
            <dt>未完成练习</dt>
            <dd>{activeSession ? '1 组' : '无'}</dd>
          </div>
        </dl>
        <div className="action-row">
          <button
            className="secondary-button"
            type="button"
            onClick={onResetPractice}
          >
            重置练习记录
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onClearMistakes}
          >
            清空错题记录
          </button>
        </div>
      </section>

      <section className="danger-zone">
        <div>
          <h2>清空当前题库</h2>
          <p>
            删除“{bank.name}”的全部学习数据和练习设置，其他题库及外观偏好不受影响。
          </p>
        </div>
        <button
          className="danger-button"
          type="button"
          onClick={onClearCurrentBankData}
        >
          清空当前题库数据
        </button>
      </section>
    </section>
  )
}
