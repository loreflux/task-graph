# 可视化任务依赖系统（Task Graph）AI 开发总提示词

> 用途：可直接提供给 Cursor、Claude Code、Codex、Gemini CLI 等 AI 编程助手，作为产品设计、架构设计与工程实现的总提示词。
>
> 技术版本原则：实现时不要机械锁死本文示例的小版本号，应优先采用官方当前稳定版；如升级存在 breaking change，必须说明影响并选择稳定、可维护的方案。本文按 2026 年当前生态进行设计。

---

# 1. 角色与总目标

你是一名资深产品架构师、全栈工程师、交互设计师、数据库工程师和图算法工程师。

请协助开发一个现代化的“可视化任务依赖管理系统（Task Graph）”。

它不是普通 Todo，不是单纯的项目管理软件，也不是传统思维导图。

核心理念：

> 每一个任务都是一个可独立管理的节点；任务可以拥有父子拆解关系，也可以拥有独立的前置依赖关系；所有依赖关系组成可编辑的 DAG；用户既可以通过列表管理任务，也可以通过树和图理解任务结构、阻塞关系、解锁关系和项目关键路径。

最终目标：

> 让用户知道“我要做什么”“为什么现在做不了”“完成它之后会解锁什么”“整个项目真正的关键任务是什么”，并能快速操作一整段任务范围。

---

# 2. 最重要的领域模型

必须严格区分以下关系：

```text
Task = 任务节点

Parent-Child = 任务拆解关系
Dependency = 前置依赖关系
Task Graph = 任务及其依赖关系形成的有向图
Project = 一组任务的业务容器
```

绝不能把父子关系和依赖关系混为一谈。

例如：

```text
毕业设计
├── 需求分析
├── 系统设计
├── 后端开发
├── 前端开发
└── 测试
```

这是 Parent-Child。

同时：

```text
需求分析 → 系统设计
系统设计 → 后端开发
系统设计 → 前端开发
后端开发 → 联调
前端开发 → 联调
联调 → 测试
```

这是 Dependency。

同一个任务可以既是另一个任务的子任务，又同时拥有来自其他任务的外部依赖。

---

# 3. 依赖关系必须是 DAG

依赖关系采用 Directed Acyclic Graph（有向无环图）。

禁止：

```text
A → B → C → A
```

创建或修改依赖时必须实时检查：

- 自依赖
- 直接循环依赖
- 间接循环依赖
- 跨项目非法依赖（如产品策略禁止时）
- 删除节点后产生的孤立关系

发现循环必须拒绝操作，并明确展示形成循环的路径，例如：

```text
无法建立依赖关系。

A → B → C → A

该操作会形成循环依赖。
```

图算法不得散落在 UI 组件中，必须沉淀到领域服务/图服务。

---

# 4. 任务状态模型

任务状态不要只设计 TODO / DONE。

建议至少支持：

```text
INBOX
TODO
IN_PROGRESS
BLOCKED
DONE
ARCHIVED
```

语义：

- INBOX：刚记录、尚未整理
- TODO：已整理、等待执行
- IN_PROGRESS：正在执行
- BLOCKED：被未完成的前置任务阻塞
- DONE：完成
- ARCHIVED：归档，不在默认工作视图显示

状态与依赖关系必须联动，但不要把“BLOCKED”简单当作一个永远人工设置的字段。可以设计为持久状态 + 派生阻塞状态，最终架构必须明确哪些字段是 Source of Truth、哪些是计算结果。

---

# 5. 自定义开始时间与结束时间

这是核心能力，不允许只做一个 dueDate。

每个任务应支持独立的时间计划：

```text
startAt
endAt
```

同时可以支持日期级与时间级粒度，例如：

```text
2026-09-10
2026-09-10 09:30
2026-09-10 09:30 ~ 2026-09-10 11:00
```

必须考虑：

- 开始日期/时间可选
- 结束日期/时间可选
- 可以只设置开始时间
- 可以只设置结束时间
- 可以设置完整时间区间
- 时间区间合法性校验：endAt >= startAt
- 时区处理
- 用户本地时区显示
- 服务端统一时间存储策略
- 全天任务
- 精确到分钟的时间
- 自定义日期格式
- 任务跨天
- 时间冲突提示
- 与依赖关系联动

建议同时保留：

