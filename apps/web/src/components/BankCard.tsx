import type {
  BankStatistics,
  PracticeSession,
  QuestionBank,
} from '../types/quiz'
import { formatDate } from '../utils/date'

export interface BankCardProps {
  bank: QuestionBank
  statistics: BankStatistics
  activeSession?: PracticeSession
  onSelect: (bankId: string) => void
}

export function BankCard({
  bank,
  statistics,
  activeSession,
  onSelect,
}: BankCardProps) {
  const progress =
    statistics.totalQuestions === 0
      ? 0
      : Math.round(
          (statistics.practicedQuestions / statistics.totalQuestions) * 100,
        )

  return (
    <article className="bank-card">
      <div className="bank-card-heading">
        <div>
          <div className="bank-tags" aria-label="题库标签">
            {bank.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <h2>{bank.name}</h2>
        </div>
        {activeSession && <span className="session-badge">练习中</span>}
      </div>

      <p className="bank-description">{bank.description}</p>

      <div className="bank-progress-row">
        <span>练习进度</span>
        <strong>
          {statistics.practicedQuestions} / {statistics.totalQuestions}
        </strong>
      </div>
      <div className="progress-track" aria-label={`练习进度 ${progress}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <dl className="bank-metrics">
        <div>
          <dt>正确率</dt>
          <dd>{statistics.attemptCount ? `${statistics.correctRate}%` : '—'}</dd>
        </div>
        <div>
          <dt>待复习错题</dt>
          <dd>{statistics.mistakeCount}</dd>
        </div>
        <div>
          <dt>最近练习</dt>
          <dd>
            {formatDate(statistics.latestPracticeAt, '尚未练习', {
              month: 'numeric',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </div>
      </dl>

      <div className="bank-card-footer">
        <span>{bank.questionCount} 道题</span>
        <button type="button" onClick={() => onSelect(bank.id)}>
          {activeSession ? '继续学习' : '进入题库'}
        </button>
      </div>
    </article>
  )
}
