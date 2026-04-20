import React, { useState } from 'react';
import { 
  FolderOpen, FileText, Users, Settings, 
  ChevronDown, Eye, AlertCircle, Maximize2, 
  PenTool, CheckCircle, ArrowUpRight,
  PanelLeftClose, PanelRightClose, PanelLeft, PanelRight, Cloud, History,
  Plus, X, Save, TrendingUp, Crosshair, MapPin, Tag,
  Layout, BookOpen, Activity, GitCommit, GitPullRequest, Search, Filter, Shield, Award, Target
} from 'lucide-react';

export default function ZhengDaoEditor() {
  // === 全局布局状态 ===
  const [showBottomPanel, setShowBottomPanel] = useState(true); // 底部沙盘
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);     // 左侧大纲
  const [rightPanelOpen, setRightPanelOpen] = useState(true);   // 右侧辅助

  // === HUD / 模态框状态管理 ===
  const [activeModal, setActiveModal] = useState(null); // 'character' | 'foreshadow' | 'plotNode' | 'fullCharacters' | 'settings'
  const [modalData, setModalData] = useState(null); 

  const openModal = (type, data = null) => {
    setActiveModal(type);
    setModalData(data);
  };
  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };

  // === 核心数据模拟 (驱动底层沙盘) ===
  const plotNodes = [
    { id: 1, ch: 2, title: '净身出户', score: -4, type: 'main', desc: '被丈母娘赶出家门' },
    { id: 2, ch: 12, title: '觉醒投资之眼', score: 2, type: 'main', desc: '获得系统初始资金' },
    { id: 3, ch: 25, title: '截胡反派妖股', score: 4, type: 'main', desc: '狂赚一千万，引发关注' },
    { id: 4, ch: 35, title: '公司遭恶意打压', score: -2, type: 'branch', desc: '死敌动用家族势力施压' },
    { id: 5, ch: 42, title: '宴会绝杀打脸', score: 5, type: 'main', desc: '抛出收购合同，碾压全场', active: true },
    { id: 6, ch: 55, title: '京城豪门试探', score: -1, type: 'main', desc: '新地图新危机铺垫' },
    { id: 7, ch: 68, title: '登顶江城首富', score: 4, type: 'main', desc: '吞并所有竞争对手' },
  ];

  // 计算 EKG 动态连线路径
  const generateEKGPath = () => {
    if (plotNodes.length === 0) return '';
    let path = `M 0 100 `;
    plotNodes.forEach(node => {
      const x = node.ch * 15;
      const y = 100 - (node.score * 15);
      path += `L ${x} ${y} `;
    });
    const lastNode = plotNodes[plotNodes.length - 1];
    path += `L ${(lastNode.ch + 15) * 15} 100`;
    return path;
  };

  // ==========================================
  // HUD 1：活体角色单卡编辑 (轻量级)
  // ==========================================
  const CharacterEditModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1a1a1a] border border-[#333] w-[600px] rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold">
            <Users size={18} /><span>{modalData?.isNew ? '建档：新出场人物' : '编辑角色档案'}</span>
          </div>
          <button onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          <div className="flex gap-4">
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">角色姓名</label>
                <input type="text" defaultValue={modalData?.name || ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition" placeholder="例如：苏清雪" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">阵营定位</label>
                  <select defaultValue={modalData?.faction || 'neutral'} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition">
                    <option value="protagonist">主角团</option>
                    <option value="enemy">死敌/反派</option>
                    <option value="heroine">女主/红颜</option>
                    <option value="neutral">工具人/路人</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">当前状态</label>
                  <select defaultValue={modalData?.status || 'active'} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 transition">
                    <option value="active">活跃/装逼中</option>
                    <option value="danger">极度危险(待打脸)</option>
                    <option value="dead">已领盒饭</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="w-32 h-32 bg-[#111] border border-[#333] rounded flex flex-col items-center justify-center text-slate-600 border-dashed cursor-pointer hover:border-indigo-500 hover:text-indigo-400 transition mt-5">
              <Plus size={24} className="mb-2" />
              <span className="text-[10px]">上传人设图</span>
            </div>
          </div>
          <div className="border-t border-[#2a2a2a] pt-4">
            <h4 className="text-xs font-bold text-slate-400 mb-3 flex items-center"><TrendingUp size={14} className="mr-1 text-emerald-500" /> 都市核心数据 (动态追踪)</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16">资产/财力:</span>
                <input type="text" defaultValue={modalData?.assets || ''} className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-yellow-400 font-mono text-sm focus:outline-none focus:border-indigo-500" placeholder="如：¥ 3000万" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-16">核心底牌:</span>
                <input type="text" defaultValue={modalData?.skill || ''} className="flex-1 bg-[#111] border border-[#333] rounded px-2 py-1 text-emerald-400 text-sm focus:outline-none focus:border-indigo-500" placeholder="如：顶级黑客技术" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">性格与人设备注 (写给未来的自己看):</label>
                <textarea rows="3" defaultValue={modalData?.desc || ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-300 text-sm focus:outline-none focus:border-indigo-500 resize-none" placeholder="高傲、目中无人..."></textarea>
              </div>
            </div>
          </div>
        </div>
        <div className="h-14 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-end px-5 gap-3">
          <button onClick={closeModal} className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition">取消</button>
          <button onClick={closeModal} className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded flex items-center transition shadow-lg shadow-indigo-900/20">
            <Save size={14} className="mr-1" /> 保存档案
          </button>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // HUD 2：角色总库大面板 (全屏沉浸)
  // ==========================================
  const FullCharactersModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-[#141414] border border-[#333] w-[90vw] h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="h-14 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between px-6 shrink-0 shadow-sm">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg tracking-wide">
            <Users size={20} /><span>活体角色档案总库</span>
          </div>
          <div className="flex space-x-4 items-center">
            <div className="bg-[#111] border border-[#333] rounded flex items-center px-2 py-1.5 text-slate-300 w-64">
              <Search size={14} className="text-slate-500 mr-2" />
              <input type="text" placeholder="搜索人名、金手指..." className="bg-transparent border-none focus:outline-none text-xs w-full" />
            </div>
            <button onClick={() => openModal('character', {isNew: true})} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded flex items-center text-xs font-bold transition">
              <Plus size={14} className="mr-1" /> 新建角色
            </button>
            <button onClick={closeModal} className="p-2 text-slate-500 hover:text-red-400 bg-[#222] rounded-full transition ml-4"><X size={20}/></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          <div className="space-y-10 max-w-7xl mx-auto">
            {/* 主角团 */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-[#333] pb-2 mb-4 flex items-center">
                <Shield size={16} className="mr-2 text-indigo-500" /> 主角阵营
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div onClick={() => openModal('character', {name: '林凡'})} className="bg-[#1e1e1e] border border-[#333] hover:border-indigo-500/50 rounded-xl p-4 cursor-pointer transition-all shadow-md group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/80"></div>
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">林</div>
                      <div>
                        <h4 className="font-bold text-slate-100">林凡 <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded ml-1 font-normal">宿主</span></h4>
                        <p className="text-[10px] text-slate-500">登场: 第1章 | 状态: 极度活跃</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs pl-2 bg-[#141414] p-2 rounded border border-[#2a2a2a]">
                    <div className="flex justify-between"><span className="text-slate-500">总资产:</span> <span className="text-yellow-400 font-mono font-bold">¥ 1.2 亿</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">核心底牌:</span> <span className="text-emerald-400">洞察之眼 LV3</span></div>
                  </div>
                </div>
              </div>
            </div>
            {/* 反派死敌 */}
            <div>
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest border-b border-[#333] pb-2 mb-4 flex items-center">
                <Crosshair size={16} className="mr-2 text-red-500" /> 待宰羔羊 (反派)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                <div onClick={() => openModal('character', {name: '赵天宇'})} className="bg-[#1e1e1e] border border-[#333] hover:border-red-500/50 rounded-xl p-4 cursor-pointer transition-all shadow-md group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500/80"></div>
                  <div className="flex justify-between items-start mb-3 pl-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-red-900/30 border border-red-500/30 flex items-center justify-center text-red-400 font-bold">赵</div>
                      <div>
                        <h4 className="font-bold text-slate-100">赵天宇 <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded ml-1 font-normal">炮灰</span></h4>
                        <p className="text-[10px] text-slate-500">登场: 第5章 | 状态: 极度危险</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs pl-2 bg-[#141414] p-2 rounded border border-[#2a2a2a]">
                    <div className="flex justify-between"><span className="text-slate-500">家族势力:</span> <span className="text-slate-300">江城风投龙头</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">作死进度:</span> <span className="text-red-400 font-bold">95% (即将破产)</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // HUD 3：设定维基面板 (全屏沉浸)
  // ==========================================
  const FullSettingsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in zoom-in-95 duration-200">
      <div className="bg-[#141414] border border-[#333] w-[85vw] h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        <button onClick={closeModal} className="absolute top-4 right-6 p-2 text-slate-400 hover:text-red-400 bg-[#222] rounded-full transition z-20 shadow-lg"><X size={20}/></button>
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧导航 */}
          <div className="w-64 border-r border-[#2a2a2a] bg-[#181818] flex flex-col shrink-0">
            <div className="h-16 border-b border-[#2a2a2a] flex items-center px-6">
              <BookOpen size={20} className="text-purple-500 mr-2" />
              <span className="font-bold text-slate-200 text-lg tracking-wide">设定维基百科</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2 ml-2">基础世界观</h4>
                <div className="bg-[#222] text-purple-400 text-sm px-3 py-2.5 rounded-lg border border-purple-500/30 cursor-pointer shadow-sm">商业/财富系统等级</div>
                <div className="text-slate-400 hover:text-slate-200 text-sm px-3 py-2.5 cursor-pointer mt-1">江城势力地图划分</div>
              </div>
              <div>
                <h4 className="text-[10px] text-slate-500 uppercase font-bold mb-2 ml-2">核心物品/金手指</h4>
                <div className="text-slate-400 hover:text-slate-200 text-sm px-3 py-2.5 cursor-pointer">洞察之眼 (技能树)</div>
                <div className="text-slate-400 hover:text-slate-200 text-sm px-3 py-2.5 cursor-pointer">神秘古玉 (主线道具)</div>
              </div>
            </div>
          </div>
          {/* 右侧编辑 */}
          <div className="flex-1 bg-[#1e1e1e] flex flex-col relative">
            <div className="h-16 border-b border-[#2a2a2a] flex items-center justify-between px-10 bg-[#1a1a1a]">
              <h2 className="text-xl font-bold text-slate-100">商业等级/系统体系设定</h2>
              <button className="bg-slate-700 hover:bg-purple-600 text-white px-4 py-2 rounded text-sm transition flex items-center mr-10"><Save size={16} className="mr-2"/> 保存设定</button>
            </div>
            <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-4xl mx-auto space-y-8">
                <div className="bg-[#141414] border border-[#333] rounded-xl p-8 shadow-sm">
                  <h3 className="text-purple-400 font-bold mb-5 flex items-center text-lg"><Award size={20} className="mr-2" /> 系统技能等级换算</h3>
                  <div className="space-y-4 text-base text-slate-300">
                    <div className="flex"><span className="w-24 font-bold text-slate-500">LV 1 :</span> <span>能看透百万级项目的回报率。(当前)</span></div>
                    <div className="flex"><span className="w-24 font-bold text-slate-500">LV 2 :</span> <span>千万级，附带查看人脉弱点。</span></div>
                    <div className="flex"><span className="w-24 font-bold text-slate-500">LV 3 :</span> <span className="text-emerald-400">亿级，可进行做空做多预测。(即将升级)</span></div>
                    <div className="flex"><span className="w-24 font-bold text-slate-500">LV Max :</span> <span className="text-yellow-400 font-bold">洞察全球国运走势。</span></div>
                  </div>
                </div>
                <div className="bg-[#141414] border border-[#333] rounded-xl p-8 shadow-sm">
                   <label className="block text-slate-400 font-bold mb-4 text-lg">大纲战力通胀防崩指南 (Markdown备忘)</label>
                   <textarea rows="10" className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg p-5 text-slate-300 text-base focus:outline-none focus:border-purple-500 resize-none font-mono leading-relaxed" defaultValue={`战力(财力)通胀警告：\n- 前期(1-100章)：千万级别打闹，主角资产不要超过 5 亿，否则失去期待感。\n- 中期(100-300章)：踏入百亿财团之争，核心写商战与收购。\n- 后期：国际资本对决，做空华尔街。`}></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // HUD 4：沙盘节点表单 (PlotNode)
  // ==========================================
  const PlotNodeModal = () => {
    const [score, setScore] = useState(modalData?.score || 0);
    const getScoreColor = (val) => { if(val >= 3) return 'text-emerald-400'; if(val <= -3) return 'text-red-400'; return 'text-yellow-400'; };
    const getScoreDesc = (val) => { if(val >= 4) return '爆爽 / 高潮迭起'; if(val > 0) return '小爽 / 装逼打脸'; if(val == 0) return '平缓 / 发育铺垫'; if(val > -4) return '打压 / 遇到阻碍'; return '极度压抑 / 虐主警告'; };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in zoom-in-95 duration-200">
        <div className="bg-[#1a1a1a] border border-[#333] w-[550px] rounded-xl shadow-2xl overflow-hidden flex flex-col">
          <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5">
            <div className="flex items-center space-x-2 text-emerald-500 font-bold">
              <Activity size={18} /><span>{modalData?.isNew ? '添加沙盘节点' : '调控大纲剧情块'}</span>
            </div>
            <button onClick={closeModal} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">核心事件 (标题)</label>
              <input type="text" defaultValue={modalData?.title || ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-emerald-50 text-lg font-bold focus:outline-none focus:border-emerald-500" placeholder="例如：宴会绝杀打脸" />
            </div>
            <div className="bg-[#111] p-4 rounded-lg border border-[#333]">
              <label className="block text-xs font-bold text-slate-300 mb-4 flex items-center justify-between">
                <span>读者的情绪波动预判 (核心功能)</span>
                <span className={`font-mono text-sm ${getScoreColor(score)}`}>{score > 0 ? '+'+score : score}</span>
              </label>
              <input type="range" min="-5" max="5" step="1" value={score} onChange={(e) => setScore(parseInt(e.target.value))} className="w-full accent-emerald-500 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer mb-2"/>
              <div className={`text-center text-xs mt-3 font-bold ${getScoreColor(score)}`}>{getScoreDesc(score)}</div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">细纲备忘录 (事件脉络)</label>
              <textarea rows="3" defaultValue={modalData?.desc || ''} className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-slate-400 text-sm focus:outline-none focus:border-emerald-500 resize-none leading-relaxed" placeholder="1. 反派挑衅..."></textarea>
            </div>
          </div>
          <div className="h-14 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5">
            <button className="text-xs text-red-500/70 hover:text-red-400 transition">废弃节点</button>
            <div className="flex gap-3">
              <button onClick={closeModal} className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200">取消</button>
              <button onClick={closeModal} className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center transition shadow-lg shadow-emerald-900/20">
                <Save size={14} className="mr-1" /> 保存至沙盘
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 主界面 (回到最经典的沉浸式三栏一底)
  // ==========================================
  return (
    <div className="flex flex-col h-screen bg-[#141414] text-slate-300 font-sans overflow-hidden select-none relative">
      
      {/* 挂载所有 HUD 模态框 */}
      {activeModal === 'character' && <CharacterEditModal />}
      {activeModal === 'fullCharacters' && <FullCharactersModal />}
      {activeModal === 'settings' && <FullSettingsModal />}
      {activeModal === 'plotNode' && <PlotNodeModal />}

      {/* --- Top Bar: 全局导航与激励 --- */}
      <div className="h-12 border-b border-[#2a2a2a] bg-[#1a1a1a] flex items-center justify-between px-4 shrink-0 shadow-sm z-30">
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-emerald-500 font-bold tracking-wide">
            <PenTool size={18} />
            <span>证道 <span className="text-[10px] text-slate-500 font-normal ml-1 border border-slate-600 rounded px-1">Pro</span></span>
          </div>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="text-sm font-medium text-slate-200">《重生之金融巨子》</div>
          
          <div className="flex items-center space-x-1 ml-4 text-slate-500">
            <button onClick={() => setLeftPanelOpen(!leftPanelOpen)} className="p-1.5 hover:bg-slate-700 hover:text-slate-300 rounded transition" title="开关目录">
              {leftPanelOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
            </button>
            <button onClick={() => setRightPanelOpen(!rightPanelOpen)} className="p-1.5 hover:bg-slate-700 hover:text-slate-300 rounded transition" title="开关辅助面板">
              {rightPanelOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />}
            </button>
          </div>
        </div>

        {/* 核心呼出按钮组：代替了之前切割感很强的标签页 */}
        <div className="flex items-center space-x-3 text-xs">
          <button onClick={() => openModal('fullCharacters')} className="flex items-center px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded hover:bg-indigo-600/20 transition font-bold">
            <Users size={14} className="mr-1.5"/> 角色总库
          </button>
          <button onClick={() => openModal('settings')} className="flex items-center px-3 py-1.5 bg-purple-600/10 text-purple-400 border border-purple-500/30 rounded hover:bg-purple-600/20 transition font-bold">
            <BookOpen size={14} className="mr-1.5"/> 设定维基
          </button>
        </div>

        <div className="flex items-center space-x-4 text-slate-400">
          <div className="flex items-center space-x-3 text-xs w-64 mr-4">
            <span className="text-slate-400 font-medium">日更:</span>
            <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden relative border border-slate-700/50">
              <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 w-[65%] shadow-[0_0_10px_rgba(52,211,153,0.4)]"></div>
            </div>
            <span className="text-emerald-400 font-bold font-mono">6,500 <span className="text-slate-500 text-[10px]">/ 10k</span></span>
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-md cursor-pointer">老炮</div>
        </div>
      </div>

      {/* --- Main Workspace (沉浸式左右中布局) --- */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        
        {/* 左侧边栏: 大纲树 */}
        <div className={`border-r border-[#2a2a2a] bg-[#1a1a1a] flex flex-col shrink-0 transition-all duration-300 ease-in-out ${leftPanelOpen ? 'w-64' : 'w-0 border-r-0 opacity-0'}`}>
          <div className="flex border-b border-[#2a2a2a] text-xs font-medium shrink-0">
            <button className="flex-1 py-2.5 text-emerald-500 border-b-2 border-emerald-500 bg-slate-800/30">大纲目录</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 text-sm space-y-1">
            <div className="flex items-center text-slate-300 py-1.5 px-2 group">
              <ChevronDown size={14} className="mr-1 text-slate-500" />
              <FolderOpen size={14} className="mr-2 text-indigo-400" />
              <span className="font-medium">第一卷：潜龙在渊</span>
            </div>
            <div className="pl-7 space-y-0.5">
              <div className="flex items-center py-1.5 text-slate-500 hover:text-slate-300 cursor-pointer rounded px-2 hover:bg-slate-800/50">
                <FileText size={14} className="mr-2 opacity-50" /> 第001章：梦醒2008
              </div>
              <div className="flex items-center py-1.5 bg-emerald-500/10 text-emerald-400 rounded cursor-pointer border border-emerald-500/20 px-2 mt-1 shadow-sm">
                <FileText size={14} className="mr-2" /> 第042章：宴会打脸
              </div>
            </div>
          </div>
        </div>

        {/* 中央沉浸编辑器 */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e] relative">
          <div className="absolute top-0 left-0 w-full h-12 flex items-center justify-between px-8 bg-gradient-to-b from-[#1e1e1e] to-transparent z-10 pointer-events-none">
            <div className="text-slate-500 font-serif tracking-widest text-sm opacity-60">第042章：宴会打脸，首富入场</div>
          </div>
          
          <div className="flex-1 overflow-y-auto px-8 pt-16 pb-32 lg:px-32 scroll-smooth">
            <div className="max-w-3xl mx-auto font-serif text-[19px] leading-[2.2] text-[#c9d1d9] tracking-wide focus:outline-none" contentEditable suppressContentEditableWarning>
              <p className="mb-6 opacity-80 transition-opacity hover:opacity-100">
                水晶吊灯散发着冷冽的光芒，江城顶级的君悦大酒店宴会厅内，衣香鬓影。
              </p>
              <p className="mb-6 opacity-80 transition-opacity hover:opacity-100 relative group">
                {/* 内联人物卡快捷键 */}
                <span 
                  onClick={() => openModal('character', {name: '赵天宇', faction: 'enemy', status: 'danger', assets: '¥ 3000万', skill: '天宇风投继承人', desc: '一直看不起林凡'})}
                  className="bg-red-900/30 text-red-300 px-1.5 py-0.5 rounded cursor-pointer border-b border-red-500/30 hover:bg-red-800/40 transition"
                  title="点击编辑角色卡"
                >
                  @赵天宇
                </span>
                端着高脚杯，居高临下地看着林凡，嘴角勾起一抹讥讽的弧度：“怎么，这种高端局，也是你这个连房租都交不起的废物能进来的？”
              </p>
              <p className="mb-6 bg-slate-800/20 -mx-4 px-4 py-1 rounded-lg border-l-2 border-emerald-500/50 text-[#e6edf3] shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-all">
                他缓缓摇晃着手中的香槟，淡淡开口：“赵公子，十分钟前，你名下的天宇风投已经被我全面收购。现在，请你从我的宴会上，滚出去。”
                <span className="inline-block w-2 h-5 bg-emerald-500 animate-pulse align-middle ml-1"></span>
              </p>
            </div>
          </div>
          
          {/* 沙盘唤出悬浮窗 */}
          <div className="absolute bottom-6 right-6 flex flex-col gap-3">
             <button 
                onClick={() => setShowBottomPanel(!showBottomPanel)}
                className={`p-3 rounded-full shadow-xl flex items-center transition-all duration-300 border ${
                  showBottomPanel 
                  ? 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700' 
                  : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                }`}
                title="呼出创世沙盘 (快捷键: Ctrl+`)"
              >
                {showBottomPanel ? <ChevronDown size={20} /> : <Activity size={20} />}
             </button>
          </div>
        </div>

        {/* 右侧边栏: 本章备忘录 (轻量级) */}
        <div className={`border-l border-[#2a2a2a] bg-[#1a1a1a] flex flex-col shrink-0 shadow-2xl z-10 transition-all duration-300 ease-in-out ${rightPanelOpen ? 'w-72' : 'w-0 border-l-0 opacity-0'}`}>
          <div className="p-4 border-b border-[#2a2a2a] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center uppercase tracking-wider">
                <AlertCircle size={14} className="mr-1.5 text-orange-500" /> 伏笔预警
              </h3>
              <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">1 待回收</span>
            </div>
            <div className="bg-[#222222] border-l-2 border-orange-500 p-2.5 rounded-r text-xs shadow-sm hover:bg-[#2a2a2a] transition cursor-pointer group">
              <div className="flex justify-between text-slate-200 mb-1.5"><span className="font-semibold text-orange-400">城南地皮文件</span><span className="text-[9px] text-slate-500 bg-slate-800 px-1 rounded">20章前</span></div>
              <div className="text-slate-400 line-clamp-2 leading-relaxed">这份文件将在下周公布，是反杀赵家筹码。</div>
            </div>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-300 flex items-center mb-4 uppercase tracking-wider">
              <Users size={14} className="mr-1.5 text-indigo-400" /> 本章活跃锚点
            </h3>
            <div onClick={() => openModal('character', {name: '赵天宇'})} className="bg-[#222222] p-3 rounded border border-[#333] hover:border-red-500/50 cursor-pointer transition-colors mb-3 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
              <div className="flex justify-between items-center mb-2.5 pl-2">
                <span className="font-bold text-red-400 text-sm tracking-wide">赵天宇</span>
                <span className="text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded text-red-400">待打脸</span>
              </div>
              <div className="space-y-1.5 text-xs pl-2">
                <div className="flex justify-between"><span className="text-slate-500">家族资产:</span> <span className="text-slate-300 font-mono">¥ 3000 万</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 沉浸式底部：高级可视创世沙盘 --- */}
      <div className={`border-t border-[#2a2a2a] bg-[#111] shrink-0 flex flex-col transition-all duration-300 ease-in-out ${showBottomPanel ? 'h-[320px] opacity-100 z-20' : 'h-0 opacity-0 overflow-hidden border-t-0 z-0'}`}>
        <div className="h-10 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-6 justify-between shrink-0 shadow-sm">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm tracking-wide">
            <Activity size={16} /><span>创世沙盘 & 爽点心电图</span>
          </div>
          <div className="flex space-x-3">
            <div className="flex items-center text-[10px] text-slate-400 mr-4 space-x-3">
              <span className="flex items-center"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1"></div>爽点区 (+1~+5)</span>
              <span className="flex items-center"><div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1"></div>平稳区 (0)</span>
              <span className="flex items-center"><div className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></div>毒点/压抑区 (-1~-5)</span>
            </div>
            <button onClick={() => openModal('plotNode', {isNew: true})} className="bg-slate-700 hover:bg-emerald-600 text-white px-2 py-1 rounded flex items-center text-[10px] font-bold transition">
              <Plus size={12} className="mr-1" /> 补全新节点
            </button>
          </div>
        </div>

        {/* 交互核心沙盘图表 */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0a0a0a]">
          <div className="relative min-w-[1500px] h-full">
            {/* 背景时间线柱 */}
            <div className="absolute top-0 left-0 w-full h-full">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="absolute top-0 h-full border-l border-[#222] flex flex-col pointer-events-none" style={{ left: `${(i+1)*150}px` }}>
                  <span className="text-[10px] text-slate-600 font-mono mt-1 ml-1">Ch {(i+1)*10}</span>
                </div>
              ))}
              <div className="absolute top-[120px] w-full border-t border-[#333] border-dashed pointer-events-none"></div>
            </div>

            {/* SVG 心电图 */}
            <svg className="absolute top-4 left-0 w-full h-[240px] pointer-events-none z-0 overflow-visible">
              <path d={generateEKGPath()} fill="none" stroke="url(#ekg-grad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"/>
              <defs>
                <linearGradient id="ekg-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>

            {/* 动态渲染的数据节点 */}
            {plotNodes.map((node) => {
              const xPos = node.ch * 15;
              const yPos = 120 - (node.score * 15);
              const isHigh = node.score > 0;
              const isLow = node.score < 0;
              
              return (
                <div 
                  key={node.id}
                  onClick={() => openModal('plotNode', node)}
                  className={`absolute w-36 p-2 rounded-lg border shadow-lg cursor-pointer transition-all duration-200 z-10 hover:shadow-xl hover:-translate-y-0.5
                    ${node.active ? 'bg-[#1a2e24] border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] z-20' : 
                      isHigh ? 'bg-[#181818] border-emerald-900/50 hover:border-emerald-500/50' : 
                      isLow ? 'bg-[#181818] border-red-900/50 hover:border-red-500/50' : 
                      'bg-[#181818] border-yellow-900/50 hover:border-yellow-500/50'}
                  `}
                  style={{ left: `${xPos - 72}px`, top: `${yPos - (isHigh ? 60 : 0)}px` }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] bg-[#2a2a2a] px-1 py-0.5 rounded text-slate-300 font-mono">Ch {node.ch}</span>
                    <span className={`text-[10px] font-bold ${isHigh ? 'text-emerald-400' : isLow ? 'text-red-400' : 'text-yellow-400'}`}>
                      {node.score > 0 ? '+'+node.score : node.score}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-100 truncate mb-0.5">{node.title}</div>
                  <div className="text-[9px] text-slate-500 line-clamp-1">{node.desc}</div>
                  
                  {/* 连接点圆心 */}
                  <div className={`absolute left-1/2 -ml-1.5 w-3 h-3 rounded-full border-2 border-[#141414] 
                    ${isHigh ? '-bottom-1.5 bg-emerald-500' : isLow ? '-top-1.5 bg-red-500' : 'top-1/2 -mt-1.5 bg-yellow-500'}
                    ${node.active ? 'animate-pulse' : ''}
                  `}></div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
}