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

    // 收集所有需要显示的元素
    const elements = []
    
    if (visited && cfg.visitedHtml) {
      const visitedMarker = HFS.h('span', { 
        className: 'hfs-visited-marker',
        innerHTML: cfg.visitedHtml 
      })
      elements.push(visitedMarker)
    }
    
    if (isNew && cfg.newHtml) {
      const newMarker = HFS.h('span', { 
        className: 'hfs-new-marker',
        innerHTML: cfg.newHtml 
      })
      elements.push(newMarker)
    }
    
    if (episodeText) {
      elements.push(HFS.h('span', { className: 'hfs-episode-tag' }, episodeText))
    }

    if (elements.length === 0) return
    
    return HFS.h('span', { style: 'display:contents' }, elements)
  })
}