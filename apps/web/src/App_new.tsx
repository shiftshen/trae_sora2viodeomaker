// 这个文件是用来标记修改点的临时文件

/* 问题1: 文生/图生视频切换按钮 - 行1016-1036 */
// 旧代码：小按钮不容易点
// 新代码：大的tab切换组

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


/* 问题2-4: 模型/智能体/角色卡片点击编辑 */
// 在每个卡片div上添加onClick和cursor-pointer

// 模型卡片 - 行1570
<div 
  key={model.id} 
  onClick={() => {
    setEditingModel(model);
    setShowModelDialog(true);
  }}
  className={`rounded-lg border ${theme.border} ${theme.card} p-4 cursor-pointer hover:border-purple-500 transition-colors`}
>

// 智能体卡片 - 行1617  
<div 
  key={agent.id}
  onClick={() => {
    setEditingAgent(agent);
    setShowAgentDialog(true);
  }} 
  className={`rounded-lg border ${theme.border} ${theme.card} p-4 cursor-pointer hover:border-purple-500 transition-colors`}
>

// 角色卡片 - 行1669
<div 
  key={char.id}
  onClick={() => {
    setEditingCharacter(char);
    setShowCharacterDialog(true);
  }}
  className={`rounded-lg border ${theme.border} ${theme.card} p-4 cursor-pointer hover:border-purple-500 transition-colors`}
>


/* 问题5: 角色插入功能修复 - 行517 */
// 确保insertCharacterAtCursor正确工作
const insertCharacterAtCursor = (charId: string, draftId: string) => {
  const textarea = promptInputRefs.current[draftId];
  const draft = draftTasks.find((d) => d.id === draftId);
  
  if (textarea && draft) {
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const text = draft.prompt;
    const newText = text.substring(0, start) + `@${charId} ` + text.substring(end);
    updateDraft(draftId, { prompt: newText });
    
    setTimeout(() => {
      if (textarea) {
        const newPosition = start + charId.length + 2;
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
        textarea.focus();
      }
    }, 10); // 增加延迟确保DOM更新
    
    const char = characters.find(c => c.id === charId);
    toast.success(`已插入角色 @${charId}${char ? ` (${char.name})` : ''}`);
  } else {
    toast.error("请先选择或创建一个视频输入框");
  }
};
