type Member = {
  id: string;
  member_name: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
};
