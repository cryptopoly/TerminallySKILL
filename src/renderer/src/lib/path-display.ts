/**
 * Shorten a folder path for one-line display: the home folder becomes `~`, and a long path keeps only its
 * last two folders (`~/…/app/src`). CSS can only cut the end of a path, which hides the useful part.
 */
export function shortenPathForDisplay(path: string, maxLength = 40): string {
  const home = path.replace(/^(\/Users|\/home)\/[^/]+(?=\/|$)/, '~').replace(/^[A-Za-z]:\\Users\\[^\\]+(?=\\|$)/, '~')
  if (home.length <= maxLength) return home
  const separator = home.includes('\\') && !home.includes('/') ? '\\' : '/'
  const parts = home.split(separator).filter(Boolean)
  if (parts.length <= 2) return home
  const root = home.startsWith('~') ? '~' : ''
  return `${root}${separator}…${separator}${parts.slice(-2).join(separator)}`.replace(/^\//, root ? '' : '/')
}
