import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-slate-900">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Junte-se ao ministério de louvor
          </p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
