
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  RefreshCw,
  Wallet,
  ReceiptText,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import api from "../services/api";
import { useAuth } from "../contexts/AuthContext";

type PaymentMethod =
  | "CASH"
  | "UPI"
  | "CARD"
  | "BANK_TRANSFER"
  | "OTHER";

interface PopulatedMember {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface PopulatedMembership {
  _id?: string;
  startDate?: string;
  expiryDate?: string;
  priceCharged?: number;
  status?: string;
}

interface Payment {
  _id: string;
  memberId?: string | PopulatedMember;
  membershipId?: string | PopulatedMembership;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  reference?: string;
  notes?: string;
  recordedBy?: string | { name?: string; email?: string };
}

interface PaymentListResponse {
  success: boolean;
  count: number;
  data: Payment[];
}

interface PaymentResponse {
  success: boolean;
  message: string;
  data: Payment;
}

const methods: PaymentMethod[] = [
  "CASH",
  "UPI",
  "CARD",
  "BANK_TRANSFER",
  "OTHER",
];

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400";

function formatDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            errors?: { fieldErrors?: Record<string, string[]> };
          };
        };
      }
    ).response;

    const message = response?.data?.message;
    const fieldErrors = response?.data?.errors?.fieldErrors;

    if (fieldErrors) {
      const details = Object.entries(fieldErrors)
        .flatMap(([field, messages]) =>
          messages.map((item) => `${field}: ${item}`)
        )
        .join("; ");

      if (details) return details;
    }

    if (message) return message;
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong. Please try again.";
}

function getMemberName(member?: Payment["memberId"]): string {
  if (!member) return "Member";

  if (typeof member === "string") return `Member ID: ${member}`;

  return member.name || member.email || "Member";
}

function getMembershipId(membership?: Payment["membershipId"]): string {
  if (!membership) return "—";

  return typeof membership === "string"
    ? membership
    : membership._id || "—";
}

