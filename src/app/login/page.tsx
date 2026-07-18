import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell title="Bem-vindo(a) de volta" subtitle="Entre para acessar o ministério de louvor">
      <LoginForm next={next ?? "/dashboard"} />
    </AuthShell>
  );
}
