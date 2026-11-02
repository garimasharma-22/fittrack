
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import api from "../services/api";

// ============================================================
// TYPES
// ============================================================

type Member = {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
};

type Plan = {
  _id: string;
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  isActive?: boolean;
};

type Membership = {
  _id: string;
  memberId: string | Member;
  planId: string | Plan;
  startDate: string;
  expiryDate: string;
  priceCharged: number;
  status: "UPCOMING" | "ACTIVE" | "EXPIRED" | "CANCELLED" | string;
  createdAt?: string;
};

type ListResponse<T> = {
  success: boolean;
  count: number;
  data: T[];
};

// ============================================================
// HELPERS
// ============================================================

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: { data?: { message?: string } };
      }
    ).response;

    if (response?.data?.message) return response.data.message;
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong. Please try again.";
}

function formatDate(value?: string): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(value?: number): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getMember(value: Membership["memberId"]): Member | null {
  return typeof value === "object" && value !== null ? value : null;
}

function getPlan(value: Membership["planId"]): Plan | null {
  return typeof value === "object" && value !== null ? value : null;
}

function statusStyle(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "border-lime-400/25 bg-lime-400/10 text-lime-300";
    case "UPCOMING":
      return "border-blue-400/25 bg-blue-400/10 text-blue-300";
    case "EXPIRED":
      return "border-zinc-700 bg-zinc-800/50 text-zinc-400";
    case "CANCELLED":
      return "border-red-400/25 bg-red-400/10 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-800/50 text-zinc-300";
  }
}

// ============================================================
// SHARED STYLES
// ============================================================

const inputClass =
  "mt-1.5 w-full min-w-0 rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400/60";

const labelClass = "block text-xs font-medium text-zinc-400";

// ============================================================
// MAIN PAGE
// ============================================================

