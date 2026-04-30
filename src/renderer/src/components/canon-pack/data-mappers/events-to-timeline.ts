/**
 * CG-A3.1 — canon_events → vis-timeline DataItem mapper.
 *
 * Pure function. Sorts by chapter_number ASC; events without a
 * chapter_number sink to the end. We use a synthetic ISO date axis
 * (start = `2000-01-01`, +1 day per chapter) because vis-timeline
 * expects real Date values; the view layer overrides axis labels to
 * read "第 N 章" instead of dates.
 */

export interface CanonEventRow {
  id: number
  title: string
  description?: string
  chapter_number?: number | null
  event_type?: 'plot' | 'character' | 'world' | 'foreshadow'
  importance?: 'low' | 'normal' | 'high'
}

export interface TimelineDataItem {
  id: number
  content: string
  start: Date
  end?: Date
  group?: string
  className: string
  title?: string
}

export interface TimelineMapOptions {
  /** Filter to events within this chapter window. */
  chapterRange?: [number, number]
  /** Reference epoch for chapter-to-date conversion (default 2000-01-01). */
  epoch?: Date
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function chapterToDate(epoch: Date, chapter: number): Date {
  return new Date(epoch.getTime() + chapter * ONE_DAY_MS)
}

export function mapEventsToTimeline(
  events: CanonEventRow[],
  opts: TimelineMapOptions = {}
): TimelineDataItem[] {
  const epoch = opts.epoch ?? new Date(Date.UTC(2000, 0, 1))

  const sorted = [...events].sort((a, b) => {
    const aChap = a.chapter_number ?? Number.POSITIVE_INFINITY
    const bChap = b.chapter_number ?? Number.POSITIVE_INFINITY
    return aChap - bChap
  })

  const filtered = opts.chapterRange
    ? sorted.filter((e) => {
        if (e.chapter_number == null) return false
        const [from, to] = opts.chapterRange!
        return e.chapter_number >= from && e.chapter_number <= to
      })
    : sorted

  return filtered.map((event) => {
    const chapter = event.chapter_number ?? sorted.length + 1
    return {
      id: event.id,
      content: event.title,
      start: chapterToDate(epoch, chapter),
      group: event.event_type ?? 'plot',
      className: `event-${event.event_type ?? 'plot'} importance-${event.importance ?? 'normal'}`,
      title: event.description
    }
  })
}
