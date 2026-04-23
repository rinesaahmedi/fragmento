import { clearAdminSession } from "../../../../lib/auth";

export async function POST(request) {
  await clearAdminSession();
  return new Response(null, {
    status: 303,
    headers: {
      Location: "/admin/login",
    },
  });
}
