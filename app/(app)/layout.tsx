import { createClient } from "@/lib/supabase/server";
import { getCurrentCourse, getCurrentProfile, getIsRealExec, isStudentView } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, Bell, Mail, Settings, GraduationCap } from "lucide-react";
import { CourseSidebar } from "./course-sidebar";
import { CourseTopBar } from "./course-topbar";
import { enterStudentView, exitStudentView } from "./student-view-actions";

function initials(name: string | null | undefined, email: string | undefined) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return email?.[0]?.toUpperCase() ?? "?";
}

// Global-rail item — icon stacked over a small label, bCourses style.
function RailLink({
  href,
  label,
  children,
  badge,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className="relative flex w-full flex-col items-center gap-1 px-1 py-3 text-[10px] font-ui leading-tight text-white/75 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
      <span className="text-center">{label}</span>
      {badge != null && badge > 0 && (
        <span className="absolute right-4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-navy-deep">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy.ts already gates every route in this group, but a Server
  // Component should never trust that alone — re-check here per the
  // Data Access Layer pattern (checks belong as close to the data as
  // possible, not just at the network edge).
  if (!user) {
    redirect("/login");
  }

  const [profile, course, realExec, studentView, { count: unreadCount }] = await Promise.all([
    getCurrentProfile(),
    getCurrentCourse(),
    getIsRealExec(),
    isStudentView(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);
  // While "viewing as a student" the app treats them as a member everywhere
  // (nav, submit boxes, quizzes) — realExec still gates the view toggle.
  const isExec = realExec && !studentView;

  const term = (course as { term?: { name?: string } } | null)?.term?.name ?? "Current Term";
  const courseLabel = course?.code
    ? `${course.code} · ${course.name}`
    : (course?.name ?? "UREC Analyst Program");

  return (
    <div className="flex min-h-screen">
      {/* Hidden peer checkbox drives the CSS-only nav collapse — the
          hamburger in the header is its <label>. No JS needed. */}
      <input type="checkbox" id="nav-toggle" className="peer hidden" />

      {/* Global nav rail — bCourses account-level nav: dark slate,
          icon-over-label, always visible. */}
      <nav className="flex w-[76px] flex-shrink-0 flex-col items-center bg-navy pb-3 text-white">
        <Link
          href="/dashboard"
          title="UREC — Dashboard"
          className="flex h-14 w-full items-center justify-center bg-navy-deep"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1 shadow-sm">
            <Image
              src="/urec-logo.png"
              alt="UREC"
              width={30}
              height={30}
              priority
            />
          </span>
        </Link>
        <div className="mt-1 flex flex-col items-center self-stretch">
          <RailLink href="/dashboard" label="Dashboard">
            <LayoutGrid className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          <RailLink href="/notifications" label="Alerts" badge={unreadCount ?? 0}>
            <Bell className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          <RailLink href="/inbox" label="Inbox">
            <Mail className="h-5 w-5" strokeWidth={1.75} />
          </RailLink>
          {isExec && (
            <RailLink href="/admin" label="Admin">
              <Settings className="h-5 w-5" strokeWidth={1.75} />
            </RailLink>
          )}
        </div>

        <div className="mt-auto flex w-full flex-col items-center gap-1.5 pt-3">
          {realExec && !studentView && (
            <form action={enterStudentView} className="w-full">
              <button
                type="submit"
                title="See the app exactly as a member does — you can submit too"
                className="flex w-full flex-col items-center gap-1 px-1 py-2 text-[10px] font-ui leading-tight text-white/75 transition-colors hover:bg-white/10 hover:text-white"
              >
                <GraduationCap className="h-5 w-5" strokeWidth={1.75} />
                Student view
              </button>
            </form>
          )}
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70 bg-blue text-xs font-bold text-white"
            title={profile?.full_name ?? user.email}
          >
            {initials(profile?.full_name, user.email)}
          </div>
          <form action="/auth/signout" method="post" className="w-full">
            <button
              type="submit"
              className="w-full px-1 py-2 text-[10px] font-ui text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      {/* Course menu — only rendered inside a course (see CourseSidebar);
          the Dashboard/admin pages show just the blue rail. Collapses
          when the header hamburger is toggled (peer checkbox above). */}
      <CourseSidebar term={term} />

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {realExec && studentView && (
          <div className="flex items-center justify-between gap-3 border-b border-[#B4531A]/20 bg-[#fff3e0] px-5 py-2 text-sm text-[#B4531A]">
            <span className="flex items-center gap-2 font-medium">
              <GraduationCap className="h-4 w-4" strokeWidth={2} />
              Viewing as a student — you see and submit exactly what a member does.
            </span>
            <form action={exitStudentView}>
              <button
                type="submit"
                className="whitespace-nowrap rounded-md bg-[#B4531A] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#9a4517]"
              >
                Return to exec
              </button>
            </form>
          </div>
        )}
        <CourseTopBar courseLabel={courseLabel} isExec={isExec} />
        <main className="flex-1 bg-paper">{children}</main>
      </div>
    </div>
  );
}
