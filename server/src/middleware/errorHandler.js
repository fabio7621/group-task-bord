import { AppError } from '../validate.js'

export const notFound = (req, res) =>
  res.status(404).json({ error: { code: 'NOT_FOUND', message: '找不到這個路徑' } })

// 統一的錯誤格式：預期內的錯誤回代碼，其餘只記在伺服器端，不外流細節
export function errorHandler (error, req, res, next) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } })
  }
  console.error('[unhandled]', req.method, req.originalUrl, error)
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: '伺服器發生錯誤，請稍後再試' } })
}
