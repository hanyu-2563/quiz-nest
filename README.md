# QuizNest

[English](#english) | [中文](#中文)

---

## English

QuizNest is a cross-platform question bank and mistake-review system. It follows a question-bank-first workflow: users select a question bank from the home page, then practice questions, review mistakes, view statistics, import or export data, and manage settings within that bank.

### Core Features

- **Question bank management:** organize questions into independent, reusable banks.
- **Practice workflow:** select a bank and complete questions in a focused flow.
- **Mistake review:** collect incorrect answers and schedule targeted reviews.
- **Offline first:** keep core question-bank and review features available without a network connection.
- **Multi-device synchronization:** keep question banks and progress consistent across devices.
- **Import and export:** move question-bank data in and out through supported formats.
- **Statistics and analytics:** understand practice progress, accuracy, and review outcomes.

### Project Structure

- `apps/` contains user-facing applications and services:
  - `web/`: Web application.
  - `mobile/`: future mobile application.
  - `api/`: future backend API service.
- `packages/` contains reusable domain modules:
  - `core/`: question banks, practice, mistakes, and review scheduling.
  - `shared/`: shared types, constants, and utilities.
  - `import-export/`: question-bank import and export logic.
- `samples/question-banks/` contains sample question banks without real personal data.
- `scripts/` contains project helper scripts.

---

## 中文

QuizNest 是一个跨平台题库与错题复习系统。产品采用“题库优先”的流程：用户先在首页选择题库，再进入该题库的刷题、错题复习、统计、导入导出和设置等功能。

### 核心功能

- **题库管理：** 将题目组织为相互独立、可复用的题库。
- **刷题流程：** 选择题库后进入专注的答题流程。
- **错题复习：** 收集错题并安排针对性复习。
- **离线优先：** 无网络时仍可使用核心题库和复习功能。
- **多设备同步：** 在不同设备间保持题库和进度一致。
- **导入导出：** 通过受支持的格式迁移题库数据。
- **统计分析：** 查看刷题进度、正确率和复习效果。

### 项目结构

- `apps/` 存放面向用户的应用与服务：
  - `web/`：Web 应用。
  - `mobile/`：未来移动端应用。
  - `api/`：未来后端 API 服务。
- `packages/` 存放可复用的领域模块：
  - `core/`：题库、刷题、错题和复习调度等核心业务逻辑。
  - `shared/`：共享类型、常量和工具函数。
  - `import-export/`：题库导入导出逻辑。
- `samples/question-banks/` 存放不含真实个人数据的示例题库。
- `scripts/` 存放项目辅助脚本。

---

## License

Currently not licensed.
