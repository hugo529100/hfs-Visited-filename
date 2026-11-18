'use strict';{
  const STORAGE_KEY = 'hfs-visited-files'

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch {
      return {}
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  function cleanup(data, keepMs) {
    const now = Date.now()
    let changed = false
    for (const uri in data) {
      if (now - data[uri] > keepMs) {
        delete data[uri]
        changed = true
      }
    }
    if (changed) save(data)
    return data
  }

  function markVisited(entry) {
    if (!entry?.uri) return
    const cfg = HFS.getPluginConfig()
    if (!cfg.visited) return
    if (!cfg.visitedFolders && entry.isFolder) return
    const keepMs = (cfg.keepDays || 7) * 86400 * 1000
    const data = cleanup(load(), keepMs)
    data[entry.uri] = Date.now()
    save(data)
  }

  function parseChineseNum(str) {
    if (/^\d+$/.test(str)) return parseInt(str)

    const map = { '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10 }
    if (map[str] !== undefined) return map[str]

    let m = str.match(/^([二三四五六七八九]?十)?([一二三四五六七八九])?$/)
    if (m) {
      let result = 0
      if (m[1]) result += map[m[1][0]] * 10
      else if (m[2] && !m[1]) return map[m[2]]
      if (m[2]) result += map[m[2]]
      return result
    }

    return null
  }

  function extractEpisode(name) {
    // S01E02 格式
    let m = name.match(/s(\d+)e(\d+)/i)
    if (m) return 'S' + parseInt(m[1]) + '-E' + parseInt(m[2])

    // 第1季第2集 / 第一季十五集 / 良医第四季第10集
    // 季前捕获：允许季前面没有"第"，直接中文数字+"季"
    m = name.match(/(?:第)?\s*(\d+|[一二三四五六七八九十]+)\s*季\s*(?:第)?\s*(\d+|[一二三四五六七八九十]+)\s*集/)
    if (m) {
      const s = parseChineseNum(m[1])
      const e = parseChineseNum(m[2])
      if (s !== null && e !== null) return 'S' + s + '-E' + e
    }

    // 第二季06 / 第2季08（季中文/数字，集数字，可能无"集"字）
    m = name.match(/(?:第)?\s*(\d+|[一二三四五六七八九十]+)\s*季\s*(\d+)\s*(?:集)?/)
    if (m) {
      const s = parseChineseNum(m[1])
      const e = parseInt(m[2])
      if (s !== null) return 'S' + s + '-E' + e
    }

    // 第64集 / 第六十四集（无季信息）
    m = name.match(/第\s*(.+?)\s*集/)
    if (m) {
      const e = parseChineseNum(m[1])
      if (e !== null) return 'E' + e
    }

    // 第一部 / 第一章 / 第二章 等
    m = name.match(/第\s*(.+?)\s*(?:部|章|节|篇|卷)/)
    if (m) {
      const p = parseChineseNum(m[1])
      if (p !== null) return 'P-' + p
    }

    // part1 / part2 / Part3 等
    m = name.match(/part\s*(\d+)/i)
    if (m) return 'P-' + parseInt(m[1])

    return null
  }

  function isNewFile(entry, cfg) {
    if (!cfg.newMark) return false
    const dt = (cfg.newDays || 7) * 86400 * 1000
    const match = HFS.misc.makeMatcher(cfg.newOnly, true)
    return Math.max(entry.c || 0, entry.m || 0) > Date.now() - dt && match(entry.n)
  }

  // 劇集標記要跟 comment 排在同一行（在 comment 左側），不能自己佔一行。
  //  - 磁貼模式：塞進 .entry-comment 開頭；沒有 comment 就塞進 .entry-details
  //  - 列表模式：留在 <li> 裡、緊貼 .entry-panel 之前
  function placeEpisodeTag(tag) {
    if (!tag || !tag.isConnected) return
    const li = tag.closest('li')
    if (!li) return

    const panel = li.querySelector(':scope > .entry-panel')
    const comment = li.querySelector('.entry-comment')
    const details = li.querySelector('.entry-details')

    if (li.closest('.list-wrapper.tiles-mode')) {
      const target = comment || details
      if (target && tag.parentElement !== target) target.insertBefore(tag, target.firstChild)
    } else if (panel && tag.parentElement !== li) {
      li.insertBefore(tag, panel)
    }
  }

  function schedulePlaceEpisodeTag(tag) {
    if (!tag) return
    requestAnimationFrame(() => placeEpisodeTag(tag))
  }

  HFS.onEvent('fileShow', ({ entry }) => {
    markVisited(entry)
  })

  HFS.onEvent('afterEntryName', ({ entry }) => {
    const cfg = HFS.getPluginConfig()
    const keepMs = (cfg.keepDays || 7) * 86400 * 1000
    const data = cfg.visited ? cleanup(load(), keepMs) : {}
    const visited = cfg.visited && !!data[entry.uri] && (cfg.visitedFolders || !entry.isFolder)
    const episodeText = cfg.episode && entry.n ? extractEpisode(entry.n) : null
    const isNew = isNewFile(entry, cfg)

    // 已讀／NEW 標記：留在檔名後面
    const nameMarks = []

    if (visited && cfg.visitedHtml) {
      const visitedMarker = HFS.h('span', {
        className: 'hfs-visited-marker',
        innerHTML: cfg.visitedHtml
      })
      nameMarks.push(visitedMarker)
    }

    if (isNew && cfg.newHtml) {
      const newMarker = HFS.h('span', {
        className: 'hfs-new-marker',
        innerHTML: cfg.newHtml
      })
      nameMarks.push(newMarker)
    }

    // 劇集標記：不放進 display:contents 包裹層（主題會把它搬進 .link-wrapper，
    // 檔名一長就被擠到第二行，在檔名和大小／時間之間頂出一行）。
    // 標記掛上 ref，等 React 掛載後再由 placeEpisodeTag 搬到 comment 那一行。
    const episodeTag = episodeText
      ? HFS.h('span', {
          className: 'hfs-episode-tag',
          ref: schedulePlaceEpisodeTag
        }, episodeText)
      : null

    if (nameMarks.length === 0 && !episodeTag) return

    const marksWrapper = nameMarks.length
      ? HFS.h('span', { style: 'display:contents' }, nameMarks)
      : null

    if (!marksWrapper) return episodeTag
    if (!episodeTag) return marksWrapper
    return [marksWrapper, episodeTag]
  })

  // 切換列表／磁貼模式後，把已有的劇集標記重新歸位
  if (typeof HFS.watchState === 'function') {
    HFS.watchState('tile_size', () => {
      requestAnimationFrame(() => {
        document.querySelectorAll('.hfs-episode-tag').forEach(placeEpisodeTag)
      })
    })
  }
}