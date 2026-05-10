import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/account");

  return (
    <div className="container-prose flex min-h-[calc(100vh-12rem)] items-center justify-center py-12">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