```text
estimatedDuration
actualDuration
```

其中：

- estimatedDuration：预计耗时
- actualDuration：实际耗时

“时间范围”和“耗时”是两个不同概念，不允许混为一谈。

例如：

```text
开始：2026-09-10 09:00
结束：2026-09-10 11:00
预计耗时：90 分钟
```

表示任务占据 2 小时时间窗口，但预计实际工作 90 分钟。

---

# 6. 时间与依赖关系联动

如果：

```text
A → B
```

且 A：

```text
09:00 ~ 10:00
```

B：

```text
09:30 ~ 11:00
```

系统应提示潜在冲突，因为 B 在 A 完成前已经开始。

不要强制所有冲突都阻止用户保存，可以提供：

```text
时间冲突
时间逻辑风险
依赖关系不满足
```

并允许用户确认继续。

如果 A 的结束时间被推迟，应能够提示：

```text
A 的结束时间变更可能影响：
B
C
D

这些任务存在依赖关系。
```

未来可以增加自动顺延：

```text
保持依赖安全
```

例如 A 延迟 2 小时，B/C 自动向后调整，但必须先提供预览并让用户确认，不能无提示修改大量任务。

---

# 7. 时间冲突与范围提示

当用户设置一个任务的时间时，如果与其他任务存在明显冲突，可显示：

```text
时间冲突

09:30 ~ 10:30 已安排：系统设计
当前任务：数据库设计
```

同时区分：

```text
资源冲突：只是时间重叠
依赖冲突：前置任务尚未完成
逻辑冲突：结束时间早于开始时间
```

不要默认假设所有任务之间互斥，因为用户可能允许并行执行。

---

# 8. 完成任务规则

必须支持多种完成语义。

## 8.1 仅完成当前任务

只修改当前节点状态。

## 8.2 完成当前任务及所有子任务

递归处理 Parent-Child 子树。

## 8.3 完成当前任务及全部前置依赖

计算 Dependency Ancestor Closure。

## 8.4 批量完成

对用户选中的多个节点进行事务性处理。

所有批量操作都必须明确显示影响范围：

```text
即将完成 18 个任务
```

---

# 9. “前置任务自动完成”必须谨慎设计

不要无条件实现：

```text
完成 B → 自动把 A 也完成
```

因为“完成后置任务”不证明“前置任务真的完成”。

推荐提供：

```text
完成当前任务
完成当前任务及子任务
完成当前任务及全部前置依赖
```

以及可配置策略：

### 严格模式

完成任务时不自动修改任何前置任务。

### 建议模式

发现未完成前置任务时弹出：

```text
当前任务有 3 个前置任务未完成。

是否同时完成这些任务？
```

### 自动模式

允许完成依赖闭包，但必须保留可撤销操作历史。

默认使用建议模式。

---

# 10. “为什么不能做？”能力

这是产品的核心差异化功能。

用户打开被阻塞任务时，应直接看到：

```text
为什么不能开始？

当前任务：系统部署
状态：BLOCKED

原因：
├─ Docker 镜像构建 未完成
└─ 服务器配置 未完成
```

支持：

```text
Why Blocked?
```

并列出直接和间接阻塞链。

例如：

```text
部署
↓
联调
↓
后端开发
↓
数据库设计
```

系统告诉用户真正的阻塞源。

---

# 11. “完成它会解锁什么？”能力

任何任务都可以查看后置影响：

```text
✓ 数据库设计

将解除：
→ 后端开发
→ API 设计
→ 数据迁移
```

并显示：

```text
直接解锁：3 个任务
间接解锁：8 个任务
```

这是 Task Graph 与普通 Todo 的核心差异之一。

---

# 12. 关键路径 Critical Path

支持对 Project 或任务子图计算关键路径。

例如：

```text
需求分析
↓
系统设计
↓
后端开发
↓
联调
↓
测试
↓
上线
```

系统识别：

```text
Critical Path
预计总时长：18 天
```

如果任务拥有开始/结束时间，则关键路径可以结合时间窗口进行分析。

优先高亮真正影响项目整体进度的任务，而不是单纯把所有未完成任务都强调。

---

# 13. 任务拆解

任何任务都可以无限递归拆解。

例如：

```text
开发个人网站
├── 页面设计
├── 前端开发
│   ├── React
│   ├── 路由
│   └── 页面
├── 后端开发
├── 数据库
└── 部署
```

