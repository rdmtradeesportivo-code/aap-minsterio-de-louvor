import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <AuthShell title="Criar conta" subtitle="Junte-se ao ministério de louvor">
      <SignupForm />
    </AuthShell>
  );
}
