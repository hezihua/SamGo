/** 团长 openid（.env WECHAT_LEADER_OPENID），仅其可发起拼单 */
export function getLeaderOpenId(): string | null {
  const v = process.env.WECHAT_LEADER_OPENID?.trim();
  return v || null;
}

export function isLeaderOpenId(openid: string): boolean {
  const leader = getLeaderOpenId();
  if (!leader) return false;
  return openid === leader;
}
