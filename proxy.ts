import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_EMAIL_DOMAIN = "@berkeley.edu";
const PUBLIC_PATHS = ["/", "/login"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
                             );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
                             );
      },
    },
  },
  );

// IMPORTANT: do not run any logic between createServerClient and
// getUser(). A stray return here can undo the session refresh above.
const {
  data: { user },
} = await supabase.auth.getUser();

const path = request.nextUrl.pathname;
  const isAuthCallback = path.startsWith("/auth/");
  // API routes handle their own auth (e.g. the CRON_SECRET check on
// the scheduled reminder route) — a cron-triggered request has no
// user session/cookies at all, so gating /api/* here the same way
// as page routes would lock every API route out permanently.
const isApiRoute = path.startsWith("/api/");
  const isPublicPath = PUBLIC_PATHS.includes(path) || isAuthCallback || isApiRoute;

// Enforce @berkeley.edu — this is the actual access restriction; Google
// Cloud has no domain toggle for a personal-Gmail-owned OAuth client, so
// it's enforced here instead. The one exception is an email exec has
// explicitly parked in guest_allowlist (see 20260821010000_guest_allowlist.sql)
// — alumni, guest speakers, cross-campus collaborators, etc. Anyone else
// who got an account otherwise (e.g. a random personal Gmail) is signed
// out immediately. The RPC only runs for the non-Berkeley case, so the
// common path (an actual @berkeley.edu sign-in) never pays for the extra
// DB round trip.
if (user && !user.email?.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN)) {
  const { data: isGuest } = await supabase.rpc("is_allowed_guest", {
    check_email: user.email ?? "",
  });
  if (!isGuest) {
    await supabase.auth.signOut();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=domain_not_allowed";
    return NextResponse.redirect(url);
  }
}

if (!user && !isPublicPath) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

if (user && path === "/login") {
  const url = request.nextUrl.clone();
  url.pathname = "/dashboard";
  return NextResponse.redirect(url);
}

return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
