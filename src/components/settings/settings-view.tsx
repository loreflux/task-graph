'use client';

import React, { useState, useEffect } from 'react';
import { useSettingsStore, FONT_SIZE_MAP, type FontSizeOption } from '@/stores/settings-store';
import { useUIStore } from '@/stores/ui-store';
import { dataAdapter } from '@/lib/storage/data-adapter';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  playChimeSound,
  requestDesktopNotificationPermission,
} from '@/components/notification/deadline-reminder';
import {
  Sliders,
  Bell,
  GitBranch,
  Network,
  Info,
  RotateCcw,
  Database,
  HardDrive,
  Type,
  Volume2,
  Monitor,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export function SettingsView() {
  const { settings, updateSettings, resetSettings } = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'general' | 'reminder' | 'completion' | 'graph' | 'about'>('general');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<string>('default');

  // Check desktop notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setDesktopPermission(Notification.permission);
    }
  }, []);

  const handleConfirmReset = () => {
    resetSettings();
    toast.success('已成功恢复所有系统默认配置');
  };

  const handleRequestNotification = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPermission(perm);
    if (perm === 'granted') {
      updateSettings({ enableDesktopNotification: true });
      toast.success('已获得系统桌面通知权限，已自动开启桌面推送！');
    } else if (perm === 'denied') {
      updateSettings({ enableDesktopNotification: false });
      toast.error('桌面通知权限已被浏览器拒绝，请在浏览器地址栏权限设置中允许通知。');
    }
  };

  const handleTestSound = () => {
    playChimeSound();
    toast.info('正在试听：温和提示双音和弦');
  };

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-4 md:p-8">
      {/* Page Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-5">
        <div>
          <h2 className="text-base md:text-lg font-bold text-zinc-100">系统偏好设置</h2>
          <p className="mt-1 text-xs text-zinc-400">
            个性化配置双模存储引擎、字体排版、临期主动提醒、任务依赖策略与图拓扑参数。
          </p>
        </div>
        <button
          onClick={() => setResetConfirmOpen(true)}
          className="self-start sm:self-auto flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>恢复默认</span>
        </button>
      </div>

      {/* Main Settings Layout: Responsive (stacked tabs on small screens, row on md+) */}
      <div className="flex flex-1 flex-col md:flex-row gap-6 md:gap-8 overflow-hidden">
        {/* Left / Top Tabs */}
        <div className="flex md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0 md:w-52 flex-shrink-0 gap-1 space-y-0 md:space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'general'
                ? 'bg-zinc-900 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>常规偏好</span>
          </button>

          <button
            onClick={() => setActiveTab('reminder')}
            className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'reminder'
                ? 'bg-zinc-900 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>临期提醒</span>
          </button>

          <button
            onClick={() => setActiveTab('completion')}
            className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'completion'
                ? 'bg-zinc-900 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            <span>依赖与完成策略</span>
          </button>

          <button
            onClick={() => setActiveTab('graph')}
            className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'graph'
                ? 'bg-zinc-900 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
            }`}
          >
            <Network className="h-4 w-4" />
            <span>画布与图表偏好</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex flex-shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
              activeTab === 'about'
                ? 'bg-zinc-900 text-zinc-100 font-semibold'
                : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
            }`}
          >
            <Info className="h-4 w-4" />
            <span>关于系统</span>
          </button>
        </div>

        {/* Right Tab Content Panel */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-900 bg-zinc-900/30 p-4 sm:p-6">
          {/* TAB 1: 常规偏好 */}
          {activeTab === 'general' && (
            <div className="max-w-2xl space-y-6">
              {/* Storage Mode Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-200">
                  数据存储持久化模式
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  支持服务端数据库持久化与浏览器端离线本地存储双模无缝切换。
                </p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PostgreSQL Option */}
                  <div
                    onClick={() => {
                      dataAdapter.clearCache();
                      updateSettings({ storageMode: 'postgresql' });
                      toast.success('已切换至 PostgreSQL 数据库存储模式');
                    }}
                    className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition ${
                      settings.storageMode === 'postgresql'
                        ? 'border-blue-500/80 bg-blue-950/20 shadow-sm'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-400" />
                        <span className="text-xs font-semibold text-zinc-200">
                          PostgreSQL 数据库存储
                        </span>
                      </div>
                      <div
                        className={`h-3 w-3 rounded-full border ${
                          settings.storageMode === 'postgresql'
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-zinc-700 bg-transparent'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      连接本地数据库服务（端口 5432），多端可接入，具备完整事务日志与持久保障。
                    </p>
                  </div>

                  {/* LocalStorage Option */}
                  <div
                    onClick={() => {
                      dataAdapter.clearCache();
                      updateSettings({ storageMode: 'localstorage' });
                      toast.success('已切换至本地 LocalStorage 存储模式');
                    }}
                    className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 transition ${
                      settings.storageMode === 'localstorage'
                        ? 'border-blue-500/80 bg-blue-950/20 shadow-sm'
                        : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-zinc-200">
                          浏览器 LocalStorage 存储
                        </span>
                      </div>
                      <div
                        className={`h-3 w-3 rounded-full border ${
                          settings.storageMode === 'localstorage'
                            ? 'border-emerald-500 bg-emerald-500'
                            : 'border-zinc-700 bg-transparent'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      免数据库纯前端离线运行，内置开箱即用的「SSO + WuJie 微前端架构」全套演练任务拓扑。
                    </p>
                  </div>
                </div>
              </div>

              {/* Custom Font Size Selector */}
              <div className="border-t border-zinc-800/80 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="h-4 w-4 text-zinc-400" />
                    <label className="block text-xs font-semibold text-zinc-200">
                      全局字体大小
                    </label>
                  </div>
                  {settings.customFontSizePx && (
                    <button
                      onClick={() => {
                        updateSettings({ customFontSizePx: null });
                        toast.success('已重置为预设档位字号');
                      }}
                      className="text-[11px] text-blue-400 hover:underline"
                    >
                      使用标准预设档位
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  支持自定义字号缩放，选用系统级原生中文字体族（苹方、微软雅黑、思源黑体），满足不同显示偏好。
                </p>

                {/* 6 Preset Cards */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { key: 'compact', label: '紧凑', sizeText: '14px', desc: '高密度信息排版' },
                    { key: 'standard', label: '标准', sizeText: '16px', desc: '系统默认字号' },
                    { key: 'comfortable', label: '舒适', sizeText: '18px', desc: '适中清晰排版' },
                    { key: 'large', label: '较大', sizeText: '20px', desc: '大号字体展示' },
                    { key: 'huge', label: '特大', sizeText: '22px', desc: '大屏清晰阅读' },
                    { key: 'cinema', label: '超大', sizeText: '24px', desc: '远距演示汇报' },
                  ].map((f) => {
                    const isSelected =
                      !settings.customFontSizePx && settings.fontSize === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => {
                          updateSettings({
                            fontSize: f.key as FontSizeOption,
                            customFontSizePx: null,
                          });
                          toast.success(`字体已调整为：${f.label} (${f.sizeText})`);
                        }}
                        className={`flex flex-col items-center justify-center rounded-lg border py-2.5 px-2 text-xs transition ${
                          isSelected
                            ? 'border-blue-500 bg-blue-950/30 text-blue-400 font-semibold shadow-sm'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <span className="text-xs">{f.label}</span>
                        <span className="text-[10px] opacity-70 mt-0.5 font-mono">{f.sizeText}</span>
                        <span className="text-[9px] text-zinc-500 mt-1 text-center">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Pixel Size Slider */}
                <div className="mt-4 rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">自定义精确像素调节</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      {settings.customFontSizePx
                        ? `${settings.customFontSizePx}px (自定义激活中)`
                        : `${FONT_SIZE_MAP[settings.fontSize]} (预设值)`}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-[11px] text-zinc-500">12px</span>
                    <input
                      type="range"
                      min={12}
                      max={28}
                      step={1}
                      value={
                        settings.customFontSizePx ||
                        parseInt(FONT_SIZE_MAP[settings.fontSize], 10) ||
                        16
                      }
                      onChange={(e) => {
                        const px = parseInt(e.target.value, 10);
                        updateSettings({ customFontSizePx: px });
                      }}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-blue-500"
                    />
                    <span className="text-[11px] text-zinc-500">28px</span>
                  </div>
                </div>
              </div>

              {/* Default View Mode */}
              <div className="border-t border-zinc-800/80 pt-5">
                <label className="block text-xs font-semibold text-zinc-200">
                  默认进入视图
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  打开项目或首页时，优先呈现的工作视图模式。
                </p>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { key: 'list', label: '列表视图' },
                    { key: 'tree', label: '层级树拆解' },
                    { key: 'graph', label: '依赖拓扑图' },
                  ].map((v) => (
                    <button
                      key={v.key}
                      onClick={() => {
                        updateSettings({ defaultView: v.key as any });
                        useUIStore.getState().setCurrentView(v.key as any);
                        toast.success(`已设置默认视图为：${v.label}`);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        settings.defaultView === v.key
                          ? 'border-blue-500 bg-blue-950/30 text-blue-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Task Status on Quick Create */}
              <div className="border-t border-zinc-800/80 pt-5">
                <label className="block text-xs font-semibold text-zinc-200">
                  快速新建任务初始状态
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  在快捷输入框按回车创建任务时，分配的默认初始流转状态。
                </p>
                <select
                  value={settings.defaultTaskStatus}
                  onChange={(e) =>
                    updateSettings({
                      defaultTaskStatus: e.target.value as any,
                    })
                  }
                  className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="TODO">待办 - 立即纳入执行计划</option>
                  <option value="INBOX">收件箱 - 暂存等待细化整理</option>
                </select>
              </div>

              {/* System Timezone */}
              <div className="border-t border-zinc-800/80 pt-5">
                <label className="block text-xs font-semibold text-zinc-200">
                  系统基准时区
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  所有任务时间区间基于此标准时区统一解析与展示。
                </p>
                <input
                  type="text"
                  disabled
                  value={settings.timezone}
                  className="mt-2 w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-400"
                />
              </div>
            </div>
          )}

          {/* TAB 2: 临期主动提醒 */}
          {activeTab === 'reminder' && (
            <div className="max-w-xl space-y-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-200">
                  任务规定时间临期主动提醒
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  当网页在浏览器中运行时，系统会自动在任务截止规定时间到达前主动发出多维度提醒（页面浮动卡片、温和提示音与系统桌面通知）。
                </p>
              </div>

              {/* Reminder Master Switch */}
              <div className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">
                    开启临期主动预警机制
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    后台实时监测未完成任务的截止时间，即将超时前主动提示。
                  </p>
                </div>
                <Checkbox
                  checked={settings.enableDeadlineReminder}
                  onCheckedChange={(checked) => {
                    updateSettings({ enableDeadlineReminder: checked });
                    toast.success(checked ? '已开启临期主动预警' : '已停用临期提醒');
                  }}
                />
              </div>

              {/* Reminder Lead Time */}
              <div className="border-t border-zinc-800/80 pt-5">
                <label className="block text-xs font-semibold text-zinc-200">
                  提前提醒触发时长
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  在任务截止时间到来之前的多少分钟提前向您主动提醒。
                </p>
                <div className="mt-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { minutes: 15, label: '提前 15 分钟' },
                    { minutes: 30, label: '提前 30 分钟 (推荐)' },
                    { minutes: 60, label: '提前 1 小时' },
                    { minutes: 120, label: '提前 2 小时' },
                  ].map((item) => (
                    <button
                      key={item.minutes}
                      onClick={() => {
                        updateSettings({ reminderLeadMinutes: item.minutes });
                        toast.success(`已设置为任务截止前 ${item.minutes} 分钟主动提醒`);
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        settings.reminderLeadMinutes === item.minutes
                          ? 'border-blue-500 bg-blue-950/30 text-blue-400 font-semibold'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Alert Toggle & Test */}
              <div className="border-t border-zinc-800/80 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-semibold text-zinc-200">
                        播放温和双音和弦提示音
                      </span>
                      <p className="text-xs text-zinc-500">
                        采用浏览器原生合成和弦，无需外部音频文件，离线即响。
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.enableAudioAlert}
                    onCheckedChange={(checked) =>
                      updateSettings({ enableAudioAlert: checked })
                    }
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleTestSound}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                  >
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>试听提示音</span>
                  </button>
                  <span className="text-[11px] text-zinc-500">
                    点击测试当前环境下的声音播放效果
                  </span>
                </div>
              </div>

              {/* Desktop Native Notification */}
              <div className="border-t border-zinc-800/80 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-blue-400" />
                    <div>
                      <span className="text-xs font-semibold text-zinc-200">
                        操作系统原生桌面通知推送
                      </span>
                      <p className="text-xs text-zinc-500">
                        即使浏览器最小化或切到其他工作软件，依然在屏幕右下角弹出系统通知。
                      </p>
                    </div>
                  </div>
                  <Checkbox
                    checked={settings.enableDesktopNotification}
                    onCheckedChange={(checked) => {
                      if (checked && desktopPermission !== 'granted') {
                        handleRequestNotification();
                      } else {
                        updateSettings({ enableDesktopNotification: checked });
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-3 text-xs">
                  <div className="flex items-center gap-2">
                    {desktopPermission === 'granted' ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-green-300">桌面通知权限：已授权</span>
                      </>
                    ) : desktopPermission === 'denied' ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        <span className="text-red-300">桌面通知权限：已被浏览器拦截</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-yellow-300">桌面通知权限：尚未授权</span>
                      </>
                    )}
                  </div>
                  {desktopPermission !== 'granted' && (
                    <button
                      onClick={handleRequestNotification}
                      className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-blue-500"
                    >
                      申请授权
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 依赖与完成策略 */}
          {activeTab === 'completion' && (
            <div className="max-w-xl space-y-6">
              <div>
                <label className="block text-xs font-semibold text-zinc-200">
                  前置未完成时的任务完成策略
                </label>
                <p className="mt-1 text-xs text-zinc-500">
                  当用户勾选完成一个有前置依赖尚未完成的任务时的响应策略。
                </p>
                <div className="mt-3 space-y-2.5">
                  {[
                    {
                      key: 'SUGGESTION',
                      title: '建议模式 (推荐)',
                      desc: '发现未完成前置任务时弹出确认，询问是否一并完成所有前置依赖；若强行仅完成当前任务，将触发二次拓扑防错警告。',
                    },
                    {
                      key: 'STRICT',
                      title: '严格模式',
                      desc: '绝不自动触动前置任务，仅将当前选中的单个任务标记为完成。',
                    },
                    {
                      key: 'AUTO',
                      title: '自动模式',
                      desc: '无感自动将该任务上游的所有前置依赖递归标记为完成。',
                    },
                  ].map((mode) => (
                    <div
                      key={mode.key}
                      onClick={() =>
                        updateSettings({
                          completionStrategy: mode.key as any,
                        })
                      }
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                        settings.completionStrategy === mode.key
                          ? 'border-blue-500/80 bg-blue-950/20'
                          : 'border-zinc-800/80 bg-zinc-900/40 hover:bg-zinc-900'
                      }`}
                    >
                      <div
                        className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border ${
                          settings.completionStrategy === mode.key
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-zinc-700 bg-zinc-800'
                        }`}
                      >
                        {settings.completionStrategy === mode.key && (
                          <div className="h-1.5 w-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-200">
                          {mode.title}
                        </span>
                        <p className="mt-0.5 text-[11px] text-zinc-400">
                          {mode.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-200">
                      严格循环依赖强拦截
                    </span>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      在前端和后端服务双重进行实时深度优先遍历探测，禁止产生任何拓扑闭环。
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.preventCyclesStrict}
                    onCheckedChange={(checked) =>
                      updateSettings({
                        preventCyclesStrict: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 画布与图表偏好 */}
          {activeTab === 'graph' && (
            <div className="max-w-xl space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-zinc-200">
                    默认显示缩略鹰眼小地图
                  </span>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    在依赖图右下角显示全局鹰眼小地图，方便大型图快速定位。
                  </p>
                </div>
                <Checkbox
                  checked={settings.showMiniMap}
                  onCheckedChange={(checked) =>
                    updateSettings({ showMiniMap: checked })
                  }
                />
              </div>

              <div className="border-t border-zinc-800/80 pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-zinc-200">
                      数据变动时自动执行拓扑整理
                    </span>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      默认关闭（将绝对保留您手动拖动规划的节点坐标与摆放布局）；开启后每次任务更新或增删连线将自动全局重排。
                    </p>
                  </div>
                  <Checkbox
                    checked={settings.autoLayoutOnDataChange}
                    onCheckedChange={(checked) =>
                      updateSettings({ autoLayoutOnDataChange: checked })
                    }
                  />
                </div>
              </div>

              <div className="border-t border-zinc-800/80 pt-5">
                <label className="block text-xs font-semibold text-zinc-200">
                  连线折线外观风格
                </label>
                <div className="mt-2 flex gap-3">
                  {[
                    { key: 'smoothstep', label: '平滑阶梯折线' },
                    { key: 'bezier', label: '贝塞尔自然曲线' },
                  ].map((style) => (
                    <button
                      key={style.key}
                      onClick={() =>
                        updateSettings({ edgeType: style.key as any })
                      }
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        settings.edgeType === style.key
                          ? 'border-blue-500 bg-blue-950/30 text-blue-400'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: 关于系统 */}
          {activeTab === 'about' && (
            <div className="max-w-xl space-y-4 text-xs text-zinc-300">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-zinc-100">
                  <span>任务拓扑图可视化系统</span>
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-400">
                    版本 1.0.2
                  </span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  基于有向无环图依赖拓扑、父子层级树形拆解与关键路径推理的高性能任务管理系统。支持本地数据库持久化与浏览器离线双模存储。
                </p>
              </div>

              <div className="space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-4 text-[11px] text-zinc-400">
                <div className="flex justify-between">
                  <span>前端技术架构</span>
                  <span className="text-zinc-200">Next.js 15 全栈框架、React 19、Tailwind CSS 4、React Flow 12</span>
                </div>
                <div className="flex justify-between">
                  <span>存储持久化引擎</span>
                  <span className="text-zinc-200">本地数据库持久化 (PostgreSQL) + 浏览器存储 (LocalStorage)</span>
                </div>
                <div className="flex justify-between">
                  <span>开源授权协议</span>
                  <span className="text-green-400 font-semibold">MIT 开源授权协议</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Confirm Dialog for Reset Settings */}
      <ConfirmDialog
        open={resetConfirmOpen}
        onOpenChange={setResetConfirmOpen}
        title="恢复默认配置"
        description="确定要重置系统所有视图偏好、存储模式与拓扑规则为默认状态吗？已有任务数据不受影响。"
        variant="danger"
        confirmText="确认恢复"
        cancelText="取消"
        onConfirm={handleConfirmReset}
      />
    </div>
  );
}
