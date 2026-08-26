import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  const steps: { name: string; ms: number; ok: boolean; detail?: string }[] = [];

  try {
    const t0 = Date.now();
    const supabase = await createClient();
    steps.push({ name: "createClient", ms: Date.now() - t0, ok: true });

    const t1 = Date.now();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    steps.push({ name: "getUser", ms: Date.now() - t1, ok: !authErr, detail: authErr?.message ?? user?.email });

    if (!user) {
      return NextResponse.json({ steps, total: Date.now() - start, error: "no user" });
    }

    const t2 = Date.now();
    const { data: profile, error: profileErr } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("id", user.id)
      .maybeSingle();
    steps.push({ name: "profile", ms: Date.now() - t2, ok: !profileErr, detail: profileErr?.message ?? profile?.email });

    const t3 = Date.now();
    const { data: execData, error: execErr } = await supabase.rpc("is_exec");
    steps.push({ name: "is_exec", ms: Date.now() - t3, ok: !execErr, detail: execErr?.message ?? String(execData) });

    const t4 = Date.now();
    const { data: courseData, error: courseErr } = await supabase
      .from("courses")
      .select("id, name")
      .limit(1)
      .maybeSingle();
    steps.push({ name: "courses", ms: Date.now() - t4, ok: !courseErr, detail: courseErr?.message ?? courseData?.name });

    const t5 = Date.now();
    const { count, error: notifErr } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    steps.push({ name: "notifications", ms: Date.now() - t5, ok: !notifErr, detail: notifErr?.message ?? `${count}` });

    return NextResponse.json({ steps, total: Date.now() - start });
  } catch (e) {
    return NextResponse.json({ steps, total: Date.now() - start, error: String(e) }, { status: 500 });
  }
}
