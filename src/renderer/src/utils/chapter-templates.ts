export interface ChapterTemplate {
  id: string
  name: string
  content: string
}

export const BUILTIN_TEMPLATES: ChapterTemplate[] = [
  {
    id: 'blank',
    name: '空白章节',
    content: ''
  },
  {
    id: 'battle',
    name: '战斗/打斗场景',
    content:
      '<p style="color:#666">[场景铺垫：环境描写，气氛烘托]</p><p></p><p style="color:#666">[冲突爆发：双方对峙，言语交锋]</p><p></p><p style="color:#666">[战斗过程：招式描写，局势变化]</p><p></p><p style="color:#666">[转折/高潮：绝招出现，逆转]</p><p></p><p style="color:#666">[战后：收获/代价，推动剧情]</p>'
  },
  {
    id: 'daily',
    name: '日常/过渡',
    content:
      '<p style="color:#666">[场景切换：时间地点]</p><p></p><p style="color:#666">[角色互动：对话推进]</p><p></p><p style="color:#666">[伏笔埋设或信息透露]</p><p></p><p style="color:#666">[章尾钩子：悬念/期待]</p>'
  },
  {
    id: 'flashback',
    name: '回忆/倒叙',
    content:
      '<p style="color:#666">[触发回忆的契机]</p><p></p><p style="color:#666">[回忆内容：过去的场景]</p><p></p><p style="color:#666">[情感冲击/关键信息揭示]</p><p></p><p style="color:#666">[回到现实：新的理解或决定]</p>'
  },
  {
    id: 'faceSlap',
    name: '打脸/爽点',
    content:
      '<p style="color:#666">[反派嘲讽/挑衅]</p><p></p><p style="color:#666">[主角不动声色/铺垫底牌]</p><p></p><p style="color:#666">[底牌亮出：全场震惊]</p><p></p><p style="color:#666">[反派面色剧变/跪地求饶]</p><p></p><p style="color:#666">[围观者议论/声望提升]</p>'
  }
]
