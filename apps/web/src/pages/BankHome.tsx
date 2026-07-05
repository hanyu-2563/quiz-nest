import type {
  BankStatistics,
  PracticeMode,
  PracticeSession,
  PracticeSettings,
  Question,
  QuestionBank,
} from '../types/quiz'

const modeLabels: Record<PracticeMode, string> = {
  sequential: '顺序练习',
  random: '随机练习',
  'difficulty-ascending': '难度递增',
  'mistake-review': '错题复习',
}

export interface BankHomeProps {
  bank: QuestionBank
  questions: Question[]
  statistics: BankStatistics
  settings: PracticeSettings
  availableQuestionCount: number
  activeSession?: PracticeSession
  onBack: () => void
  onSettingsChange: (settings: PracticeSettings) => void
  onStartPractice: () => void
  onContinuePractice: () => void
  onOpenMistakes: () => void
  onResetPractice: () => void
  onClearMistakes: () => void
  onClearAllData: () => void
}

function formatDateTime(value?: string) {
  if (!value) {
    return '暂无'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function BankHome({
  bank,
  questions,
  statistics,
  settings,
  availableQuestionCount,
  activeSession,
  onBack,
  onSettingsChange,
  onStartPractice,
  onContinuePractice,
  onOpenMistakes,
  onResetPractice,
  onClearMistakes,
  onClearAllData,
}: BankHomeProps) {
  const chapters = [
    ...new Set(
      questions
        .map((question) => question.chapter)
        .filter((chapter): chapter is string => Boolean(chapter)),
    ),
  ]
  const tags = [
    ...new Set(questions.flatMap((question) => question.tags)),
  ]

  function updateSetting<Key extends keyof PracticeSettings>(
    key: Key,
    value: PracticeSettings[Key],
  ) {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={onBack}>
        返回题库大厅
      </button>

      <div className="page-heading">
        <p className="eyebrow">当前题库</p>
        <h1>{bank.name}</h1>
        <p>{bank.description}</p>
      </div>

      <div className="statistics-grid" aria-label="题库统计">
        <div>
          <strong>{statistics.totalQuestions}</strong>
          <span>总题数</span>
        </div>
        <div>
          <strong>{statistics.practicedQuestions}</strong>
          <span>已练习题数</span>
        </div>
        <div>
          <strong>{statistics.mistakeCount}</strong>
          <span>待掌握错题</span>
        </div>
        <div>
          <strong>{statistics.correctRate}%</strong>
          <span>正确率</span>
        </div>
        <div className="wide-stat">
          <strong>{formatDateTime(statistics.latestPracticeAt)}</strong>
          <span>最近练习时间</span>
        </div>
      </div>

      {activeSession && (
        <section className="resume-panel">
          <div>
            <h2>有一组练习尚未完成</h2>
            <p>
              {modeLabels[activeSession.mode]}，已完成{' '}
              {activeSession.answeredCount} / {activeSession.totalCount} 题
            </p>
          </div>
          <button type="button" onClick={onContinuePractice}>
            继续上次练习
          </button>
        </section>
      )}

      <section className="settings-panel">
        <div className="section-heading">
          <h2>练习设置</h2>
          <p>当前条件下有 {availableQuestionCount} 道可练习题。</p>
        </div>

        <div className="settings-grid">
          <label>
            练习模式
            <select
              value={settings.mode}
              onChange={(event) =>
                updateSetting(
                  'mode',
                  event.target.value as PracticeMode,
                )
              }
            >
              {Object.entries(modeLabels).map(([value, label]) => (
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
              onChange={(event) =>
                updateSetting('tag', event.target.value)
              }
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

        <div className="filter-options">
          <label>
            <input
              type="checkbox"
              checked={settings.onlyUnpracticed}
              onChange={(event) =>
                updateSetting('onlyUnpracticed', event.target.checked)
              }
            />
            只练未练习题
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.onlyMistakes}
              onChange={(event) =>
                updateSetting('onlyMistakes', event.target.checked)
              }
            />
            只练未掌握错题
          </label>
        </div>

        <div className="action-row">
          <button
            type="button"
            disabled={availableQuestionCount === 0}
            onClick={onStartPractice}
          >
            开始新练习
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onOpenMistakes}
          >
            错题复习
          </button>
        </div>
      </section>

      <section className="data-panel">
        <div className="section-heading">
          <h2>本地数据管理</h2>
          <p>
            已掌握错题 {statistics.masteredMistakeCount} 道，累计作答{' '}
            {statistics.attemptCount} 次。操作不会删除示例题库。
          </p>
        </div>
        <div className="action-row">
          <button
            className="secondary-button"
            type="button"
            onClick={onResetPractice}
          >
            重置当前题库练习记录
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={onClearMistakes}
          >
            清空当前题库错题
          </button>
          <button
            className="danger-button"
            type="button"
            onClick={onClearAllData}
          >
            清空全部本地数据
          </button>
        </div>
      </section>
    </section>
  )
}
