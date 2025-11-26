# 开发指南

## 环境配置

### 本地开发环境

1. **MySQL 配置**

   确保 MySQL 服务运行，并创建数据库：

   ```sql
   CREATE DATABASE videogeneration;
   ```

2. **环境变量**

   Shell 环境变量会覆盖 `.env` 文件，如果遇到连接问题，使用以下命令启动：

   ```bash
   env -u MYSQL_HOST -u MYSQL_PASSWORD -u MYSQL_USER -u MYSQL_PORT -u MYSQL_DATABASE npm run dev
   ```

3. **并行启动前后端**

   ```bash
   # 终端 1 - 后端
   cd apps/api && npm run dev

   # 终端 2 - 前端
   cd apps/web && npm run dev
   ```

## 项目架构

### 后端 (apps/api)

```
src/
├── index.js           # Express 应用主入口，路由定义
├── db.js              # MySQL 连接池
├── db.sql             # 数据库 Schema
├── migrate.js         # 数据库迁移脚本
├── sora2.js           # Sora 2 API 封装
├── llm.js             # LLM 多模型支持
├── yijiaChat.js       # Yijia 聊天 API
├── agentRepo.js       # Agent 数据操作
├── characterRepo.js   # 角色数据操作
├── promptRepo.js      # Prompt 模板操作
├── userRepo.js        # 用户数据操作
├── userSettingsRepo.js    # 用户设置
├── userModelsRepo.js      # 用户模型配置
├── userCharactersRepo.js  # 用户角色
└── videoRepo.js       # 视频数据操作
```

### 前端 (apps/web)

```
src/
├── App.tsx            # 主应用组件（单文件应用）
├── main.tsx           # React 入口
├── i18n.ts            # 国际化配置
├── index.css          # Tailwind 样式
├── components/
│   ├── ui/            # shadcn/ui 组件
│   └── figma/         # 自定义组件
├── services/
│   └── sora.ts        # API 服务封装
└── styles/
    └── globals.css    # 全局样式
```

## 代码风格

### JavaScript/TypeScript

- 使用 ESM 模块 (`import`/`export`)
- 异步操作使用 `async`/`await`
- 错误处理使用 try-catch

### API 响应格式

成功响应：
```json
{
  "success": true,
  "data": { ... }
}
```

错误响应：
```json
{
  "error": "error_code",
  "detail": "错误详情"
}
```

## Git 工作流

### 分支说明

- `main`: 主分支，生产环境代码
- `vscode`: 开发分支，所有二次开发在此进行

### 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
refactor: 代码重构
style: 代码格式
chore: 构建/工具相关
```

### 开发流程

1. 确保在 `vscode` 分支
2. 开发完成后提交到 `vscode`
3. 测试通过后合并到 `main`

```bash
# 检查当前分支
git branch

# 切换到开发分支
git checkout vscode

# 提交更改
git add .
git commit -m "feat: 添加新功能"

# 推送到远程
git push origin vscode
```

## 调试技巧

### 后端日志

关键操作都有 `console.log` 输出，查看终端即可。

### 前端调试

1. 打开浏览器开发者工具
2. 查看 Network 面板检查 API 请求
3. 使用 React DevTools 查看组件状态

### 数据库调试

```bash
mysql -u root -p videogeneration

# 查看表结构
SHOW TABLES;
DESCRIBE videos;

# 查看数据
SELECT * FROM videos LIMIT 10;
```

## 常见问题

### Q: 启动时提示端口被占用

```bash
# 查找占用端口的进程
lsof -i :5050
lsof -i :3010

# 杀死进程
kill -9 <PID>
```

### Q: MySQL 连接失败

1. 确认 MySQL 服务运行中
2. 检查 `.env` 文件配置
3. 使用 `127.0.0.1` 而非 `localhost` 避免 IPv6 问题

### Q: 前端 API 请求跨域

后端已配置 CORS，如仍有问题检查 vite.config.ts 中的代理配置。
