import { Label } from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import { useForm } from "react-hook-form";

interface LoginValues {
  readonly pat: string;
}

/**
 * P0 login shell — routes + tokens only (plan P0.5); auth journey incl. probe
 * + persisted-token consent lands in P1.9 (ADR-0002).
 * Copy law: founder vocabulary — access key (never "token"), no banned words.
 */
export function LoginScreen() {
  const { register, watch } = useForm<LoginValues>({ defaultValues: { pat: "" } });
  const pat = watch("pat");

  return (
    <main className="min-h-dvh bg-bg text-text-primary font-display flex items-center justify-center p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
        }}
        className="w-full max-w-sm rounded-card border border-border-soft bg-surface p-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Content studio</h1>
        <p className="mt-2 text-sm text-text-muted">
          Sign-in is a shell in this scaffold — the real journey lands in P1.
        </p>
        <div className="mt-8 grid gap-2">
          <Label htmlFor="access-key" className="text-sm text-text-muted">
            Access key
          </Label>
          <input
            id="access-key"
            type="password"
            autoComplete="off"
            placeholder="••••••••••••"
            {...register("pat")}
            className="rounded-lg border border-border-soft bg-surface-raised px-4 py-3 text-lg outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
        </div>
        <Slot className="mt-6 block w-full">
          <button
            type="submit"
            disabled={pat.length === 0}
            className="w-full rounded-lg bg-accent px-4 py-3 font-semibold text-lg text-[#111] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40"
          >
            Continue
          </button>
        </Slot>
      </form>
    </main>
  );
}
