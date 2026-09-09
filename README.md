# Task Graph (可视化任务依赖管理系统)

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/Next.js-15.x-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.x-blue?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-4.x-38bdf8?logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/React%20Flow-12.x-ff0072" alt="React Flow" />
  <img src="https://img.shields.io/badge/PostgreSQL-17.x-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Drizzle%20ORM-0.38-brightgreen" alt="Drizzle ORM" />
</p>

> **让每一个任务都有迹可循，让每一次阻塞都清晰明了。**  
> Task Graph 不是普通的 Todo 清单，不是单纯的敏捷看板，也不是思维导图。它是一个以**任务关系、有向无环依赖 (DAG)、时间窗口与项目推理**为核心的现代化任务管理系统。

---

## 🎯 核心理念

在复杂的软件工程、学术科研与跨部门协作中，管理者与执行者最常遇到的痛点是：
- *“为什么这个任务我现在不能做？”*
- *“我如果今天做完了它，到底能释放哪些后续流程？”*
- *“项目整体延期了，真正的瓶颈任务到底是哪一个？”*

Task Graph 围绕图论推理与工程直觉设计，回答这些核心问题：

```
                    需求方案设计
                     ↙        ↘
        SSO认证鉴权服务      主基座容器搭建
             ↓                     ↓
        子应用改造接入       WuJie通信总线封装
             ↘                     ↙
               跨应用免登联合调试 (已阻塞!)
                         ↓
               沙箱稳定性压测
                         ↓
               集群多环境部署
```

---

## 💡 核心模型：两大关系的本质分离

绝不能把**父子拆解**和**依赖约束**混为一谈：

| 关系维度 | 领域概念 | 物理建模 | 适用视图 | 核心作用 |
| :--- | :--- | :--- | :--- | :--- |
| **任务拆解关系** | Parent-Child (树) | `tasks.parent_id` (自关联) | **Tree View (层级树)** | 无限层级分解大目标 |
| **前置依赖关系** | Dependency (DAG) | `task_relations` (有向边) | **Graph View (依赖图)** | 明确执行时序与阻塞条件 |

同一个任务可以既属于某个模块的子任务，又跨模块依赖于其他团队交付的产物。

---

## ✨ 特性清单

### 1. 三大工作视图联动
- **列表视图 (List View)**：高信息密度呈现，支持按状态（待办/进行中/已阻塞/已完成）、优先级、搜索过滤，支持多选浮动批量完成、归档与删除。
- **层级树视图 (Tree View)**：清晰展示目标拆解结构，悬停一键快捷添加子任务，支持无限层级折叠。
- **依赖关系图 (Graph View)**：基于 **React Flow v12**，定制节点卡片，支持拓扑分层自动排版（Layered DAG Layout）、缩略小地图、视野自适应与连线交互。

### 2. 核心图算法推理 (`src/lib/graph-algorithms/`)
- **循环依赖强阻断**：实时 DFS 环路探测。若建立依赖会产生死锁，即刻拦截并精确展示闭环链路（如 `A → B → C → A`）。
- **为什么不能开始？ (Why Blocked?)**：自动追踪直接与间接的上游阻塞源，彻底理清阻碍原因。
- **完成它会解锁什么？**：推演标记当前任务完成后，哪些后置任务将直接就绪，哪些链路将获得间接推进。
- **关键路径分析 (Critical Path)**：基于加权工时动态规划推导决定项目总工期的最长路径。

### 3. 双模持久化存储引擎 (Dual Storage)
- **PostgreSQL 数据库存储**：企业级标准服务端持久化，支持全事务 ACID、多端协作与服务端查询。
- **浏览器 LocalStorage 存储**：免数据库、离线优先、开箱即用，内建预加载「SSO + WuJie 微前端架构」全套演练工程。

### 4. 智能完成策略与二次警告防错
- **建议模式 (默认推荐)**：当勾选完成被阻塞任务时，系统自动扫描未完成的前置依赖，询问是否一同批量完成前置。
- **二次阻断警告确认**：若用户坚持选择“仅完成当前任务”，系统触发二次醒目警告弹窗，告知违规破坏 DAG 拓扑执行序的后果，由用户二次明确决断。
- **严格模式 / 自动模式**：可在系统设置中自由切换。

