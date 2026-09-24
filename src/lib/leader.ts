/** 团长 openid（.env WECHAT_LEADER_OPENID），预留标识；发起拼单不限团长 */
export function getLeaderOpenId(): string | null {
  const v = process.env.WECHAT_LEADER_OPENID?.trim();
  return v || null;
}

export function isLeaderOpenId(openid: string): boolean {
  const leader = getLeaderOpenId();
  if (!leader) return false;
  return openid === leader;
}
