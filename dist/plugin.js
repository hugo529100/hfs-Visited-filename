exports.version = 1.8
exports.apiRequired = 8.8
exports.repo = "Hug3O/Visited-filename"
exports.description = "Visited file indicator, episode tag and new file marker"

exports.config = {
  visited: {
    type: 'boolean',
    label: 'Show visited indicator',
    defaultValue: true,
    frontend: true
  },
    keepDays: {
    type: 'number',
    label: 'Visited indicator keep time (days)',
    showIf: x => x.visited,
    defaultValue: 7,
    min: 1,
    frontend: true
  },
  visitedHtml: {
    label: "Visited marker HTML",
    multiline: true,
    frontend: true,
    showIf: x => x.visited,
    defaultValue: `—`
  },
  visitedFolders: {
    type: 'boolean',
    label: 'Mark visited folders',
    showIf: x => x.visited,
    defaultValue: false,
    frontend: true
  },
  newMark: {
    type: 'boolean',
    label: 'Mark new files',
    defaultValue: true,
    frontend: true
  },
  newDays: {
    type: 'number',
    label: 'Consider new if modified/created within (days)',
    showIf: x => x.newMark,
    defaultValue: 7,
    min: 1,
    step: 0.1,
    frontend: true,
    helperText: "Enter 0.5 for 12 hours"
  },
  newHtml: {
    label: "New file marker HTML",
    showIf: x => x.newMark,
    multiline: true,
    frontend: true,
    defaultValue: `NEW`
  },
  newOnly: {
    label: "Limit to some names",
    showIf: x => x.newMark,
    frontend: true,
    helperText: "example: *.jpg"
  },
  episode: {
    type: 'boolean',
    label: 'Show episode number (e.g. S02E01 → S2-E1)',
    defaultValue: true,
    frontend: true
  }
}

exports.frontend_js = 'main.js'
exports.frontend_css = 'style.css'