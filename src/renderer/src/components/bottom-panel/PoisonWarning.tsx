import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  startCh: number
  endCh: number
  onClose: () => void
}

export default function PoisonWarning({ startCh, endCh, onClose }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    btnRef.current?.focus()
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
      <div role="alertdialog" aria-modal="true" aria-labelledby="poison-title" className="bg-[#1a1a1a] border-2 border-red-500/50 w-[500px] rounded-2xl shadow-2xl shadow-red-900/30 overflow-hidden">
        <div className="flex flex-col items-center py-10 px-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mb-6 animate-pulse">
            <AlertTriangle size={40} className="text-red-500" />
          </div>
          <h2 id="poison-title" className="text-xl font-bold text-red-400 mb-3">毒点熔断预警！</h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-sm">
            第 <span className="text-red-400 font-bold">{startCh}</span> 章到第{' '}
            <span className="text-red-400 font-bold">{endCh}</span>{' '}
            章连续 5 个节点情绪值均 ≤ 0，读者可能正在流失！
          </p>
          <p className="text-slate-500 text-xs mt-3">
            建议安排爽点/金手指/主角反转来挽救剧情节奏。
          </p>
        </div>
        <div className="h-14 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-center">
          <button
            ref={btnRef}
            onClick={onClose}
            className="px-6 py-2 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition"
          >
            我知道了，马上调整
          </button>
        </div>
      </div>
    </div>
  )
}
