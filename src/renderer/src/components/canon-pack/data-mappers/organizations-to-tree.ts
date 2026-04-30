/**
 * CG-A3.1 — canon_organizations → react-d3-tree RawNodeDatum mapper.
 *
 * Pure function building a recursive tree. Cycle/orphan handling: if a
 * parent reference goes missing (e.g. parent deleted with `ON DELETE
 * SET NULL` not yet propagated to UI state), the orphan is promoted to
 * a synthetic root rather than dropped. Self-references collapse to
 * roots too.
 */

export interface CanonOrgRow {
  id: number
  name: string
  description?: string
  parent_id?: number | null
  org_type?: 'group' | 'faction' | 'company' | 'department'
}

export interface OrgTreeNodeData {
  name: string
  attributes: Record<string, string>
  children: OrgTreeNodeData[]
}

export interface OrgTreeMapOptions {
  /** When true, return a forest of roots; when false, wrap in a single
   * synthetic root so react-d3-tree (which renders one tree per call) can
   * draw all top-level nodes side-by-side. Default: true (forest). */
  forest?: boolean
}

interface InternalNode {
  id: number
  name: string
  parent_id: number | null
  org_type: string
  description: string
  children: InternalNode[]
}

export function mapOrganizationsToTree(
  organizations: CanonOrgRow[],
  opts: OrgTreeMapOptions = {}
): OrgTreeNodeData[] {
  const byId = new Map<number, InternalNode>()
  for (const org of organizations) {
    byId.set(org.id, {
      id: org.id,
      name: org.name,
      parent_id: org.parent_id ?? null,
      org_type: org.org_type ?? 'group',
      description: org.description ?? '',
      children: []
    })
  }

  const roots: InternalNode[] = []
  byId.forEach((node) => {
    if (
      node.parent_id !== null &&
      node.parent_id !== node.id &&
      byId.has(node.parent_id)
    ) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  function toNodeData(node: InternalNode): OrgTreeNodeData {
    return {
      name: node.name,
      attributes: {
        type: node.org_type,
        ...(node.description ? { 描述: node.description } : {})
      },
      children: node.children.map(toNodeData)
    }
  }

  const forest = roots.map(toNodeData)
  if (opts.forest === false && forest.length > 1) {
    return [
      {
        name: '组织总览',
        attributes: {},
        children: forest
      }
    ]
  }
  return forest
}
