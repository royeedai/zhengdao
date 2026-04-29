import { app } from 'electron'
import { spawn } from 'child_process'
import { chmodSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  buildGeminiCliSetupScript,
  ensureGeminiCliWorkspace,
  getBundledGeminiCliEntry,
  resolveGeminiCliRuntime
} from '../ai/gemini-cli-service'

/**
 * SPLIT-007 — interactive Gemini CLI login launcher.
 *
 * Spawns a Terminal.app / cmd.exe / x-terminal-emulator window that runs
 * the bundled Gemini CLI auth flow. Kept out of register-ai-ipc.ts
 * because it has its own platform-specific shell scripting that is
 * unrelated to the rest of the AI domain.
 */
export function launchGeminiCliSetup(): { ok: boolean; error?: string } {
  const cliEntry = getBundledGeminiCliEntry()
  if (!existsSync(cliEntry)) {
    return { ok: false, error: '未找到 Gemini CLI 运行文件，请重新安装应用后再试。' }
  }
  const workspace = ensureGeminiCliWorkspace(app.getPath('userData'))
  const runtime = resolveGeminiCliRuntime(process.env, process.execPath)

  if (process.platform === 'win32') {
    const scriptPath = join(workspace, 'gemini-login.cmd')
    writeFileSync(
      scriptPath,
      [
        '@echo off',
        `cd /d "${workspace}"`,
        'set NODE_OPTIONS=',
        'set ELECTRON_RUN_AS_NODE=1',
        `"${runtime}" "${cliEntry}"`,
        'echo.',
        'echo Gemini CLI 登录流程结束后可关闭此窗口。',
        'pause'
      ].join('\r\n')
    )
    const child = spawn('cmd.exe', ['/c', 'start', 'Gemini CLI Login', scriptPath], {
      detached: true,
      stdio: 'ignore'
    })
    child.unref()
    return { ok: true }
  }

  const scriptPath = join(workspace, 'gemini-login.sh')
  writeFileSync(scriptPath, buildGeminiCliSetupScript(runtime, cliEntry, workspace))
  chmodSync(scriptPath, 0o755)
  const args = process.platform === 'darwin' ? ['-a', 'Terminal', scriptPath] : [scriptPath]
  const command = process.platform === 'darwin' ? 'open' : 'x-terminal-emulator'
  const child = spawn(command, args, { detached: true, stdio: 'ignore' })
  child.on('error', () => {
    spawn(scriptPath, { detached: true, stdio: 'ignore' }).unref()
  })
  child.unref()
  return { ok: true }
}
