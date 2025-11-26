# API 文档

## 认证

所有 API 请求需要在 Header 中携带 API Key：

```
x-client-api-key: your_api_key
```

或使用 Bearer Token：

```
Authorization: Bearer your_api_key
```

---

## 视频相关

### 创建视频

**POST** `/api/videos`

创建视频生成任务。

**请求体:**

```json
{
  "prompt": "视频描述文字",
  "model": "sora-2",
  "input_reference": "base64_image_data",  // 可选，图生视频时使用
  "size": "720x720",                        // 可选
  "is_story": false                         // 可选，是否为故事模式
}
```

**响应:**

```json
{
  "id": "4078",
  "object": "video",
  "model": "sora-2",
  "status": "queued",
  "progress": 0,
  "created_at": 1762415032,
  "size": "720x720"
}
```

### 获取视频状态

**GET** `/api/videos/:id`

查询视频生成进度。

**响应:**

```json
{
  "id": "4078",
  "url": "https://...",           // 无水印视频地址
  "size": "https://...",          // 有水印视频地址
  "model": "sora-2-yijia",
  "object": "video",
  "status": "completed",          // queued | processing | completed | error
  "quality": "standard",          // standard 或违规说明
  "seconds": "2",
  "progress": 100,
  "created_at": 1762418837
}
```

### 获取视频列表

**GET** `/api/videos`

获取当前用户的视频列表。

**查询参数:**
- `limit`: 数量限制，默认 20
- `offset`: 偏移量，默认 0

---

## AI 角色相关

### 创建角色

**POST** `/api/characters`

从视频中提取角色。

**请求体:**

```json
{
  "instruction_value": "角色描述",
  "timestamps": "0-3",            // 截取视频时间段(3秒内)
  "video_id": "4078",             // 视频ID
  "uuid": "角色唯一标识"
}
```

### 获取角色列表

**GET** `/api/characters`

获取当前用户的角色列表。

### 获取角色状态

**GET** `/api/characters/:uuid`

查询角色创建状态。

---

## 聊天相关

### Yijia 聊天

**POST** `/api/chat`

使用 Yijia 平台的聊天接口。

**请求体:**

```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    { "role": "user", "content": "你好" }
  ],
  "stream": false
}
```

### 自定义模型聊天

**POST** `/api/chat/provider`

使用自定义模型提供商。

**请求体:**

```json
{
  "provider": "DeepSeek",
  "model": "deepseek-chat",
  "messages": [...],
  "apiKey": "your_key",           // 可选
  "endpoint": "https://..."       // 可选
}
```

---

## 用户设置

### 获取设置

**GET** `/api/user/settings`

### 保存设置

**POST** `/api/user/settings`

**请求体:** 任意 JSON 对象

### 获取模型配置

**GET** `/api/user/models`

### 保存模型配置

**POST** `/api/user/models`

**请求体:**

```json
{
  "models": [
    {
      "id": "deepseek-chat",
      "name": "DeepSeek Chat",
      "provider": "DeepSeek",
      "apiEndpoint": "https://api.deepseek.com/v1",
      "apiKey": "",
      "enabled": true
    }
  ]
}
```

---

## 管理接口

### 数据库状态

**GET** `/api/admin/db-status`

检查数据库连接状态。

### 配置状态

**GET** `/api/admin/config-status`

检查 API Key 配置状态。

### 测试模型连接

**POST** `/api/admin/test-deepseek`
**POST** `/api/admin/test-gemini`
**POST** `/api/admin/test-yijia`

测试各模型提供商的连接。