需要支持：

- 快速创建子任务
- 批量创建子任务
- 拖拽调整层级
- 移动到其他父任务
- 从父任务移除
- 跨项目移动
- 子树复制
- 子树归档
- 子树删除

---

# 14. 智能范围选择

右键或操作菜单提供：

```text
选择当前任务
选择所有子任务
选择整个任务树
选择所有前置任务
选择所有后置任务
选择整个依赖链
选择所有直接阻塞任务
选择所有被当前任务解锁的任务
选择同级任务
选择整个项目
```

选中范围后支持：

```text
完成
取消完成
归档
删除
修改优先级
修改标签
修改时间
移动到项目
```

批量操作必须支持撤销。

---

# 15. 任务模板

支持将任务树/任务图保存为模板。

例如：

```text
毕业设计模板
├── 资料收集
├── 需求分析
├── 系统设计
├── 数据库设计
├── 后端开发
├── 前端开发
├── 联调
├── 测试
├── 论文初稿
├── 修改
├── 查重
└── 答辩
```

模板创建时可保留：

- 子任务结构
- 依赖关系
- 默认标签
- 默认优先级
- 默认耗时
- 相对时间偏移

模板实例化后应生成新的任务 ID，不能直接复用原任务。

---

# 16. 关系解释

图上的边不能只是：

```text
A → B
```

任务详情中应能够解释：

```text
A 是 B 的前置任务
```

未来可以支持：

```text
依赖原因
```

例如：

```text
后端开发依赖数据库设计
原因：需要使用数据库结构生成 API。
```

为 AI 能力预留关系说明字段，但第一版不必强制使用 AI 自动生成。

---

# 17. 三种核心视图

## List View

用于：

- 快速处理
- 搜索
- 排序
- 筛选
- 批量操作

支持显示：

```text
状态
优先级
开始时间
结束时间
预计耗时
项目
标签
前置数量
后置数量
```

## Tree View

展示 Parent-Child。

适合任务拆解。

## Graph View

展示完整 DAG。

适合：

- 前置依赖
- 阻塞分析
- 解锁分析
- 关键路径
- 任务关系理解

三种视图必须共享同一领域模型，不能分别维护三套任务数据。

---

# 18. Graph View

推荐使用当前稳定版 React Flow 实现任务图。

节点至少显示：

```text
任务名称
状态
优先级
开始时间
结束时间
依赖数量
子任务数量
```

支持：

- 拖动节点
- 缩放
- 平移
- 框选
- 多选
- 创建节点
- 创建边
- 删除边
- 快速编辑
- 双击打开详情
- 自动布局
- MiniMap
- Fit View
- 聚焦当前节点
- 聚焦依赖链
- 聚焦子树
- 隐藏已完成
- 隐藏归档
- 显示关键路径
- 显示阻塞链
- 显示解锁范围

---

# 19. 图布局

至少支持：

```text
Tree Layout
DAG / Hierarchical Layout
```

未来可扩展：

```text
Timeline Layout
Mindmap-like Layout
Critical Path Layout
```

布局算法必须与业务图算法解耦。

当图规模较大时，不允许每次 render 都全量重新布局。

---

# 20. 快速创建任务

任务创建必须足够快。

支持：

```text
输入任务标题 → Enter
```

创建成功后可以继续输入下一个任务。

支持全局 Command Palette：

```text
创建任务
搜索任务
跳转任务
打开任务图
完成任务
归档任务
删除任务
切换视图
```

---

# 21. 任务详情 Drawer

点击节点后从右侧打开详情。

至少包括：

```text
标题
描述
状态
优先级
开始时间
结束时间
预计耗时
实际耗时
项目
标签
父任务
子任务
前置任务
后置任务
历史记录
```

时间编辑要支持快速输入：

```text
今天 18:00
明天 09:30
本周五
2026-09-20 14:00
```

但解析与保存必须最终标准化为可靠的时间类型。

---

# 22. 日历与时间视图预留

第一版可以不做复杂 Calendar，但模型必须为以下能力预留：

```text
Day
Week
Month
Timeline
Gantt
```

未来用户可以看到：

```text
09:00  任务 A
10:30  任务 B
13:00  任务 C
```

时间视图的数据源必须来自 Task 的时间字段，而不是额外复制一套时间数据。

