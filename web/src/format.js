export const TASK_STATUS = {
  open: '待認領',
  claimed: '進行中',
  submitted: '待確認',
  done: '已完成'
}

export const REDEMPTION_STATUS = {
  pending: '待兌現',
  fulfilled: '已兌現',
  void: '已失效'
}

export const TX_KIND = {
  earn: '賺取',
  redeem: '兌換',
  void: '作廢'
}

const pad = (n) => String(n).padStart(2, '0')

/** 9/24 */
export function shortDate (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 2026/09/24 */
export function fullDate (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

/** 09/24 21:14 */
export function dateTime (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 給 <input type="date"> 用 */
export function dateInputValue (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
