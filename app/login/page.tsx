import { Suspense } from "react";
import { LoginForm } from "./LoginForm";
import { EnvFaltando } from "@/components/EnvFaltando";
import { envConfigurado } from "@/lib/supabase/env";

export default function LoginPage() {
  if (!envConfigurado()) return <EnvFaltando />;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
