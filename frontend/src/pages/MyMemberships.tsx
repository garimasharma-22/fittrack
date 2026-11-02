
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";

type MembershipPlan = {
  _id: string;
  name: string;
  description?: string;
  durationDays?: number;
  price?: number;
};

type Membership = {
  _id: string;
  planId: string | MembershipPlan;
  startDate: string;
  expiryDate?: string;
  endDate?: string;
  status: string;
};

type MembershipResponse = {
  success: boolean;
  count: number;
  data: Membership[];
};

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPlanName(plan: Membership["planId"]) {
  if (typeof plan === "object" && plan !== null) {
    return plan.name;
  }

  return "Membership plan";
}

function getPlanPrice(plan: Membership["planId"]) {
  if (
    typeof plan === "object" &&
    plan !== null &&
    typeof plan.price === "number"
  ) {
    return `₹${plan.price.toLocaleString("en-IN")}`;
  }

  return "Price unavailable";
}

export default function MyMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadMemberships = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<MembershipResponse>(
        "/memberships/me"
      );

      setMemberships(response.data.data ?? []);
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err
          ? (
              err as {
                response?: {
                  data?: { message?: string };
                };
              }
            ).response?.data?.message
          : undefined;

      setError(message || "Could not load your memberships.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMemberships();
  }, [loadMemberships]);

  return (
    <main className="min-h-screen bg-[#090b09] px-4 py-6 text-white sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        {/* Shared page header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-lime-400 hover:text-lime-400"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#111411] px-3 py-2 text-xs font-medium text-zinc-300">
            <ShieldCheck size={16} className="text-lime-400" />
            Member access
          </div>
        </header>

        {/* Page title and actions */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">
              FitTrack
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              My Memberships
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              View your gym memberships and subscription dates.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void loadMemberships()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-[#111411] px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              to="/membership-plans"
              className="inline-flex items-center justify-center rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              Browse Plans
            </Link>
          </div>
        </section>

        {/* Loading state */}
        {loading && (
          <div className="rounded-2xl border border-zinc-800 bg-[#111411] p-6 text-sm text-zinc-300">
            Loading your memberships...
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-900/70 bg-red-950/30 p-6">
            <h2 className="text-lg font-semibold text-red-300">
              Unable to load memberships
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() => void loadMemberships()}
              className="mt-4 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && memberships.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-[#111411] p-8 text-center sm:p-10">
            <CreditCard
              size={36}
              className="mx-auto text-lime-400"
            />

            <h2 className="mt-4 text-lg font-semibold">
              No memberships yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
              You do not have a membership assigned to your account yet.
              Browse the available plans to see your options.
            </p>

            <Link
              to="/membership-plans"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300"
            >
              Explore Membership Plans
            </Link>
          </div>
        )}

        {/* Membership cards */}
        {!loading && !error && memberships.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2">
            {memberships.map((membership) => {
              const plan = membership.planId;
              const expiry =
                membership.expiryDate ?? membership.endDate;

              return (
                <article
                  key={membership._id}
                  className="rounded-2xl border border-zinc-800 bg-[#111411] p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                        Membership
                      </p>

                      <h2 className="mt-1 break-words text-lg font-semibold">
                        {getPlanName(plan)}
                      </h2>
                    </div>

                    <span className="shrink-0 rounded-full border border-lime-800 bg-lime-950/50 px-3 py-1 text-xs font-semibold text-lime-300">
                      {membership.status}
                    </span>
                  </div>

                  <p className="mt-4 text-2xl font-bold text-lime-400">
                    {getPlanPrice(plan)}
                  </p>

                  {typeof plan === "object" &&
                    plan !== null &&
                    plan.description && (
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        {plan.description}
                      </p>
                    )}

                  <div className="mt-5 space-y-4 border-t border-zinc-800 pt-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10">
                        <CalendarDays
                          size={17}
                          className="text-lime-400"
                        />
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">
                          Start date
                        </p>

                        <p className="mt-0.5 text-sm font-medium text-zinc-200">
                          {formatDate(membership.startDate)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime-400/10">
                        <CalendarDays
                          size={17}
                          className="text-lime-400"
                        />
                      </div>

                      <div>
                        <p className="text-xs text-zinc-500">
                          Expiry date
                        </p>

                        <p className="mt-0.5 text-sm font-medium text-zinc-200">
                          {formatDate(expiry)}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