---

# 23. 项目 Project

任务可以属于 Project。

例如：

```text
Project: 毕业设计
Project: 实验室系统
Project: 学习 React
```

任务也可以存在于 Inbox。

Project 页面需要提供：

```text
任务完成率
阻塞任务
关键路径
最近变更
逾期任务
时间线
任务图
```

---

# 24. Inbox

快速捕获暂时不知道如何分类的任务：

```text
联系老师
购买硬盘
研究 React Flow
准备会议材料
```

之后再整理：

```text
Project
Tag
Priority
Start Time
End Time
Dependency
```

---

# 25. 首页 / Today

首页默认展示：

```text
Today
```

至少包含：

```text
今日任务
逾期任务
进行中
阻塞任务
即将到期
```

同时可以显示：

```text
今天计划工作时长
今天已完成时长
本周完成数
当前阻塞任务
```

不做无意义的大屏数据。

---

# 26. 搜索与过滤

全局搜索支持：

```text
标题
描述
标签
项目
状态
```

支持过滤：

```text
Project
Status
Priority
Tag
Start Time
End Time
Due / Overdue
Blocked
Archived
```

未来可以升级到全文搜索与语义搜索。

---

# 27. 归档与回收站

Archive 和 Delete 必须分离。

Archive：

> 保留数据，只是不参与默认工作视图。

Delete：

> 进入回收站。

删除默认使用 Soft Delete。

回收站支持：

```text
恢复
永久删除
清空回收站
```

删除任务时必须明确处理其 Parent-Child 与 Dependency 关系。

推荐默认行为：删除前展示受影响关系数量，并允许用户选择关系清理策略。

---

# 28. Undo / Redo

必须支持：

```text
Ctrl / Cmd + Z
Ctrl / Cmd + Shift + Z
```

能够撤销：

- 删除任务
- 创建任务
- 修改任务
- 创建依赖
- 删除依赖
- 改变父子关系
- 修改时间
- 批量完成
- 批量归档
- 批量删除

批量操作应该作为一个可整体撤销的 command。

---

# 29. 操作历史

记录：

```text
创建
修改
完成
取消完成
建立依赖
删除依赖
移动
归档
删除
恢复
批量操作
```

例如：

```text
09:32
将“系统设计”设置为完成。

09:33
建立“系统设计 → 后端开发”的依赖。

09:40
将“前端开发”移动到“毕业设计”下。
```

历史用于审计和 Undo/Redo，但不能因为加入日志而让领域逻辑耦合到 UI。

---

# 30. 图算法能力

核心服务至少实现并测试：

```text
findAncestors(taskId)
findDescendants(taskId)
findDependencies(taskId)
findDependents(taskId)
detectCycle(sourceTaskId, targetTaskId)
getDependencyClosure(taskId)
getBlockedTasks(projectId)
getUnlockableTasks(taskId)
getCriticalPath(projectId)
topologicalSort(projectId)
```

所有算法需要考虑：

- 空图
- 单节点
- 深层图
- 大型图
- 多分支
- 汇聚节点
- 跨项目关系（如允许）
- 已归档任务
- 已删除任务

---

# 31. 时间算法

至少预留：

```text
validateTimeRange()
calculateDuration()
findTimeConflicts()
findDependencyScheduleConflicts()
calculateScheduleShift()
propagateScheduleChange()
```

未来可扩展：

```text
Earliest Start
Latest Start
Slack
Critical Path by duration
Critical Path by calendar schedule
```

---

# 32. 智能范围与图算法结合

例如用户选中任务 D：

```text
A → C → D
B → C → D
```

系统应能提供：

```text
选择全部前置任务
=> A、B、C

选择全部后置任务
=> D 的全部后代

选择完整依赖链
=> A、B、C、D
```

选择后可以批量：

```text
完成
归档
调整时间
调整优先级
修改标签
```

---

# 33. 自动顺延与计划保护

任务时间变化可能影响依赖任务。

例如：

```text
A 结束：10:00
B 开始：10:00
A 延后到：12:00
```

系统可以提示：

```text
B 可能需要顺延 2 小时。
```

未来支持：

```text
保持当前任务时间
保持依赖关系
自动顺延后续任务
```

涉及多个任务时必须显示变更预览：

