import seedJson from './races.seed.json'
import type {
  RaceEntry,
  RaceFilters,
  RaceGroup,
  RaceSeed,
  SortState,
} from '../types/race'

/**
 * 页面只依赖此接口。接入 FastAPI 后，可实现 ApiRaceDataSource，
 * 无需修改筛选器与表格组件。
 */
export interface EntryQueryOptions {
  /** 是否按「日期 + 场地 + 场次」聚合成一场比赛。 */
  groupByRace: boolean
}

export interface RaceDataSource {
  getEntries(
    filters: RaceFilters,
    sort: SortState,
    options: EntryQueryOptions,
  ): Promise<RaceGroup[]>
  getHorseNames(): Promise<string[]>
  getLatestRaceDate(): Promise<string>
}

const seed = seedJson as RaceSeed

function raceGroupId(entry: Pick<RaceEntry, 'raceDate' | 'venueCode' | 'raceNo'>) {
  return `${entry.raceDate}-${entry.venueCode}-${String(entry.raceNo).padStart(2, '0')}`
}

function getSortValue(entry: RaceEntry, key: SortState['key']): string | number | null {
  if (!key.startsWith('odds.')) {
    const value = entry[key as Exclude<keyof RaceEntry, 'odds'>]
    return typeof value === 'string' || typeof value === 'number' ? value : null
  }

  const [, betType, moment] = key.split('.') as [
    'odds',
    keyof RaceEntry['odds'],
    keyof RaceEntry['odds']['win'],
  ]
  return entry.odds[betType][moment]
}

function compareEntries(a: RaceEntry, b: RaceEntry, sort: SortState): number {
  const left = getSortValue(a, sort.key)
  const right = getSortValue(b, sort.key)

  // 缺失值始终放在组内末尾，避免升序时「—」排到最前。
  if (left === null && right === null) return 0
  if (left === null) return 1
  if (right === null) return -1

  const result =
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right), 'zh-Hans-CN', { numeric: true })

  return sort.direction === 'asc' ? result : -result
}

/** 组间固定：日期降序 → 场地 → 场次升序。 */
function compareGroups(a: RaceGroup, b: RaceGroup): number {
  const dateCmp = b.raceDate.localeCompare(a.raceDate)
  if (dateCmp !== 0) return dateCmp

  const venueCmp = a.venue.localeCompare(b.venue, 'zh-Hans-CN')
  if (venueCmp !== 0) return venueCmp

  return a.raceNo - b.raceNo
}

function groupEntries(entries: RaceEntry[], sort: SortState): RaceGroup[] {
  const groups = new Map<string, RaceGroup>()

  for (const entry of entries) {
    const id = raceGroupId(entry)
    const existing = groups.get(id)
    if (existing) {
      existing.entries.push(entry)
      continue
    }

    groups.set(id, {
      id,
      raceDate: entry.raceDate,
      venue: entry.venue,
      venueCode: entry.venueCode,
      raceNo: entry.raceNo,
      entries: [entry],
    })
  }

  return [...groups.values()]
    .toSorted(compareGroups)
    .map((group) => ({
      ...group,
      // 列头排序只影响组内顺序，不打散场次聚合。
      entries: group.entries.toSorted((a, b) => compareEntries(a, b, sort)),
    }))
}

/**
 * 设计原型的数据实现。Promise 形态用于模拟 API 边界，
 * 后续迁移时可直接替换为 fetch 请求。
 */
export const localJsonDataSource: RaceDataSource = {
  async getEntries(filters, sort, options) {
    const query = filters.horseName.trim().toLocaleLowerCase('zh-Hans-CN')

    const filtered = seed.entries
      .filter((entry) => !filters.raceDate || entry.raceDate === filters.raceDate)
      .filter((entry) => filters.venue === '全部' || entry.venue === filters.venue)
      .filter(
        (entry) =>
          !query || entry.horseName.toLocaleLowerCase('zh-Hans-CN').includes(query),
      )

    if (options.groupByRace) {
      return groupEntries(filtered, sort)
    }

    // 平铺模式：不渲染分组头，整表按当前列排序。
    const first = filtered[0]
    return [
      {
        id: '__flat__',
        raceDate: first?.raceDate ?? '',
        venue: first?.venue ?? '沙田',
        venueCode: first?.venueCode ?? 'ST',
        raceNo: first?.raceNo ?? 0,
        entries: filtered.toSorted((a, b) => compareEntries(a, b, sort)),
      },
    ]
  },

  async getHorseNames() {
    return [...new Set(seed.entries.map((entry) => entry.horseName))].toSorted((a, b) =>
      a.localeCompare(b, 'zh-Hans-CN'),
    )
  },

  async getLatestRaceDate() {
    return seed.entries.map((entry) => entry.raceDate).toSorted().at(-1) ?? ''
  },
}
