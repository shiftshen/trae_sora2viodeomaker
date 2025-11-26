# Sora 2 Video Maker

基于 Sora 2 API 的视频生成平台，支持文生视频、图生视频、AI 角色管理等功能。

## 项目结构

```
sora2videomakervs/
├── apps/
│   ├── api/                 # 后端 API 服务 (Node.js + Express)
│   │   ├── src/             # 源代码
│   │   │   ├── index.js     # 主入口
│   │   │   ├── db.js        # 数据库连接
│   │   │   ├── sora2.js     # Sora 2 API 调用
│   │   │   ├── llm.js       # LLM 聊天接口
│   │   │   └── *Repo.js     # 数据仓库模块
│   │   └── data/            # 本地数据存储
│   └── web/                 # 前端应用 (React + Vite + Tailwind)
│       ├── src/
│       │   ├── App.tsx      # 主应用组件
│       │   ├── components/  # UI 组件 (shadcn/ui)
│       │   ├── services/    # API 服务
│       │   └── i18n.ts      # 国际化
│       └── vite.config.ts
├── docs/                    # 项目文档
└── README.md
```

## 快速开始

### 环境要求

- Node.js >= 18
- MySQL >= 8.0
- npm 或 yarn

### 1. 安装依赖

```bash
# 后端
cd apps/api
npm install

# 前端
cd apps/web
npm install
```

### 2. 配置环境变量

复制 `apps/api/.env.example` 为 `apps/api/.env`，配置以下变量：

```env
YIJIA_API_KEY=your_api_key      # Yijia API 密钥
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=videogeneration
PORT=5050
```

### 3. 初始化数据库

```bash
cd apps/api
npm run migrate
```

### 4. 启动服务

```bash
# 启动后端 API (端口 5050)
cd apps/api
npm run dev

# 启动前端 (端口 3010)
cd apps/web
npm run dev
```

## 主要功能

### 视频生成
- **文生视频**: 通过文字描述生成视频
- **图生视频**: 上传图片生成视频
- **故事模式**: 生成连续剧情视频

### AI 角色
- 创建自定义 AI 角色
- 角色一致性管理
- 视频中引用角色

### 用户管理
- API Key 认证
- 用户设置同步
- 模型配置管理

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/videos` | 创建视频任务 |
| GET | `/api/videos/:id` | 获取视频状态 |
| GET | `/api/videos` | 获取视频列表 |
| POST | `/api/characters` | 创建 AI 角色 |
| GET | `/api/characters` | 获取角色列表 |
| POST | `/api/chat` | LLM 聊天 |
| POST | `/api/chat/provider` | 自定义模型聊天 |
| GET | `/api/user/settings` | 获取用户设置 |
| POST | `/api/user/settings` | 保存用户设置 |
| GET | `/api/user/models` | 获取用户模型配置 |
| POST | `/api/user/models` | 保存用户模型配置 |

## 技术栈

### 后端
- Node.js + Express
- MySQL + mysql2
- dotenv

### 前端
- React 18
- Vite 6
- Tailwind CSS
- shadcn/ui (Radix UI)
- Lucide Icons

## 开发指南

### 分支管理
- `main`: 主分支，稳定版本
- `vscode`: 开发分支，二次开发在此分支进行

### 代码规范
- 使用 ESM 模块
- API 响应格式: `{ success: true, data: ... }` 或 `{ error: "error_code", detail: "..." }`

## License

MIT
