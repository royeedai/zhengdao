export interface SeedCharacterField {
  key: string
  label: string
  type: 'text' | 'select' | 'number'
  options?: string[]
}

export interface SeedFactionLabel {
  value: string
  label: string
  color: string
}

export interface SeedStatusLabel {
  value: string
  label: string
}

export interface SeedEmotionLabel {
  score: number
  label: string
}

export interface GenreTemplateSeed {
  id: string
  name: string
  character_fields: SeedCharacterField[]
  faction_labels: SeedFactionLabel[]
  status_labels: SeedStatusLabel[]
  emotion_labels: SeedEmotionLabel[]
}

export const SEED_GENRE_TEMPLATES: GenreTemplateSeed[] = [
  {
    id: 'urban',
    name: '都市商战',
    character_fields: [
      { key: 'assets', label: '资产/财力', type: 'text' },
      { key: 'skill', label: '核心底牌', type: 'text' },
      { key: 'background', label: '势力背景', type: 'text' }
    ],
    faction_labels: [
      { value: 'protagonist', label: '主角团', color: 'indigo' },
      { value: 'enemy', label: '死敌/反派', color: 'red' },
      { value: 'heroine', label: '女主/红颜', color: 'amber' },
      { value: 'neutral', label: '工具人/路人', color: 'slate' }
    ],
    status_labels: [
      { value: 'active', label: '活跃' },
      { value: 'danger', label: '极度危险(待打脸)' },
      { value: 'dead', label: '已领盒饭' }
    ],
    emotion_labels: [
      { score: 5, label: '爆爽 / 打脸碾压' },
      { score: 4, label: '大爽 / 逆袭高潮' },
      { score: 3, label: '小爽 / 装逼成功' },
      { score: 2, label: '微爽 / 小有收获' },
      { score: 1, label: '轻快 / 铺垫期待' },
      { score: 0, label: '平缓 / 发育铺垫' },
      { score: -1, label: '微压 / 小挫折' },
      { score: -2, label: '打压 / 遇到阻碍' },
      { score: -3, label: '重压 / 危机逼近' },
      { score: -4, label: '极压 / 被迫害' },
      { score: -5, label: '极度压抑 / 虐主警告' }
    ]
  },
  {
    id: 'xianxia',
    name: '玄幻修仙',
    character_fields: [
      { key: 'realm', label: '修为境界', type: 'text' },
      { key: 'technique', label: '功法/神通', type: 'text' },
      { key: 'treasure', label: '法宝', type: 'text' },
      { key: 'resources', label: '灵石/资源', type: 'text' }
    ],
    faction_labels: [
      { value: 'protagonist', label: '主角', color: 'indigo' },
      { value: 'daolv', label: '道侣', color: 'amber' },
      { value: 'enemy_sect', label: '敌对宗门', color: 'red' },
      { value: 'loose', label: '散修', color: 'slate' }
    ],
    status_labels: [
      { value: 'cultivating', label: '修炼中' },
      { value: 'secluded', label: '闭关' },
      { value: 'tribulation', label: '渡劫' },
      { value: 'fallen', label: '陨落' }
    ],
    emotion_labels: [
      { score: 5, label: '碾压 / 逆天战斗' },
      { score: 4, label: '突破 / 获得神器' },
      { score: 3, label: '进步 / 悟道' },
      { score: 2, label: '小突破 / 获宝' },
      { score: 1, label: '机缘 / 铺垫' },
      { score: 0, label: '修炼 / 日常' },
      { score: -1, label: '受挫 / 瓶颈' },
      { score: -2, label: '被追杀 / 围困' },
      { score: -3, label: '重伤 / 败退' },
      { score: -4, label: '生死危机' },
      { score: -5, label: '道心破碎 / 至暗时刻' }
    ]
  },
  {
    id: 'scifi',
    name: '科幻未来',
    character_fields: [
      { key: 'tech_level', label: '科技等级', type: 'text' },
      { key: 'ability', label: '异能/植入体', type: 'text' },
      { key: 'org', label: '阵营组织', type: 'text' },
      { key: 'equipment', label: '装备', type: 'text' }
    ],
    faction_labels: [
      { value: 'protagonist', label: '主角组', color: 'indigo' },
      { value: 'enemy', label: '敌对势力', color: 'red' },
      { value: 'neutral', label: '中立方', color: 'slate' },
      { value: 'ai', label: 'AI/机器', color: 'amber' }
    ],
    status_labels: [
      { value: 'online', label: '在线' },
      { value: 'undercover', label: '潜伏' },
      { value: 'offline', label: '失联' },
      { value: 'kia', label: '阵亡' }
    ],
    emotion_labels: [
      { score: 5, label: '科技碾压 / 终极武器' },
      { score: 4, label: '重大突破' },
      { score: 3, label: '战术胜利' },
      { score: 2, label: '获取情报' },
      { score: 1, label: '铺垫 / 探索' },
      { score: 0, label: '日常 / 准备' },
      { score: -1, label: '小危机' },
      { score: -2, label: '遭遇伏击' },
      { score: -3, label: '重大损失' },
      { score: -4, label: '背叛 / 陷阱' },
      { score: -5, label: '末日级危机' }
    ]
  },
  {
    id: 'historical',
    name: '历史架空',
    character_fields: [
      { key: 'rank', label: '官职/爵位', type: 'text' },
      { key: 'troops', label: '兵力', type: 'text' },
      { key: 'strategy', label: '谋略', type: 'text' },
      { key: 'territory', label: '领地', type: 'text' }
    ],
    faction_labels: [
      { value: 'own', label: '本方', color: 'indigo' },
      { value: 'enemy_nation', label: '敌国', color: 'red' },
      { value: 'court', label: '朝廷', color: 'amber' },
      { value: 'jianghu', label: '江湖', color: 'slate' }
    ],
    status_labels: [
      { value: 'in_court', label: '在朝' },
      { value: 'campaigning', label: '征战' },
      { value: 'exiled', label: '被贬' },
      { value: 'dead', label: '驾崩' }
    ],
    emotion_labels: [
      { score: 5, label: '大胜 / 统一' },
      { score: 4, label: '战胜 / 封侯' },
      { score: 3, label: '计谋成功' },
      { score: 2, label: '结盟 / 小胜' },
      { score: 1, label: '谋划 / 发展' },
      { score: 0, label: '治理 / 日常' },
      { score: -1, label: '朝争 / 小败' },
      { score: -2, label: '被弹劾 / 失地' },
      { score: -3, label: '大败 / 围城' },
      { score: -4, label: '兵变 / 背叛' },
      { score: -5, label: '亡国 / 灭族' }
    ]
  },
  {
    id: 'romance',
    name: '言情/现代',
    character_fields: [
      { key: 'job', label: '职业', type: 'text' },
      { key: 'personality', label: '性格标签', type: 'text' },
      { key: 'relation', label: '与主角关系', type: 'text' },
      { key: 'affection', label: '好感度', type: 'text' }
    ],
    faction_labels: [
      { value: 'main_cp', label: '主CP', color: 'indigo' },
      { value: 'sub_cp', label: '副CP', color: 'amber' },
      { value: 'rival', label: '情敌', color: 'red' },
      { value: 'family', label: '家人/闺蜜', color: 'slate' }
    ],
    status_labels: [
      { value: 'ambiguous', label: '暧昧中' },
      { value: 'together', label: '热恋' },
      { value: 'cold_war', label: '冷战' },
      { value: 'breakup', label: '分手' }
    ],
    emotion_labels: [
      { score: 5, label: '甜蜜爆棚 / HE高潮' },
      { score: 4, label: '告白 / 重逢' },
      { score: 3, label: '暧昧升温' },
      { score: 2, label: '小甜蜜' },
      { score: 1, label: '初见 / 好感' },
      { score: 0, label: '日常 / 过渡' },
      { score: -1, label: '误会 / 小矛盾' },
      { score: -2, label: '冷战 / 争吵' },
      { score: -3, label: '分离 / 背叛' },
      { score: -4, label: '生死离别' },
      { score: -5, label: '虐心 / BE预警' }
    ]
  }
]
