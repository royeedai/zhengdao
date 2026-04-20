interface FlushAndInstallOptions {
  prepare?: (() => Promise<void>) | null
  install: () => Promise<void>
}

export async function flushAndInstallUpdate(options: FlushAndInstallOptions): Promise<void> {
  if (options.prepare) {
    await options.prepare()
  }
  await options.install()
}