### 5. 时间计划与冲突推理
- 严格区分 `startAt ~ endAt`（时间窗口）与 `estimatedDuration`（预计工时）。
- 自动检测同一执行人/资源的日历时间重叠，以及“前置未结束而后置已开工”的时序违规警报。

### 6. 现代化交互体验与精致设计
- **现代化自定义弹窗系统**：基于 `@radix-ui/react-dialog` 构建，彻底告别丑陋卡顿的原生 `confirm/prompt`。
- **精致定制复选框与控件**：全面替代原生 HTML 复选框与表单项，具备平滑动画、高对比聚焦环与微交互反馈。
- **全局动态字体与自适应排版**：支持自定义字号（紧凑 13px / 标准 14px / 舒适 15px / 大字号 16px），系统设置位于左下角，完美适配大、中、小各类屏幕分辨率（含移动端抽屉侧栏）。
- **全局命令面板**：随时按下 `Ctrl + K` 呼出命令中心，支持瞬时建任务、搜任务与全站导航。
- **快捷键支持**：`L` 切换列表、`T` 切换树图、`G` 切换依赖图、`Esc` 关闭详情抽屉。

### 7. 内置微前端工程演示数据
- 开箱内置「**SSO + WuJie 微前端工程架构开发**」真实场景，涵盖 9 个拆解子任务与 11 组复杂有向依赖关系。

---

## 🛠️ 技术选型

- **核心框架**：Next.js 15 (App Router, Server Actions, Server Components)
- **UI & 样式**：React 19, TypeScript 5, Tailwind CSS 4, Lucide Icons
- **交互与弹窗**：@radix-ui/react-dialog, cmdk, sonner
- **图引擎**：@xyflow/react (React Flow v12)
- **状态管理**：Zustand 5 (客户端视图/多选/配置), TanStack Query v5
- **数据库与 ORM**：PostgreSQL 17, Drizzle ORM, postgres.js
- **单元测试**：Vitest (图算法与时间服务 100% 覆盖)
- **包管理器**：pnpm

---

## 🚀 快速上手

### 1. 环境准备
- Node.js >= 20.x
- pnpm >= 9.x
- 本地或远程 PostgreSQL 数据库 (默认用户名/密码可配置在 `.env.local`)

### 2. 克隆与安装
```bash
git clone https://github.com/your-username/task-graph.git
cd task-graph
pnpm install
```

### 3. 配置数据库
在根目录创建或检查 `.env.local`：
```env
DATABASE_URL=postgresql://seikei:seikei@localhost:5432/task_graph
```

### 4. 初始化数据库表结构
```bash
pnpm db:push
```

### 5. 播种微前端演示数据
```bash
pnpm db:seed
```

### 6. 启动本地开发服务
```bash
pnpm dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000) 即可开始探索。

---

## 🧪 运行单元测试

```bash
pnpm test
```
包含对环路检测、拓扑排序、阻塞链分析、级联解锁推演、关键路径分析与时间冲突校验的全面纯函数单元测试。

---

## 📁 项目工程目录

```text
src/
├── app/                  # Next.js App Router 路由页面
│   ├── page.tsx          # 首页 / 今天任务三视图
│   ├── inbox/            # 收件箱 (快速捕捉想法)
│   ├── projects/         # 项目总览及项目独立看板
│   ├── archive/          # 已归档任务视图
│   ├── trash/            # 回收站 (软删除与永久销毁)
│   └── settings/         # 系统偏好设置
├── components/           # UI 组件
│   ├── ui/               # Radix 现代化自定义弹窗与基础控件
│   ├── layout/           # AppShell、侧边栏、顶部导航、详情抽屉
│   ├── task/             # 列表视图、树状视图、快捷新建、批量操作栏
│   ├── graph/            # React Flow 画布、自定义节点、工具栏、布局器
│   └── settings/         # 设置面板组件
├── domain/               # 核心领域服务 (CRUD、完成策略、时间推理)
├── db/                   # Drizzle ORM 数据表建模与播种脚本
├── lib/
│   └── graph-algorithms/ # 纯函数图论算法核心 (环路、阻塞、解锁、关键路径)
├── server/               # Next.js Server Actions 与服务端查询
├── stores/               # Zustand 客户端状态 (UI、多选、设置偏好)
└── types/                # 全局 TypeScript 类型定义
```

---

## 📄 开源许可

本项目基于 [MIT License](LICENSE) 协议开源。欢迎自由使用、修改与商业应用。
