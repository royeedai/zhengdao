export type ToolboxSurface = 'web_standalone' | 'web_project' | 'desktop_project' | 'mobile_project'

export type ToolboxModule =
  | 'worldbuilding'
  | 'writing'
  | 'plotting'
  | 'characters'
  | 'timeline'
  | 'map'
  | 'whiteboard'
  | 'random_tables'
  | 'rpg'
  | 'publishing'
  | 'materials'
  | 'visual'

export interface ToolboxTool {
  slug: string
  title: string
  summary: string
  module: ToolboxModule
  status: 'contracted' | 'available' | 'planned'
  aiDraftBoundary: boolean
  tags: string[]
  parity: string[]
}

export const toolboxSurfaces: ToolboxSurface[] = [
  'web_standalone',
  'web_project',
  'desktop_project',
  'mobile_project'
]

export const toolboxTools: ToolboxTool[] = [
  {
    slug: 'world-bible',
    title: '世界观 Bible',
    summary: '把设定维基、模板字段、自动链接和 Canon 事实整理成可检索资料库。',
    module: 'worldbuilding',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['设定', '模板', 'Canon'],
    parity: ['World Anvil 世界观', '墨星素材资料', 'Story Plotter 世界観設定']
  },
  {
    slug: 'manuscript-lab',
    title: '稿件实验室',
    summary: '手稿、章节、纠错补全、续写润色、摘要、大纲和导出。',
    module: 'writing',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['手稿', 'AI 草稿', '导出'],
    parity: ['World Anvil Manuscripts', 'OiaWrite', 'Story Plotter プロット']
  },
  {
    slug: 'plot-board',
    title: '剧情板',
    summary: '灵感、主题、剧情线、章节节点、爽点/风险评分和 AI brainstorming。',
    module: 'plotting',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['大纲', '灵感', '主题'],
    parity: ['墨星全书大纲', 'Story Plotter ネタメモ', 'World Anvil Plot']
  },
  {
    slug: 'character-relations',
    title: '角色关系与家族树',
    summary: '角色卡、关系边、家族树、组织归属、阵营外交和动态关系窗口。',
    module: 'characters',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['角色', '关系图', '组织'],
    parity: ['World Anvil Family Trees', 'Story Plotter 相関図', '墨星人物设定']
  },
  {
    slug: 'timeline-calendar',
    title: '时间线与日历',
    summary: '纪元、并行时间线、自定义日历、章节事件和世界事件联动。',
    module: 'timeline',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['年表', '事件', '日历'],
    parity: ['World Anvil Timelines', 'Story Plotter 時系列', '墨星剧情时间线']
  },
  {
    slug: 'interactive-map',
    title: '交互地图',
    summary: '地图上传、图层、标记、地点资料链接、私密标记和移动端列表化编辑。',
    module: 'map',
    status: 'contracted',
    aiDraftBoundary: false,
    tags: ['地图', '地点', '图层'],
    parity: ['World Anvil Maps', '墨星小说地图', 'Story Plotter 世界観']
  },
  {
    slug: 'whiteboard-charts',
    title: '白板与图表',
    summary: '自由白板、结构图、表格、跨资料链接和作品内可视化规划。',
    module: 'whiteboard',
    status: 'contracted',
    aiDraftBoundary: false,
    tags: ['白板', '表格', '结构图'],
    parity: ['World Anvil Whiteboards', 'World Anvil Charts']
  },
  {
    slug: 'random-generator-studio',
    title: '随机表与生成器工坊',
    summary: '命名器、词库、桥段、设定、随机表、掷骰表和用户私有生成器。',
    module: 'random_tables',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['生成器', '随机表', '词库'],
    parity: ['World Anvil Roll Tables', '墨星 100+ 生成器', 'Story Plotter AI brainstorm']
  },
  {
    slug: 'rpg-campaign',
    title: 'RPG 战役管理',
    summary: '战役、会话、玩家、角色卡、状态块、GM 私密笔记和创作向战役资料。',
    module: 'rpg',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['RPG', '战役', '角色卡'],
    parity: ['World Anvil Campaigns', 'World Anvil Statblocks']
  },
  {
    slug: 'publication-access',
    title: '发布页与访问权限',
    summary: '作品资料发布、公开/私密/协作者访问、读者展示和点数权益边界。',
    module: 'publishing',
    status: 'contracted',
    aiDraftBoundary: false,
    tags: ['发布', '权限', '协作'],
    parity: ['World Anvil Publishing', 'Story Plotter Cloud Sync', '墨星多端同步']
  },
  {
    slug: 'material-library',
    title: '原创素材库',
    summary: '原创/授权素材、教程、PDF 资料、灵感图和用户私有资料库。',
    module: 'materials',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['素材', '原创授权', '教程'],
    parity: ['墨星千库千寻', '墨星写作技巧', 'World Anvil Templates']
  },
  {
    slug: 'visual-assets',
    title: '视觉资产工作台',
    summary: '封面、角色立绘、场景图、地图素材和作品绑定视觉资产。',
    module: 'visual',
    status: 'contracted',
    aiDraftBoundary: true,
    tags: ['封面', '立绘', '场景图'],
    parity: ['墨星 AI 绘画', '墨星封面生成', 'World Anvil Images']
  }
]

export const toolboxModuleLabels: Record<ToolboxModule, string> = {
  worldbuilding: '世界观',
  writing: '稿件',
  plotting: '剧情',
  characters: '角色',
  timeline: '时间线',
  map: '地图',
  whiteboard: '白板',
  random_tables: '随机表',
  rpg: 'RPG',
  publishing: '发布',
  materials: '素材',
  visual: '视觉'
}
