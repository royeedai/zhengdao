import { getDb } from './connection'

export function getPlotNodes(bookId: number) {
  const db = getDb()
  return db.prepare('SELECT * FROM plot_nodes WHERE book_id = ? ORDER BY chapter_number, sort_order').all(bookId)
}

export function createPlotNode(data: Record<string, unknown>) {
  const db = getDb()
  const plotlineId = data.plotline_id != null && data.plotline_id !== '' ? Number(data.plotline_id) : null
  const result = db.prepare(`
    INSERT INTO plot_nodes (book_id, chapter_number, title, score, node_type, description, sort_order, plotline_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.book_id,
    data.chapter_number || 0,
    data.title,
    data.score || 0,
    data.node_type || 'main',
    data.description || '',
    data.sort_order || 0,
    plotlineId
  )
  return db.prepare('SELECT * FROM plot_nodes WHERE id = ?').get(result.lastInsertRowid)
}

export function updatePlotNode(id: number, data: Record<string, unknown>) {
  const db = getDb()
  const fields: string[] = []
  const values: unknown[] = []
  for (const [key, val] of Object.entries(data)) {
    if (['chapter_number', 'title', 'score', 'node_type', 'description', 'sort_order', 'plotline_id'].includes(key)) {
      fields.push(`${key} = ?`)
      values.push(key === 'plotline_id' && (val === '' || val === undefined) ? null : val)
    }
  }
  if (fields.length === 0) return
  values.push(id)
  db.prepare(`UPDATE plot_nodes SET ${fields.join(', ')} WHERE id = ?`).run(...values)
}

export function deletePlotNode(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM plot_nodes WHERE id = ?').run(id)
}

export function getPlotNodeCharacters(plotNodeId: number) {
  const db = getDb()
  const rows = db
    .prepare('SELECT character_id FROM plot_node_characters WHERE plot_node_id = ?')
    .all(plotNodeId) as { character_id: number }[]
  return rows.map((r) => r.character_id)
}

export function setPlotNodeCharacters(plotNodeId: number, characterIds: number[]) {
  const db = getDb()
  const del = db.prepare('DELETE FROM plot_node_characters WHERE plot_node_id = ?')
  const ins = db.prepare('INSERT INTO plot_node_characters (plot_node_id, character_id) VALUES (?, ?)')
  db.transaction(() => {
    del.run(plotNodeId)
    for (const cid of characterIds) {
      ins.run(plotNodeId, cid)
    }
  })()
}

export function getCharacterPlotNodes(characterId: number) {
  const db = getDb()
  const rows = db
    .prepare('SELECT plot_node_id FROM plot_node_characters WHERE character_id = ?')
    .all(characterId) as { plot_node_id: number }[]
  return rows.map((r) => r.plot_node_id)
}

export function getPlotCharacterLinksForBook(bookId: number) {
  const db = getDb()
  return db
    .prepare(
      `
    SELECT pnc.plot_node_id AS plot_node_id, pnc.character_id AS character_id
    FROM plot_node_characters pnc
    INNER JOIN plot_nodes pn ON pn.id = pnc.plot_node_id
    WHERE pn.book_id = ?
  `
    )
    .all(bookId) as { plot_node_id: number; character_id: number }[]
}
