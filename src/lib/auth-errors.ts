const ERROR_MESSAGES: Record<string, string> = {
  "Invalid login credentials":
    "邮箱或密码错误。若你曾在其他 Supabase 项目注册，请在本页重新注册；若刚注册，请先查收邮件完成验证。",
  "Email not confirmed": "请先查收注册邮件，点击确认链接后再登录。",
  "User already registered": "该邮箱已注册，请直接登录。",
  "Password should be at least 6 characters": "密码至少需要 6 位。",
  "Unable to validate email address: invalid format": "邮箱格式不正确。",
  "Signup requires a valid password": "请填写有效密码。",
};

export function translateAuthError(message: string): string {
  return ERROR_MESSAGES[message] ?? message;
}