```text
将影响 6 个任务
预计最晚结束时间从 18:00 变更为 20:00
```

用户确认后才写入数据库。

---

# 34. 任务模板与相对时间

模板中的时间不要固定成绝对日期。

例如模板：

```text
项目开始
D+0：需求分析
D+2：系统设计
D+5：开发
D+12：测试
D+14：发布
```

实例化时根据项目开始时间计算真正的 startAt / endAt。

---

# 35. 离线优先

优先考虑 Offline-first。

允许：

```text
离线创建
离线编辑
离线完成
离线建立关系
离线修改时间
```

使用浏览器持久化能力，例如：

```text
IndexedDB
Dexie
TanStack Query Persistence
Service Worker
```

具体选型根据实现时的稳定性与复杂度决定。

网络恢复后同步服务器。

必须考虑：

- 冲突
- 版本
- 时间戳
- 重试
- 幂等性
- 临时操作队列

第一版可以采用可解释的 Last-write-wins，但领域层和数据模型需要为未来更复杂的同步方案留出空间。

---

# 36. 推荐技术栈

优先采用现代 Web 技术栈：

```text
Framework:
Next.js 16.x（以当前 Active LTS / 稳定版本为准）

UI:
React 19.x
TypeScript

Styling:
Tailwind CSS 4.x

Component:
shadcn/ui + Base UI

Icons:
Lucide

Graph:
React Flow

Server State:
TanStack Query v5

Client State:
Zustand

Database:
PostgreSQL 18.x 当前稳定小版本

ORM:
Drizzle ORM

Validation:
Zod

Authentication:
Better Auth 或同等级现代、维护活跃的认证方案

Testing:
Vitest
Playwright

Package Manager:
pnpm
```

实现时必须核对官方文档的当前稳定版本；禁止为了追求“最新”而使用明显不成熟的实验版本作为生产核心依赖。

---

# 37. Next.js 架构原则

使用：

```text
App Router
Server Components
Server Functions / Server Actions
Route Handlers（确有 API 需求时）
```

复杂交互区域才使用：

```text
'use client'
```

任务图、时间拖拽、范围选择等属于高度交互的客户端能力。

但业务逻辑必须保留在领域层，不能直接散落在 React Component 中。

---

# 38. 状态管理

Server State：

```text
TanStack Query
```

用于：

- 查询
- 缓存
- Mutation
- Invalidation
- 乐观更新
- 同步

Client State：

```text
Zustand
```

管理：

- 当前视图
- 选中节点
- Drawer
- Graph UI 状态
- 筛选器
- 临时编辑状态

不要把所有服务端任务数据全部复制到 Zustand。

---

# 39. 数据库原则

使用 PostgreSQL 18 当前稳定小版本。

核心表至少包括：

```text
tasks
projects
task_relations
tags
task_tags
activity_logs
```

为未来预留：

```text
reminders
attachments
recurring_tasks
saved_views
task_templates
task_template_relations
```

---

# 40. 关系数据模型

不要简单保存：

```text
dependencies: string[]
```

必须建立真正的关系实体。

例如：

```text
task_relations

id
source_task_id
target_task_id
relation_type
created_at
updated_at
```

至少明确：

```text
PARENT_CHILD
DEPENDS_ON
```

未来可以扩展其他关系类型，但第一版不要为了抽象而过度设计。

---

# 41. 时间数据模型建议

任务应至少支持：

```text
start_at
end_at
is_all_day
estimated_duration
actual_duration
user_timezone（如业务确有需求）
```

时间必须使用数据库原生可靠类型，而不是普通字符串。

服务端要统一时区策略：

```text
存储：标准化时间
展示：用户时区
输入：用户本地时区解释
```

不要在前端和后端各自随意转换时区。

---

# 42. 事务一致性

涉及多个节点/关系变更时必须使用数据库事务。

例如：

```text
批量完成
删除任务
删除任务树
建立依赖
删除依赖
移动任务
修改父子关系
批量归档
时间顺延
```

要求：

```text
成功 → 全部提交
失败 → 全部回滚
```

不能出现：

```text
任务已经删除，但依赖边仍然存在
```

这种脏状态。

---

# 43. 乐观更新

例如用户点击：

```text
完成
```

前端应立即更新 UI。

后台同步失败后：

```text
回滚
提示失败
恢复正确状态
```

