import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col">
      <div className="bg-grid absolute inset-0 -z-10 opacity-50" aria-hidden />
      <header className="mx-auto flex h-14 w-full max-w-6xl items-center px-4">
        <Logo />
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">{children}</main>
    </div>
  );
}
