import { describe, expect, it } from 'vitest'
import { mapEventsToTimeline, type CanonEventRow } from '../events-to-timeline'

describe('mapEventsToTimeline', () => {
  it('returns empty array for empty input', () => {
    expect(mapEventsToTimeline([])).toEqual([])
  })

  it('sorts by chapter_number ASC and pushes nullish chapters to end', () => {
    const events: CanonEventRow[] = [
      { id: 1, title: 'A', chapter_number: 5 },
      { id: 2, title: 'B' },
      { id: 3, title: 'C', chapter_number: 1 }
    ]
    const out = mapEventsToTimeline(events)
    expect(out.map((e) => e.content)).toEqual(['C', 'A', 'B'])
  })

  it('chapterRange filter retains only events inside window and drops nullish chapters', () => {
    const events: CanonEventRow[] = [
      { id: 1, title: 'in', chapter_number: 5 },
      { id: 2, title: 'out', chapter_number: 50 },
      { id: 3, title: 'no-chapter' }
    ]
    const out = mapEventsToTimeline(events, { chapterRange: [1, 10] })
    expect(out.map((e) => e.content)).toEqual(['in'])
  })

  it('writes className from event_type + importance', () => {
    const events: CanonEventRow[] = [
      { id: 1, title: 'X', chapter_number: 1, event_type: 'foreshadow', importance: 'high' }
    ]
    const out = mapEventsToTimeline(events)
    expect(out[0]?.className).toBe('event-foreshadow importance-high')
  })

  it('produces strictly increasing start dates for ascending chapter numbers', () => {
    const events: CanonEventRow[] = [
      { id: 1, title: 'A', chapter_number: 1 },
      { id: 2, title: 'B', chapter_number: 2 },
      { id: 3, title: 'C', chapter_number: 3 }
    ]
    const out = mapEventsToTimeline(events)
    expect(out[0]!.start.getTime()).toBeLessThan(out[1]!.start.getTime())
    expect(out[1]!.start.getTime()).toBeLessThan(out[2]!.start.getTime())
  })
})
