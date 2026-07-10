import type { BankStatistics, QuestionBank } from '../types/quiz'

export type WorkspaceSection =
  | 'overview'
  | 'practice'
  | 'mistakes'
  | 'data'

export interface BankWorkspaceProps {
  bank: QuestionBank
  statistics: BankStatistics
  activeSection: WorkspaceSection
  onBack: () => void
  onNavigate: (section: WorkspaceSection) => void
  children: React.ReactNode
}

const navigationItems: Array<{
  id: WorkspaceSection
  label: string
  description: string
}> = [
  { id: 'overview', label: '概览', description: '进度与最近记录' },
  { id: 'practice', label: '开始练习', description: '范围与练习模式' },
  { id: 'mistakes', label: '错题本', description: '查看与复习错题' },
  { id: 'data', label: '设置与数据', description: '本地记录管理' },
]

export function BankWorkspace({
  bank,
  statistics,
  activeSection,
  onBack,
  onNavigate,
  children,
}: BankWorkspaceProps) {
  const progress =
    statistics.totalQuestions === 0
      ? 0
      : Math.round(
          (statistics.practicedQuestions / statistics.totalQuestions) * 100,
        )

  return (
    <div className="bank-workspace">
      <aside className="workspace-sidebar">
        <button className="workspace-back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span>
          全部题库
        </button>

        <div className="workspace-bank-summary">
          <span className="workspace-label">当前题库</span>
          <h2>{bank.name}</h2>
          <p>{bank.questionCount} 道单选题</p>
          <div className="progress-track" aria-label={`练习进度 ${progress}%`}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="workspace-progress-copy">
            <span>已练 {statistics.practicedQuestions} 题</span>
            <strong>{progress}%</strong>
          </div>
        </div>

        <nav className="workspace-nav" aria-label="题库工作区导航">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              className={activeSection === item.id ? 'active' : undefined}
              type="button"
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="workspace-nav-copy">
                <span>{item.label}</span>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </nav>

        <p className="workspace-storage-note">
          练习记录仅保存在当前浏览器
        </p>
      </aside>

      <div className="workspace-main">{children}</div>
    </div>
  )
}
