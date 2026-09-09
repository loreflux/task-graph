/**
 * 数据库演示数据播种脚本
 * 场景：SSO + WuJie 微前端工程架构与研发
 * 运行命令：pnpm db:seed
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL || 'postgresql://seikei:seikei@localhost:5432/task_graph';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function seed() {
  console.log('🌱 开始播种 Task Graph 示例数据 (SSO + WuJie 微前端)...');

  // 1. 清理现有测试数据
  await db.delete(schema.activityLogs);
  await db.delete(schema.taskRelations);
  await db.delete(schema.taskTags);
  await db.delete(schema.tasks);
  await db.delete(schema.projects);
  await db.delete(schema.tags);

  console.log('✓ 清理现有数据库记录完成');

  // 2. 创建微前端项目
  const [project] = await db
    .insert(schema.projects)
    .values({
      name: 'SSO + WuJie 微前端工程架构开发',
      description: '基于无界 (WuJie) 极速微前端框架与统一认证中心的分布式企业级门户平台研发',
      color: '#3b82f6',
    })
    .returning();

  console.log(`✓ 创建项目: ${project.name}`);

  // 3. 创建父任务 (Parent-Child 树根)
  const now = new Date();
  const d0 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);

  const addDays = (d: Date, days: number, hours = 0) => {
    const res = new Date(d);
    res.setDate(res.getDate() + days);
    res.setHours(res.getHours() + hours);
    return res;
  };

  const [rootTask] = await db
    .insert(schema.tasks)
    .values({
      title: '微前端门户平台研发总工程',
      description: '微前端主基座、子应用集群与统一单点登录研发的顶级根任务',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      projectId: project.id,
      startAt: d0,
      endAt: addDays(d0, 30),
      isAllDay: false,
      sortOrder: 0,
    })
    .returning();

  // 4. 创建子任务 (Parent-Child 拆解)
  const taskDefinitions = [
    {
      key: 'sso_arch',
      title: '统一认证中心 SSO 架构方案设计',
      description: '梳理 CAS / OAuth2.0 / OIDC 认证流，设计跨域 Cookie 共享与 Token 静默刷新机制',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      startAt: d0,
      endAt: addDays(d0, 2),
      estimatedDuration: 480,
    },
    {
      key: 'sso_service',
      title: 'SSO 认证网关与 Token 鉴权服务实现',
      description: '基于 JWT RS256 签名体系完成登录授权接口、单点登出广播与会话校验中间件',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      startAt: addDays(d0, 2),
      endAt: addDays(d0, 5),
      estimatedDuration: 600,
    },
    {
      key: 'wujie_host',
      title: 'WuJie 微前端主基座宿主应用搭建',
      description: '搭建 React 19 基座，配置 WujieApp 容器组件，实现导航菜单与多标签页 Keep-Alive 保活机制',
      status: 'DONE' as const,
      priority: 'HIGH' as const,
      startAt: addDays(d0, 2),
      endAt: addDays(d0, 4),
      estimatedDuration: 480,
    },
    {
      key: 'bus_protocol',
      title: 'WuJie 通信总线与全局状态代理封装',
      description: '封装 bus.emit/bus.on 通信协议规范，打通基座与子应用间的主题、用户状态与路由广播',
      status: 'DONE' as const,
      priority: 'MEDIUM' as const,
      startAt: addDays(d0, 4),
      endAt: addDays(d0, 6),
      estimatedDuration: 360,
    },
    {
      key: 'sub_app_a',
      title: '子应用 A: 用户权限与组织管理中心改造接入',
      description: '改造旧版 Vue3 应用为无界微前端子应用，抽离独立入口，适配基座注入的 SSO Token',
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      startAt: addDays(d0, 6),
      endAt: addDays(d0, 11),
      estimatedDuration: 720,
    },
    {
      key: 'sub_app_b',
      title: '子应用 B: 核心业务报表分析工作台改造接入',
      description: '改造 React 报表工作台子应用，集成基座数据下发总线与微前端沙箱代理',
      status: 'IN_PROGRESS' as const,
      priority: 'HIGH' as const,
      startAt: addDays(d0, 6),
      endAt: addDays(d0, 11),
      estimatedDuration: 720,
    },
    {
      key: 'integration',
      title: '跨子应用免登授权与路由同步联合调试',
      description: '联调基座与子应用间的免登录无感透传，修复浏览器前进后退与子应用 Hash/History 冲突',
      status: 'BLOCKED' as const,
      priority: 'URGENT' as const,
      startAt: addDays(d0, 11),
      endAt: addDays(d0, 15),
      estimatedDuration: 540,
    },
    {
      key: 'sandbox_test',
      title: 'WuJie 沙箱隔离、样式防穿透与内存泄漏压测',
      description: '压测长周期切换 100 次子应用的内存占用，验证 window 变量隔离与 CSS 样式完全防穿透',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      startAt: addDays(d0, 15),
      endAt: addDays(d0, 18),
      estimatedDuration: 420,
    },
    {
      key: 'deploy',
      title: '微前端集群容器化构建与 Nginx 反向代理部署',
      description: '编写 Docker 多阶段镜像构建脚本，配置 Nginx 跨域与子应用静态资源 CORS 头转发',
      status: 'TODO' as const,
      priority: 'URGENT' as const,
      startAt: addDays(d0, 18),
      endAt: addDays(d0, 22),
      estimatedDuration: 600,
    },
  ];

  const createdTasks = new Map<string, typeof schema.tasks.$inferSelect>();

  for (let i = 0; i < taskDefinitions.length; i++) {
    const def = taskDefinitions[i];
    const [task] = await db
      .insert(schema.tasks)
      .values({
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        projectId: project.id,
        parentId: rootTask.id, // 父子拆解树
        startAt: def.startAt,
        endAt: def.endAt,
        estimatedDuration: def.estimatedDuration,
        sortOrder: i + 1,
      })
      .returning();

    createdTasks.set(def.key, task);
  }

  console.log(`✓ 创建 ${taskDefinitions.length} 个子任务 (父子拆解树)`);

  // 5. 创建 DAG 依赖关系 (有向无环图，前置约束)
  // sourceTaskId depends on targetTaskId (source 必须等待 target 完成)
  const dependencyPairs = [
    { from: 'sso_service', to: 'sso_arch', desc: 'SSO鉴权服务依赖整体认证架构设计' },
    { from: 'wujie_host', to: 'sso_arch', desc: '基座搭建依赖全局认证与通信架构方案' },
    { from: 'bus_protocol', to: 'wujie_host', desc: '通信协议封装依赖基座宿主运行容器' },
    { from: 'sub_app_a', to: 'sso_service', desc: '用户权限中心改造依赖统一SSO Token规范' },
    { from: 'sub_app_a', to: 'bus_protocol', desc: '用户权限中心依赖通信总线协议' },
    { from: 'sub_app_b', to: 'sso_service', desc: '报表中心改造依赖统一SSO鉴权服务' },
    { from: 'sub_app_b', to: 'bus_protocol', desc: '报表工作台依赖全局通信与事件总线' },
    { from: 'integration', to: 'sub_app_a', desc: '跨应用联调必须等待子应用A改造完毕' },
    { from: 'integration', to: 'sub_app_b', desc: '跨应用联调必须等待子应用B改造完毕' },
    { from: 'sandbox_test', to: 'integration', desc: '沙箱稳定性压测必须等待联合调试打通' },
    { from: 'deploy', to: 'sandbox_test', desc: '生产多环境发布必须在压测通过后进行' },
  ];

  for (const pair of dependencyPairs) {
    const dependentTask = createdTasks.get(pair.from)!;
    const prerequisiteTask = createdTasks.get(pair.to)!;

    await db.insert(schema.taskRelations).values({
      sourceTaskId: dependentTask.id, // 依赖方 (后置)
      targetTaskId: prerequisiteTask.id, // 被依赖方 (前置)
      relationType: 'DEPENDS_ON',
      description: pair.desc,
    });
  }

  console.log(`✓ 创建 ${dependencyPairs.length} 组 DAG 有向依赖关系`);

  // 6. 创建收件箱待整理任务
  await db.insert(schema.tasks).values({
    title: '调研 WuJie 预加载 preload 与保活 keep-alive 在低配置客户端的内存开销',
    description: '收件箱暂存任务，后续评估是否纳入正式压测技术方案中',
    status: 'INBOX',
    priority: 'MEDIUM',
    sortOrder: 0,
  });

  console.log('✓ 创建收件箱待办想法');
  console.log('🎉 SSO + WuJie 微前端示例数据播种成功！');
  await client.end();
}

seed().catch((err) => {
  console.error('❌ 播种失败:', err);
  process.exit(1);
});
