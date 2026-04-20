import { useEffect, useState } from 'react'
import { Cloud, ExternalLink, LogIn, X, Loader2 } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { useAuthStore } from '@/stores/auth-store'
import { useBookStore } from '@/stores/book-store'

export default function LoginModal() {
  const closeModal = useUIStore((s) => s.closeModal)
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const syncing = useAuthStore((s) => s.syncing)
  const syncEnabled = useAuthStore((s) => s.syncEnabled)
  const loadUser = useAuthStore((s) => s.loadUser)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const syncUploadBook = useAuthStore((s) => s.syncUploadBook)
  const setSyncEnabled = useAuthStore((s) => s.setSyncEnabled)

  const currentBookId = useBookStore((s) => s.currentBookId)
  const books = useBookStore((s) => s.books)
  const currentBook = books.find((b) => b.id === currentBookId)

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [cloudList, setCloudList] = useState<Array<{ id: string; name: string; modifiedTime: string }>>([])
  const [cloudLoading, setCloudLoading] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  async function loadCloudFiles() {
    setCloudLoading(true)
    try {
      const list = (await window.api.syncListCloudBooks()) as Array<{
        id: string
        name: string
        modifiedTime: string
      }>
      setCloudList(list)
    } catch {
      setCloudList([])
    } finally {
      setCloudLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      await loadUser()
      void window.api.getAppState('google_client_id').then((v) => {
        if (v) setClientId(v)
      })
      const tok = await window.api.authGetAccessToken()
      if (!tok) return
      await loadCloudFiles()
    })()
  }, [loadUser])

  const handleLogin = async () => {
    setSyncMsg(null)
    const ok = await login(clientId.trim(), clientSecret.trim())
    if (!ok) setSyncMsg('登录失败，请检查凭据与网络')
    else await loadCloudFiles()
  }

  const handleSyncNow = async () => {
    if (!currentBookId) {
      setSyncMsg('请先打开一本书再同步')
      return
    }
    setSyncMsg(null)
    try {
      await syncUploadBook(currentBookId)
      setSyncMsg('已上传到 Google Drive（应用数据）')
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : '同步失败')
    }
  }

  const refreshCloudList = () => {
    if (!user) return
    void loadCloudFiles()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#1a1a1a] border border-[#333] w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="h-12 border-b border-[#2a2a2a] bg-[#141414] flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold">
            <Cloud size={18} />
            <span>Google 账号与云同步</span>
          </div>
          <button type="button" onClick={closeModal} className="text-slate-500 hover:text-slate-300 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-500 leading-relaxed">
            在{' '}
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
            >
              Google Cloud Console <ExternalLink size={12} />
            </a>{' '}
            创建 OAuth 客户端（桌面应用），将客户端 ID 与密钥填入下方。凭据仅存于本机数据库。
          </p>

          {!user && (
            <>
              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Client ID</span>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="xxxx.apps.googleusercontent.com"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Client Secret</span>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  autoComplete="off"
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-[#333] text-sm text-slate-200 focus:border-emerald-500/50 focus:outline-none"
                  placeholder="GOCSPX-..."
                />
              </label>
            </>
          )}

          {user && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#141414] border border-[#2a2a2a]">
              {user.picture ? (
                <img src={user.picture} alt="" className="w-11 h-11 rounded-full shrink-0" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-emerald-600/30 flex items-center justify-center text-sm font-bold text-emerald-300 shrink-0">
                  {user.name?.charAt(0) || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-100 truncate">{user.name}</div>
                <div className="text-xs text-slate-500 truncate">{user.email}</div>
              </div>
            </div>
          )}

          {syncMsg && (
            <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/30 text-slate-300 text-xs">{syncMsg}</div>
          )}

          {user && (
            <>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(e) => void setSyncEnabled(e.target.checked)}
                  className="rounded border-[#444] bg-[#141414] text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-300">启用后将显示云同步状态（仍需手动上传备份）</span>
              </label>

              <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-[#141414]">
                  当前作品 · 手动备份到 Drive
                </div>
                <div className="p-3 space-y-2">
                  <p className="text-xs text-slate-500">
                    {currentBook ? `《${currentBook.title}》` : '未打开作品'} — 备份为{' '}
                    <code className="text-emerald-400/90">
                      book_{currentBookId ?? '?'}.json
                    </code>
                  </p>
                  <button
                    type="button"
                    onClick={() => void handleSyncNow()}
                    disabled={syncing || !currentBookId}
                    className="w-full py-2.5 text-xs font-bold rounded-lg bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center gap-2 transition"
                  >
                    {syncing ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                    {syncing ? '正在上传…' : '立即备份到云端'}
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">应用数据中的备份</span>
                  <button
                    type="button"
                    onClick={() => void refreshCloudList()}
                    className="text-[11px] text-emerald-400 hover:underline"
                    disabled={cloudLoading}
                  >
                    刷新列表
                  </button>
                </div>
                {cloudLoading ? (
                  <div className="text-xs text-slate-500 py-2">加载中…</div>
                ) : cloudList.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">暂无 book_*.json 文件</div>
                ) : (
                  <ul className="max-h-36 overflow-y-auto text-xs border border-[#2a2a2a] rounded-lg divide-y divide-[#2a2a2a]">
                    {cloudList.map((f) => (
                      <li key={f.id} className="px-3 py-2 flex justify-between gap-2 text-slate-300">
                        <span className="truncate font-mono">{f.name}</span>
                        <span className="text-slate-500 shrink-0">{f.modifiedTime?.slice(0, 19) ?? ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <div className="h-14 border-t border-[#2a2a2a] bg-[#141414] flex items-center justify-end px-5 gap-3 shrink-0">
          <button type="button" onClick={closeModal} className="px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition">
            关闭
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="px-4 py-1.5 text-xs border border-[#444] text-slate-300 rounded hover:bg-[#252525] transition"
            >
              退出登录
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading || !clientId.trim() || !clientSecret.trim()}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded flex items-center gap-1 transition"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              使用 Google 登录
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
