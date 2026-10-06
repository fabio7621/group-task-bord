import { del, get, patch, post } from './client.js'

const rewardsPath = (groupId) => `/groups/${groupId}/rewards`

export const rewardsApi = {
  /** 回傳 { rewards, myBalances } */
  list: (groupId) => get(rewardsPath(groupId)),
  create: (groupId, payload) => post(rewardsPath(groupId), payload),
  setStock: (groupId, rewardId, stock) => patch(`${rewardsPath(groupId)}/${rewardId}/stock`, { stock }),
  remove: (groupId, rewardId) => del(`${rewardsPath(groupId)}/${rewardId}`),
  redeem: (groupId, rewardId) => post(`${rewardsPath(groupId)}/${rewardId}/redeem`),

  /** 回傳 { mine, received } */
  redemptions: (groupId) => get(`/groups/${groupId}/redemptions`),
  fulfill: (groupId, redemptionId) => post(`/groups/${groupId}/redemptions/${redemptionId}/fulfill`),

  /** 回傳 { balances, transactions } */
  points: (groupId) => get(`/groups/${groupId}/points`)
}
