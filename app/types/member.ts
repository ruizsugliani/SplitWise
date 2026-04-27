export type MemberProfile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

export type Member = {
  id: string
  member_name: string
  profile_id: string | null
  profiles: MemberProfile | null
}
