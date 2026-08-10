import { useEffect, useMemo, useState } from 'react'
import { localJsonDataSource } from '../../data/dataSource'
import type { RaceFilters, RaceGroup, SortKey, SortState } from '../../types/race'
import { DEFAULT_SORT } from '../../types/race'
import { FilterBar } from './FilterBar'
import { RaceTable } from './RaceTable'
import './data.knobs.css'
import './data.css'

const emptyFilters: RaceFilters = {
  raceDate: '',
  horseName: '',
  venue: '全部',
}

export function DataPage() {
  const [latestRaceDate, setLatestRaceDate] = useState('')
  const [horseNames, setHorseNames] = useState<string[]>([])
  const [draftFilters, setDraftFilters] = useState<RaceFilters>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<RaceFilters>(emptyFilters)
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT)
  const [groupByRace, setGroupByRace] = useState(true)
  const [groups, setGroups] = useState<RaceGroup[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true

    Promise.all([
      localJsonDataSource.getLatestRaceDate(),
      localJsonDataSource.getHorseNames(),
    ]).then(([date, names]) => {
      if (!active) return
      // 日期默认为空：不过滤，展示全部记录。
      setLatestRaceDate(date)
      setHorseNames(names)
      setDraftFilters(emptyFilters)
      setAppliedFilters(emptyFilters)
      setIsReady(true)
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!isReady) return
    let active = true
    setIsLoading(true)

    localJsonDataSource
      .getEntries(appliedFilters, sort, { groupByRace })
      .then((nextGroups) => {
        if (!active) return
        setGroups(nextGroups)
        setSelectedId((current) =>
          current &&
          nextGroups.some((group) => group.entries.some((entry) => entry.id === current))
            ? current
            : null,
        )
        setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [appliedFilters, groupByRace, isReady, sort])

  const entryCount = useMemo(
    () => groups.reduce((total, group) => total + group.entries.length, 0),
    [groups],
  )

  const raceCount = useMemo(() => {
    if (groupByRace) return groups.length
    return new Set(
      groups.flatMap((group) =>
        group.entries.map(
          (entry) => `${entry.raceDate}-${entry.venueCode}-${entry.raceNo}`,
        ),
      ),
    ).size
  }, [groupByRace, groups])

  const selectedEntry = useMemo(() => {
    for (const group of groups) {
      const found = group.entries.find((entry) => entry.id === selectedId)
      if (found) return found
    }
    return null
  }, [groups, selectedId])

  const handleSort = (key: SortKey) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleReset = () => {
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setSort(DEFAULT_SORT)
    setGroupByRace(true)
  }

  return (
    <div className="data-page" data-page="race-data">
      <header className="page-header">
        <div className="page-header__brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 48 48">
              <path d="M12 34c5-1 8-5 9-11l-5-4 7-9c7 2 12 8 13 16l-6-3-2 11H12Z" />
              <path d="M18 34h21M25 15l-5-5" />
            </svg>
          </span>
          <div>
            <p className="page-kicker">Race Intelligence / 赛事研究</p>
            <h1>赛马数据平台</h1>
            <p className="page-subtitle">历史赛事与赔率检索</p>
          </div>
        </div>
        <div className="page-header__meta" aria-label="数据状态">
          <span className="status-dot" aria-hidden="true" />
          <div>
            <span>数据集状态</span>
            <strong>设计原型 · JSON</strong>
          </div>
        </div>
      </header>

      <main>
        <FilterBar
          filters={draftFilters}
          horseNames={horseNames}
          latestRaceDate={latestRaceDate}
          groupByRace={groupByRace}
          onChange={setDraftFilters}
          onGroupByRaceChange={setGroupByRace}
          onSubmit={() => setAppliedFilters({ ...draftFilters })}
          onReset={handleReset}
        />

        <section className="results-section" aria-labelledby="results-title">
          <div className="results-heading">
            <div>
              <p className="section-eyebrow">历史数据</p>
              <h2 id="results-title">赛事记录</h2>
            </div>
            <div className="results-summary" aria-live="polite">
              {selectedEntry ? (
                <span>
                  已选择 <strong>{selectedEntry.horseName}</strong> · 第 {selectedEntry.raceNo}{' '}
                  场
                </span>
              ) : groupByRace ? (
                <span>按场次聚合 · 组内默认名次第 1 名在前</span>
              ) : (
                <span>平铺列表 · 点击列头排序全部结果</span>
              )}
              <span className="result-count">
                <strong>{raceCount}</strong> 场 · <strong>{entryCount}</strong> 条
              </span>
            </div>
          </div>

          <div className={`table-stage${isLoading ? ' is-loading' : ''}`}>
            {isLoading ? (
              <div className="table-skeleton" aria-label="正在加载赛事数据" role="status">
                <div />
                {Array.from({ length: 8 }, (_, index) => (
                  <div key={index} />
                ))}
              </div>
            ) : (
              <RaceTable
                groups={groups}
                groupByRace={groupByRace}
                selectedId={selectedId}
                sort={sort}
                onSelect={(id) => setSelectedId((current) => (current === id ? null : id))}
                onSort={handleSort}
              />
            )}
          </div>
        </section>
      </main>

      <footer className="page-footer">
        <span>数据来源：历史数据整理</span>
        <span aria-hidden="true">|</span>
        <strong>仅供研究参考</strong>
      </footer>
    </div>
  )
}