function SummaryCard({
  label,
  value,
  description,
  icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-[#111411] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{label}</p>
        <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">
          {icon}
        </div>
      </div>

      <p
        className={`mt-4 break-words text-2xl font-bold ${
          accent ? "text-lime-400" : "text-white"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
    </article>
  );
}

function FieldLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="mb-1.5 block text-xs font-medium text-zinc-400">
      {children}
    </span>
  );
}

export default function Payments() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [membershipId, setMembershipId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("UPI");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = isAdmin ? "/payments" : "/payments/me";
      const response = await api.get<PaymentListResponse>(endpoint);

      setPayments(
        Array.isArray(response.data.data) ? response.data.data : []
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  async function handleCreatePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!membershipId.trim()) {
      setError("Enter the membership ID for this payment.");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    if (!paymentDate) {
      setError("Select the payment date.");
      return;
    }

    const selectedDate = new Date(`${paymentDate}T12:00:00`);

    if (Number.isNaN(selectedDate.getTime())) {
      setError("Enter a valid payment date.");
      return;
    }

    if (selectedDate > new Date()) {
      setError("Payment date cannot be in the future.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        membershipId: membershipId.trim(),
        amount: numericAmount,
        paymentMethod,
        paymentDate: selectedDate.toISOString(),
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      const response = await api.post<PaymentResponse>(
        "/payments",
        payload
      );

      setSuccess(
        response.data.message || "Payment recorded successfully."
      );

      setMembershipId("");
      setAmount("");
      setPaymentMethod("UPI");
      setReference("");
      setNotes("");
      setPaymentDate(new Date().toISOString().slice(0, 10));

      await loadPayments();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const totalRecorded = payments.reduce(
    (total, payment) => total + payment.amount,
    0
  );

  return (
    <div className="min-h-screen bg-[#090b09] text-white">
      {/* Shared FitTrack header */}
      <header className="border-b border-zinc-800">
        <div className="flex min-h-[66px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-3 text-sm font-medium text-zinc-200 transition hover:text-lime-400"
          >
            <ArrowLeft size={20} />
            <span>Back to Dashboard</span>
          </Link>

          <div className="inline-flex shrink-0 items-center gap-2 text-sm text-zinc-400">
            <ShieldCheck size={20} className="text-lime-400" />
            <span>{isAdmin ? "Admin access" : "Member access"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page title and refresh */}
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-lime-400">
              FITTRACK / PAYMENTS
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              {isAdmin ? "Payments Management" : "My Payments"}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              {isAdmin
                ? "Record membership payments and review payment history."
                : "View your recorded membership payments and payment history."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPayments()}
            disabled={loading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-[#111411] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-lime-400/50 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </section>

        {/* Feedback messages */}
        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          >
            <p className="break-words">{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
              className="shrink-0 font-semibold hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="flex items-start justify-between gap-3 rounded-xl border border-lime-400/30 bg-lime-400/10 p-4 text-sm text-lime-200"
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <p>{success}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
              className="shrink-0 font-semibold hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SummaryCard
            label="Payment records"
            value={loading ? "—" : payments.length}
            description={
              isAdmin
                ? "Payment records returned by the API"
                : "Your recorded payment transactions"
            }
            icon={<ReceiptText size={21} />}
          />

          <SummaryCard
            label="Total recorded"
            value={loading ? "—" : formatAmount(totalRecorded)}
            description="Total amount across the returned payment records"
            icon={<Wallet size={21} />}
            accent
          />
        </section>

        {/* Record payment form: admin only */}
        {isAdmin && (
          <section className="rounded-2xl border border-zinc-800 bg-[#111411] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">
                <CreditCard size={21} />
              </div>

              <div>
                <h2 className="text-lg font-semibold">Record a Payment</h2>
                <p className="mt-1 text-sm leading-5 text-zinc-400">
                  Record a payment for an existing membership.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleCreatePayment}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <label className="block min-w-0">
                <FieldLabel>Membership ID *</FieldLabel>
                <input
                  required
                  value={membershipId}
                  onChange={(event) => setMembershipId(event.target.value)}
                  placeholder="Enter membership ID"
                  className={inputClass}
                />
                <span className="mt-1.5 block text-xs leading-5 text-zinc-500">
                  Enter the real membership _id from your database or API.
                </span>
              </label>

              <label className="block min-w-0">
                <FieldLabel>Amount (INR) *</FieldLabel>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="e.g. 1500"
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0">
                <FieldLabel>Payment Method *</FieldLabel>
                <select
                  required
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value as PaymentMethod)
                  }
                  className={inputClass}
                >
                  {methods.map((method) => (
                    <option key={method} value={method}>
                      {method.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block min-w-0">
                <FieldLabel>Payment Date *</FieldLabel>
                <input
                  required
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0 sm:col-span-2">
                <FieldLabel>Reference (optional)</FieldLabel>
                <input
                  maxLength={100}
                  value={reference}
                  onChange={(event) => setReference(event.target.value)}
                  placeholder="UPI transaction ID or receipt number"
                  className={inputClass}
                />
              </label>

              <label className="block min-w-0 sm:col-span-2">
                <FieldLabel>Notes (optional)</FieldLabel>
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Additional payment details"
                  className={`${inputClass} resize-y`}
                />
              </label>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      Record Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Payment history */}
        <section className="min-w-0 rounded-2xl border border-zinc-800 bg-[#111411] p-5 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Payment History</h2>
            <p className="mt-1 text-sm leading-5 text-zinc-400">
              {isAdmin
                ? "Review payments recorded across memberships."
                : "Review payments associated with your account."}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-zinc-400">
              <RefreshCw size={18} className="animate-spin text-lime-400" />
              Loading payments...
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 px-5 py-10 text-center">
              <ReceiptText
                size={30}
                className="mx-auto text-zinc-500"
              />
              <h3 className="mt-3 text-sm font-semibold text-white">
                No payments found
              </h3>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-400">
                {isAdmin
                  ? "Payment records will appear here after an admin records a payment."
                  : "Your payment history will appear here when a payment is recorded for your membership."}
              </p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-wider text-zinc-500">
                    {isAdmin && (
                      <th className="px-3 py-3 font-medium">Member</th>
                    )}
                    <th className="px-3 py-3 font-medium">Payment Date</th>
                    <th className="px-3 py-3 font-medium">Method</th>
                    <th className="px-3 py-3 font-medium">Amount</th>
                    <th className="px-3 py-3 font-medium">Membership</th>
                    <th className="px-3 py-3 font-medium">Reference</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment._id}
                      className="border-b border-zinc-800/60 transition hover:bg-white/[0.02]"
                    >
                      {isAdmin && (
                        <td className="max-w-48 px-3 py-3.5">
                          <p className="break-words font-medium text-zinc-200">
                            {getMemberName(payment.memberId)}
                          </p>

                          {typeof payment.memberId === "object" &&
                            payment.memberId?.email && (
                              <p className="mt-1 break-all text-xs text-zinc-500">
                                {payment.memberId.email}
                              </p>
                            )}
                        </td>
                      )}

                      <td className="whitespace-nowrap px-3 py-3.5 text-zinc-300">
                        {formatDate(payment.paymentDate)}
                      </td>

                      <td className="px-3 py-3.5">
                        <span className="inline-block rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                          {payment.paymentMethod.replace("_", " ")}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-3.5 font-semibold text-lime-400">
                        {formatAmount(payment.amount)}
                      </td>

                      <td className="max-w-48 px-3 py-3.5">
                        <span className="break-all text-xs text-zinc-400">
                          {getMembershipId(payment.membershipId)}
                        </span>
                      </td>

                      <td className="max-w-40 break-words px-3 py-3.5 text-zinc-400">
                        {payment.reference || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="border-t border-zinc-800 py-4 text-center text-xs text-zinc-500">
          FitTrack · Stay consistent. Get stronger.
        </footer>
      </main>
    </div>
  );
}
