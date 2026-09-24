-- 修复「Database error creating new user」（auth 触发器写 profiles 失败）

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname, wechat_openid)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'nickname'), ''),
      split_part(NEW.email, '@', 1),
      '用户'
    ),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'wechat_openid'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    nickname = COALESCE(NULLIF(EXCLUDED.nickname, ''), profiles.nickname),
    wechat_openid = COALESCE(EXCLUDED.wechat_openid, profiles.wechat_openid);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT INSERT, UPDATE ON public.profiles TO supabase_auth_admin;
