import { Fragment, type KeyboardEvent, type ReactNode } from 'react'
import type { RaceEntry, RaceGroup, SortKey, SortState } from '../../types/race'

interface RaceTableProps {
  groups: RaceGroup[]
  groupByRace: boolean
  selectedId: string | null
  sort: SortState
  onSelect: (id: string) => void
  onSort: (key: SortKey) => void
}

interface BaseColumn {
  key: Exclude<SortKey, `odds.${string}`>
  label: string
  className?: string
}

/** 赛事定位：靠前，便于扫表。 */
const leadingColumns: BaseColumn[] = [
  { key: 'raceDate', label: '赛事日期', className: 'cell-date' },
  { key: 'venue', label: '场地' },
  { key: 'raceNo', label: '场次', className: 'cell-number' },
  { key: 'horseNo', label: '马号', className: 'cell-number' },
]

/** 结果与走势：紧挨赔率之前。 */
const resultColumns: BaseColumn[] = [
  { key: 'finishPosition', label: '名次', className: 'cell-number' },
  { key: 'recentForm', label: '近 5 场', className: 'cell-form' },
]

/** 马匹细节：放到赔率之后。 */
const detailColumns: BaseColumn[] = [
  { key: 'horseName', label: '马名', className: 'cell-horse' },
  { key: 'jockey', label: '骑师' },
  { key: 'trainer', label: '练马师' },
  { key: 'weight', label: '负磅', className: 'cell-number' },
  { key: 'barrier', label: '档位', className: 'cell-number' },
]

const oddsGroups = [
  { key: 'win', label: '独赢' },
  { key: 'place', label: '位置' },
  { key: 'quinella', label: '连赢' },
] as const

const COLUMN_COUNT =
  leadingColumns.length + resultColumns.length + oddsGroups.length * 2 + detailColumns.length

function formatDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${year}.${month}.${day}`
}

function formatOdds(value: number | null) {
  return value === null ? '—' : value.toFixed(1)
}

function SortButton({
  label,
  sortKey,
  sort,
  groupByRace,
  onSort,
}: {
  label: string
  sortKey: SortKey
  sort: SortState
  groupByRace: boolean
  onSort: (key: SortKey) => void
}) {
  const isActive = sort.key === sortKey
  const ariaSort = !isActive ? 'none' : sort.direction === 'asc' ? 'ascending' : 'descending'
  const scope = groupByRace ? '组内排序' : '排序'

  return (
    <button
      className={`sort-button${isActive ? ' sort-button--active' : ''}`}
      type="button"
      aria-label={`${label}，当前${ariaSort === 'none' ? '未排序' : ariaSort === 'ascending' ? '升序' : '降序'}，点击切换${scope}`}
      onClick={() => onSort(sortKey)}
    >
      <span>{label}</span>
      <span className="sort-indicator" aria-hidden="true">
        {isActive ? (sort.direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  )
}

function BaseHeader({
  column,
  sort,
  groupByRace,
  onSort,
}: {
  column: BaseColumn
  sort: SortState
  groupByRace: boolean
  onSort: (key: SortKey) => void
}) {
  return (
    <th
      className={column.className}
      scope="col"
      rowSpan={3}
      aria-sort={
        sort.key === column.key
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <SortButton
        label={column.label}
        sortKey={column.key}
        sort={sort}
        groupByRace={groupByRace}
        onSort={onSort}
      />
    </th>
  )
}

function renderBaseCells(entry: RaceEntry, columns: BaseColumn[]): ReactNode[] {
  return columns.map((column) => {
    switch (column.key) {
      case 'raceDate':
        return (
          <td key={column.key} className="cell-date">
            {formatDate(entry.raceDate)}
          </td>
        )
      case 'venue':
        return (
          <td key={column.key}>
            <span className={`venue-mark venue-mark--${entry.venueCode.toLowerCase()}`}>
              {entry.venue}
            </span>
          </td>
        )
      case 'raceNo':
        return (
          <td key={column.key} className="cell-number">
            {entry.raceNo}
          </td>
        )
      case 'horseNo':
        return (
          <td key={column.key} className="cell-number cell-horse-number">
            {entry.horseNo}
          </td>
        )
      case 'finishPosition':
        return (
          <td key={column.key} className="cell-number cell-finish">
            {entry.finishPosition ?? '—'}
          </td>
        )
      case 'recentForm':
        return (
          <td key={column.key} className="cell-form">
            {entry.recentForm ? (
              <span className="recent-form" aria-label={`近五场成绩 ${entry.recentForm}`}>
                {entry.recentForm.split('-').map((result, index) => (
                  <span key={`${entry.id}-form-${index}`}>{result}</span>
                ))}
              </span>
            ) : (
              '—'
            )}
          </td>
        )
      case 'horseName':
        return (
          <td key={column.key} className="cell-horse">
            <strong>{entry.horseName}</strong>
          </td>
        )
      case 'jockey':
        return <td key={column.key}>{entry.jockey}</td>
      case 'trainer':
        return <td key={column.key}>{entry.trainer}</td>
      case 'weight':
        return (
          <td key={column.key} className="cell-number">
            {entry.weight}
          </td>
        )
      case 'barrier':
        return (
          <td key={column.key} className="cell-number">
            {entry.barrier}
          </td>
        )
      default:
        return null
    }
  })
}

function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, onSelect: () => void) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    onSelect()
  }
}

export function RaceTable({
  groups,
  groupByRace,
  selectedId,
  sort,
  onSelect,
  onSort,
}: RaceTableProps) {
  const hasRows = groups.some((group) => group.entries.length > 0)

  if (!hasRows) {
    return (
      <div className="empty-state" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M7 11h10M9.5 16h5" />
        </svg>
        <strong>没有符合条件的赛事记录</strong>
        <span>请尝试更换日期、清空马名或选择全部场地。</span>
      </div>
    )
  }

  return (
    <div className="table-scroll" tabIndex={0} aria-label="赛事数据表格，可横向滚动">
      <table className="race-table">
        <caption className="sr-only">
          {groupByRace
            ? '赛马历史排位与赔率数据，按日期、场地、场次聚合；组内默认按名次排列'
            : '赛马历史排位与赔率数据，平铺列表模式'}
        </caption>
        <thead>
          <tr>
            {leadingColumns.map((column) => (
              <BaseHeader
                key={column.key}
                column={column}
                sort={sort}
                groupByRace={groupByRace}
                onSort={onSort}
              />
            ))}
            {resultColumns.map((column) => (
              <BaseHeader
                key={column.key}
                column={column}
                sort={sort}
                groupByRace={groupByRace}
                onSort={onSort}
              />
            ))}
            <th className="odds-parent" colSpan={6} scope="colgroup">
              赔率
              <span>开跑前 / 临场</span>
            </th>
            {detailColumns.map((column) => (
              <BaseHeader
                key={column.key}
                column={column}
                sort={sort}
                groupByRace={groupByRace}
                onSort={onSort}
              />
            ))}
          </tr>
          <tr>
            {oddsGroups.map((group) => (
              <th key={group.key} className="odds-group" colSpan={2} scope="colgroup">
                {group.label}
              </th>
            ))}
          </tr>
          <tr>
            {oddsGroups.flatMap((group) =>
              (['pre', 'final'] as const).map((moment) => {
                const key: SortKey = `odds.${group.key}.${moment}`
                return (
                  <th
                    key={key}
                    className={`odds-leaf odds-leaf--${moment}`}
                    scope="col"
                    aria-sort={
                      sort.key === key
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                  >
                    <SortButton
                      label={moment === 'pre' ? '开跑前' : '临场'}
                      sortKey={key}
                      sort={sort}
                      groupByRace={groupByRace}
                      onSort={onSort}
                    />
                  </th>
                )
              }),
            )}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.id}>
              {groupByRace ? (
                <tr className="race-group-header">
                  <td colSpan={COLUMN_COUNT}>
                    <div className="race-group-header__inner">
                      <strong>
                        {formatDate(group.raceDate)}
                        <span aria-hidden="true"> · </span>
                        {group.venue}
                        <span aria-hidden="true"> · </span>
                        第 {group.raceNo} 场
                      </strong>
                      <span className="race-group-header__count">{group.entries.length} 匹</span>
                    </div>
                  </td>
                </tr>
              ) : null}
              {group.entries.map((entry) => {
                const isSelected = entry.id === selectedId

                return (
                  <tr
                    key={entry.id}
                    className={isSelected ? 'is-selected' : undefined}
                    aria-selected={isSelected}
                    tabIndex={0}
                    onClick={() => onSelect(entry.id)}
                    onKeyDown={(event) => handleRowKeyDown(event, () => onSelect(entry.id))}
                  >
                    {renderBaseCells(entry, leadingColumns)}
                    {renderBaseCells(entry, resultColumns)}
                    {oddsGroups.flatMap((oddsGroup) =>
                      (['pre', 'final'] as const).map((moment) => (
                        <td
                          key={`${oddsGroup.key}-${moment}`}
                          className={`cell-odds cell-odds--${moment}`}
                        >
                          {formatOdds(entry.odds[oddsGroup.key][moment])}
                        </td>
                      )),
                    )}
                    {renderBaseCells(entry, detailColumns)}
                  </tr>
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
