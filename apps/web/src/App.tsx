import { useState, useRef, useEffect } from "react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import {
  Settings,
  User,
  Sparkles,
  Blend,
  Download,
  History,
  RefreshCw,
  Trash2,
  Upload,
  Edit2,
  X,
  Plus,
  Wand2,
  Video,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Palette,
  Cpu,
  Zap,
  Globe,
  Server,
  UserCircle,
} from "lucide-react";
import { Progress } from "./components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { Badge } from "./components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { toast } from "sonner";
import { Separator } from "./components/ui/separator";
import { ScrollArea } from "./components/ui/scroll-area";
import { Toaster } from "./components/ui/sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "./components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { translations, Language, TranslationKey } from "./i18n";
import { createVideo, getVideoStatus, listVideos, yijiaChat, chatProvider, testGeminiKey, testDeepseekKey, getUserSettings, saveUserSettings, getUserModels, saveUserModels, listAgents, createAgentApi, updateAgentApi, deleteAgentApi, getUserCharacters, saveUserCharacters, createCharacterApi, listCharactersApi, testLineBase } from "./services/sora";

const providerForModel = (id: string) => {
  if (id?.toLowerCase().includes("deepseek")) return "deepseek";
  if (id?.toLowerCase().startsWith("gemini")) return "gemini";
  return "openai";
};

const normalizeProvider = (p?: string, id?: string) => {
  const s = String(p || "").toLowerCase();
  if (s.includes("deepseek")) return "deepseek";
  if (s.includes("gemini") || s.includes("google")) return "gemini";
  if (s.includes("openai")) return "openai";
  return providerForModel(id || "");
};

const defaultModelForProvider = (provider: string) => {
  if (provider === "deepseek") return "deepseek-chat";
  if (provider === "gemini") return "gemini-3-pro-preview";
  return "gpt-4o-mini";
};

const isRecognizedModelId = (provider: string, id?: string) => {
  const s = String(id || "").toLowerCase();
  if (!s) return false;
  if (provider === "deepseek") return s.includes("deepseek");
  if (provider === "gemini") return s.startsWith("gemini");
  if (provider === "openai") return s.startsWith("gpt");
  return false;
};

const resolveProviderModelId = (activeModel: AIModelConfig, selectedModelId: string, agent?: Agent) => {
  const provider = normalizeProvider(activeModel.provider, activeModel.id || selectedModelId);
  if (isRecognizedModelId(provider, activeModel.id)) return activeModel.id;
  if (agent && isRecognizedModelId(provider, agent.model)) return agent.model;
  return defaultModelForProvider(provider);
};

const getModelById = (models: AIModelConfig[], id?: string) => {
  if (!id) return undefined as any;
  return models.find((m) => String(m.id) === String(id));
};

const pickActiveModel = (models: AIModelConfig[], selectedModelId: string, agents: Agent[], agentId?: string) => {
  const direct = getModelById(models, selectedModelId);
  if (direct) return direct;
  const ag = agents.find((a) => String(a.id) === String(agentId || "")) || agents.find((a) => String(a.id) === String(agentId || ""));
  const bind = ag ? getModelById(models, ag.model) : undefined;
  if (bind) return bind;
  return models.find((m) => m.enabled) || models[0];
};

interface Storyboard {
  id: string;
  prompt: string;
}

interface DraftTask {
  id: string;
  type: "text-to-video" | "image-to-video";
  prompt: string;
  image?: string;
  storyboards: Storyboard[];
  remixVideoId?: string;
}

interface SubmittedTask {
  id: string;
  type: "text-to-video" | "image-to-video";
  prompt: string;
  image?: string;
  storyboards: Storyboard[];
  quality: string;
  duration: string;
  orientation: string;
  aiModel: string;
  status: "generating" | "completed" | "failed";
  progress: number;
  videoUrl?: string;
  submitTime: string;
  remixVideoId?: string;
  externalId?: string;
}

interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  apiEndpoint: string;
  customPrompt: string;
  enabled: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  provider?: string;
  model: string;
  knowledge: string;
  instructions: string;
  promptTemplate: string;
}

interface Character {
  id: string;
  name: string;
  avatar: string;
  description?: string;
  startSec?: number;
  endSec?: number;
  videoId?: string;
  soraId?: string;
}

const DEFAULT_CHARACTERS: Character[] = [];

const DEFAULT_AGENTS: Agent[] = [
  {
    id: "agent-comedy",
    name: "搞笑智能体",
    description: "专注于幽默搞笑内容创作",
    icon: "😄",
    provider: "gemini",
    model: "gemini-2.0-flash",
    knowledge: "喜剧理论、幽默技巧、网络梗",
    instructions: "你是一个专业的喜剧内容创作者，善于创造轻松幽默的视频内容",
    promptTemplate: "创作一个幽默搞笑的视频场景，包含意外反转、夸张表演或轻松诙谐的对话",
  },
  {
    id: "agent-relax",
    name: "解压智能体",
    description: "治愈系、放松减压主题",
    icon: "🌸",
    provider: "openai",
    model: "gpt-4",
    knowledge: "冥想、自然疗愈、ASMR",
    instructions: "你是一个专业的疗愈内容创作者，善于创造平静放松的氛围",
    promptTemplate: "创作一个治愈放松的视频场景，包含柔和的画面、舒缓的氛围和平静的元素",
  },
];

const DEFAULT_AI_MODELS: AIModelConfig[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "DeepSeek",
    apiKey: "",
    apiEndpoint: "https://api.deepseek.com/v1",
    customPrompt: "",
    enabled: true,
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    provider: "Google",
    apiKey: "",
    apiEndpoint: "https://generativelanguage.googleapis.com/v1beta",
    customPrompt: "",
    enabled: true,
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    provider: "OpenAI",
    apiKey: "",
    apiEndpoint: "https://api.openai.com/v1",
    customPrompt: "",
    enabled: true,
  },
];

const THEMES = {
  dark: {
    name: "深色模式",
    bg: "bg-slate-950",
    bgSecondary: "bg-slate-900",
    bgTertiary: "bg-slate-800",
    text: "text-slate-50",
    textSecondary: "text-slate-200",
    textMuted: "text-slate-400",
    border: "border-slate-600",
    input: "bg-slate-800 border-slate-600 text-slate-50 placeholder:text-slate-400",
    card: "bg-slate-900/80 border-slate-600",
    hover: "hover:bg-slate-800",
  },
  light: {
    name: "浅色模式",
    bg: "bg-gray-50",
    bgSecondary: "bg-white",
    bgTertiary: "bg-gray-100",
    text: "text-gray-900",
    textSecondary: "text-gray-700",
    textMuted: "text-gray-500",
    border: "border-gray-300",
    input: "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400",
    card: "bg-white border-gray-300",
    hover: "hover:bg-gray-100",
  },
  blue: {
    name: "蓝色主题",
    bg: "bg-blue-950",
    bgSecondary: "bg-blue-900",
    bgTertiary: "bg-blue-800",
    text: "text-blue-50",
    textSecondary: "text-blue-200",
    textMuted: "text-blue-300",
    border: "border-blue-600",
    input: "bg-blue-800 border-blue-600 text-blue-50 placeholder:text-blue-300",
    card: "bg-blue-900/80 border-blue-600",
    hover: "hover:bg-blue-800",
  },
  green: {
    name: "绿色主题",
    bg: "bg-emerald-950",
    bgSecondary: "bg-emerald-900",
    bgTertiary: "bg-emerald-800",
    text: "text-emerald-50",
    textSecondary: "text-emerald-200",
    textMuted: "text-emerald-300",
    border: "border-emerald-600",
    input: "bg-emerald-800 border-emerald-600 text-emerald-50 placeholder:text-emerald-300",
    card: "bg-emerald-900/80 border-emerald-600",
    hover: "hover:bg-emerald-800",
  },
  purple: {
    name: "紫色主题",
    bg: "bg-purple-950",
    bgSecondary: "bg-purple-900",
    bgTertiary: "bg-purple-800",
    text: "text-purple-50",
    textSecondary: "text-purple-200",
    textMuted: "text-purple-300",
    border: "border-purple-600",
    input: "bg-purple-800 border-purple-600 text-purple-50 placeholder:text-purple-300",
    card: "bg-purple-900/80 border-purple-600",
    hover: "hover:bg-purple-800",
  },
};

const ITEMS_PER_PAGE = 10;
const DEFAULT_ROUTES = [
  "https://ai.yijiarj.cn",
  "https://dnssora.78978999.xyz",
];