export default function MembershipManagement() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [memberId, setMemberId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState("");

  // ----------------------------------------------------------
  // LOAD MEMBERSHIPS, MEMBERS, AND PLANS
  // ----------------------------------------------------------

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      api.get<ListResponse<Membership>>("/memberships"),
      api.get<ListResponse<Member>>("/users"),
      api.get<ListResponse<Plan>>("/membership-plans"),
    ]);

    const [membershipResult, memberResult, planResult] = results;
    const errors: string[] = [];

    if (membershipResult.status === "fulfilled") {
      setMemberships(membershipResult.value.data.data ?? []);
    } else {
      errors.push(
        `Memberships: ${getErrorMessage(membershipResult.reason)}`
      );
    }

    if (memberResult.status === "fulfilled") {
      setMembers(memberResult.value.data.data ?? []);
    } else {
      errors.push(`Members: ${getErrorMessage(memberResult.reason)}`);
    }

    if (planResult.status === "fulfilled") {
      setPlans(planResult.value.data.data ?? []);
    } else {
      errors.push(`Plans: ${getErrorMessage(planResult.reason)}`);
    }

    if (errors.length > 0) {
      setError(errors.join(" "));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ----------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadData(false);
    } finally {
      setRefreshing(false);
    }
  }

  // ----------------------------------------------------------
  // SEARCH AND FILTER
  // ----------------------------------------------------------

  const filteredMemberships = memberships.filter((membership) => {
    const member = getMember(membership.memberId);
    const plan = getPlan(membership.planId);

    const searchText = [
      member?.name ?? "",
      member?.email ?? "",
      member?.phone ?? "",
      plan?.name ?? "",
      membership.status,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchText.includes(search.trim().toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || membership.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ----------------------------------------------------------
  // ASSIGN MEMBERSHIP
  // ----------------------------------------------------------

  const handleAssign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!memberId || !planId) {
      setError("Please select a member and a membership plan.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/memberships", {
        memberId,
        planId,
        ...(startDate ? { startDate } : {}),
      });

      setNotice("Membership assigned successfully.");
      setMemberId("");
      setPlanId("");
      setStartDate("");

      await loadData(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // ----------------------------------------------------------
  // CANCEL MEMBERSHIP
  // ----------------------------------------------------------

  const handleCancel = async (membership: Membership) => {
    if (
      membership.status === "CANCELLED" ||
      membership.status === "EXPIRED"
    ) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this membership?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setCancellingId(membership._id);

    try {
      await api.patch(`/memberships/${membership._id}/cancel`, {});

      setNotice("Membership cancelled successfully.");
      await loadData(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  // ----------------------------------------------------------
  // RENEW MEMBERSHIP
  // ----------------------------------------------------------

  const handleRenew = async (membership: Membership) => {
    if (membership.status === "CANCELLED") {
      setError("Cancelled memberships cannot be renewed.");
      return;
    }

    const confirmed = window.confirm(
      "Renew this membership using its current plan?"
    );

    if (!confirmed) return;

    setError("");
    setNotice("");
    setRenewingId(membership._id);

    try {
      await api.post(`/memberships/${membership._id}/renew`, {});

      setNotice("Membership renewed successfully.");
      await loadData(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setRenewingId(null);
    }
  };

  // ----------------------------------------------------------
  // SUMMARY COUNTS
  // ----------------------------------------------------------

  const activeCount = memberships.filter(
    (item) => item.status === "ACTIVE"
  ).length;

  const upcomingCount = memberships.filter(
    (item) => item.status === "UPCOMING"
  ).length;

  const expiredCount = memberships.filter(
    (item) => item.status === "EXPIRED"
  ).length;

  const cancelledCount = memberships.filter(
    (item) => item.status === "CANCELLED"
  ).length;

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#090b09] text-white">
      {/* SHARED TOP NAVIGATION */}
      <header className="flex min-h-[66px] items-center justify-between gap-4 border-b border-zinc-800 px-4 sm:px-6 lg:px-10">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-3 text-sm font-medium text-zinc-200 transition hover:text-lime-400"
        >
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </Link>

        <div className="inline-flex shrink-0 items-center gap-2 text-sm text-zinc-400">
          <ShieldCheck size={21} className="text-lime-400" />
          <span>Admin access</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1800px] px-4 py-7 sm:px-6 sm:py-8 lg:px-10">
        {/* PAGE TITLE AND REFRESH */}
        <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-lime-400">
              Memberships
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Membership Management
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Assign plans, manage member subscriptions, and review
              membership status.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || refreshing}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-transparent px-4 py-2.5 text-sm font-semibold text-white transition hover:border-lime-400/50 hover:text-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {/* ERROR MESSAGE */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-400/25 bg-red-400/5 p-4 text-sm text-red-300"
          >
            <p className="min-w-0 break-words">{error}</p>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError("")}
              className="shrink-0 text-red-300 transition hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SUCCESS MESSAGE */}
        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-lime-400/25 bg-lime-400/5 p-4 text-sm text-lime-300"
          >
            <p className="min-w-0">{notice}</p>
            <button
              type="button"
              aria-label="Dismiss message"
              onClick={() => setNotice("")}
              className="shrink-0 transition hover:text-white"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <section className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total memberships", value: memberships.length },
            { label: "Active", value: activeCount },
            { label: "Upcoming", value: upcomingCount },
            { label: "Expired", value: expiredCount },
          ].map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-zinc-800 bg-[#111411] p-5 transition hover:border-lime-400/20"
            >
              <p className="text-sm text-zinc-400">{item.label}</p>
              <p className="mt-3 text-2xl font-bold text-lime-300">
                {loading ? "—" : item.value}
              </p>
            </article>
          ))}
        </section>

        {/* ASSIGN MEMBERSHIP FORM */}
        <section className="mb-7 rounded-2xl border border-zinc-800 bg-[#111411] p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
              <CreditCard size={20} />
            </div>

            <div>
              <h2 className="text-lg font-semibold">Assign a Membership</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Choose a member, select a plan, and set the start date.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleAssign}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <label className={labelClass}>
              Member
              <select
                value={memberId}
                onChange={(event) => setMemberId(event.target.value)}
                required
                className={inputClass}
              >
                <option value="">Select a member</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} — {member.email}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Membership plan
              <select
                value={planId}
                onChange={(event) => setPlanId(event.target.value)}
                required
                className={inputClass}
              >
                <option value="">Select a plan</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>
                    {plan.name} — {formatPrice(plan.price)}
                  </option>
                ))}
              </select>
            </label>

            <label className={labelClass}>
              Start date (optional)
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className={inputClass}
              />
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving && <RefreshCw size={15} className="animate-spin" />}
                {saving ? "Assigning..." : "Assign Membership"}
              </button>
            </div>
          </form>

          {members.length === 0 && !loading && (
            <p className="mt-4 text-xs leading-5 text-amber-300">
              No members were returned. Check that your admin account can
              access GET /api/users.
            </p>
          )}

          {plans.length === 0 && !loading && (
            <p className="mt-2 text-xs leading-5 text-amber-300">
              No membership plans were returned. Create an active plan first.
            </p>
          )}
        </section>

        {/* ALL MEMBERSHIPS */}
        <section className="rounded-2xl border border-zinc-800 bg-[#111411] p-5 sm:p-6">
          <div className="mb-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h2 className="text-lg font-semibold">All Memberships</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Review member details, plan prices, dates, and membership
                status.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search member or plan..."
                aria-label="Search memberships"
                className="w-full rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400/60"
              />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter membership status"
                className="w-full rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2.5 text-sm text-white outline-none transition focus:border-lime-400/60"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* MEMBERSHIP STATUS SUMMARY */}
          <div className="mb-5 flex flex-wrap gap-2">
            {[
              { label: "All", value: memberships.length },
              { label: "Active", value: activeCount },
              { label: "Upcoming", value: upcomingCount },
              { label: "Expired", value: expiredCount },
              { label: "Cancelled", value: cancelledCount },
            ].map((item) => (
              <span
                key={item.label}
                className="rounded-lg border border-zinc-800 bg-[#090b09] px-3 py-1.5 text-xs text-zinc-400"
              >
                {item.label}:{" "}
                <span className="font-semibold text-zinc-200">
                  {loading ? "—" : item.value}
                </span>
              </span>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-zinc-400">
              <RefreshCw size={17} className="animate-spin text-lime-400" />
              Loading memberships...
            </div>
          ) : filteredMemberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 px-5 py-12 text-center">
              <CreditCard
                size={30}
                className="mx-auto text-lime-400"
              />
              <h3 className="mt-3 text-sm font-semibold">
                No memberships found
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-zinc-400">
                {memberships.length === 0
                  ? "Memberships will appear here after a plan is assigned to a member."
                  : "Try changing your search or status filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMemberships.map((membership) => {
                const member = getMember(membership.memberId);
                const plan = getPlan(membership.planId);

                return (
                  <article
                    key={membership._id}
                    className="rounded-xl border border-zinc-800 bg-[#090b09] p-4 sm:p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="text-base font-semibold">
                            {member?.name ?? "Member details unavailable"}
                          </h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(membership.status)}`}
                          >
                            {membership.status}
                          </span>
                        </div>

                        <p className="mt-1 break-all text-sm text-zinc-400">
                          {member?.email ?? "Email unavailable"}
                          {member?.phone ? ` · ${member.phone}` : ""}
                        </p>

                        <p className="mt-3 text-sm font-semibold text-lime-300">
                          {plan?.name ?? "Membership plan"}
                        </p>

                        <div className="mt-3 grid grid-cols-1 gap-3 text-sm text-zinc-400 sm:grid-cols-2 xl:grid-cols-3">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="shrink-0 text-lime-400"
                            />
                            <span>
                              <span className="text-zinc-500">Starts:</span>{" "}
                              {formatDate(membership.startDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={15}
                              className="shrink-0 text-lime-400"
                            />
                            <span>
                              <span className="text-zinc-500">Expires:</span>{" "}
                              {formatDate(membership.expiryDate)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <CreditCard
                              size={15}
                              className="shrink-0 text-lime-400"
                            />
                            <span className="font-semibold text-zinc-200">
                              {formatPrice(membership.priceCharged)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
                        {membership.status !== "CANCELLED" &&
                          membership.status !== "EXPIRED" && (
                            <button
                              type="button"
                              onClick={() => void handleCancel(membership)}
                              disabled={
                                cancellingId === membership._id ||
                                renewingId === membership._id
                              }
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/25 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cancellingId === membership._id && (
                                <RefreshCw
                                  size={14}
                                  className="animate-spin"
                                />
                              )}
                              {cancellingId === membership._id
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          )}

                        {membership.status !== "CANCELLED" && (
                          <button
                            type="button"
                            onClick={() => void handleRenew(membership)}
                            disabled={
                              renewingId === membership._id ||
                              cancellingId === membership._id
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {renewingId === membership._id && (
                              <RefreshCw
                                size={14}
                                className="animate-spin"
                              />
                            )}
                            {renewingId === membership._id
                              ? "Renewing..."
                              : "Renew"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer className="mt-6 flex items-center gap-2 border-t border-zinc-800 py-4 text-xs text-zinc-500">
          <UserRound size={14} />
          <span>Admin-only membership management</span>
        </footer>
      </main>
    </div>
  );
}
