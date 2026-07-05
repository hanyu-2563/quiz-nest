import type {
  MistakeRecord,
  Question,
  QuestionBank,
} from '../types/quiz'

export interface MistakePageProps {
  bank: QuestionBank
  questions: Question[]
  mistakes: MistakeRecord[]
  onBack: () => void
  onStartReview: () => void
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function summarizeQuestion(content: string) {
  return content.length > 72 ? `${content.slice(0, 72)}…` : content
}

export function MistakePage({
  bank,
  questions,
  mistakes,
  onBack,
  onStartReview,
}: MistakePageProps) {
  const mistakeItems = [...mistakes]
    .sort((left, right) =>
      right.lastMistakenAt.localeCompare(left.lastMistakenAt),
    )
    .map((mistake) => ({
      mistake,
      question: questions.find(
        (question) => question.id === mistake.questionId,
      ),
    }))
    .filter(
      (
        item,
      ): item is { mistake: MistakeRecord; question: Question } =>
        Boolean(item.question),
    )
  const activeMistakeCount = mistakes.filter(
    (mistake) => !mistake.masteredAt,
  ).length

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={onBack}>
        返回题库主页
      </button>

      <div className="page-heading">
        <p className="eyebrow">错题记录</p>
        <h1>{bank.name}</h1>
        <p>
          共 {mistakeItems.length} 道错题，其中 {activeMistakeCount}{' '}
          道尚未掌握。
        </p>
      </div>

      <button
        type="button"
        disabled={activeMistakeCount === 0}
        onClick={onStartReview}
      >
        开始错题复习
      </button>

      {mistakeItems.length === 0 ? (
        <div className="empty-state">
          <h2>还没有错题</h2>
          <p>答错的题目会自动出现在这里。</p>
        </div>
      ) : (
        <div className="mistake-list">
          {mistakeItems.map(({ mistake, question }) => (
            <article className="mistake-item" key={mistake.id}>
              <div>
                <span
                  className={
                    mistake.masteredAt
                      ? 'status-badge mastered'
                      : 'status-badge pending'
                  }
                >
                  {mistake.masteredAt ? '已掌握' : '待复习'}
                </span>
                <h2>{summarizeQuestion(question.content)}</h2>
              </div>
              <dl>
                <div>
                  <dt>错误次数</dt>
                  <dd>{mistake.mistakeCount}</dd>
                </div>
                <div>
                  <dt>最近错误</dt>
                  <dd>{formatDateTime(mistake.lastMistakenAt)}</dd>
                </div>
                <div>
                  <dt>章节</dt>
                  <dd>{question.chapter ?? '未分类'}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
