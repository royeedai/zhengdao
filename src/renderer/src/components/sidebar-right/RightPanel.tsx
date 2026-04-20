import ForeshadowBoard from './ForeshadowBoard'
import ActiveCharacters from './ActiveCharacters'
import QuickNotes from './QuickNotes'

export default function RightPanel() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ForeshadowBoard />
      <ActiveCharacters />
      <QuickNotes />
    </div>
  )
}
