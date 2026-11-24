"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useSession } from "@/hooks/use-session";
import { MOCK_MODE, signIn, signUp } from "@/lib/data";
import { setSession } from "@/lib/session";

/** Only allow same-site relative redirects. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (session) router.replace(next);
  }, [session, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const name = username.trim();
    if (!name || !password) {
      setError("Enter a username and password.");
      return;
    }
    if (mode === "signup") {
      if (password.length < 6) {
        setError("Use at least 6 characters for the password.");
        return;
      }
      if (password !== confirm) {
        setError("The passwords don't match.");
        return;
      }
    }
    setPending(true);
    try {
      const s = mode === "signin" ? await signIn(name, password) : await signUp(name, password);
      setSession(s); // the effect above redirects
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  const isSignin = mode === "signin";
  return (
    <Card className="w-full max-w-sm shadow-xl shadow-black/10">
      <CardHeader>
        <CardTitle className="text-xl">{isSignin ? "Welcome back" : "Create your account"}</CardTitle>
        <CardDescription>
          {isSignin ? "Sign in to see how your sites are doing." : "Start monitoring your first site in a minute."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} noValidate>
        <CardContent>
          <FieldGroup>
            {MOCK_MODE ? (
              <Alert>
                <AlertDescription>Demo mode: any username and password works.</AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor="username">Username</FieldLabel>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ada"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                type="password"
                autoComplete={isSignin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {!isSignin ? <FieldDescription>At least 6 characters.</FieldDescription> : null}
            </Field>
            {!isSignin ? (
              <Field>
                <FieldLabel htmlFor="confirm">Confirm password</FieldLabel>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </Field>
            ) : null}
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-6 flex-col gap-3">
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : null}
            {isSignin ? "Sign in" : "Create account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {isSignin ? "New here? " : "Already have an account? "}
            <Link
              href={`${isSignin ? "/signup" : "/signin"}${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              {isSignin ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
