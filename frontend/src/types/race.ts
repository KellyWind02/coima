export type Venue = '沙田' | '跑马地'
export type VenueCode = 'ST' | 'HV'
export type OddsMomentKey = 'pre' | 'final'
export type BetTypeKey = 'win' | 'place' | 'quinella'

/** 同一玩法在开跑前与临场两个时点的赔率。 */
export interface OddsMoment {
  pre: number | null
  final: number | null
}

/** 赔率父级。以后新增玩法时，只需增加显式字段及相应列配置。 */
export interface OddsByBetType {
  win: OddsMoment
  place: OddsMoment
  quinella: OddsMoment
}

/** 表格中的一行：一匹马在一场赛事中的参赛记录。 */
export interface RaceEntry {
  id: string
  raceDate: string
  venue: Venue
  venueCode: VenueCode
  raceNo: number
  horseNo: number
  horseName: string
  jockey: string
  trainer: string
  weight: number
  barrier: number
  odds: OddsByBetType
  recentForm: string | null
  finishPosition: number | null
}

export interface RaceSeed {
  version: number
  generatedAt: string
  note: string
  venues: Array<{ code: VenueCode; name: Venue }>
  entries: RaceEntry[]
}

export interface RaceFilters {
  raceDate: string
  horseName: string
  venue: Venue | '全部'
}

export type SortDirection = 'asc' | 'desc'

export type SortKey =
  | Exclude<keyof RaceEntry, 'odds'>
  | `odds.${BetTypeKey}.${OddsMomentKey}`

export interface SortState {
  key: SortKey
  direction: SortDirection
}

/** 一场比赛：日期 + 场地 + 场次。 */
export interface RaceGroup {
  id: string
  raceDate: string
  venue: Venue
  venueCode: VenueCode
  raceNo: number
  entries: RaceEntry[]
}

/** 默认组内排序：名次第 1 名在前。 */
export const DEFAULT_SORT: SortState = {
  key: 'finishPosition',
  direction: 'asc',
}
