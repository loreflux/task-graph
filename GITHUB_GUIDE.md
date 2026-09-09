# Task Graph 源码上传至 GitHub 完整实操教程

本文档旨在为您提供从零到一将 **Task Graph (可视化任务依赖管理系统)** 源码完整推送到个人 GitHub 仓库的保姆级教程。

> 💡 **前置信息**：
> 当前本地项目已经完整初始化了 Git 仓库，且拥有完备的 `.gitignore` 过滤规则（已自动忽略 `node_modules`、`.next` 打包缓存和 `.env` 敏感文件），您无需担心泄露私密配置。

---

## 目录
1. [第一步：在 GitHub 上创建新的空仓库](#第一步在-github-上创建新的空仓库)
2. [第二步：选择身份认证方式 (HTTPS 或 SSH)](#第二步选择身份认证方式-https-或-ssh)
3. [第三步：本地终端关联远程仓库并首次推送](#第三步本地终端关联远程仓库并首次推送)
4. [第四步：日常代码修改后的提交与推送](#第四步日常代码修改后的提交与推送)
5. [第五步：常见报错与排坑速查 (FAQ)](#第五步常见报错与排坑速查-faq)
6. [第六步：(可选) 免费一键将项目上线到 Vercel](#第六步可选-免费一键将项目上线到-vercel)

---

## 第一步：在 GitHub 上创建新的空仓库

1. 打开浏览器并访问 GitHub 官网：[https://github.com](https://github.com) 并登录您的账号。
2. 点击页面右上角的 **`+`** 号，选择 **`New repository`**（或者直接访问 [https://github.com/new](https://github.com/new)）。
3. 填写仓库基础信息：
   - **Repository name (仓库名)**：建议填写 `task-graph`（也可以起您喜欢的名字）。
   - **Description (描述，可选)**：例如 `现代化有向无环图 (DAG) 任务依赖拓扑管理系统，支持纯本地/PostgreSQL双引擎`。
   - **Visibility (公开/私有)**：
     - 如果想开源分享给社区，选择 **Public**；
     - 如果仅自己可见，选择 **Private**。
   - ⚠️ **【极其重要 - 千万不要勾选以下选项】**：
     - ❌ **不要** 勾选 `Add a README file`
     - ❌ **不要** 勾选 `Add .gitignore`
     - ❌ **不要** 勾选 `Choose a license`
     > **原因**：本地项目已经拥有了完善的 `README.md`、`.gitignore` 和 `LICENSE` 文件。如果此时勾选，GitHub 仓库会自动生成初始 commit，会导致本地与远端分支冲突（出现 `fetch first` 错误）。
4. 点击底部的绿色按钮 **`Create repository`** 创建仓库。

---

## 第二步：选择身份认证方式 (HTTPS 或 SSH)

GitHub 目前不支持直接使用账号密码推送代码，请在以下两种方式中**任选其一**：

### 选项 A：HTTPS + Personal Access Token (新手推荐，无需配置密钥)
GitHub 从 2021 年起要求使用 **个人访问令牌 (Token)** 代替密码：
1. 访问 GitHub 生成页面：[https://github.com/settings/tokens](https://github.com/settings/tokens)。
2. 点击 **`Generate new token`** -> **`Generate new token (classic)`**。
3. **Note (用途说明)**：填写 `task-graph-push`。
4. **Expiration (有效期)**：可按需选择（如 `90 days` 或 `No expiration` 长期免输）。
5. **Select scopes (权限勾选)**：勾选 **`repo`**（包含创建、提交、推送完整权限）。
6. 滑动到底部点击 **`Generate token`**。
7. 📋 **复制生成的 Token（格式类似 `ghp_xxxxxxxxxxxx...`），并妥善保存在记事本中**（该页面关闭后将无法再次查看完整 Token）。

### 选项 B：SSH 密钥方式 (推荐熟悉 Git 的开发者，一次配置永久免密)
1. 在本地 PowerShell 检查或生成 SSH 密钥：
   ```powershell
   ssh-keygen -t ed25519 -C "l418148113@163.com"
   ```
   （连续按 3 次回车即可，无需输入额外密码）
2. 查看并复制公钥内容：
   ```powershell
   cat ~/.ssh/id_ed25519.pub
   ```
3. 打开 GitHub 的 SSH 设置：[https://github.com/settings/keys](https://github.com/settings/keys) -> 点击 **`New SSH key`** -> 粘贴进去并保存。

---

## 第三步：本地终端关联远程仓库并首次推送

打开项目根目录所在的终端（如 VS Code 终端或 PowerShell，工作目录为 `l:\Projects\Antigravity\task-graph`）：

### 1. 关联 GitHub 远程仓库
将 `<YOUR-USERNAME>` 替换为您真实的 GitHub 用户名（如果仓库名不是 `task-graph`，相应替换）：

- **如果使用 HTTPS 方式**：
  ```powershell
  git remote add origin https://github.com/<YOUR-USERNAME>/task-graph.git
  ```

- **如果使用 SSH 方式**：
  ```powershell
  git remote add origin git@github.com:<YOUR-USERNAME>/task-graph.git
  ```

### 2. 检查关联是否成功
```powershell
git remote -v
```
终端输出类似如下即代表绑定成功：
```text
origin  https://github.com/<YOUR-USERNAME>/task-graph.git (fetch)
origin  https://github.com/<YOUR-USERNAME>/task-graph.git (push)
```

### 3. (可选) 将默认分支命名统一为 main
目前本地分支名为 `master`。如果您希望与 GitHub 默认推荐的主分支名 `main` 保持一致，可执行以下命令切换：
```powershell
git branch -M main
```

### 4. 首次推送全部代码
- **如果您保留了 `master` 分支**：
  ```powershell
  git push -u origin master
  ```
- **如果您切换为了 `main` 分支**：
  ```powershell
  git push -u origin main
  ```

> 🔑 **输入凭据提示**：
> - **Username**：输入您的 GitHub 用户名（或绑定的邮箱）；
> - **Password**：输入您在第二步获取的 **Personal Access Token (`ghp_xxx`)**，而不是您的 GitHub 网页登录密码！

推送完成后，刷新您的 GitHub 仓库页面，即可看到全部代码、漂亮的目录结构和 README 介绍！

---

## 第四步：日常代码修改后的提交与推送

未来在日常开发中，如果您新增了功能或修复了 Bug，只需执行以下标准三步即可同步到 GitHub：

```powershell
# 1. 查看修改的文件
git status

# 2. 将修改添加到暂存区
git add .

# 3. 提交本地变更（附带更新说明）
git commit -m "feat: 增加新功能说明"

# 4. 推送到远程 GitHub 仓库
git push
```

---

## 第五步：常见报错与排坑速查 (FAQ)

### Q1: 报错 `fatal: remote origin already exists`
- **原因**：本地之前已经添加过名为 `origin` 的远程地址。
- **解决方法**：
  ```powershell
  # 查看现有的 origin
  git remote -v
  # 重新设置正确的仓库地址
  git remote set-url origin https://github.com/<YOUR-USERNAME>/task-graph.git
  ```

### Q2: 报错 `Support for password authentication was removed`
- **原因**：在终端要求输入 Password 时输成了网页登录密码。
- **解决方法**：前往 GitHub Settings 创建 Personal Access Token，并在输入密码时粘贴 Token 作为密码。Windows 凭据管理器会记住此 Token，后续无需反复输入。

### Q3: 报错 `Updates were rejected because the remote contains work that you do not have locally` (fetch first)
- **原因**：在 GitHub 创建仓库时不小心勾选了自动创建 README 或 License，导致远端有的提交本地没有。
- **解决方法**：
  ```powershell
  # 允许合并不相关的历史记录并拉取
  git pull origin main --rebase --allow-unrelated-histories
  # 重新推送
  git push -u origin main
  ```

### Q4: 国内网络访问 GitHub 超时或 `OpenSSL SSL_read: Connection was reset`
- **解决方法**：
  1. 如果本地开启了代理软件（例如端口为 `7890`），可为 Git 快速配置本地代理：
     ```powershell
     git config --global http.proxy http://127.0.0.1:7890
     git config --global https.proxy http://127.0.0.1:7890
     ```
  2. 若关闭代理，可随时清除代理配置：
     ```powershell
     git config --global --unset http.proxy
     git config --global --unset https.proxy
     ```

---

## 第六步：(可选) 免费一键将项目上线到 Vercel

本项目为标准的 Next.js 15 全栈应用，原生完美支持 Vercel 一键免服务器部署：

1. 打开 [https://vercel.com](https://vercel.com) 并使用您的 **GitHub 账号登录**；
2. 点击 **`Add New...`** -> **`Project`**；
3. 在列表里找到您刚刚推送的 **`task-graph`** 仓库，点击 **`Import`**；
4. 环境变量配置（可选）：
   - 如果您希望直接使用内置的纯前端 LocalStorage 零配置离线运行模式，无需配置任何环境变量，直接点击 **`Deploy`**！
   - 如果您希望连接云端 PostgreSQL 数据库，在 `Environment Variables` 中填入您的 `DATABASE_URL` 即可；
5. 点击 **`Deploy`**，约 1~2 分钟后，Vercel 会自动为您生成一个公网可访问的 `.vercel.app` 免费域名，您便可以随时随地在线演示与使用了！
