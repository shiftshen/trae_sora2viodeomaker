// 国际化配置
export const translations = {
  zh: {
    // 通用
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    add: "添加",
    close: "关闭",
    confirm: "确认",
    
    // 顶部导航
    appName: "AI视频生成工作台",
    settings: "设置",
    account: "账户",
    
    // 全局参数
    aiModel: "AI模型",
    agent: "智能体",
    selectAgent: "选择智能体",
    quality: "画质",
    orientation: "方向",
    duration: "时长",
    batchGenerate: "批量生成",
    
    // 编辑区
    editArea: "编辑区域",
    addPrompt: "添加提示词",
    video: "视频",
    textToVideo: "文生",
    imageToVideo: "图生",
    basedOnRemix: "基于",
    remix: "二创",
    
    // 提示词操作
    promptPlaceholder: "输入视频描述提示词，或选择智能体自动生成...",
    addVideoPrompt: "添加视频提示词",
    storyboard: "分镜",
    aiGenerate: "AI生成",
    aiOptimize: "AI优化",
    generate: "生成",
    selectRemixVideo: "选择二创视频",
    selectVideoToRemix: "选择要二创的视频",
    storyThemeGenerate: "故事主题生成",
    
    // 历史记录
    history: "历史记录",
    records: "条记录",
    page: "第",
    of: "/",
    pageUnit: "页",
    typeImage: "类型/图片",
    prompt: "提示词",
    storyboardCount: "分镜",
    params: "参数",
    progress: "进度",
    videoPreview: "视频预览",
    submitTime: "提交时间",
    operations: "操作",
    
    // 操作按钮
    mix: "混合",
    download: "下载",
    newWindow: "新窗口",
    remixAction: "Remix",
    
    // 状态
    completed: "完成",
    failed: "失败",
    generating: "生成中",
    noStoryboard: "无分镜",
    textVideo: "文生视频",
    
    // 设置
    apiSettings: "本站API设置",
    modelSettings: "模型设置",
    agentSettings: "智能体设置",
    themeSettings: "主题设置",
    
    // API设置
    apiServerUrl: "API服务器地址",
    apiKey: "API密钥",
    apiServerDescription: "向此服务器发送视频生成请求",
    
    // 模型设置
    aiModelConfig: "AI模型配置",
    modelName: "模型名称",
    provider: "提供商",
    apiEndpoint: "API端点",
    customPrompt: "自定义提示词模板",
    enabled: "启用",
    
    // 智能体设置
    agentManagement: "智能体管理",
    addAgent: "添加智能体",
    agentName: "智能体名称",
    agentDescription: "描述",
    agentIcon: "图标",
    agentModel: "使用模型",
    agentKnowledge: "知识库",
    agentInstructions: "系统指令",
    agentPromptTemplate: "提示词模板",
    
    // 主题设置
    themeMode: "主题模式",
    darkMode: "深色模式",
    lightMode: "浅色模式",
    autoMode: "跟随系统",
    accentColor: "主题色",
    
    // 账户
    accountManagement: "账户管理",
    login: "登录",
    register: "注册",
    username: "用户名",
    password: "密码",
    email: "邮箱",
    
    // 通知消息
    loginSuccess: "登录成功",
    registerSuccess: "注册成功",
    settingsSaved: "设置已保存",
    taskSubmitted: "任务已提交",
    agentAdded: "智能体已添加",
    agentUpdated: "智能体已更新",
    agentDeleted: "智能体已删除",
  },
  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    close: "Close",
    confirm: "Confirm",
    
    // Top Navigation
    appName: "AI Video Generation Platform",
    settings: "Settings",
    account: "Account",
    
    // Global Parameters
    aiModel: "AI Model",
    agent: "Agent",
    selectAgent: "Select Agent",
    quality: "Quality",
    orientation: "Orientation",
    duration: "Duration",
    batchGenerate: "Batch Generate",
    
    // Edit Area
    editArea: "Edit Area",
    addPrompt: "Add Prompt",
    video: "Video",
    textToVideo: "Text",
    imageToVideo: "Image",
    basedOnRemix: "Based on",
    remix: "Remix",
    
    // Prompt Operations
    promptPlaceholder: "Enter video prompt, or select an agent to auto-generate...",
    addVideoPrompt: "Add Video Prompt",
    storyboard: "Storyboard",
    aiGenerate: "AI Generate",
    aiOptimize: "AI Optimize",
    generate: "Generate",
    selectRemixVideo: "Select Remix Video",
    selectVideoToRemix: "Select video to remix",
    storyThemeGenerate: "Story Theme Generate",
    
    // History
    history: "History",
    records: "records",
    page: "Page",
    of: "/",
    pageUnit: "",
    typeImage: "Type/Image",
    prompt: "Prompt",
    storyboardCount: "Storyboard",
    params: "Parameters",
    progress: "Progress",
    videoPreview: "Video Preview",
    submitTime: "Submit Time",
    operations: "Operations",
    
    // Operation Buttons
    mix: "Mix",
    download: "Download",
    newWindow: "New Window",
    remixAction: "Remix",
    
    // Status
    completed: "Completed",
    failed: "Failed",
    generating: "Generating",
    noStoryboard: "No Storyboard",
    textVideo: "Text Video",
    
    // Settings
    apiSettings: "API Settings",
    modelSettings: "Model Settings",
    agentSettings: "Agent Settings",
    themeSettings: "Theme Settings",
    
    // API Settings
    apiServerUrl: "API Server URL",
    apiKey: "API Key",
    apiServerDescription: "Send video generation requests to this server",
    
    // Model Settings
    aiModelConfig: "AI Model Configuration",
    modelName: "Model Name",
    provider: "Provider",
    apiEndpoint: "API Endpoint",
    customPrompt: "Custom Prompt Template",
    enabled: "Enabled",
    
    // Agent Settings
    agentManagement: "Agent Management",
    addAgent: "Add Agent",
    agentName: "Agent Name",
    agentDescription: "Description",
    agentIcon: "Icon",
    agentModel: "Model",
    agentKnowledge: "Knowledge Base",
    agentInstructions: "System Instructions",
    agentPromptTemplate: "Prompt Template",
    
    // Theme Settings
    themeMode: "Theme Mode",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    autoMode: "Auto",
    accentColor: "Accent Color",
    
    // Account
    accountManagement: "Account Management",
    login: "Login",
    register: "Register",
    username: "Username",
    password: "Password",
    email: "Email",
    
    // Notifications
    loginSuccess: "Login successful",
    registerSuccess: "Registration successful",
    settingsSaved: "Settings saved",
    taskSubmitted: "Task submitted",
    agentAdded: "Agent added",
    agentUpdated: "Agent updated",
    agentDeleted: "Agent deleted",
  },
  th: {
    // ทั่วไป
    save: "บันทึก",
    cancel: "ยกเลิก",
    delete: "ลบ",
    edit: "แก้ไข",
    add: "เพิ่ม",
    close: "ปิด",
    confirm: "ยืนยัน",
    
    // เมนูด้านบน
    appName: "แพลตฟอร์มสร้างวิดีโอ AI",
    settings: "การตั้งค่า",
    account: "บัญชี",
    
    // พารามิเตอร์ทั่วไป
    aiModel: "โมเดล AI",
    agent: "ตัวแทน",
    selectAgent: "เลือกตัวแทน",
    quality: "คุณภาพ",
    orientation: "การวางแนว",
    duration: "ระยะเวลา",
    batchGenerate: "สร้างเป็นชุด",
    
    // พื้นที่แก้ไข
    editArea: "พื้นที่แก้ไข",
    addPrompt: "เพิ่มพรอมต์",
    video: "วิดีโอ",
    textToVideo: "ข้อความ",
    imageToVideo: "รูปภาพ",
    basedOnRemix: "อิงจาก",
    remix: "รีมิกซ์",
    
    // การดำเนินการพรอมต์
    promptPlaceholder: "ป้อนพรอมต์วิดีโอ หรือเลือกตัวแทนเพื่อสร้างอัตโนมัติ...",
    addVideoPrompt: "เพิ่มพรอมต์วิดีโอ",
    storyboard: "สตอรี่บอร์ด",
    aiGenerate: "สร้างด้วย AI",
    aiOptimize: "ปรับปรุงด้วย AI",
    generate: "สร้าง",
    selectRemixVideo: "เลือกวิดีโอรีมิกซ์",
    selectVideoToRemix: "เลือกวิดีโอที่จะรีมิกซ์",
    storyThemeGenerate: "สร้างธีมเรื่องราว",
    
    // ประวัติ
    history: "ประวัติ",
    records: "บันทึก",
    page: "หน้า",
    of: "/",
    pageUnit: "",
    typeImage: "ประเภท/รูปภาพ",
    prompt: "พรอมต์",
    storyboardCount: "สตอรี่บอร์ด",
    params: "พารามิเตอร์",
    progress: "ความคืบหน้า",
    videoPreview: "ตัวอย่างวิดีโอ",
    submitTime: "เวลาส่ง",
    operations: "การดำเนินการ",
    
    // ปุ่มดำเนินการ
    mix: "ผสม",
    download: "ดาวน์โหลด",
    newWindow: "หน้าต่างใหม่",
    remixAction: "รีมิกซ์",
    
    // สถานะ
    completed: "เสร็จสมบูรณ์",
    failed: "ล้มเหลว",
    generating: "กำลังสร้าง",
    noStoryboard: "ไม่มีสตอรี่บอร์ด",
    textVideo: "วิดีโอจากข้อความ",
    
    // การตั้งค่า
    apiSettings: "การตั้งค่า API",
    modelSettings: "การตั้งค่าโมเดล",
    agentSettings: "การตั้งค่าตัวแทน",
    themeSettings: "การตั้งค่าธีม",
    
    // การตั้งค่า API
    apiServerUrl: "URL เซิร์ฟเวอร์ API",
    apiKey: "คีย์ API",
    apiServerDescription: "ส่งคำขอสร้างวิดีโอไปยังเซิร์ฟเวอร์นี้",
    
    // การตั้งค่าโมเดล
    aiModelConfig: "การกำหนดค่าโมเดล AI",
    modelName: "ชื่อโมเดล",
    provider: "ผู้ให้บริการ",
    apiEndpoint: "จุดสิ้นสุด API",
    customPrompt: "เทมเพลตพรอมต์ที่กำหนดเอง",
    enabled: "เปิดใช้งาน",
    
    // การตั้งค่าตัวแทน
    agentManagement: "การจัดการตัวแทน",
    addAgent: "เพิ่มตัวแทน",
    agentName: "ชื่อตัวแทน",
    agentDescription: "คำอธิบาย",
    agentIcon: "ไอคอน",
    agentModel: "โมเดล",
    agentKnowledge: "ฐานความรู้",
    agentInstructions: "คำสั่งระบบ",
    agentPromptTemplate: "เทมเพลตพรอมต์",
    
    // การตั้งค่าธีม
    themeMode: "โหมดธีม",
    darkMode: "โหมดมืด",
    lightMode: "โหมดสว่าง",
    autoMode: "อัตโนมัติ",
    accentColor: "สีหลัก",
    
    // บัญชี
    accountManagement: "การจัดการบัญชี",
    login: "เข้าสู่ระบบ",
    register: "ลงทะเบียน",
    username: "ชื่อผู้ใช้",
    password: "รหัสผ่าน",
    email: "อีเมล",
    
    // การแจ้งเตือน
    loginSuccess: "เข้าสู่ระบบสำเร็จ",
    registerSuccess: "ลงทะเบียนสำเร็จ",
    settingsSaved: "บันทึกการตั้งค่าแล้ว",
    taskSubmitted: "ส่งงานแล้ว",
    agentAdded: "เพิ่มตัวแทนแล้ว",
    agentUpdated: "อัปเดตตัวแทนแล้ว",
    agentDeleted: "ลบตัวแทนแล้ว",
  },
};

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.zh;