涉及批量任务时，需要确保乐观更新与事务最终结果一致。

---

# 44. 安全

使用生产级安全设计：

- 参数校验
- 权限校验
- 身份认证
- Session 安全
- CSRF 防护
- XSS 防护
- SQL 注入防护
- Rate Limit
- 安全 Headers
- 输入长度限制
- 文件上传安全
- Secrets 环境变量
- 日志脱敏
- 资源访问控制
- 多租户边界（未来如需要）

绝对禁止：

```text
硬编码密码
硬编码 Token
fake database
fake API
假数据冒充真实业务
```

---

# 45. 性能

必须从第一天考虑任务规模扩大到：

```text
100
500
1000
5000+
```

需要考虑：

- memoization
- incremental updates
- graph indexing
- viewport culling / virtualization
- debounce
- selective rendering
- 后台计算
- Web Worker（确有必要时）

不要在每次 React render 时重新计算整个图。

---

# 46. 响应式设计

桌面端优先：

```text
Sidebar
Main Content
Details Drawer
```

移动端：

```text
Bottom Navigation
Task List
Task Detail
Graph
```

移动端 Graph 支持：

- 双指缩放
- 平移
- 点击节点
- 长按/快捷菜单
- 节点编辑
- 创建关系

---

# 47. 快捷键

至少支持：

```text
N                  新建任务
Enter              确认
E                  编辑
Space              完成
Delete             删除
A                  归档
F                  聚焦搜索
G                  Graph View
L                  List View
T                  Tree View
Esc                关闭面板
Ctrl/Cmd + K       Command Palette
Ctrl/Cmd + Z       撤销
Ctrl/Cmd + Shift+Z 重做
```

提供快捷键帮助页面，并允许未来自定义。

---

# 48. AI 能力预留

第一版不要求复杂 AI，但必须为未来 AI 做好结构化操作接口。

未来用户可以说：

```text
帮我把毕业设计拆成任务

这个任务为什么一直不能做？

完成这个任务会解锁哪些任务？

帮我找出整个项目的关键路径

我今天只有 2 小时，应该做什么？

帮我把这些任务整理成 DAG

根据我的截止时间重新安排任务
```

AI 不能直接操作数据库。

必须使用：

```text
AI
↓
结构化 Action Plan
↓
用户确认（涉及批量写入时）
↓
Task Command
↓
Domain Service
↓
Database
```

---

# 49. AI Action 体系

未来预留：

```text
CreateTask
UpdateTask
DeleteTask
CompleteTask
CompleteTaskTree
CompleteDependencyClosure
CreateDependency
RemoveDependency
CreateSubtask
MoveTask
ArchiveTask
RestoreTask
RescheduleTask
```

AI 只产生结构化意图，不直接生成 SQL。

---

# 50. 认证

使用现代、维护活跃的认证解决方案。

支持：

- Email
- Password
- Session
- OAuth
- 多设备登录
- 会话注销

密码、Session、Cookie 等安全机制不得自行造轮子。

---

# 51. 测试要求

必须具备：

```text
Unit Test
Integration Test
E2E Test
```

重点测试：

### DAG

- 创建依赖
- 循环检测
- 拓扑排序
- Ancestors
- Descendants
- Dependency Closure

### 状态

- TODO → IN_PROGRESS
- IN_PROGRESS → DONE
- BLOCKED → TODO
- DONE → TODO

### 完成传播

- 当前任务
- 子树
- 前置依赖链
- 批量任务

### 时间

- 合法区间
- 空时间
- 跨天
- 全天任务
- 时区
- 冲突检测
- 依赖时间冲突
- 自动顺延预览

### 数据一致性

- 事务回滚
- 删除关系
- 恢复任务
- 并发更新

---

# 52. UI / UX 风格

视觉方向参考现代生产力软件，但不要直接复制任何品牌：

```text
Linear
Notion
Plane
Obsidian
Raycast
```

要求：

- 简洁
- 高信息密度
- 专业
- 快速
- 强键盘操作
- 清晰层级
- 少装饰
- 强调任务关系

不要做成传统 ERP，也不要做成花哨的“数据大屏”。

---

# 53. 首页交互建议

推荐结构：

