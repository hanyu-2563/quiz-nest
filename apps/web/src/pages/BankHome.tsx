import type { QuestionBank } from '../types/quiz'

export interface BankHomeProps {
  bank: QuestionBank
  onBack: () => void
  onStartPractice: () => void
}

export function BankHome({
  bank,
  onBack,
  onStartPractice,
}: BankHomeProps) {
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

      <div className="bank-summary">
        <p>
          当前共有 <strong>{bank.questionCount}</strong> 道题
        </p>
        <p>{bank.tags.join(' · ')}</p>
      </div>

      <button type="button" onClick={onStartPractice}>
        开始刷题
      </button>
    </section>
  )
}
