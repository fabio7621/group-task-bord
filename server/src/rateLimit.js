import { AppError } from './validate.js'

/**
 * 記憶體版的速率限制，擋登入與註冊的暴力嘗試。
 * ponytail: 單一行程的 Map，之後要跑多個後端實例再換成 Redis。
 */
export function rateLimit ({ windowMs, max, keyOf }) {
  const hits = new Map()

  return (req, res, next) => {
    const now = Date.now()
    const key = keyOf(req) || 'unknown'
    const record = hits.get(key)

    if (!record || now > record.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
    } else if (++record.count > max) {
      return next(new AppError('TOO_MANY_REQUESTS', '嘗試太多次了，請稍後再試', 429))
    }

    // 順手清掉過期的 key，不另外開計時器
    if (hits.size > 5000) {
      for (const [entryKey, entry] of hits) if (now > entry.resetAt) hits.delete(entryKey)
    }

    next()
  }
}
