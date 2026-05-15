exports.version = 1
exports.apiRequired = 8.8
exports.repo = "Hug3O/Visited-filename"
exports.description = "Visited file indicator and episode tag"

exports.config = {
  keepDays: {
    type: 'number',
    label: 'Visited indicator keep time (days)',
    defaultValue: 1,
    min: 1,
    frontend: true
  },
  episode: {
    type: 'boolean',
    label: 'Show episode number (e.g. S02E01 → S2-E1)',
    defaultValue: false,
    frontend: true
  }
}

exports.frontend_js = 'main.js'
exports.frontend_css = 'style.css'