export default function App() {
  // 国际化和主题
  const [language, setLanguage] = useState<Language>("zh");
  const t = (key: TranslationKey) => translations[language][key];
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>("dark");
  const theme = THEMES[currentTheme];
  
  // 对话框状态
  const [showSettings, setShowSettings] = useState(false);
  const [showStoryboardDialog, setShowStoryboardDialog] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showAgentDialog, setShowAgentDialog] = useState(false);
  const [showModelDialog, setShowModelDialog] = useState(false);
  const [showCharacterDialog, setShowCharacterDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editingModel, setEditingModel] = useState<AIModelConfig | null>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState("");
  const [previewOriginalUrl, setPreviewOriginalUrl] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [settingsTab, setSettingsTab] = useState("api");
  const [selectedAgentForOptimize, setSelectedAgentForOptimize] = useState<string>("");
  const [focusedDraftId, setFocusedDraftId] = useState<string | null>(null);
  
  // 数据状态
  const [aiModels, setAiModels] = useState<AIModelConfig[]>([]);
  const [selectedAiModel, setSelectedAiModel] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [characters, setCharacters] = useState<Character[]>([]);
  
  // 表单状态
  const [newAgent, setNewAgent] = useState<Agent>({
    id: "",
    name: "",
    description: "",
    icon: "🤖",
    provider: providerForModel("gemini-2.0-flash"),
    model: "gemini-2.0-flash",
    knowledge: "",
    instructions: "",
    promptTemplate: "",
  });
  
  const [newModel, setNewModel] = useState<AIModelConfig>({
    id: "",
    name: "",
    provider: "",
    apiKey: "",
    apiEndpoint: "",
    customPrompt: "",
    enabled: true,
  });

  const [newCharacter, setNewCharacter] = useState<Character>({
    id: "",
    name: "",
    avatar: "",
    description: "",
    startSec: 0,
    endSec: 3,
    videoId: "",
    soraId: "",
  });
  const [characterVideoId, setCharacterVideoId] = useState<string>("");
  const [characterDialogMode, setCharacterDialogMode] = useState<"add" | "generate">("add");
  const [characterBusy, setCharacterBusy] = useState(false);
  const [editingCharacterOriginalId, setEditingCharacterOriginalId] = useState<string>("");

  const normalizeAgentFromServer = (raw: any): Agent => {
    const model = raw?.model || raw?.parameters?.model || selectedAiModel || "deepseek-chat";
    return {
      id: String(raw?.id ?? raw?.uuid ?? raw?.name ?? `agent-${Date.now()}`),
      name: raw?.name || "",
      description: raw?.description || raw?.parameters?.description || "",
      icon: raw?.icon || raw?.parameters?.icon || "🤖",
      provider: raw?.provider || raw?.parameters?.provider || providerForModel(model),
      model,
      knowledge: raw?.knowledge || raw?.parameters?.knowledge || "",
      instructions: raw?.instructions || raw?.system_prompt || raw?.parameters?.instructions || "",
      promptTemplate: raw?.prompt_template || raw?.promptTemplate || raw?.parameters?.prompt_template || raw?.parameters?.promptTemplate || "",
    };
  };

  const agentToApiPayload = (agent: Agent) => ({
    name: agent.name,
    provider: agent.provider || providerForModel(agent.model),
    model: agent.model,
    description: agent.description,
    icon: agent.icon,
    knowledge: agent.knowledge,
    instructions: agent.instructions,
    prompt_template: agent.promptTemplate,
    parameters: { promptTemplate: agent.promptTemplate, description: agent.description, icon: agent.icon, knowledge: agent.knowledge },
  });
  
  // 参数设置
  const [globalQuality, setGlobalQuality] = useState("普清");
  const [globalDuration, setGlobalDuration] = useState("10s");
  const [globalOrientation, setGlobalOrientation] = useState("横屏");
  
  // API设置
  const [apiServerUrl, setApiServerUrl] = useState("");
  const [apiServerKey, setApiServerKey] = useState("");
  const [apiRoutes, setApiRoutes] = useState<string[]>(DEFAULT_ROUTES);
  const [selectedRoute, setSelectedRoute] = useState<string>(DEFAULT_ROUTES[0]);
  useEffect(() => {
    if (!apiServerUrl && selectedRoute) setApiServerUrl(selectedRoute);
  }, [selectedRoute]);
  const VIDEO_LINE_OPTIONS = ["http://38.102.232.8:3000", "http://69.33.3.222:3000", "http://43.224.35.24:3000"];
  const [selectedVideoLine, setSelectedVideoLine] = useState<string>(() => {
    try { return localStorage.getItem("videoLineSelected") || VIDEO_LINE_OPTIONS[2]; } catch { return VIDEO_LINE_OPTIONS[2]; }
  });
  const [lineStatuses, setLineStatuses] = useState<Record<string, "unknown" | "ok" | "fail" | "loading">>({});
  const [lineSwitching, setLineSwitching] = useState(false);
  const [lineLatency, setLineLatency] = useState<Record<string, number>>({});

  const refreshLineStatuses = async () => {
    const opts = VIDEO_LINE_OPTIONS;
    setLineStatuses((s) => {
      const next = { ...s } as any;
      opts.forEach((o) => { next[o] = "loading"; });
      return next;
    });
    await Promise.all(opts.map(async (o) => {
      const start = performance.now();
      try {
        const r = await testLineBase(o);
        const ms = Math.round(performance.now() - start);
        setLineStatuses((s) => ({ ...s, [o]: r?.ok ? "ok" : "fail" }));
        setLineLatency((lat) => ({ ...lat, [o]: ms }));
        toast.info(`${o} ${r?.ok ? "可用" : "不可用"} (${ms}ms)`);
      } catch {
        const ms = Math.round(performance.now() - start);
        setLineStatuses((s) => ({ ...s, [o]: "fail" }));
        setLineLatency((lat) => ({ ...lat, [o]: ms }));
        toast.info(`${o} 不可用 (${ms}ms)`);
      }
    }));
  };

  const switchLine = async (base: string) => {
    if (lineSwitching) return;
    setLineSwitching(true);
    setSelectedVideoLine(base);
    setLineStatuses((s) => ({ ...s, [base]: "loading" }));
    try {
      const start = performance.now();
      const r = await testLineBase(base);
      const ms = Math.round(performance.now() - start);
      setLineLatency((lat) => ({ ...lat, [base]: ms }));
      setLineStatuses((s) => ({ ...s, [base]: r?.ok ? "ok" : "fail" }));
    } catch {
      setLineStatuses((s) => ({ ...s, [base]: "fail" }));
    }
    try { localStorage.setItem("videoLineSelected", base); } catch {}
    try { await saveUserSettings({ video_line_base: base }); } catch {}
    setLineSwitching(false);
    toast.success("线路已切换");
  };

  useEffect(() => {
    if (settingsTab === "api") {
      refreshLineStatuses();
    }
  }, [settingsTab]);
  
  // 任务数据
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([
    {
      id: "draft-1",
      type: "text-to-video",
      prompt: "",
      storyboards: [],
    },
  ]);

  const [submittedTasks, setSubmittedTasks] = useState<SubmittedTask[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  
  const [tempStoryboards, setTempStoryboards] = useState<Storyboard[]>([]);
  const promptInputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    // 服务器设置
    (async () => {
      try {
        const r = await getUserSettings();
        const s = r?.data || {};
        if (s.client_api_key) {
          setApiServerKey(s.client_api_key);
          try { localStorage.setItem("clientApiKey", s.client_api_key); } catch {}
        }
        if (s.default_ai_model) {
          setSelectedAiModel(s.default_ai_model);
          try { localStorage.setItem("defaultAiModel", s.default_ai_model); } catch {}
        }
        if (s.language) {
          setLanguage(s.language as Language);
        }
        if (s.theme) {
          setCurrentTheme(s.theme as keyof typeof THEMES);
        }
        if (s.api_server_url) {
          setApiServerUrl(s.api_server_url);
          setSelectedRoute(s.api_server_url);
          try { localStorage.setItem("clientApiServer", s.api_server_url); } catch {}
        }
        if (Array.isArray(s.api_routes)) {
          setApiRoutes(s.api_routes);
          try { localStorage.setItem("apiRoutes", JSON.stringify(s.api_routes)); } catch {}
        }
        try {
          const pStd = localStorage.getItem("preferredStdModel") || "";
          const pHd = localStorage.getItem("preferredHdModel") || "";
          if (pStd) setPreferredStandardModel(pStd);
          if (pHd) setPreferredHdModel(pHd);
        } catch {}
        if (s.video_line_base) {
          setSelectedVideoLine(s.video_line_base);
          try { localStorage.setItem("videoLineSelected", s.video_line_base); } catch {}
        }
      } catch {}
      try {
        const lk = localStorage.getItem("clientApiKey") || "";
        if (lk && lk.trim()) setApiServerKey(lk);
      } catch {}
      try {
        const ls = localStorage.getItem("clientApiServer") || "";
        if (ls && ls.trim()) { setApiServerUrl(ls); setSelectedRoute(ls); }
      } catch {}
    })();
    try {
      const localModels = JSON.parse(localStorage.getItem("aiModels") || "[]");
      if (Array.isArray(localModels) && localModels.length) {
        const uniq = Object.values(Object.fromEntries(localModels.map((m: any) => [String(m.id || m.name || Date.now()), m])));
        setAiModels(uniq as any);
      }
    } catch {}
    (async () => {
      try {
        const r = await getUserModels();
        const list = r?.data;
        if (Array.isArray(list) && list.length) {
          const uniq = Object.values(Object.fromEntries(list.map((m: any) => [String(m.id || m.name || Date.now()), m])));
          const baseModels = [
            { id: "sora-2-yijia", name: "sora-2-yijia", enabled: true },
            { id: "sora-2-landscape-yijia", name: "sora-2-landscape-yijia", enabled: true },
            { id: "sora-2-15s-yijia", name: "sora-2-15s-yijia", enabled: true },
            { id: "sora-2-landscape-15s-yijia", name: "sora-2-landscape-15s-yijia", enabled: true },
            { id: "sora-2-pro-10s-large-yijia", name: "sora-2-pro-10s-large-yijia", enabled: true },
            { id: "sora-2-pro-landscape-10s-large-yijia", name: "sora-2-pro-landscape-10s-large-yijia", enabled: true },
            { id: "sora-2-pro-15s-large-yijia", name: "sora-2-pro-15s-large-yijia", enabled: true },
            { id: "sora-2-pro-landscape-15s-large-yijia", name: "sora-2-pro-landscape-15s-large-yijia", enabled: true },
            { id: "sora-2-pro-25s-yijia", name: "sora-2-pro-25s-yijia", enabled: true },
            { id: "sora-2-pro-landscape-25s-yijia", name: "sora-2-pro-landscape-25s-yijia", enabled: true },
          ];
          const merged = Object.values(Object.fromEntries([...uniq, ...baseModels].map((m: any) => [String(m.id || m.name), m])));
          setAiModels(merged as any);
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await getUserCharacters();
        const list = r?.data;
        if (Array.isArray(list) && list.length) {
          setCharacters(list);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try {
      if (!selectedAiModel && aiModels.length > 0) {
        const first = aiModels.find(m => m.enabled) || aiModels[0];
        if (first && first.id) {
          setSelectedAiModel(String(first.id));
          try { localStorage.setItem("defaultAiModel", String(first.id)); } catch {}
        }
      }
    } catch {}
  }, [aiModels]);

  useEffect(() => {
    if (!apiServerKey) return;
    (async () => {
      try {
        const r = await getUserModels();
        const list = r?.data;
        let fromLocal: AIModelConfig[] = [];
        try { fromLocal = JSON.parse(localStorage.getItem("aiModels") || "[]"); } catch { fromLocal = []; }
        const merged = Array.isArray(list) && list.length ? list : fromLocal;
        const uniq = Object.values(Object.fromEntries((merged || []).map((m) => [String(m.id || m.name || Date.now()), m])));
        setAiModels(uniq as any);
      } catch {}
    })();
  }, [apiServerKey]);

  useEffect(() => {
    (async () => {
      try {
        const r = await getUserCharacters();
        const list = r?.data;
        if (Array.isArray(list)) {
          setCharacters(list);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await saveUserSettings({
          default_ai_model: selectedAiModel,
          client_api_key: (apiServerKey && apiServerKey.trim()) ? apiServerKey : undefined as any,
          api_server_url: (apiServerUrl && apiServerUrl.trim()) ? apiServerUrl : undefined as any,
          api_routes: apiRoutes,
          language,
          theme: currentTheme,
        }, apiServerKey || undefined);
      } catch {}
    })();
  }, [language, currentTheme]);

  useEffect(() => {
    (async () => {
      try {
        const r = await listAgents();
        const list = Array.isArray(r?.data) ? r.data.map(normalizeAgentFromServer) : [];
        const uniq = Object.values(Object.fromEntries(list.map((a) => [String(a.id), a])));
        setAgents(uniq);
        if (!selectedAgent && uniq[0]) setSelectedAgent(String(uniq[0].id));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!selectedAgentForOptimize && agents.length > 0) {
      setSelectedAgentForOptimize(selectedAgent || agents[0].id);
    }
  }, [agents, selectedAgent, selectedAgentForOptimize]);

  // 分页计算
  const totalPages = Math.ceil(submittedTasks.length / ITEMS_PER_PAGE);
  const paginatedTasks = submittedTasks.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // 按提供商分组模型
  const modelsByProvider = aiModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModelConfig[]>);

  // ===== 模型管理函数 =====
  const addModel = () => {
    if (!newModel.name || !newModel.provider) {
      toast.error("请填写模型名称和提供商");
      return;
    }
    const model: AIModelConfig = {
      ...newModel,
      id: `model-${Date.now()}`,
    };
    const next = [...aiModels, model];
    setAiModels(next);
    try { localStorage.setItem("aiModels", JSON.stringify(next)); } catch {}
    (async () => {
      try {
        const r = await saveUserModels(next);
        if (r?.success === false) {
          toast.error("保存模型失败：请先在本站API设置中绑定Yijia Key");
        } else {
          const c = r?.changes || {};
          if (typeof c.added === "number" || typeof c.removed === "number" || typeof c.updated === "number") {
            toast.success(`模型已保存（新增${c.added || 0}，删除${c.removed || 0}，更新${c.updated || 0}）`);
          }
        }
      } catch { toast.error("保存模型失败"); }
    })();
    setShowModelDialog(false);
    try {
      if (model.provider === "Google" && model.apiKey) {
        localStorage.setItem("defaultAiModel", model.id);
        toast.success("已设为默认 Gemini 模型");
      }
    } catch {}
    setNewModel({
      id: "",
      name: "",
      provider: "",
      apiKey: "",
      apiEndpoint: "",
      customPrompt: "",
      enabled: true,
    });
    toast.success("模型已添加");
  };

  const updateModelConfig = () => {
    if (!editingModel) return;
    const next = aiModels.map(m => m.id === editingModel.id ? editingModel : m);
    setAiModels(next);
    try { localStorage.setItem("aiModels", JSON.stringify(next)); } catch {}
    (async () => {
      try {
        const r = await saveUserModels(next);
        if (r?.success === false) {
          toast.error("保存模型失败：请先在本站API设置中绑定Yijia Key");
        } else {
          const c = r?.changes || {};
          if (typeof c.added === "number" || typeof c.removed === "number" || typeof c.updated === "number") {
            toast.success(`模型已保存（新增${c.added || 0}，删除${c.removed || 0}，更新${c.updated || 0}）`);
          }
        }
      } catch { toast.error("保存模型失败"); }
    })();
    setShowModelDialog(false);
    setEditingModel(null);
    toast.success("模型已更新");
  };

  const deleteModel = (id: string) => {
    const next = aiModels.filter(m => m.id !== id);
    setAiModels(next);
    try { localStorage.setItem("aiModels", JSON.stringify(next)); } catch {}
    (async () => {
      try {
        const r = await saveUserModels(next);
        if (r?.success === false) {
          toast.error("保存模型失败：请先在本站API设置中绑定Yijia Key");
        } else {
          const c = r?.changes || {};
          if (typeof c.added === "number" || typeof c.removed === "number" || typeof c.updated === "number") {
            toast.success(`模型已保存（新增${c.added || 0}，删除${c.removed || 0}，更新${c.updated || 0}）`);
          }
        }
      } catch { toast.error("保存模型失败"); }
    })();
    toast.success("模型已删除");
  };

  // ===== 智能体管理函数 =====
  const addAgent = async () => {
    if (!newAgent.name || !newAgent.promptTemplate) {
      toast.error("请填写智能体名称和提示词模板");
      return;
    }
    const agent: Agent = { ...newAgent, id: `agent-${Date.now()}`, provider: newAgent.provider || providerForModel(newAgent.model) };
    try {
      const created = await createAgentApi(agentToApiPayload(agent));
      const serverId = created?.id || created?.data?.id;
      const stored = { ...agent, id: serverId ? String(serverId) : agent.id };
      const next = [...agents, stored];
      setAgents(next);
      setSelectedAgent(stored.id);
      setShowAgentDialog(false);
      setNewAgent({
        id: "",
        name: "",
        description: "",
        icon: "🤖",
        provider: providerForModel("gemini-2.0-flash"),
        model: "gemini-2.0-flash",
        knowledge: "",
        instructions: "",
        promptTemplate: "",
      });
      toast.success(t("agentAdded"));
    } catch (err) {
      console.error("create agent failed", err);
      toast.error("创建智能体失败，请稍后重试");
    }
  };

  const updateAgent = async () => {
    if (!editingAgent) return;
    const payload = agentToApiPayload(editingAgent);
    try {
      const res = await updateAgentApi(editingAgent.id, payload);
      if (res?.success === false) throw new Error("update failed");
      const nextId = res?.id ? String(res.id) : editingAgent.id;
      const updated = { ...editingAgent, id: nextId };
      setAgents(agents.map(a => a.id === editingAgent.id ? updated : a));
      setSelectedAgent(nextId);
      setShowAgentDialog(false);
      setEditingAgent(null);
      toast.success(t("agentUpdated"));
    } catch (err) {
      console.error("update agent failed", err);
      toast.error("更新智能体失败");
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const res = await deleteAgentApi(id);
      if (res?.success === false) throw new Error("delete failed");
      setAgents(agents.filter(a => a.id !== id));
      if (selectedAgent === id) setSelectedAgent("");
      toast.success(t("agentDeleted"));
    } catch (err) {
      console.error("delete agent failed", err);
      toast.error("删除智能体失败");
    }
  };

  // ===== 角色管理函数 =====
  const addCharacter = async () => {
    if (!newCharacter.name || !newCharacter.id) {
      toast.error("请填写角色名称和ID");
      return;
    }
    if (!newCharacter.avatar) {
      toast.error("请上传角色头像");
      return;
    }
    if (characters.some(c => String(c.id) === String(newCharacter.id))) {
      toast.error("角色ID已存在，请更换");
      return;
    }
    const character: Character = {
      ...newCharacter,
      soraId: newCharacter.id,
    };
    const next = [...characters, character];
    setCharacters(next);
    await saveUserCharacters(next);
    setShowCharacterDialog(false);
    setNewCharacter({
      id: "",
      name: "",
      avatar: "",
      description: "",
      startSec: 0,
      endSec: 3,
      videoId: "",
      soraId: "",
    });
    toast.success("角色已添加");
  };

  const updateCharacter = async () => {
    if (!editingCharacter) return;
    const originalId = editingCharacterOriginalId || editingCharacter.id;
    const next = characters.map(c => c.id === originalId ? editingCharacter : c);
    setCharacters(next);
    await saveUserCharacters(next);
    setShowCharacterDialog(false);
    setEditingCharacter(null);
    setEditingCharacterOriginalId("");
    toast.success("角色已更新");
  };

  const deleteCharacter = async (id: string) => {
    const next = characters.filter(c => c.id !== id);
    setCharacters(next);
    await saveUserCharacters(next);
    toast.success("角色已删除");
  };

  const generateCharacter = async () => {
    if (characterBusy) return;
    const instruction_value = String(newCharacter.description || "").trim();
    const video_id = String(newCharacter.videoId || characterVideoId || "").trim();
    const uuidRaw = String(newCharacter.id || "").trim();
    const uuidSeed = uuidRaw || `char${Date.now().toString(36)}`;
    const uuid = uuidSeed.replace(/[^A-Za-z0-9._]/g, "");
    if (!uuid) {
      toast.error("请填写有效的角色ID");
      return;
    }
    if (characters.some(c => String(c.id) === String(uuid))) {
      toast.error("角色ID已存在，请更换");
      return;
    }
    const start = Number(newCharacter.startSec ?? 0);
    const end = Number(newCharacter.endSec ?? 3);
    const timestamps = `${start}-${end}`;
    if (!instruction_value) {
      toast.error("请填写角色描述");
      return;
    }
    if (!video_id) {
      toast.error("请填写或选择关联视频ID");
      return;
    }
    if (!(end > start) || end - start > 3 || start < 0) {
      toast.error("请设置正确的截取时长（最长3秒，结束秒大于起始秒）");
      return;
    }
    try {
      setCharacterBusy(true);
      const r = await createCharacterApi({ instruction_value, timestamps, video_id, uuid });
      const payload = r?.data || {};
      const sid = payload?.uuid || r?.uuid || uuid;
      if (!r || r.success !== true || !payload?.uuid) {
        const detail = String(r?.error || r?.detail || r?.body || "").slice(0, 300);
        throw new Error(detail || "创建角色请求被拒绝或参数无效");
      }
      setNewCharacter({ ...newCharacter, id: sid, soraId: sid });
      toast.info("角色创建中，请稍候...");
      const deadline = Date.now() + 180000;
      let createdOk = false;
      let lastStatus = 0;
      while (Date.now() < deadline) {
        await new Promise(res => setTimeout(res, 2000));
        try {
          const stRes = await getCharacterStatusApi(sid);
          const payload = stRes?.data || stRes;
          const st = Number(payload?.status ?? 0);
          lastStatus = st;
          if (st === 999) { createdOk = true; break; }
          if (st === -1) { break; }
        } catch {}
      }
      if (createdOk) {
        if (characters.some(c => String(c.id) === String(sid))) {
          toast.error("角色ID已存在，请换一个ID");
          return;
        }
        const next = [...characters, { ...newCharacter, id: sid, soraId: sid }];
        setCharacters(next);
        await saveUserCharacters(next);
        setShowCharacterDialog(false);
        toast.success("角色生成成功并已保存");
      } else {
        if (lastStatus === -1) {
          toast.error("角色生成失败，请稍后在角色列表重试");
        } else {
          toast.error("角色生成超时，请稍后在角色列表重试");
        }
      }
    } catch (err: any) {
      toast.error(`角色生成失败：${String(err?.message || err)}`);
    } finally {
      setCharacterBusy(false);
    }
  };

  const handleCharacterAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editingCharacter) {
          setEditingCharacter({ ...editingCharacter, avatar: reader.result as string });
        } else {
          setNewCharacter({ ...newCharacter, avatar: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ===== 任务管理函数 =====
  const updateDraft = (draftId: string, updates: Partial<DraftTask>) => {
    setDraftTasks(draftTasks.map((d) => (d.id === draftId ? { ...d, ...updates } : d)));
  };

  const addNewDraft = (basedOnDraft?: DraftTask) => {
    const newDraft: DraftTask = basedOnDraft ? {
      id: `draft-${Date.now()}`,
      type: basedOnDraft.type,
      prompt: basedOnDraft.prompt,
      image: basedOnDraft.image,
      storyboards: [...basedOnDraft.storyboards],
      remixVideoId: basedOnDraft.remixVideoId,
    } : {
      id: `draft-${Date.now()}`,
      type: "text-to-video",
      prompt: "",
      storyboards: [],
    };
    setDraftTasks([...draftTasks, newDraft]);
    toast.success("已添加新的视频提示词");
  };

  const deleteDraft = (draftId: string) => {
    if (draftTasks.length === 1) {
      toast.error("至少保留一个输入框");
      return;
    }
    setDraftTasks(draftTasks.filter((d) => d.id !== draftId));
    toast.success("已删除");
  };

  const insertCharacterAtCursor = (charId: string, draftId?: string) => {
    // 使用传入的draftId或focusedDraftId或第一个draft
    const targetDraftId = draftId || focusedDraftId || (draftTasks.length > 0 ? draftTasks[0].id : null);
    
    if (!targetDraftId) {
      toast.error("请先选择或创建一个视频输入框");
      return;
    }
    
    const draft = draftTasks.find((d) => d.id === targetDraftId);
    
    if (!draft) {
      toast.error("未找到对应的编辑框");
      return;
    }
    
    // 获取当前文本
    const currentText = draft.prompt || "";
    
    // 尝试获取 textarea 和光标位置
    const textarea = promptInputRefs.current[targetDraftId];
    let newText = "";
    let cursorPosition = currentText.length;
    
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      newText = currentText.substring(0, start) + `@${charId} ` + currentText.substring(end);
      cursorPosition = start + charId.length + 2;
    } else {
      // 如果没有 textarea，就添加到末尾
      newText = currentText + (currentText ? " " : "") + `@${charId} `;
      cursorPosition = newText.length;
    }
    
    // 更新 draft
    updateDraft(targetDraftId, { prompt: newText });
    
    // 尝试聚焦到 textarea
    setTimeout(() => {
      const textarea = promptInputRefs.current[targetDraftId];
      if (textarea) {
        textarea.focus();
        textarea.selectionStart = cursorPosition;
        textarea.selectionEnd = cursorPosition;
      }
    }, 50);
    
    const char = characters.find(c => c.id === charId);
    toast.success(`已插入角色 @${charId}${char ? ` (${char.name})` : ''}`);
  };

  const useAgent = (agentId: string, draftId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    toast.info(`使用智能体：${agent.name}`);
    setTimeout(() => {
      updateDraft(draftId, { prompt: agent.promptTemplate });
      toast.success(`${agent.name} 已生成提示词`);
    }, 1000);
  };

  const aiGenerate = async (draftId: string) => {
    if (aiBusy) return;
    const draft = draftTasks.find((d) => d.id === draftId);
    if (!draft) return;
    const activeModel = pickActiveModel(aiModels, selectedAiModel, agents, selectedAgent);
    if (!activeModel) { toast.error("请先在模型设置中选择并配置模型"); return; }
    if (!String(activeModel.apiKey || "").trim()) { toast.error("当前模型未配置 API Key"); return; }
    toast.info(`使用 ${activeModel.name} 生成提示词...`);
    try {
      setAiBusy(true);
      const provider = normalizeProvider(activeModel.provider, activeModel.id || selectedAiModel);
      const agent = agents.find(a => a.id === selectedAgent);
      const systemPrompt = agent ? [
        agent.description || "",
        agent.knowledge ? `知识库: ${agent.knowledge}` : "",
        agent.instructions || "",
        agent.promptTemplate ? `模板: ${agent.promptTemplate}` : "",
        "直接返回用于图生视频的中文提示词。",
      ].filter(Boolean).join("\n") : "你是一个提示词生成助手，请直接输出用于图生视频的中文提示词。";
      const userPrompt = agent?.promptTemplate
        ? (agent.promptTemplate.replace(/\{\{user_topic\}\}/g, draft.prompt).replace(/\{\{prompt\}\}/g, draft.prompt) || draft.prompt)
        : (draft.prompt.trim() || "请生成一个简洁、可直接用于图生视频的中文提示词");
      const res = await chatProvider({
        provider,
        model: resolveProviderModelId(activeModel, selectedAiModel, agent),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        apiKey: activeModel.apiKey || undefined,
        endpoint: activeModel.apiEndpoint || undefined,
      });
      const content = String(res?.content || "").trim();
      if (content) {
        updateDraft(draftId, { prompt: content });
        toast.success("AI生成完成");
      } else {
        toast.error("AI生成失败");
      }
    } catch (e) {
      toast.error(`AI生成失败：${String(e?.message || e)}`);
    } finally {
      setAiBusy(false);
    }
  };

  const aiOptimize = async (draftId: string) => {
    if (aiBusy) return;
    const draft = draftTasks.find((d) => d.id === draftId);
    if (!draft || !draft.prompt.trim()) {
      toast.error("请先输入提示词");
      return;
    }
    const activeModel = pickActiveModel(aiModels, selectedAiModel, agents, selectedAgentForOptimize || selectedAgent);
    if (!activeModel) { toast.error("请先在模型设置中选择并配置模型"); return; }
    if (!String(activeModel.apiKey || "").trim()) { toast.error("当前模型未配置 API Key"); return; }
    
    const agentId = selectedAgentForOptimize || selectedAgent;
    const agent = agents.find(a => a.id === agentId);
    const agentName = agent ? agent.name : "AI";
    const systemPrompt = agent ? [
      agent.description || "",
      agent.knowledge ? `知识库: ${agent.knowledge}` : "",
      agent.instructions || "",
      agent.promptTemplate ? `模板: ${agent.promptTemplate}` : "",
      "请直接返回优化后的提示词，不要解释。",
    ].filter(Boolean).join("\n") : "你是一个提示词优化助手，请直接输出优化后的提示词。";
    const userPrompt = agent?.promptTemplate
      ? agent.promptTemplate.replace(/\{\{user_topic\}\}/g, draft.prompt).replace(/\{\{prompt\}\}/g, draft.prompt)
      : `请优化如下视频提示词：${draft.prompt}`;
    
    toast.info(`使用 ${agentName} 优化中...`);
    try {
      setAiBusy(true);
      const provider = normalizeProvider(activeModel.provider, activeModel.id || selectedAiModel);
      const res = await chatProvider({
        provider,
        model: resolveProviderModelId(activeModel, selectedAiModel, agent),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        apiKey: activeModel?.apiKey || undefined,
        endpoint: activeModel?.apiEndpoint || undefined,
      });
      const content = String(res?.content || "").trim();
      if (content) {
        updateDraft(draftId, { prompt: content });
        toast.success("AI优化完成");
      } else {
        toast.error("AI优化失败");
      }
    } catch (e) {
      toast.error(`AI优化失败：${String(e?.message || e)}`);
    } finally {
      setAiBusy(false);
    }
  };
  

  // 打开分镜编辑
  const openStoryboardEdit = (draftId: string) => {
    setEditingDraftId(draftId);
    const draft = draftTasks.find((d) => d.id === draftId);
    if (draft) {
      setTempStoryboards(draft.storyboards.length > 0 ? draft.storyboards : [
        { id: Date.now().toString(), prompt: "" }
      ]);
    }
    setShowStoryboardDialog(true);
  };

  // 保存分镜
  const saveStoryboards = () => {
    const validStoryboards = tempStoryboards.filter((s) => s.prompt.trim());
    
    if (editingDraftId) {
      updateDraft(editingDraftId, { storyboards: validStoryboards });
    }
    setShowStoryboardDialog(false);
    setEditingDraftId(null);
    toast.success("分镜已保存");
  };

  // 分镜操作
  const addStoryboard = () => {
    if (tempStoryboards.length < 5) {
      setTempStoryboards([
        ...tempStoryboards,
        { id: Date.now().toString(), prompt: "" },
      ]);
    }
  };

  const removeStoryboard = (id: string) => {
    setTempStoryboards(tempStoryboards.filter((s) => s.id !== id));
  };

  const updateStoryboard = (id: string, prompt: string) => {
    setTempStoryboards(
      tempStoryboards.map((s) => (s.id === id ? { ...s, prompt } : s))
    );
  };

  const aiGenerateStoryboard = async (id: string) => {
    if (aiBusy) return;
    const sb = tempStoryboards.find(s => s.id === id);
    if (!sb) return;
    const activeModel = pickActiveModel(aiModels, selectedAiModel, agents, selectedAgent);
    if (!activeModel) { toast.error("请先在模型设置中选择并配置模型"); return; }
    if (!String(activeModel.apiKey || "").trim()) { toast.error("当前模型未配置 API Key"); return; }
    const provider = normalizeProvider(activeModel.provider, activeModel.id || selectedAiModel);
    const agent = agents.find(a => a.id === selectedAgent);
    const draft = draftTasks.find(d => d.id === editingDraftId);
    const baseInput = sb.prompt || draft?.prompt || "";
    const systemPrompt = agent ? [
      agent.description || "",
      agent.knowledge ? `知识库: ${agent.knowledge}` : "",
      agent.instructions || "",
      agent.promptTemplate ? `模板: ${agent.promptTemplate}` : "",
      "直接返回用于图生视频的中文提示词。",
    ].filter(Boolean).join("\n") : "你是一个提示词生成助手，请直接输出用于图生视频的中文提示词。";
    const userPrompt = agent?.promptTemplate
      ? (agent.promptTemplate.replace(/\{\{user_topic\}\}/g, baseInput).replace(/\{\{prompt\}\}/g, baseInput) || baseInput)
      : (baseInput.trim() || "请生成一个简洁、可直接用于图生视频的中文提示词");
    try {
      setAiBusy(true);
      const res = await chatProvider({
        provider,
        model: resolveProviderModelId(activeModel, selectedAiModel, agent),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        apiKey: activeModel.apiKey || undefined,
        endpoint: activeModel.apiEndpoint || undefined,
      });
      const content = String(res?.content || "").trim();
      if (content) {
        updateStoryboard(id, content);
        toast.success("分镜 AI生成完成");
      } else {
        toast.error("分镜 AI生成失败");
      }
    } catch (e) {
      toast.error(`分镜 AI生成失败：${String(e?.message || e)}`);
    } finally {
      setAiBusy(false);
    }
  };

  const aiOptimizeStoryboard = async (id: string) => {
    if (aiBusy) return;
    const sb = tempStoryboards.find(s => s.id === id);
    if (!sb || !sb.prompt.trim()) { toast.error("请先输入分镜提示词"); return; }
    const activeModel = pickActiveModel(aiModels, selectedAiModel, agents, selectedAgentForOptimize || selectedAgent);
    if (!activeModel) { toast.error("请先在模型设置中选择并配置模型"); return; }
    if (!String(activeModel.apiKey || "").trim()) { toast.error("当前模型未配置 API Key"); return; }
    const agentId = selectedAgentForOptimize || selectedAgent;
    const agent = agents.find(a => a.id === agentId);
    const provider = normalizeProvider(activeModel.provider, activeModel.id || selectedAiModel);
    const systemPrompt = agent ? [
      agent.description || "",
      agent.knowledge ? `知识库: ${agent.knowledge}` : "",
      agent.instructions || "",
      agent.promptTemplate ? `模板: ${agent.promptTemplate}` : "",
      "请直接返回优化后的提示词，不要解释。",
    ].filter(Boolean).join("\n") : "你是一个提示词优化助手，请直接输出优化后的提示词。";
    const userPrompt = agent?.promptTemplate
      ? agent.promptTemplate.replace(/\{\{user_topic\}\}/g, sb.prompt).replace(/\{\{prompt\}\}/g, sb.prompt)
      : `请优化如下视频提示词：${sb.prompt}`;
    try {
      setAiBusy(true);
      const res = await chatProvider({
        provider,
        model: resolveProviderModelId(activeModel, selectedAiModel, agent),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        apiKey: activeModel.apiKey || undefined,
        endpoint: activeModel.apiEndpoint || undefined,
      });
      const content = String(res?.content || "").trim();
      if (content) {
        updateStoryboard(id, content);
        toast.success("分镜 AI优化完成");
      } else {
        toast.error("分镜 AI优化失败");
      }
    } catch (e) {
      toast.error(`分镜 AI优化失败：${String(e?.message || e)}`);
    } finally {
      setAiBusy(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, draftId: string) => {
    if (isYijiaServer(apiServerUrl)) {
      toast.error("当前线路只支持图片链接或资源引用");
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateDraft(draftId, { image: reader.result as string });
        toast.success("图片已上传");
      };
      reader.readAsDataURL(file);
    }
  };

  const ensureApiKeyConfigured = (): boolean => {
    const k = apiServerKey || (typeof localStorage !== "undefined" ? (localStorage.getItem("clientApiKey") || "") : "");
    if (!String(k).trim()) {
      toast.error("请先在设置中配置 API Key");
      return false;
    }
    return true;
  };

  const generateSingle = (draftId: string) => {
    const draft = draftTasks.find((d) => d.id === draftId);
    if (!draft) return;
    // 文生视频与图生视频均支持：图生需有图片，文生需有提示词或分镜
    if (!ensureApiKeyConfigured()) return;

    // 检查是否有提示词或分镜内容
    const hasPrompt = draft.prompt.trim();
    const hasStoryboards = draft.storyboards.length > 0 && draft.storyboards.some(s => s.prompt.trim());
    
    if (!hasPrompt && !hasStoryboards && !(draft.type === "image-to-video" && !!draft.image)) {
      toast.error("请填写提示词或分镜内容");
      return;
    }

    if (draft.type === "image-to-video" && !draft.image) {
      toast.error("图生视频需要上传图片");
      return;
    }
    if (draft.type === "image-to-video") {
      const ref = String(draft.image || "");
      const ok = isYijiaServer(apiServerUrl)
        ? (/^https?:\/\//i.test(ref) || /^[A-Za-z0-9._-]+\/.+\.(jpg|jpeg|png|webp)$/i.test(ref))
        : (ref.startsWith("data:") || /^https?:\/\//i.test(ref) || /^[A-Za-z0-9._-]+\/.+\.(jpg|jpeg|png|webp)$/i.test(ref));
      if (!ok) {
        toast.error(isYijiaServer(apiServerUrl) ? "请填写有效的图片链接或资源引用" : "请填写有效的图片链接或上传图片文件");
        return;
      }
    }

    const effectivePrompt = draft.prompt.trim() || (draft.type === "image-to-video" ? "根据图片生成视频" : "生成视频");

    const newTask: SubmittedTask = {
      ...draft,
      id: `submitted-${Date.now()}`,
      prompt: effectivePrompt,
      quality: globalQuality,
      duration: globalDuration,
      orientation: globalOrientation,
      aiModel: selectedAiModel,
      status: "generating",
      progress: 0,
      submitTime: new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setSubmittedTasks([newTask, ...submittedTasks]);
    
    // 删除当前任务，如果这是最后一个，则添加一个新的空白任务
    const remainingDrafts = draftTasks.filter((d) => d.id !== draftId);
    if (remainingDrafts.length === 0) {
      setDraftTasks([
        {
          id: `draft-${Date.now()}`,
          type: draft.type,
          prompt: "",
          storyboards: [],
        },
      ]);
    } else {
      setDraftTasks(remainingDrafts);
    }
    if (!apiServerKey) {
      setSubmittedTasks((prev) => prev.map((t) => (
        t.id === newTask.id ? { ...t, status: "failed" } : t
      )));
      toast.error("请先在设置中配置 API Key");
      return;
    }

    createVideo({ input_reference: draft.image, prompt: effectivePrompt, model: pickVideoModelName(), is_story: draft.storyboards.length > 0 ? "1" : undefined })
      .then((res) => {
        const externalId = String(res?.external_id || res?.video_id || res?.id || "");
        if (externalId) {
          trackVideoProgress(newTask.id, externalId);
        } else {
          setSubmittedTasks((prev) => prev.map((t) => (
            t.id === newTask.id ? { ...t, status: "failed" } : t
          )));
          const msg = String(res?.error || res?.detail || "提交生成任务失败");
          toast.error(msg);
        }
      })
      .catch((e) => {
        setSubmittedTasks((prev) => prev.map((t) => (
          t.id === newTask.id ? { ...t, status: "failed" } : t
        )));
        toast.error(String(e?.message || "提交生成任务失败"));
      });
    toast.success("任务已提交");
  };

  const batchSubmitAll = () => {
    const validDrafts = draftTasks.filter((d) => {
      const hasPrompt = !!d.prompt.trim();
      const hasStoryboards = d.storyboards.length > 0 && d.storyboards.some(s => s.prompt.trim());
      const hasImage = d.type === "image-to-video" && !!d.image;
      return hasPrompt || hasStoryboards || hasImage;
    });
    
    if (validDrafts.length === 0) {
      toast.error("请至少填写一个提示词或分镜");
      return;
    }

    const invalidImageTasks = validDrafts.filter((d) => {
      if (d.type !== "image-to-video") return false;
      const ref = String(d.image || "");
      const ok = isYijiaServer(apiServerUrl)
        ? (/^https?:\/\//i.test(ref) || /^[A-Za-z0-9._-]+\/.+\.(jpg|jpeg|png|webp)$/i.test(ref))
        : (ref.startsWith("data:") || /^https?:\/\//i.test(ref) || /^[A-Za-z0-9._-]+\/.+\.(jpg|jpeg|png|webp)$/i.test(ref));
      return !ok;
    });
    if (invalidImageTasks.length > 0) {
      toast.error("请填写有效的图片链接或上传图片文件");
      return;
    }

    // 批量提交允许文生与图生混合

    const newSubmittedTasks: SubmittedTask[] = validDrafts.map((draft) => ({
      ...draft,
      id: `submitted-${Date.now()}-${Math.random()}`,
      prompt: draft.prompt.trim() || (draft.type === "image-to-video" ? "根据图片生成视频" : "生成视频"),
      quality: globalQuality,
      duration: globalDuration,
      orientation: globalOrientation,
      aiModel: selectedAiModel,
      status: "generating" as const,
      progress: 0,
      submitTime: new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    setSubmittedTasks([...newSubmittedTasks, ...submittedTasks]);

    setDraftTasks([
      {
        id: `draft-${Date.now()}`,
        type: (draftTasks[0]?.type ?? "text-to-video") as "text-to-video" | "image-to-video",
        prompt: "",
        storyboards: [],
      },
    ]);

    if (!ensureApiKeyConfigured()) return;
    newSubmittedTasks.forEach((task) => {
      createVideo({ input_reference: task.image, prompt: task.prompt, model: pickVideoModelName(), is_story: task.storyboards.length > 0 ? "1" : undefined })
        .then((res) => {
          const externalId = String(res?.external_id || res?.video_id || res?.id || "");
          if (externalId) {
            trackVideoProgress(task.id, externalId);
          } else {
            setSubmittedTasks((prev) => prev.map((t) => (
              t.id === task.id ? { ...t, status: "failed" } : t
            )));
            const msg = String(res?.error || res?.detail || "提交生成任务失败");
            toast.error(msg);
          }
        })
        .catch((e) => {
          setSubmittedTasks((prev) => prev.map((t) => (
            t.id === task.id ? { ...t, status: "failed" } : t
          )));
          toast.error(String(e?.message || "提交生成任务失败"));
        });
    });

    toast.success(`已提交 ${validDrafts.length} 个任务`);
  };

  const simulateProgress = (taskId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setSubmittedTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  status: "completed",
                  progress: 100,
                  videoUrl: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&h=200&fit=crop&t=${taskId}`,
                }
              : t
          )
        );
        toast.success("视频生成完成！");
      } else {
        setSubmittedTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, progress } : t))
        );
      }
    }, 800);
  };

  const deleteSubmittedTask = (taskId: string) => {
    setSubmittedTasks(submittedTasks.filter((t) => t.id !== taskId));
    toast.success("任务已删除");
  };

  const downloadVideo = (task: SubmittedTask) => {
    if (!task.videoUrl) return;
    const url = `/api/download?url=${encodeURIComponent(task.videoUrl)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${task.id}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("开始下载视频");
  };

  const computePlayableUrl = (original: string) => {
    if (!original) return "";
    const order = VIDEO_LINE_OPTIONS;
    const sel = selectedVideoLine;
    const stat = lineStatuses[sel];
    const remote = stat === "ok" ? sel : order.find((b) => lineStatuses[b] === "ok");
    const rebase = (base: string, urlStr: string) => {
      try {
        const u = new URL(urlStr);
        const bn = String(base || "").replace(/\/$/, "");
        return `${bn}${u.pathname}${u.search}`;
      } catch { return `${base}/api/download?url=${encodeURIComponent(urlStr)}`; }
    };
    if (remote) return rebase(remote, original);
    return original;
  };

  const previewVideo = (videoUrl: string) => {
    if (!videoUrl) return;
    setPreviewOriginalUrl(videoUrl);
    setPreviewVideoUrl(computePlayableUrl(videoUrl));
    setShowVideoPreview(true);
  };

  const onPlaybackError = async (originalUrl: string, triedBase?: string) => {
    const order = VIDEO_LINE_OPTIONS;
    const start = triedBase ? Math.max(order.indexOf(triedBase), 0) : Math.max(order.indexOf(selectedVideoLine), 0);
    for (let i = 1; i < order.length; i++) {
      const cand = order[(start + i) % order.length];
      try {
        const r = await testLineBase(cand);
        if (r?.ok) {
          const next = (() => {
            try {
              const u = new URL(originalUrl);
              const bn = cand.replace(/\/$/, "");
              return `${bn}${u.pathname}${u.search}`;
            } catch {
              return `${cand}/api/download?url=${encodeURIComponent(originalUrl)}`;
            }
          })();
          setPreviewVideoUrl(next);
          toast.info("已自动切换到可用线路");
          return;
        }
      } catch {}
    }
    try {
      const u = new URL(originalUrl);
      setPreviewVideoUrl(`${u.origin}${u.pathname}${u.search}`);
      toast.info("已回退到默认源线路");
    } catch {
      setPreviewVideoUrl(`/api/download?url=${encodeURIComponent(originalUrl)}`);
      toast.info("已回退为本站线路播放");
    }
  };

  const handleTablePlaybackError = async (e: React.SyntheticEvent<HTMLVideoElement>, originalUrl: string) => {
    const order = VIDEO_LINE_OPTIONS;
    for (let i = 0; i < order.length; i++) {
      const cand = order[i];
      try {
        const r = await testLineBase(cand);
        if (r?.ok) {
          try {
            const u = new URL(originalUrl);
            const bn = cand.replace(/\/$/, "");
            e.currentTarget.src = `${bn}${u.pathname}${u.search}`;
          } catch {
            e.currentTarget.src = `${cand}/api/download?url=${encodeURIComponent(originalUrl)}`;
          }
          toast.info("已自动切换到可用线路");
          return;
        }
      } catch {}
    }
    try {
      const u = new URL(originalUrl);
      e.currentTarget.src = `${u.origin}${u.pathname}${u.search}`;
      toast.info("已回退到默认源线路");
    } catch {
      e.currentTarget.src = `/api/download?url=${encodeURIComponent(originalUrl)}`;
      toast.info("已回退为本站线路播放");
    }
  };

  const ensureFirstFrame = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    try {
      v.muted = true;
      // @ts-ignore
      v.playsInline = true;
      v.currentTime = 0.01;
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => setTimeout(() => { try { v.pause(); } catch {} }, 120)).catch(() => {});
      }
    } catch {}
  };

  const remixVideo = (task: SubmittedTask) => {
    const newDraft: DraftTask = {
      id: `draft-${Date.now()}`,
      type: task.type,
      prompt: task.prompt,
      image: task.image,
      storyboards: task.storyboards,
      remixVideoId: task.id,
    };
    setDraftTasks([newDraft, ...draftTasks]);
    toast.success("已加载到编辑区，将基于原视频进行二次创作");
  };

  const clearRemixId = (draftId: string) => {
    updateDraft(draftId, { remixVideoId: undefined });
    toast.success("已清除二创关联");
  };

  const STANDARD_MODEL_MAP: Record<string, Record<string, string>> = {
    "10s": { "竖屏": "sora-2-yijia", "横屏": "sora-2-landscape-yijia" },
    "15s": { "竖屏": "sora-2-15s-yijia", "横屏": "sora-2-landscape-15s-yijia" },
    "25s": { "竖屏": "sora-2-yijia", "横屏": "sora-2-landscape-yijia" },
  };
  const HD_MODEL_MAP: Record<string, Record<string, string>> = {
    "10s": { "竖屏": "sora-2-pro-10s-large-yijia", "横屏": "sora-2-pro-landscape-10s-large-yijia" },
    "15s": { "竖屏": "sora-2-pro-15s-large-yijia", "横屏": "sora-2-pro-landscape-15s-large-yijia" },
    "25s": { "竖屏": "sora-2-pro-25s-yijia", "横屏": "sora-2-pro-landscape-25s-yijia" },
  };
  const [preferredStandardModel, setPreferredStandardModel] = useState<string>(() => {
    try { return localStorage.getItem("preferredStdModel") || ""; } catch { return ""; }
  });
  const [preferredHdModel, setPreferredHdModel] = useState<string>(() => {
    try { return localStorage.getItem("preferredHdModel") || ""; } catch { return ""; }
  });
  const pickVideoModelName = () => {
    const d = String(globalDuration || "").toLowerCase();
    const o = globalOrientation;
    const table = globalQuality === "高清" ? HD_MODEL_MAP : STANDARD_MODEL_MAP;
    const byDur = table[d] || table["10s"];
    const name = (byDur[o] || byDur["竖屏"]) || (globalQuality === "高清" ? "sora-2-pro-10s-large-yijia" : "sora-2-yijia");
    return name;
  };
  useEffect(() => {
    const name = pickVideoModelName();
    if (globalQuality === "高清") {
      setPreferredHdModel(name);
      try { localStorage.setItem("preferredHdModel", name); } catch {}
      try { saveUserSettings({ preferred_hd_model: name }); } catch {}
      toast.success(`已切换到高清：${name}`);
    } else {
      setPreferredStandardModel(name);
      try { localStorage.setItem("preferredStdModel", name); } catch {}
      try { saveUserSettings({ preferred_standard_model: name }); } catch {}
      toast.success(`已切换到普通：${name}`);
    }
  }, [globalQuality, globalDuration, globalOrientation]);

  const resolveSubmittedModelName = () => pickVideoModelName();

  const resolveVideoModelFromUI = () => {
    const o = globalOrientation === "横屏" ? "landscape" : "portrait";
    const d = globalDuration;
    return `sora-2-yijia-${d}-${o}`;
  };

  const regenerateVideo = (task: SubmittedTask) => {
    // 重新生成：使用相同的参数重新提交任务
    const newTask: SubmittedTask = {
      ...task,
      id: `submitted-${Date.now()}-${Math.random()}`,
      status: "generating",
      progress: 0,
      videoUrl: undefined,
      submitTime: new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    
    setSubmittedTasks([newTask, ...submittedTasks]);
    if (!ensureApiKeyConfigured()) return;
    createVideo({ input_reference: newTask.image, prompt: newTask.prompt, model: resolveSubmittedModelName(), is_story: newTask.storyboards.length > 0 ? "1" : undefined })
      .then((res) => {
        const externalId = String(res?.external_id || res?.video_id || res?.id || "");
        if (externalId) {
          trackVideoProgress(newTask.id, externalId);
        } else {
          setSubmittedTasks((prev) => prev.map((t) => (
            t.id === newTask.id ? { ...t, status: "failed" } : t
          )));
          toast.error("提交生成任务失败");
        }
      })
      .catch(() => {
        setSubmittedTasks((prev) => prev.map((t) => (
          t.id === newTask.id ? { ...t, status: "failed" } : t
        )));
        toast.error("提交生成任务失败");
      });
    toast.success("已重新提交生成任务");
  };

  const completedVideos = submittedTasks.filter(t => t.status === "completed");
  
  // 计算可提交的任务数
  const validDraftsCount = draftTasks.filter((d) => {
    const hasPrompt = d.prompt.trim();
    const hasStoryboards = d.storyboards.length > 0 && d.storyboards.some(s => s.prompt.trim());
    const hasImage = d.type === "image-to-video" && !!d.image;
    return hasPrompt || hasStoryboards || hasImage;
  }).length;

  const trackVideoProgress = (taskId: string, externalId: string) => {
    const interval = setInterval(async () => {
      try {
        const status = await getVideoStatus(externalId);
        const p = Number(status?.progress ?? 0);
        const completed = status?.status === "completed";
        const errored = status?.status === "error";
        const sz = String(status?.size || "");
        let ori = "";
        const m = /^(\d+)x(\d+)$/i.exec(sz);
        if (m) {
          const w = Number(m[1]);
          const h = Number(m[2]);
          ori = h > w ? "竖屏" : "横屏";
        }
        setSubmittedTasks((prev) => prev.map((t) => (
          t.id === taskId
            ? {
                ...t,
                progress: p,
                status: completed ? "completed" : (errored ? "failed" : "generating"),
                videoUrl: completed ? (status?.url || status?.size || undefined) : t.videoUrl,
                orientation: ori || t.orientation,
              }
            : t
        )));
        if (completed || p >= 100 || errored) {
          clearInterval(interval);
          if (completed) toast.success("视频生成完成！");
          if (errored) toast.error("视频生成失败");
        }
      } catch (e) {
        clearInterval(interval);
        setSubmittedTasks((prev) => prev.map((t) => (
          t.id === taskId ? { ...t, status: "failed" } : t
        )));
        toast.error("视频生成失败");
      }
    }, 1500);
  };

  useEffect(() => {
    const loadHistory = async () => {
      try {
        if (!ensureApiKeyConfigured()) return;
        const res = await listVideos(50, 0);
        const rows = (res?.data || res?.items || []);
        const mapped: SubmittedTask[] = rows.map((r: any) => ({
          id: String(r.external_id || r.id || `hist-${Date.now()}`),
          externalId: String(r.external_id || r.id || ""),
          type: "text-to-video",
          prompt: String(r.prompt || ""),
          image: undefined,
          storyboards: [],
          quality: String(r.quality || "standard"),
          duration: String(r.seconds ? `${r.seconds}s` : globalDuration),
          orientation: (() => {
            const sz = String(r.size || "");
            const m = /^(\d+)x(\d+)$/i.exec(sz);
            if (m) {
              const w = Number(m[1]);
              const h = Number(m[2]);
              return h > w ? "竖屏" : "横屏";
            }
            return globalOrientation;
          })(),
          aiModel: String(r.model || selectedAiModel),
          status: r.status === "completed" ? "completed" : (r.status === "error" ? "failed" : "generating"),
          progress: Number(r.progress ?? 0),
          videoUrl: r.url || r.size || undefined,
          submitTime: String(r.created_at || new Date().toLocaleString("zh-CN")),
          remixVideoId: undefined,
        }));
        setSubmittedTasks(mapped);
        mapped.filter(m => m.status === "generating" && m.externalId).forEach(m => {
          trackVideoProgress(m.id, String(m.externalId));
        });
      } catch (e) {
        console.warn("loadHistory failed", e);
      }
    };
    loadHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiServerKey]);


  return (
    <div className={`min-h-screen ${theme.bg} ${theme.text}`}>
      {/* 顶部导航 */}
      <div className={`border-b ${theme.border} ${theme.bgSecondary} backdrop-blur`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="flex items-center gap-2">
              <Sparkles className="size-5 text-purple-400" />
              <span className="text-lg">{t("appName")}</span>
            </h1>
            <div className="flex gap-2">
              <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                <SelectTrigger className={`w-24 h-9 ${theme.input}`}>
                  <Globe className="size-4 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">中文</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="th">ไทย</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(true)}
                className={theme.hover}
              >
                <Settings className="size-4 mr-2" />
                {t("settings")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 全局参数栏 */}
      <div className={`border-b ${theme.border} ${theme.bgTertiary}`}>
        <div className="container mx-auto px-4 py-3">
          <div className="grid grid-cols-12 gap-4 items-end">
            <div className="col-span-2">
              <Label className={`text-xs ${theme.textMuted} mb-1 block`}>{t("aiModel")}</Label>
              <Select value={selectedAiModel} onValueChange={setSelectedAiModel}>
                <SelectTrigger className={`h-9 ${theme.input}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(modelsByProvider).map(([provider, models]) => (
                    <div key={provider}>
                      <div className="px-2 py-1.5 text-xs text-zinc-400">{provider}</div>
                      {models.filter(m => m.enabled).map((model) => (
                        <SelectItem key={`model-${model.id}`} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className={`text-xs ${theme.textMuted} mb-1 block`}>{t("agent")}</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger className={`h-9 ${theme.input}`}>
                  <SelectValue placeholder={t("selectAgent")} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent, idx) => (
                    <SelectItem key={`agent-${String(agent.id)}-${idx}`} value={agent.id}>
                      {agent.icon} {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1">
              <Label className={`text-xs ${theme.textMuted} mb-1 block`}>{t("quality")}</Label>
              <Select value={globalQuality} onValueChange={setGlobalQuality}>
                <SelectTrigger className={`h-9 ${theme.input}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="普清">普清</SelectItem>
                  <SelectItem value="高清">高清</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1">
              <Label className={`text-xs ${theme.textMuted} mb-1 block`}>{t("orientation")}</Label>
              <Select value={globalOrientation} onValueChange={setGlobalOrientation}>
                <SelectTrigger className={`h-9 ${theme.input}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="横屏">横屏</SelectItem>
                  <SelectItem value="竖屏">竖屏</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1">
              <Label className={`text-xs ${theme.textMuted} mb-1 block`}>{t("duration")}</Label>
              <Select value={globalDuration} onValueChange={setGlobalDuration}>
                <SelectTrigger className={`h-9 ${theme.input}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10s">10秒</SelectItem>
                  <SelectItem value="15s">15秒</SelectItem>
                  <SelectItem value="25s">25秒</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-5 flex justify-end">
              <Button 
                onClick={batchSubmitAll}
                className="bg-purple-600 hover:bg-purple-700 h-9"
                disabled={validDraftsCount === 0}
              >
                <Sparkles className="size-4 mr-2" />
                {t("batchGenerate")} ({validDraftsCount})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 角色快捷按钮 */}
      <div className={`border-b ${theme.border} ${theme.bgSecondary}`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs ${theme.textMuted}`}>常用角色：</span>
            <ScrollArea className="w-full">
              <div className="flex items-center gap-2">
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => insertCharacterAtCursor(char.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${theme.border} ${theme.hover} transition-colors`}
                    title={`@${char.id} - ${char.name}`}
                  >
                    {char.avatar ? (
                      <img src={char.avatar} alt={char.name} className="size-6 rounded-full object-cover" />
                    ) : (
                      <div className={`size-6 rounded-full ${theme.bgTertiary} flex items-center justify-center`}>
                        <UserCircle className="size-4" />
                      </div>
                    )}
                    <span className={`text-xs ${theme.textSecondary}`}>{char.name}</span>
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingCharacter(null);
                    setShowCharacterDialog(true);
                  }}
                  className={`h-8 text-xs ${theme.textSecondary} ${theme.hover} ${theme.border}`}
                >
                  <Plus className="size-3 mr-1" />
                  添加角色
                </Button>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="container mx-auto px-4 py-6 space-y-8">
        {/* 编辑区域 */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <Edit2 className="size-5 text-blue-400" />
              <span>{t("editArea")}</span>
            </h2>
            <Button onClick={() => addNewDraft()} variant="outline" size="sm" className={`${theme.textSecondary} ${theme.hover} ${theme.border}`}>
              <Plus className="size-4 mr-2" />
              {t("addPrompt")}
            </Button>
          </div>

          <div className="space-y-4">
            {draftTasks.map((draft, index) => (
              <div key={draft.id} className={`rounded-lg border ${theme.border} ${theme.card} p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${theme.textSecondary}`}>{t("video")} #{index + 1}</span>
                    <div className={`flex rounded-lg border ${theme.border} ${theme.bgTertiary} p-1`}>
                      <button
                        onClick={() => updateDraft(draft.id, { type: "text-to-video", image: undefined })}
                        className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
                          draft.type === "text-to-video"
                            ? "bg-purple-600 text-white shadow-sm"
                            : `${theme.textMuted} hover:${theme.textSecondary}`
                        }`}
                      >
                        {t("textToVideo")}
                      </button>
                      <button
                        onClick={() => updateDraft(draft.id, { type: "image-to-video" })}
                        className={`px-4 py-1.5 rounded text-sm font-medium transition-all ${
                          draft.type === "image-to-video"
                            ? "bg-purple-600 text-white shadow-sm"
                            : `${theme.textMuted} hover:${theme.textSecondary}`
                        }`}
                      >
                        {t("imageToVideo")}
                      </button>
                    </div>
                    {draft.remixVideoId && (
                      <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/50">
                        基于 {draft.remixVideoId} 二创
                      </Badge>
                    )}
                  </div>
                  {draftTasks.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteDraft(draft.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-7"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-12 gap-4">
                  {/* 图片列（图生视频） */}
                  {draft.type === "image-to-video" && (
                    <div className="col-span-2">
                      <Input
                        type="file"
                        accept="image/*"
                        disabled={isYijiaServer(apiServerUrl)}
                        onChange={(e) => handleImageUpload(e, draft.id)}
                        className={theme.input}
                      />
                      <Input
                        placeholder="图片链接或资源引用（如 cmM-.../xxx.jpg）"
                        value={draft.image && !draft.image.startsWith("data:") ? draft.image : ""}
                        onChange={(e) => updateDraft(draft.id, { image: e.target.value })}
                        className={`${theme.input} mt-2`}
                      />
                    </div>
                  )}

                  {/* 提示词列 */}
                  <div className={draft.type === "image-to-video" ? "col-span-8" : "col-span-10"}>
                    <Textarea
                      ref={(el) => (promptInputRefs.current[draft.id] = el)}
                      value={draft.prompt}
                      onChange={(e) => updateDraft(draft.id, { prompt: e.target.value })}
                      onFocus={() => setFocusedDraftId(draft.id)}
                      placeholder={t("promptPlaceholder")}
                      className={`min-h-32 resize-none ${theme.input}`}
                    />
                    
                    {/* 提示词下方功能按钮 - 分两行 */}
                    <div className="mt-2 space-y-2">
                      
                      
                      {/* 第二行：其他功能 */}
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addNewDraft(draft)}
                            className={`${theme.textSecondary} ${theme.hover} ${theme.border}`}
                          >
                            <Video className="size-3 mr-1" />
                            {t("addVideoPrompt")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStoryboardEdit(draft.id)}
                            className={`${theme.textSecondary} ${theme.hover} ${theme.border}`}
                          >
                            <Edit2 className="size-3 mr-1" />
                            {t("storyboard")} {draft.storyboards.length > 0 && `(${draft.storyboards.length})`}
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Select 
                            value={selectedAgentForOptimize} 
                            onValueChange={setSelectedAgentForOptimize}
                          >
                            <SelectTrigger className={`w-32 h-8 text-xs ${theme.input}`}>
                              <SelectValue placeholder="选智能体" />
                            </SelectTrigger>
                            <SelectContent>
                              {agents.map((agent) => (
                                <SelectItem key={`agent-${String(agent.id)}`} value={agent.id}>
                                  {agent.icon} {agent.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => aiGenerate(draft.id)}
                            disabled={aiBusy}
                            className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 border-zinc-600"
                          >
                            <Sparkles className="size-3 mr-1" />
                            {t("aiGenerate")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => aiOptimize(draft.id)}
                            disabled={aiBusy}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 border-zinc-600"
                          >
                            <Wand2 className="size-3 mr-1" />
                            {t("aiOptimize")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 生成按钮列 */}
                  <div className="col-span-2 flex flex-col gap-2">
                    <Button
                      onClick={() => generateSingle(draft.id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={(() => { const hasPrompt = !!draft.prompt.trim(); const hasStory = draft.storyboards.length > 0 && draft.storyboards.some(s => s.prompt.trim()); const needsImage = draft.type === "image-to-video"; const hasImage = !!draft.image; return !hasPrompt && !hasStory && (!needsImage || !hasImage); })()}
                    >
                      <Sparkles className="size-4 mr-2" />
                      {t("generate")}
                    </Button>
                    
                    {/* 二创选择器 */}
                    {draft.remixVideoId ? (
                      <div className="flex gap-1">
                        <Select 
                          value={draft.remixVideoId} 
                          onValueChange={(value) => updateDraft(draft.id, { remixVideoId: value })}
                        >
                          <SelectTrigger className={`h-8 text-xs flex-1 ${theme.input}`}>
                            <SelectValue placeholder="选择视频" />
                          </SelectTrigger>
                          <SelectContent>
                          {completedVideos.map((video) => (
                              <SelectItem key={`video-${video.id}`} value={video.id}>
                                {video.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => clearRemixId(draft.id)}
                          className={`${theme.textMuted} hover:${theme.textSecondary} h-8 px-2`}
                        >
                          <X className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <Select onValueChange={(value) => updateDraft(draft.id, { remixVideoId: value })}>
                        <SelectTrigger className={`h-8 text-xs ${theme.input}`}>
                          <SelectValue placeholder={t("selectRemixVideo")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none" disabled>
                            选择要二创的视频
                          </SelectItem>
                          {completedVideos.map((video) => (
                            <SelectItem key={`video-${video.id}`} value={video.id}>
                              {video.id}
                            </SelectItem>
                          ))}
                          </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className={theme.border} />

        {/* 历史记录区域 */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2">
              <History className="size-5 text-green-400" />
              <span>{t("history")}</span>
              <span className={`text-sm ${theme.textMuted}`}>
                ({submittedTasks.length} {t("records")})
              </span>
            </h2>
            
            {/* 分页控制 */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`${theme.textSecondary} ${theme.border}`}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <span className={`text-sm ${theme.textSecondary}`}>
                  {t("page")} {currentPage} {t("of")} {totalPages} {t("pageUnit")}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`${theme.textSecondary} ${theme.border}`}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {submittedTasks.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 ${theme.textMuted}`}>
              <History className="size-12 mb-4 opacity-50" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className={`border-b ${theme.border} ${theme.bgSecondary}`}>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "100px" }}>
                      {t("typeImage")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ minWidth: "300px" }}>
                      {t("prompt")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "100px" }}>
                      {t("storyboardCount")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "120px" }}>
                      {t("params")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "120px" }}>
                      {t("progress")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "160px" }}>
                      {t("videoPreview")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "140px" }}>
                      {t("submitTime")}
                    </th>
                    <th className={`p-3 text-left text-sm ${theme.textSecondary}`} style={{ width: "220px" }}>
                      {t("operations")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map((task) => (
                    <tr key={task.id} className={`border-b ${theme.border} ${theme.hover}`}>
                      <td className="p-3">
                        {task.type === "image-to-video" && task.image ? (
                          <img
                            src={task.image}
                            alt="Source"
                            className="size-20 rounded-lg object-cover"
                          />
                        ) : (
                          <Badge variant="outline" className={`text-xs ${theme.textSecondary} ${theme.border}`}>
                            {t("textVideo")}
                          </Badge>
                        )}
                      </td>

                      <td className="p-3">
                        <div className={`text-sm ${theme.textSecondary} line-clamp-3`}>{task.prompt}</div>
                        {task.remixVideoId && (
                          <Badge variant="outline" className="text-xs text-purple-400 border-purple-500/50 mt-1">
                            二创自 {task.remixVideoId}
                          </Badge>
                        )}
                      </td>

                      <td className="p-3">
                        {task.storyboards.length > 0 ? (
                          <Badge variant="outline" className={`text-xs ${theme.textSecondary} ${theme.border}`}>
                            {task.storyboards.length} 个分镜
                          </Badge>
                        ) : (
                          <span className={`text-xs ${theme.textMuted}`}>{t("noStoryboard")}</span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className={`text-xs ${theme.textSecondary}`}>
                          {task.quality} / {task.orientation}
                          <br />
                          {task.duration}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          {task.status === "generating" && (
                            <>
                              <Progress value={task.progress} className="h-2" />
                              <span className={`text-xs ${theme.textSecondary}`}>
                                {Math.round(task.progress)}%
                              </span>
                            </>
                          )}
                          {task.status === "completed" && (
                            <Badge
                              variant="default"
                              className="bg-green-500/20 text-green-400 border-green-500/50 text-xs"
                            >
                              ✓ {t("completed")}
                            </Badge>
                          )}
                          {task.status === "failed" && (
                            <Badge
                              variant="default"
                              className="bg-red-500/20 text-red-400 border-red-500/50 text-xs"
                            >
                              ✗ {t("failed")}
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="p-3">
                        {task.videoUrl ? (
                          <div 
                            className="relative group cursor-pointer"
                            onClick={() => previewVideo(task.videoUrl!)}
                          >
                            <video
                              src={computePlayableUrl(task.videoUrl!)}
                              controls
                              muted
                              playsInline
                              preload="auto"
                              className="w-full rounded-lg"
                              onLoadedMetadata={ensureFirstFrame}
                              onError={(e) => handleTablePlaybackError(e, task.videoUrl!)}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <div className="text-3xl">▶️</div>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex h-20 items-center justify-center rounded-lg ${theme.bgTertiary} text-xs ${theme.textMuted}`}>
                            {task.status === "failed" ? t("failed") : t("generating")}
                          </div>
                        )}
                      </td>

                      <td className="p-3">
                        <div className={`text-xs ${theme.textSecondary}`}>{task.submitTime}</div>
                      </td>

                      <td className="p-3">
                        {/* 操作按钮 - 分两行 */}
                        <div className="space-y-1">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title="重新生成"
                              onClick={() => regenerateVideo(task)}
                              className={`${theme.textSecondary} ${theme.hover} ${theme.border} flex-1`}
                            >
                              <RefreshCw className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title={t("download")}
                              onClick={() => downloadVideo(task)}
                              disabled={!task.videoUrl}
                              className={`${theme.textSecondary} ${theme.hover} ${theme.border} flex-1`}
                            >
                              <Download className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title={t("newWindow")}
                              onClick={() => task.videoUrl && window.open(task.videoUrl, '_blank')}
                              disabled={!task.videoUrl}
                              className={`${theme.textSecondary} ${theme.hover} ${theme.border} flex-1`}
                            >
                              <ExternalLink className="size-4" />
                            </Button>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              title={t("remixAction")}
                              onClick={() => remixVideo(task)}
                              className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 border-zinc-600 flex-1"
                            >
                              <Blend className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              title="生成角色"
                              onClick={() => {
                                setCharacterDialogMode("generate");
                                setCharacterVideoId(task.id);
                                setNewCharacter({
                                  id: `char-${Math.floor(Math.random() * 9000 + 1000)}`,
                                  name: "",
                                  avatar: "",
                                  description: "",
                                  startSec: 0,
                                  endSec: 3,
                                  videoId: task.id,
                                  soraId: "",
                                });
                                setShowCharacterDialog(true);
                              }}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 border-zinc-600 flex-1"
                            >
                              <UserCircle className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteSubmittedTask(task.id)}
                              title={t("delete")}
                              className="text-red-400 hover:text-red-300 hover:bg-red-950/30 border-zinc-600 flex-1"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 设置对话框 - 保持完整 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className={`sm:max-w-[1000px] max-h-[85vh] p-0 ${theme.bgSecondary} ${theme.border} overflow-hidden`}>
          <div className="flex h-[85vh]">
            {/* 左侧导航 */}
            <div className={`w-48 border-r ${theme.border} ${theme.bgSecondary} p-4`}>
              <DialogHeader className="mb-6">
                <DialogTitle className={theme.text}>{t("settings")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-1">
                {[
                  { key: "api", icon: Server, label: t("apiSettings") },
                  { key: "models", icon: Cpu, label: t("modelSettings") },
                  { key: "agents", icon: Zap, label: t("agentSettings") },
                  { key: "characters", icon: UserCircle, label: "角色管理" },
                  { key: "theme", icon: Palette, label: t("themeSettings") },
                ].map(({ key, icon: Icon, label }) => (
                  <button
                    key={key}
                    onClick={() => setSettingsTab(key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                      settingsTab === key
                        ? "bg-purple-600 text-white"
                        : `${theme.textSecondary} ${theme.hover}`
                    }`}
                  >
                    <Icon className="size-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 右侧内容 */}
            <div className="flex-1 flex flex-col">
              <ScrollArea className="flex-1 p-6">
                {/* API设置 */}
                {settingsTab === "api" && (
                  <div className="space-y-6">
                    <h3 className={`text-lg ${theme.text}`}>{t("apiSettings")}</h3>

                    <div className="space-y-2">
                      <Label className={theme.textSecondary}>API服务器地址</Label>
                      <Input value="https://ai.yijiarj.cn" readOnly disabled className={theme.input} />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label className={theme.textSecondary}>视频流线路选择</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className={`text-xs ${theme.textMuted}`}>提示</span>
                          </TooltipTrigger>
                          <TooltipContent>如果访问视频卡顿，请切换线路</TooltipContent>
                        </Tooltip>
                        <Button variant="outline" size="sm" onClick={refreshLineStatuses}>诊断</Button>
                      </div>
                      <RadioGroup value={selectedVideoLine} onValueChange={(v) => switchLine(v)} className="space-y-3">
                        {VIDEO_LINE_OPTIONS.map((line, idx) => {
                          const stat = lineStatuses[line] || "unknown";
                          const active = selectedVideoLine === line;
                          const label = `线路${idx + 1}`;
                          return (
                            <div
                              key={line}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded border ${theme.border} ${active ? "bg-purple-600/20 border-purple-500" : theme.hover} cursor-pointer`}
                              onClick={() => switchLine(line)}
                              role="button"
                              aria-pressed={active}
                            >
                              <div className="flex items-center gap-3">
                                <RadioGroupItem value={line} />
                                <div className="flex flex-col text-left">
                                  <span className={theme.text}>{label}</span>
                                  <span className={`text-xs ${theme.textMuted}`}>{line} {typeof lineLatency[line] === "number" ? `· ${lineLatency[line]}ms` : ""}</span>
                                </div>
                              </div>
                              <span className="flex items-center gap-2">
                                <span className={`inline-block size-2 rounded-full ${stat === "ok" ? "bg-green-400" : stat === "fail" ? "bg-red-400" : "bg-zinc-500"}`} />
                                {lineSwitching && active && <Badge variant="outline" className="text-xs">检测中</Badge>}
                              </span>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>

                    <div className="space-y-2">
                      <Label className={theme.textSecondary}>角色API地址</Label>
                      <Input value="https://video.yijiarj.cn" readOnly disabled className={theme.input} />
                    </div>

                    <div className="space-y-2">
                      <Label className={theme.textSecondary}>{t("apiKey")}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={apiServerKey}
                          onChange={(e) => setApiServerKey(e.target.value)}
                          className={`${theme.input} flex-1`}
                        />
                        <Button
                          data-testid="btn-detect-yijia"
                          variant="outline"
                          onClick={async () => {
                            try {
                              if (apiServerKey && apiServerKey.trim()) {
                                localStorage.setItem("clientApiKey", apiServerKey);
                              }
                            } catch {}
                            toast.info(`正在检测 Yijia 用户 Key...`);
                            const r = await testYijiaKey();
                            if (r?.ok) {
                              toast.success(`Yijia 用户 Key 可用`);
                              await saveUserSettings({ default_ai_model: selectedAiModel, client_api_key: (apiServerKey && apiServerKey.trim()) ? apiServerKey : undefined as any, api_server_url: "https://ai.yijiarj.cn", api_routes: apiRoutes, video_line_base: selectedVideoLine, preferred_standard_model: preferredStandardModel, preferred_hd_model: preferredHdModel, language, theme: currentTheme }, apiServerKey || undefined);
                              try {
                                const r = await saveUserModels(aiModels);
                                const c = r?.changes || {};
                                if (r?.success !== false && (typeof c.added === "number" || typeof c.removed === "number" || typeof c.updated === "number")) {
                                  toast.success(`模型已保存（新增${c.added || 0}，删除${c.removed || 0}，更新${c.updated || 0}）`);
                                }
                              } catch {}
                            } else {
                              const msg = r?.error || r?.body || "未知错误";
                              toast.error(`检测失败：${String(msg).slice(0,200)}`);
                            }
                          }}
                        >检测</Button>
                      </div>
                      <p className={`text-xs ${theme.textMuted}`}>此密钥仅用于视频生成服务（Yijia）；LLM 提供商的模型 Key 请在“模型设置”中分别配置与检测。</p>
                    </div>
                  </div>
                )}

                {settingsTab === "stream" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg ${theme.text}`}>视频流设置</h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`text-xs ${theme.textMuted}`}>API和线路是从属关系</span>
                        </TooltipTrigger>
                        <TooltipContent>API和线路是从属关系</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="space-y-2">
                      <Label className={theme.textSecondary}>API服务器地址</Label>
                      <Input value="https://ai.yijiarj.cn" readOnly disabled className={theme.input} />
                    </div>

                    <div className="space-y-3">
                      <Label className={theme.textSecondary}>线路选择</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {VIDEO_LINE_OPTIONS.map((line) => {
                          const stat = lineStatuses[line] || "unknown";
                          const active = selectedVideoLine === line;
                          return (
                            <button
                              key={line}
                              onClick={() => switchLine(line)}
                              disabled={lineSwitching}
                              className={`flex items-center justify-between px-3 py-2 rounded border ${theme.border} ${active ? "bg-purple-600/20 border-purple-500" : theme.hover}`}
                            >
                              <span className={`text-sm ${theme.text}`}>{line}</span>
                              <span className="flex items-center gap-2">
                                <span className={`inline-block size-2 rounded-full ${stat === "ok" ? "bg-green-400" : stat === "fail" ? "bg-red-400" : "bg-zinc-500"}`} />
                                {active && <Badge variant="outline" className="text-xs">当前</Badge>}
                                {lineSwitching && active && <Badge variant="outline" className="text-xs">检测中</Badge>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <p className={`text-xs ${theme.textMuted}`}>如果访问视频卡顿，请切换线路</p>
                    </div>

                    <div className="space-y-2">
                      <Label className={theme.textSecondary}>角色API地址</Label>
                      <Input value="https://video.yijiarj.cn" readOnly disabled className={theme.input} />
                    </div>
                  </div>
                )}

                {/* 模型设置 */}
                {settingsTab === "models" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg ${theme.text}`}>{t("aiModelConfig")}</h3>
                      <Button
                        onClick={() => {
                          setEditingModel(null);
                          setShowModelDialog(true);
                        }}
                        size="sm"
                      >
                        <Plus className="size-4 mr-2" />
                        添加模型
                      </Button>
                    </div>
                    
                    {Object.entries(modelsByProvider).map(([provider, models]) => (
                      <div key={provider} className="space-y-3">
                        <h4 className={`text-sm ${theme.textSecondary} border-b ${theme.border} pb-2`}>
                          {provider}
                        </h4>
                        {models.map((model, idx) => (
                          <div 
                            key={`model-card-${model.id}-${idx}`} 
                            onClick={() => {
                              setEditingModel(model);
                              setShowModelDialog(true);
                            }}
                            className={`rounded-lg border ${theme.border} ${theme.card} p-4 cursor-pointer hover:border-purple-500 transition-colors`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Label className={theme.text}>{model.name}</Label>
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingModel(model);
                                    setShowModelDialog(true);
                                  }}
                                >
                                  <Edit2 className="size-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteModel(model.id);
                                  }}
                                  className="text-red-400"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                            <div className={`text-xs ${theme.textMuted} space-y-1`}>
                              <div>Endpoint: {model.apiEndpoint}</div>
                              <div>状态: {model.enabled ? "已启用" : "已禁用"}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* 智能体设置 */}
                {settingsTab === "agents" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg ${theme.text}`}>{t("agentManagement")}</h3>
                      <Button
                        onClick={() => {
                          setEditingAgent(null);
                          setShowAgentDialog(true);
                        }}
                        size="sm"
                      >
                        <Plus className="size-4 mr-2" />
                        {t("addAgent")}
                      </Button>
                    </div>
                    
                    {agents.map((agent) => (
                      <div 
                        key={agent.id} 
                        onClick={() => {
                          setEditingAgent(agent);
                          setShowAgentDialog(true);
                        }}
                        className={`rounded-lg border ${theme.border} ${theme.card} p-4 cursor-pointer hover:border-purple-500 transition-colors`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-3xl">{agent.icon}</div>
                          <div className="flex-1">
                            <h4 className={`${theme.text} mb-1`}>{agent.name}</h4>
                            <p className={`text-sm ${theme.textMuted} mb-2`}>{agent.description}</p>
                            <p className={`text-xs ${theme.textMuted} ${theme.bgTertiary} p-2 rounded`}>
                              {agent.promptTemplate}
                            </p>
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingAgent(agent);
                                setShowAgentDialog(true);
                              }}
                            >
                              <Edit2 className="size-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAgent(agent.id);
                              }}
                              className="text-red-400"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 角色管理 */}
                {settingsTab === "characters" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-lg ${theme.text}`}>角色管理</h3>
                      <Button
                        onClick={() => {
                          setCharacterDialogMode("add");
                          setEditingCharacter(null);
                          setShowCharacterDialog(true);
                        }}
                        size="sm"
                      >
                        <Plus className="size-4 mr-2" />
                        添加角色
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {characters.map((char) => (
                        <div 
                          key={char.id} 
                          onClick={() => {
                            setEditingCharacter(char);
                            setEditingCharacterOriginalId(char.id);
                            setShowCharacterDialog(true);
                          }}
                          className={`rounded-lg border ${theme.border} ${theme.card} p-4 cursor-pointer hover:border-purple-500 transition-colors`}
                        >
                          <div className="flex items-center gap-3">
                            {char.avatar ? (
                              <img src={char.avatar} alt={char.name} className="size-12 rounded-full object-cover" />
                            ) : (
                              <div className={`size-12 rounded-full ${theme.bgTertiary} flex items-center justify-center`}>
                                <UserCircle className="size-6" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className={`${theme.text}`}>{char.name}</h4>
                              <p className={`text-xs ${theme.textMuted}`}>@{char.id}</p>
                            </div>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingCharacter(char);
                                  setShowCharacterDialog(true);
                                }}
                              >
                                <Edit2 className="size-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteCharacter(char.id);
                                }}
                                className="text-red-400"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 主题设置 */}
                {settingsTab === "theme" && (
                  <div className="space-y-4">
                    <h3 className={`text-lg ${theme.text} mb-4`}>{t("themeSettings")}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(THEMES).map(([key, themeConfig]) => (
                        <button
                          key={key}
                          onClick={() => setCurrentTheme(key as keyof typeof THEMES)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            currentTheme === key
                              ? "border-purple-500 scale-105"
                              : `${theme.border} hover:border-purple-300`
                          } ${themeConfig.bg}`}
                        >
                          <div className={`text-sm ${themeConfig.text} mb-2`}>{themeConfig.name}</div>
                          <div className="flex gap-2">
                            <div className={`w-8 h-8 rounded ${themeConfig.bg}`}></div>
                            <div className={`w-8 h-8 rounded ${themeConfig.bgSecondary}`}></div>
                            <div className={`w-8 h-8 rounded ${themeConfig.bgTertiary}`}></div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </ScrollArea>

              <div className={`border-t ${theme.border} p-4 flex justify-end gap-2`}>
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  {t("cancel")}
                </Button>
                <Button data-testid="btn-save-settings" onClick={() => {
                  setShowSettings(false);
                  try {
                    if (apiServerKey && apiServerKey.trim()) localStorage.setItem("clientApiKey", apiServerKey);
                    if (apiServerUrl && apiServerUrl.trim()) localStorage.setItem("clientApiServer", apiServerUrl);
                    localStorage.setItem("apiRoutes", JSON.stringify(apiRoutes));
                    localStorage.setItem("defaultAiModel", selectedAiModel);
                    localStorage.setItem("videoLineSelected", selectedVideoLine);
                  } catch {}
                  saveUserSettings({ default_ai_model: selectedAiModel, client_api_key: (apiServerKey && apiServerKey.trim()) ? apiServerKey : undefined as any, api_server_url: (apiServerUrl && apiServerUrl.trim()) ? apiServerUrl : undefined as any, api_routes: apiRoutes, video_line_base: selectedVideoLine, preferred_standard_model: preferredStandardModel, preferred_hd_model: preferredHdModel, language, theme: currentTheme }, apiServerKey || undefined);
                  try {
                    (async () => {
                      const r = await saveUserModels(aiModels);
                      const c = r?.changes || {};
                      if (r?.success !== false && (typeof c.added === "number" || typeof c.removed === "number" || typeof c.updated === "number")) {
                        toast.success(`模型已保存（新增${c.added || 0}，删除${c.removed || 0}，更新${c.updated || 0}）`);
                      }
                    })();
                  } catch {}
                  toast.success(t("settingsSaved"));
                }}>
                  {t("save")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 模型添加/编辑对话框 */}
      <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
        <DialogContent className={`sm:max-w-[600px] ${theme.bgSecondary} ${theme.border}`}>
          <DialogHeader>
            <DialogTitle className={theme.text}>
              {editingModel ? "编辑模型" : "添加模型"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={theme.textSecondary}>模型名称</Label>
                <Input
                  value={editingModel ? editingModel.name : newModel.name}
                  onChange={(e) =>
                    editingModel
                      ? setEditingModel({ ...editingModel, name: e.target.value })
                      : setNewModel({ ...newModel, name: e.target.value })
                  }
                  className={theme.input}
                />
              </div>
              <div className="space-y-2">
                <Label className={theme.textSecondary}>提供商</Label>
                <Input
                  value={editingModel ? editingModel.provider : newModel.provider}
                  onChange={(e) =>
                    editingModel
                      ? setEditingModel({ ...editingModel, provider: e.target.value })
                      : setNewModel({ ...newModel, provider: e.target.value })
                  }
                  className={theme.input}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className={theme.textSecondary}>API Endpoint</Label>
              <Input
                value={editingModel ? editingModel.apiEndpoint : newModel.apiEndpoint}
                onChange={(e) =>
                  editingModel
                    ? setEditingModel({ ...editingModel, apiEndpoint: e.target.value })
                    : setNewModel({ ...newModel, apiEndpoint: e.target.value })
                }
                className={theme.input}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={theme.textSecondary}>API Key</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={editingModel ? editingModel.apiKey : newModel.apiKey}
                  onChange={(e) =>
                    editingModel
                      ? setEditingModel({ ...editingModel, apiKey: e.target.value })
                      : setNewModel({ ...newModel, apiKey: e.target.value })
                  }
                  className={`${theme.input} flex-1`}
                />
                <Button
                  data-testid="btn-detect-model"
                  variant="outline"
                  onClick={async () => {
                    const rawKey = editingModel ? editingModel.apiKey : newModel.apiKey;
                    const key = (rawKey || "").trim();
                    const modelId = editingModel ? (editingModel.id || "deepseek-chat") : newModel.id || selectedAiModel || "deepseek-chat";
                    const endpoint = (editingModel ? editingModel.apiEndpoint : newModel.apiEndpoint) || "https://api.deepseek.com/v1";
                    const providerRaw = editingModel?.provider || (aiModels.find((m) => m.id === (modelId || selectedAiModel))?.provider) || providerForModel(modelId || selectedAiModel);
                    const providerNorm = String(providerRaw || "").toLowerCase();
                    const provider = providerRaw || providerNorm;
                    toast.info(`正在检测 ${provider} Key...`);
                    let r;
                    if (providerNorm.includes("deepseek")) {
                      r = await testDeepseekKey("deepseek-chat", key || undefined, endpoint);
                    } else if (providerNorm.includes("gemini") || providerNorm.includes("google")) {
                      r = await testGeminiKey(modelId || "gemini-3-pro-preview", key || undefined);
                    } else {
                      toast.error(`暂不支持 ${provider} 的自动检测`);
                      return;
                    }
                    if (r?.ok) {
                      toast.success(`${provider} Key 可用`);
                      setSelectedAiModel(modelId || selectedAiModel);
                      try { localStorage.setItem("defaultAiModel", modelId || selectedAiModel); } catch {}
                      await saveUserSettings({ default_ai_model: modelId || selectedAiModel, client_api_key: (apiServerKey && apiServerKey.trim()) ? apiServerKey : undefined as any, api_server_url: (apiServerUrl && apiServerUrl.trim()) ? apiServerUrl : undefined as any, api_routes: apiRoutes, language, theme: currentTheme }, apiServerKey || undefined);
                      try {
                        const r = await saveUserModels(aiModels);
                        const c = r?.changes || {};
                        if (r?.success !== false && (typeof c.added === "number" || typeof c.removed === "number" || typeof c.updated === "number")) {
                          toast.success(`模型已保存（新增${c.added || 0}，删除${c.removed || 0}，更新${c.updated || 0}）`);
                        }
                      } catch {}
                    } else {
                      const msg = r?.error || r?.body || "未知错误";
                      toast.error(`检测失败：${String(msg).slice(0,200)}`);
                    }
                  }}
                >检测</Button>
              </div>
              <p className={`text-xs ${theme.textMuted}`}>此模型 Key 仅用于对应提供商；“本站 API Key”仅用于 Yijia 视频生成。</p>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingModel ? editingModel.enabled : newModel.enabled}
                onChange={(e) =>
                  editingModel
                    ? setEditingModel({ ...editingModel, enabled: e.target.checked })
                    : setNewModel({ ...newModel, enabled: e.target.checked })
                }
                className="size-4"
              />
              <Label className={theme.textSecondary}>启用此模型</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModelDialog(false)}>
              取消
            </Button>
            <Button data-testid="btn-save-model" onClick={editingModel ? updateModelConfig : addModel}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 智能体添加/编辑对话框 */}
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className={`sm:max-w-[600px] ${theme.bgSecondary} ${theme.border}`}>
          <DialogHeader>
            <DialogTitle className={theme.text}>
              {editingAgent ? t("edit") : t("addAgent")}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 py-4 px-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={theme.textSecondary}>{t("agentName")}</Label>
                  <Input
                    value={editingAgent ? editingAgent.name : newAgent.name}
                    onChange={(e) =>
                      editingAgent
                        ? setEditingAgent({ ...editingAgent, name: e.target.value })
                        : setNewAgent({ ...newAgent, name: e.target.value })
                    }
                    className={theme.input}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={theme.textSecondary}>{t("agentIcon")}</Label>
                  <Input
                    value={editingAgent ? editingAgent.icon : newAgent.icon}
                    onChange={(e) =>
                      editingAgent
                        ? setEditingAgent({ ...editingAgent, icon: e.target.value })
                        : setNewAgent({ ...newAgent, icon: e.target.value })
                    }
                    className={theme.input}
                    placeholder="🤖"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className={theme.textSecondary}>{t("agentDescription")}</Label>
                <Textarea
                  value={editingAgent ? editingAgent.description : newAgent.description}
                  onChange={(e) =>
                    editingAgent
                      ? setEditingAgent({ ...editingAgent, description: e.target.value })
                      : setNewAgent({ ...newAgent, description: e.target.value })
                  }
                  className={theme.input}
                />
              </div>
              
              <div className="space-y-2">
                <Label className={theme.textSecondary}>{t("agentModel")}</Label>
                <Select
                  value={editingAgent ? editingAgent.model : newAgent.model}
                  onValueChange={(v) =>
                    editingAgent
                      ? setEditingAgent({ ...editingAgent, model: v, provider: providerForModel(v) })
                      : setNewAgent({ ...newAgent, model: v, provider: providerForModel(v) })
                  }
                >
                  <SelectTrigger className={theme.input}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {aiModels.filter(m => m.enabled).map((model) => (
                      <SelectItem key={`model-${model.id}`} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className={theme.textSecondary}>{t("agentKnowledge")}</Label>
                <Textarea
                  value={editingAgent ? editingAgent.knowledge : newAgent.knowledge}
                  onChange={(e) =>
                    editingAgent
                      ? setEditingAgent({ ...editingAgent, knowledge: e.target.value })
                      : setNewAgent({ ...newAgent, knowledge: e.target.value })
                  }
                  className={theme.input}
                  placeholder="相关领域知识、专业术语等"
                />
              </div>
              
              <div className="space-y-2">
                <Label className={theme.textSecondary}>{t("agentInstructions")}</Label>
                <Textarea
                  value={editingAgent ? editingAgent.instructions : newAgent.instructions}
                  onChange={(e) =>
                    editingAgent
                      ? setEditingAgent({ ...editingAgent, instructions: e.target.value })
                      : setNewAgent({ ...newAgent, instructions: e.target.value })
                  }
                  className={theme.input}
                  placeholder="系统角色设定和行为指引"
                />
              </div>
              
              <div className="space-y-2">
                <Label className={theme.textSecondary}>{t("agentPromptTemplate")}</Label>
                <Textarea
                  value={editingAgent ? editingAgent.promptTemplate : newAgent.promptTemplate}
                  onChange={(e) =>
                    editingAgent
                      ? setEditingAgent({ ...editingAgent, promptTemplate: e.target.value })
                      : setNewAgent({ ...newAgent, promptTemplate: e.target.value })
                  }
                  className={theme.input}
                  rows={4}
                  placeholder="生成视频的提示词模板"
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgentDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={editingAgent ? updateAgent : addAgent}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 角色添加/编辑对话框 */}
      <Dialog open={showCharacterDialog} onOpenChange={setShowCharacterDialog}>
        <DialogContent className={`sm:max-w-[500px] ${theme.bgSecondary} ${theme.border}`}>
          <DialogHeader>
            <DialogTitle className={theme.text}>
              {editingCharacter ? "编辑角色" : (characterDialogMode === "generate" ? "生成角色" : "添加角色")}
            </DialogTitle>
          </DialogHeader>
          {!editingCharacter && (
            <div className="flex items-center gap-2 mb-2">
              <Button
                size="sm"
                variant={characterDialogMode === "generate" ? "default" : "outline"}
                onClick={() => setCharacterDialogMode("generate")}
              >
                生成角色
              </Button>
              <Button
                size="sm"
                variant={characterDialogMode === "add" ? "default" : "outline"}
                onClick={() => setCharacterDialogMode("add")}
              >
                添加角色
              </Button>
            </div>
          )}
          <div className="space-y-4 py-4">
            
            
            {characterDialogMode === "generate" && !editingCharacter ? (
              <div className="space-y-2">
                <Label className={theme.textSecondary}>角色名（限制10个字符）</Label>
                <div className="relative">
                  <Input
                    value={newCharacter.id}
                    onChange={(e) => setNewCharacter({ ...newCharacter, id: e.target.value.slice(0, 10) })}
                    className={theme.input}
                    placeholder="例如：char3943"
                  />
                  <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${theme.textMuted}`}>{(newCharacter.id || "").length}/10</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className={theme.textSecondary}>角色ID (格式: 字母+数字，如 char001)</Label>
                <Input
                  value={editingCharacter ? editingCharacter.id : newCharacter.id}
                  onChange={(e) =>
                    editingCharacter
                      ? setEditingCharacter({ ...editingCharacter, id: e.target.value })
                      : setNewCharacter({ ...newCharacter, id: e.target.value })
                  }
                  className={theme.input}
                  placeholder="char001"
                />
              </div>
            )}
            
            {characterDialogMode === "add" && (
              <div className="space-y-2">
                <Label className={theme.textSecondary}>角色名称</Label>
                <Input
                  value={editingCharacter ? editingCharacter.name : newCharacter.name}
                  onChange={(e) =>
                    editingCharacter
                      ? setEditingCharacter({ ...editingCharacter, name: e.target.value })
                      : setNewCharacter({ ...newCharacter, name: e.target.value })
                  }
                  className={theme.input}
                  placeholder="赛博武士"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className={theme.textSecondary}>{characterDialogMode === "generate" && !editingCharacter ? "人物描述词（最多500字）" : "角色描述"}</Label>
              <div className="relative">
                <Textarea
                  value={editingCharacter ? (editingCharacter.description || "") : (newCharacter.description || "")}
                  onChange={(e) =>
                    editingCharacter
                      ? setEditingCharacter({ ...editingCharacter, description: e.target.value })
                      : setNewCharacter({ ...newCharacter, description: e.target.value.slice(0, 500) })
                  }
                  className={theme.input}
                  placeholder={characterDialogMode === "generate" && !editingCharacter ? "描述越详细，生成效果越好" : "角色外观、性格、口头禅、背景等"}
                  rows={characterDialogMode === "generate" && !editingCharacter ? 6 : 4}
                />
                {characterDialogMode === "generate" && !editingCharacter && (
                  <span className={`absolute right-2 bottom-2 text-xs ${theme.textMuted}`}>{(newCharacter.description || "").length}/500</span>
                )}
              </div>
            </div>

            {characterDialogMode === "generate" && !editingCharacter && (
              <div className="space-y-2">
                <Label className={theme.textSecondary}>选择视频 (从已完成视频中提取角色)</Label>
                <Select
                  value={newCharacter.videoId || ""}
                  onValueChange={(v) => setNewCharacter({ ...newCharacter, videoId: v })}
                >
                  <SelectTrigger className={theme.input}>
                    <SelectValue placeholder="选择一个已完成的视频" />
                  </SelectTrigger>
                  <SelectContent>
                    {completedVideos.length === 0 ? (
                      <SelectItem value="" disabled>暂无已完成视频</SelectItem>
                    ) : (
                      completedVideos.map((video) => (
                        <SelectItem key={video.id} value={video.externalId || video.id}>
                          {video.prompt?.slice(0, 30) || video.id}{video.prompt && video.prompt.length > 30 ? "..." : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {completedVideos.length === 0 && (
                  <p className={`text-xs ${theme.textMuted}`}>提示：请先生成一个视频，完成后才能从中提取角色</p>
                )}
              </div>
            )}

            {characterDialogMode === "generate" && !editingCharacter && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={theme.textSecondary}>起始秒</Label>
                  <Input
                    type="number"
                    value={newCharacter.startSec ?? 0}
                    onChange={(e) => setNewCharacter({ ...newCharacter, startSec: Number(e.target.value) })}
                    className={theme.input}
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={theme.textSecondary}>结束秒</Label>
                  <Input
                    type="number"
                    value={newCharacter.endSec ?? 3}
                    onChange={(e) => setNewCharacter({ ...newCharacter, endSec: Number(e.target.value) })}
                    className={theme.input}
                    min={0}
                  />
                </div>
              </div>
            )}

            
            {characterDialogMode === "add" && (
              <div className="space-y-2">
                <Label className={theme.textSecondary}>Sora角色ID</Label>
                <Input
                  value={editingCharacter ? (editingCharacter.soraId || "") : (newCharacter.soraId || "")}
                  onChange={(e) =>
                    editingCharacter
                      ? setEditingCharacter({ ...editingCharacter, soraId: e.target.value })
                      : setNewCharacter({ ...newCharacter, soraId: e.target.value })
                  }
                  className={theme.input}
                  placeholder="输入 Sora 的角色 ID"
                />
              </div>
            )}
            
            <div className={`p-3 rounded ${theme.bgTertiary} text-xs ${theme.textMuted}`}>
              <p>使用说明：</p>
              <ul className="list-disc list-inside mt-1">
                <li>点击常用角色栏的角色按钮，会在光标位置插入 @{editingCharacter?.id || newCharacter.id || 'char001'}</li>
                <li>ID格式建议：char + 数字，如 char001, char002</li>
                <li>头像推荐尺寸：100x100 像素</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCharacterDialog(false)}>
              取消
            </Button>
            {!editingCharacter && characterDialogMode === "generate" && (
              <Button onClick={generateCharacter} disabled={characterBusy}>
                确认生成
              </Button>
            )}
            <Button onClick={editingCharacter ? updateCharacter : addCharacter} disabled={characterDialogMode === "generate" && characterBusy}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分镜编辑对话框 */}
      <Dialog open={showStoryboardDialog} onOpenChange={setShowStoryboardDialog}>
        <DialogContent className={`sm:max-w-[800px] max-h-[80vh] overflow-y-auto ${theme.bgSecondary} ${theme.border}`}>
          <DialogHeader>
            <DialogTitle className={theme.text}>编辑分镜提示词</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {tempStoryboards.map((storyboard, index) => (
              <div
                key={storyboard.id}
                className={`rounded-lg border ${theme.border} ${theme.bgTertiary} p-4`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className={`text-sm ${theme.textSecondary}`}>分镜 {index + 1}</span>
                  {tempStoryboards.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeStoryboard(storyboard.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={storyboard.prompt}
                  onChange={(e) => updateStoryboard(storyboard.id, e.target.value)}
                  placeholder={`输入分镜 ${index + 1} 的提示词描述...`}
                  className={`min-h-24 resize-none ${theme.input}`}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => aiGenerateStoryboard(storyboard.id)}
                    disabled={aiBusy}
                    className="text-purple-400 hover:text-purple-300 hover:bg-purple-950/30 border-zinc-600"
                  >
                    <Sparkles className="size-3 mr-1" />
                    AI生成
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => aiOptimizeStoryboard(storyboard.id)}
                    disabled={aiBusy}
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 border-zinc-600"
                  >
                    <Wand2 className="size-3 mr-1" />
                    AI优化
                  </Button>
                </div>
              </div>
            ))}

            {tempStoryboards.length < 5 && (
              <Button
                onClick={addStoryboard}
                variant="outline"
                className={`w-full border-dashed ${theme.textSecondary} ${theme.hover} ${theme.border}`}
              >
                <Plus className="size-4 mr-2" />
                添加分镜 ({tempStoryboards.length}/5)
              </Button>
            )}
          </div>
          <DialogFooter>
            <p className={`text-sm ${theme.textMuted} mr-auto`}>
              提示：每个分镜将独立生成视频片段，最多支持 5 个分镜
            </p>
            <Button variant="outline" onClick={() => setShowStoryboardDialog(false)} className={`${theme.textSecondary} ${theme.border}`}>
              取消
            </Button>
            <Button onClick={saveStoryboards}>保存分镜</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      {/* 视频预览对话框 */}
      <Dialog open={showVideoPreview} onOpenChange={setShowVideoPreview}>
        <DialogContent className={`sm:max-w-[800px] ${theme.bgSecondary} ${theme.border}`}>
          <DialogHeader>
            <DialogTitle className={theme.text}>视频预览</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {previewVideoUrl ? (
              <video src={previewVideoUrl} controls muted playsInline preload="auto" className="w-full rounded" onLoadedMetadata={ensureFirstFrame} onError={() => onPlaybackError(previewOriginalUrl)} />
            ) : (
              <div className={`text-sm ${theme.textMuted}`}>暂无视频</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVideoPreview(false)}>{t("close")}</Button>
            {previewVideoUrl && (
              <Button onClick={() => downloadVideo({ id: "preview", type: "text-to-video", prompt: "", storyboards: [], status: "completed", progress: 100, quality: globalQuality, duration: globalDuration, orientation: globalOrientation, aiModel: selectedAiModel, submitTime: new Date().toLocaleString(), videoUrl: previewOriginalUrl })}>{t("download")}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
  const isYijiaServer = (u: string) => /(\.|^)yijiarj\.cn(\/|$)/i.test(String(u || ""));
