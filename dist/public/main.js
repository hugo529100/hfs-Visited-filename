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
    const keepMs = (cfg.keepDays || 7) * 86400 * 1000
    const data = cleanup(load(), keepMs)
    data[entry.uri] = Date.now()
    save(data)
  }

  const CHINESE_NUM = {
    '零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,
    '十':10,'十一':11,'十二':12,'十三':13,'十四':14,'十五':15,'十六':16,
    '十七':17,'十八':18,'十九':19,'二十':20
  }

  function extractEpisode(name) {
    // S01E02 格式
    let m = name.match(/s(\d+)e(\d+)/i)
    if (m) return 'S' + parseInt(m[1]) + '-E' + parseInt(m[2])

    // 第1季第2集 / 第一季02 等混合格式
    m = name.match(/第\s*(\d+|[一二三四五六七八九十]+)\s*季\s*(\d+|[一二三四五六七八九十]+)\s*(?:集)?/)
    if (m) {
      const s = CHINESE_NUM[m[1]] ?? parseInt(m[1])
      const e = CHINESE_NUM[m[2]] ?? parseInt(m[2])
      return 'S' + s + '-E' + e
    }

    // 第二季06 / 第2季08 等混合（季中文，集数字）
    m = name.match(/第?\s*(\d+|[一二三四五六七八九十]+)\s*季\s*(\d+)\s*(?:集)?/)
    if (m) {
      const s = CHINESE_NUM[m[1]] ?? parseInt(m[1])
      const e = parseInt(m[2])
      return 'S' + s + '-E' + e
    }

    // 第06集（无季信息，作为特例识别）
    m = name.match(/第\s*(\d+)\s*集/)
    if (m) return 'E' + parseInt(m[1])

    return null
  }

  HFS.onEvent('fileShow', ({ entry }) => {
    markVisited(entry)
  })

  HFS.onEvent('afterEntryName', ({ entry }) => {
    const cfg = HFS.getPluginConfig()
    const keepMs = (cfg.keepDays || 7) * 86400 * 1000
    const data = cleanup(load(), keepMs)
    const visited = !!data[entry.uri]
    const episodeText = cfg.episode && entry.n ? extractEpisode(entry.n) : null

    if (!visited && !episodeText) return

    if (visited && episodeText) {
      return HFS.h('span', { style: 'display:contents' }, [
        HFS.h('span', { className: 'hfs-visited-dot', 'aria-hidden': 'true' }, '---'),
        HFS.h('span', { className: 'hfs-episode-tag' }, episodeText)
      ])
    }

    if (visited) {
      return HFS.h('span', { className: 'hfs-visited-dot', 'aria-hidden': 'true' }, '---')
    }

    return HFS.h('span', { className: 'hfs-episode-tag' }, episodeText)
  })
}