export interface CharacterMatchCandidate {
  id: number
  name: string
}

export interface CollectCharacterIdsInput {
  plainText: string
  mentionIds: number[]
  characters: CharacterMatchCandidate[]
}

type MatchRange = { start: number; end: number }

function overlaps(range: MatchRange, occupied: MatchRange[]): boolean {
  return occupied.some((slot) => range.start < slot.end && slot.start < range.end)
}

export function collectCharacterIdsFromContent(input: CollectCharacterIdsInput): number[] {
  const matchedIds = new Set<number>(input.mentionIds)
  const occupied: MatchRange[] = []
  const sortedCharacters = [...input.characters]
    .filter((character) => character.name.trim().length > 0)
    .sort((left, right) => right.name.length - left.name.length || left.id - right.id)

  for (const character of sortedCharacters) {
    let searchFrom = 0
    while (searchFrom < input.plainText.length) {
      const foundAt = input.plainText.indexOf(character.name, searchFrom)
      if (foundAt === -1) break

      const range = {
        start: foundAt,
        end: foundAt + character.name.length
      }

      if (!overlaps(range, occupied)) {
        occupied.push(range)
        matchedIds.add(character.id)
      }

      searchFrom = foundAt + character.name.length
    }
  }

  return [...matchedIds].sort((left, right) => left - right)
}