```text
┌──────────────┬──────────────────────────────┬──────────────────┐
│ Sidebar      │ Task List / Graph            │ Detail Drawer    │
│              │                              │                  │
│ Today        │ 当前任务                     │ 任务详情         │
│ Inbox        │                              │                  │
│ Projects     │                              │ 前置任务         │
│ Archive      │                              │ 后置任务         │
│ Trash        │                              │ 时间             │
│ Templates    │                              │ 历史             │
└──────────────┴──────────────────────────────┴──────────────────┘
```

图视图可以占满主区域。

---

# 54. 命令中心 Command Palette

需要成为高频操作入口。

例如：

```text
> create task
> complete current task
> complete dependency chain
> focus blockers
> show critical path
> add dependency
> set start time
> set end time
> archive selected
> move to project
```

---

# 55. 第一阶段 MVP

第一阶段不要一次实现所有高级功能。

必须先形成一个完整闭环：

```text
Task CRUD
↓
Parent-Child
↓
Dependency
↓
Cycle Detection
↓
Completion Logic
↓
List View
↓
Tree View
↓
Graph View
↓
Batch Operations
↓
Archive / Trash
↓
Start / End Time
```

MVP 必须可真正使用，而不是只有 Demo 页面。

---

# 56. 第二阶段

加入：

```text
Search
Filter
Undo / Redo
Activity Log
Time Conflict
Why Blocked
What Will Be Unlocked
Calendar
Task Templates
```

---

# 57. 第三阶段

加入：

```text
Critical Path
Schedule Propagation
Offline-first
Multi-device Sync
Recurring Tasks
Attachments
Saved Views
高级统计
```

---

# 58. 第四阶段 AI

加入：

```text
AI Task Breakdown
AI Dependency Suggestions
AI Schedule Optimization
AI Natural Language Search
AI Task Prioritization
AI Project Health Analysis
```

所有 AI 写操作都经过结构化 Action 层。

---

# 59. 开发顺序

严格按照可验证的增量方式开发：

```text
1. Domain Model
2. Database Schema
3. Task CRUD
4. Parent-Child
5. Dependency Relations
6. Cycle Detection
7. Status / Blocking Logic
8. Completion Commands
9. Time Model
10. Time Conflict Detection
11. List View
12. Tree View
13. Graph View
14. Scope Selection
15. Batch Operations
16. Archive / Trash
17. Activity Log
18. Undo / Redo
19. Search / Filter
20. Calendar / Timeline
21. Task Templates
22. Critical Path
23. Offline / Sync
24. Authentication
25. AI Extension
```

每个阶段必须：

```text
可以运行
可以测试
可以验证
可以回滚
```

不要一次生成大量互相耦合的代码。

---

# 60. AI 编程助手行为准则

开始写代码前必须先完成：

```text
需求分析
领域模型
数据关系
状态机
DAG 规则
时间模型
交互流程
技术架构
```

如果发现产品需求存在逻辑冲突，不允许静默做出危险假设。

必须说明：

```text
问题
原因
推荐方案
备选方案
```

如果不需要等待用户确认，也应选择最合理、最安全、最容易维护的默认方案继续实现。

---

# 61. 最重要的产品哲学

不要把产品做成：

> “又一个 Todo List”。

传统 Todo：

```text
☐ 查资料
☐ 写论文
☐ 做实验
☐ 做 PPT
```

本产品：

```text
查资料
   ↓
需求分析
   ↓
系统设计
  ↙   ↘
后端   前端
  ↘   ↙
   联调
     ↓
    测试
     ↓
    答辩
```

用户应该能回答：

```text
我现在为什么不能做这个任务？

完成这个任务会解锁什么？

哪些任务真正决定项目进度？

这次批量操作会影响什么？

这个任务应该从什么时候开始，到什么时候结束？
```

---

# 62. 最终核心规则

永远保持以下模型：

```text
Task = Node

Parent-Child = Task Decomposition

Dependency = Task Dependency

Dependency Graph = DAG

Start/End Time = Schedule Window

Duration = Work Estimate / Actual Work

List = Task Management

Tree = Task Decomposition

Graph = Task Reasoning

Calendar = Time Management

Critical Path = Project Reasoning

Domain Service = Business Logic

Database = Source of Truth

AI = Structured Intent Generator
```

最终产品应成为一个：

> **以任务关系、依赖、时间和项目推理为核心的现代任务管理系统。**

而不是一个增加了几个高级功能的传统 Todo。
