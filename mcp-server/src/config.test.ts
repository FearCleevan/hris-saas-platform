import { describe, it, expect } from 'vitest'
import { parseAllowedOrgIds } from './config.js'

describe('parseAllowedOrgIds', () => {
  it('returns null for undefined (unset env var)', () => {
    expect(parseAllowedOrgIds(undefined)).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseAllowedOrgIds('')).toBeNull()
  })

  it('returns null for a string that is only commas/whitespace', () => {
    expect(parseAllowedOrgIds(' , , ')).toBeNull()
  })

  it('parses a single org id', () => {
    expect(parseAllowedOrgIds('85ab7ff3-454b-4ba0-858d-037551986556')).toEqual([
      '85ab7ff3-454b-4ba0-858d-037551986556',
    ])
  })

  it('parses and trims multiple comma-separated org ids', () => {
    expect(parseAllowedOrgIds(' org-a , org-b ,org-c')).toEqual(['org-a', 'org-b', 'org-c'])
  })

  it('drops empty entries from trailing/double commas', () => {
    expect(parseAllowedOrgIds('org-a,,org-b,')).toEqual(['org-a', 'org-b'])
  })
})
