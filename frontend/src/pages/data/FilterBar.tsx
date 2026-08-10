import type { FormEvent } from 'react'
import type { RaceFilters, Venue } from '../../types/race'

interface FilterBarProps {
  filters: RaceFilters
  horseNames: string[]
  latestRaceDate: string
  groupByRace: boolean
  onChange: (filters: RaceFilters) => void
  onGroupByRaceChange: (groupByRace: boolean) => void
  onSubmit: () => void
  onReset: () => void
}

const venues: Array<Venue | '全部'> = ['全部', '沙田', '跑马地']

export function FilterBar({
  filters,
  horseNames,
  latestRaceDate,
  groupByRace,
  onChange,
  onGroupByRaceChange,
  onSubmit,
  onReset,
}: FilterBarProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form className="filter-bar" aria-label="赛事数据筛选" onSubmit={handleSubmit}>
      <div className="filter-bar__heading">
        <span className="filter-bar__eyebrow">研究条件</span>
        <strong>筛选赛事数据</strong>
      </div>

      <label className="filter-field">
        <span>赛事日期（可留空）</span>
        <input
          type="date"
          max={latestRaceDate || undefined}
          value={filters.raceDate}
          title="留空则显示全部日期的数据"
          onChange={(event) => onChange({ ...filters, raceDate: event.target.value })}
        />
      </label>

      <label className="filter-field filter-field--horse">
        <span>马名</span>
        <div className="input-with-icon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <input
            type="search"
            list="horse-name-options"
            placeholder="输入马名，支持模糊搜索"
            autoComplete="off"
            value={filters.horseName}
            onChange={(event) => onChange({ ...filters, horseName: event.target.value })}
          />
          <datalist id="horse-name-options">
            {horseNames.map((horseName) => (
              <option key={horseName} value={horseName} />
            ))}
          </datalist>
        </div>
      </label>

      <label className="filter-field">
        <span>场地</span>
        <select
          value={filters.venue}
          onChange={(event) =>
            onChange({ ...filters, venue: event.target.value as RaceFilters['venue'] })
          }
        >
          {venues.map((venue) => (
            <option key={venue} value={venue}>
              {venue}
            </option>
          ))}
        </select>
      </label>

      <div className="filter-field filter-field--toggle">
        <span id="group-by-race-label">浏览方式</span>
        <button
          className={`view-switch${groupByRace ? ' is-on' : ''}`}
          type="button"
          role="switch"
          aria-checked={groupByRace}
          aria-labelledby="group-by-race-label"
          title="开启后按日期、场地、场次聚合成一场比赛"
          onClick={() => onGroupByRaceChange(!groupByRace)}
        >
          <span className="view-switch__track" aria-hidden="true">
            <span className="view-switch__thumb" />
          </span>
          <span className="view-switch__text">
            {groupByRace ? '按场次聚合' : '平铺列表'}
          </span>
        </button>
      </div>

      <div className="filter-actions">
        <button className="button button--quiet" type="button" onClick={onReset}>
          重置
        </button>
        <button className="button button--primary" type="submit">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          筛选
        </button>
      </div>
    </form>
  )
}
