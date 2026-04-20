import { create } from 'zustand'
import type { Plotline, PlotNode } from '@/types'

interface PlotStore {
  plotNodes: PlotNode[]
  plotlines: Plotline[]
  plotNodeCharacterIds: Record<number, number[]>
  loading: boolean
  loadPlotNodes: (bookId: number) => Promise<void>
  loadPlotlines: (bookId: number) => Promise<void>
  createPlotline: (bookId: number, name: string, color: string) => Promise<void>
  updatePlotline: (id: number, name: string, color: string) => Promise<void>
  deletePlotline: (id: number) => Promise<void>
  createPlotNode: (data: Partial<PlotNode> & { book_id: number; title: string; score: number }) => Promise<PlotNode>
  updatePlotNode: (id: number, data: Partial<PlotNode>) => Promise<void>
  deletePlotNode: (id: number) => Promise<void>
  setPlotNodeCharacters: (plotNodeId: number, characterIds: number[]) => Promise<void>
  checkPoisonWarning: (chapterWordCounts?: Map<number, number>) => { triggered: boolean; startCh: number; endCh: number }
}

function linksToMap(links: { plot_node_id: number; character_id: number }[]) {
  const map: Record<number, number[]> = {}
  for (const row of links) {
    if (!map[row.plot_node_id]) map[row.plot_node_id] = []
    map[row.plot_node_id].push(row.character_id)
  }
  return map
}

export const usePlotStore = create<PlotStore>((set, get) => ({
  plotNodes: [],
  plotlines: [],
  plotNodeCharacterIds: {},
  loading: false,

  loadPlotNodes: async (bookId) => {
    set({ loading: true })
    try {
      const [plotNodes, links] = await Promise.all([
        window.api.getPlotNodes(bookId),
        window.api.getPlotCharacterLinksForBook(bookId)
      ])
      set({ plotNodes: plotNodes as PlotNode[], plotNodeCharacterIds: linksToMap(links as { plot_node_id: number; character_id: number }[]) })
    } finally {
      set({ loading: false })
    }
  },

  loadPlotlines: async (bookId) => {
    const rows = await window.api.getPlotlines(bookId)
    set({ plotlines: rows as Plotline[] })
  },

  createPlotline: async (bookId, name, color) => {
    await window.api.createPlotline(bookId, name, color)
    await get().loadPlotlines(bookId)
  },

  updatePlotline: async (id, name, color) => {
    await window.api.updatePlotline(id, name, color)
    const pl = get().plotlines.find((p) => p.id === id)
    if (pl) await get().loadPlotlines(pl.book_id)
  },

  deletePlotline: async (id) => {
    const pl = get().plotlines.find((p) => p.id === id)
    await window.api.deletePlotline(id)
    if (pl) {
      await get().loadPlotlines(pl.book_id)
      await get().loadPlotNodes(pl.book_id)
    }
  },

  createPlotNode: async (data) => {
    const node = (await window.api.createPlotNode(data)) as PlotNode
    await get().loadPlotNodes(data.book_id)
    return node
  },

  updatePlotNode: async (id, data) => {
    await window.api.updatePlotNode(id, data)
    const node = get().plotNodes.find((n) => n.id === id)
    if (node) await get().loadPlotNodes(node.book_id)
  },

  deletePlotNode: async (id) => {
    const node = get().plotNodes.find((n) => n.id === id)
    await window.api.deletePlotNode(id)
    if (node) {
      await get().loadPlotNodes(node.book_id)
      set((s) => {
        const next = { ...s.plotNodeCharacterIds }
        delete next[id]
        return { plotNodeCharacterIds: next }
      })
    }
  },

  setPlotNodeCharacters: async (plotNodeId, characterIds) => {
    await window.api.setPlotNodeCharacters(plotNodeId, characterIds)
    set((s) => ({
      plotNodeCharacterIds: { ...s.plotNodeCharacterIds, [plotNodeId]: [...characterIds] }
    }))
  },

  checkPoisonWarning: (chapterWordCounts?: Map<number, number>) => {
    const sorted = [...get().plotNodes].sort((a, b) => a.chapter_number - b.chapter_number)

    for (let i = 0; i <= sorted.length - 5; i++) {
      const window5 = sorted.slice(i, i + 5)
      if (window5.every((n) => n.score <= 0)) {
        return {
          triggered: true,
          startCh: window5[0].chapter_number,
          endCh: window5[4].chapter_number
        }
      }
    }

    if (chapterWordCounts && sorted.length > 0) {
      let consecutiveWords = 0
      let startCh = sorted[0].chapter_number
      for (const node of sorted) {
        if (node.score <= 0) {
          if (consecutiveWords === 0) startCh = node.chapter_number
          consecutiveWords += chapterWordCounts.get(node.chapter_number) || 2000
          if (consecutiveWords >= 10000) {
            return { triggered: true, startCh, endCh: node.chapter_number }
          }
        } else {
          consecutiveWords = 0
        }
      }
    }

    return { triggered: false, startCh: 0, endCh: 0 }
  }
}))
