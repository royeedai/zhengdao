import { describe, expect, it } from 'vitest'
import { mapOrganizationsToTree, type CanonOrgRow } from '../organizations-to-tree'

describe('mapOrganizationsToTree', () => {
  it('returns empty array for empty input', () => {
    expect(mapOrganizationsToTree([])).toEqual([])
  })

  it('builds nested tree with children attached to parents', () => {
    const orgs: CanonOrgRow[] = [
      { id: 1, name: '青云宗' },
      { id: 2, name: '内门', parent_id: 1 },
      { id: 3, name: '丹房', parent_id: 2 },
      { id: 4, name: '外门', parent_id: 1 }
    ]
    const tree = mapOrganizationsToTree(orgs)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('青云宗')
    expect(tree[0]?.children).toHaveLength(2)
    const inner = tree[0]?.children.find((c) => c.name === '内门')
    expect(inner?.children).toHaveLength(1)
    expect(inner?.children[0]?.name).toBe('丹房')
  })

  it('orphan with missing parent gets promoted to root', () => {
    const orgs: CanonOrgRow[] = [
      { id: 1, name: '宗门' },
      { id: 2, name: '孤儿', parent_id: 999 }
    ]
    const tree = mapOrganizationsToTree(orgs)
    expect(tree.map((n) => n.name).sort()).toEqual(['孤儿', '宗门'])
  })

  it('self-reference collapses to root', () => {
    const orgs: CanonOrgRow[] = [{ id: 5, name: '怪节点', parent_id: 5 }]
    const tree = mapOrganizationsToTree(orgs)
    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('怪节点')
  })

  it('forest=false wraps multiple roots under synthetic root', () => {
    const orgs: CanonOrgRow[] = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' }
    ]
    const tree = mapOrganizationsToTree(orgs, { forest: false })
    expect(tree).toHaveLength(1)
    expect(tree[0]?.name).toBe('组织总览')
    expect(tree[0]?.children).toHaveLength(2)
  })

  it('writes attributes from org_type and description', () => {
    const orgs: CanonOrgRow[] = [
      { id: 1, name: '青云', org_type: 'faction', description: '正派之首' }
    ]
    const tree = mapOrganizationsToTree(orgs)
    expect(tree[0]?.attributes.type).toBe('faction')
    expect(tree[0]?.attributes['描述']).toBe('正派之首')
  })
})
