
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import api from "../services/api";

type Member = {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
};

type WorkoutPlan = {
  _id: string;
  name?: string;
  title?: string;
  description?: string;
  isActive?: boolean;
};

type WorkoutAssignment = {
  _id: string;
  memberId?: Member | string;
  workoutPlanId?: WorkoutPlan | string;
  member?: Member;
  workoutPlan?: WorkoutPlan;
  startDate?: string;
  endDate?: string;
  notes?: string;
  status?: string;
  createdAt?: string;
};

type AssignmentForm = {
  memberId: string;
  workoutPlanId: string;
  startDate: string;
  endDate: string;
  notes: string;
};

type ApiResponse<T> = {
  success?: boolean;
  count?: number;
  data?: T;
  message?: string;
};

const initialForm: AssignmentForm = {
  memberId: "",
  workoutPlanId: "",
  startDate: "",
  endDate: "",
  notes: "",
};

const cardClass =
  "rounded-2xl border border-zinc-800 bg-[#111411] p-5";

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-lime-400 focus:ring-1 focus:ring-lime-400 disabled:cursor-not-allowed disabled:opacity-50";

const labelClass =
  "mb-1.5 block text-xs font-medium text-zinc-400";

const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

const primaryButtonClass =
  `${buttonClass} bg-lime-400 text-zinc-950 hover:bg-lime-300`;

const secondaryButtonClass =
  `${buttonClass} border border-zinc-800 bg-[#111411] text-zinc-200 hover:bg-zinc-900`;

function getErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        message?: string;
        errors?: Array<{ message?: string }>;
      };
    };
    message?: string;
  };

  return (
    err.response?.data?.message ||
    err.response?.data?.errors?.[0]?.message ||
    err.message ||
    "Something went wrong. Please try again."
  );
}

function unwrapArray<T>(response: {
  data: ApiResponse<T[]> | T[];
}): T[] {
  const body = response.data;

  if (Array.isArray(body)) return body;

  return Array.isArray(body?.data) ? body.data : [];
}

function getMemberName(member?: Member | string): string {
  if (!member) return "Unknown member";

  if (typeof member === "string") return member;

  return (
    member.name ||
    [member.firstName, member.lastName].filter(Boolean).join(" ") ||
    member.email ||
    member._id
  );
}

function getPlanName(plan?: WorkoutPlan | string): string {
  if (!plan) return "Unknown workout";

  if (typeof plan === "string") return plan;

  return plan.name || plan.title || plan._id;
}

function getStatus(assignment: WorkoutAssignment): string {
  return (assignment.status || "ACTIVE").toUpperCase();
}

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

function getDateInputValue(value?: string): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getMemberId(assignment: WorkoutAssignment): string {
  if (typeof assignment.memberId === "string") {
    return assignment.memberId;
  }

  return assignment.memberId?._id || assignment.member?._id || "";
}

function getWorkoutPlanId(assignment: WorkoutAssignment): string {
  if (typeof assignment.workoutPlanId === "string") {
    return assignment.workoutPlanId;
  }

  return (
    assignment.workoutPlanId?._id ||
    assignment.workoutPlan?._id ||
    ""
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "ACTIVE"
      ? "border-lime-500/30 bg-lime-400/10 text-lime-300"
      : status === "COMPLETED"
        ? "border-sky-500/30 bg-sky-400/10 text-sky-300"
        : ["CANCELLED", "INACTIVE"].includes(status)
          ? "border-red-500/30 bg-red-400/10 text-red-300"
          : "border-zinc-700 bg-zinc-800 text-zinc-300";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {status}
    </span>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className={cardClass}>
      <p className="text-xs font-medium text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-lime-400">{value}</p>
    </div>
  );
}

export default function WorkoutAssignments() {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);

  const [form, setForm] = useState<AssignmentForm>(initialForm);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      api.get("/workout-assignments"),
      api.get("/users"),
      api.get("/workout-plans"),
    ]);

    if (results[0].status === "fulfilled") {
      setAssignments(
        unwrapArray<WorkoutAssignment>(results[0].value),
      );
    } else {
      setError(getErrorMessage(results[0].reason));
    }

    if (results[1].status === "fulfilled") {
      setMembers(unwrapArray<Member>(results[1].value));
    }

    if (results[2].status === "fulfilled") {
      setWorkoutPlans(unwrapArray<WorkoutPlan>(results[2].value));
    }

    const failed = results.some(
      (result) => result.status === "rejected",
    );

    if (failed && results[0].status === "fulfilled") {
      const messages = results
        .map((result) =>
          result.status === "rejected"
            ? getErrorMessage(result.reason)
            : "",
        )
        .filter(Boolean);

      if (messages.length > 0) {
        setError(messages.join(" "));
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const memberName = getMemberName(
        assignment.member || assignment.memberId,
      );

      const planName = getPlanName(
        assignment.workoutPlan || assignment.workoutPlanId,
      );

      const matchesSearch =
        !query ||
        memberName.toLowerCase().includes(query) ||
        planName.toLowerCase().includes(query) ||
        (assignment.notes || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "ALL" ||
        getStatus(assignment) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assignments, search, statusFilter]);

  const activeCount = assignments.filter(
    (item) => getStatus(item) === "ACTIVE",
  ).length;

  const completedCount = assignments.filter(
    (item) => getStatus(item) === "COMPLETED",
  ).length;

  const cancelledCount = assignments.filter((item) =>
    ["CANCELLED", "INACTIVE"].includes(getStatus(item)),
  ).length;

  function handleFormChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setError("");
    setSuccess("");
  }

  function startEditing(assignment: WorkoutAssignment) {
    setEditingId(assignment._id);

    setForm({
      memberId: getMemberId(assignment),
      workoutPlanId: getWorkoutPlanId(assignment),
      startDate: getDateInputValue(assignment.startDate),
      endDate: getDateInputValue(assignment.endDate),
      notes: assignment.notes || "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!editingId && !form.memberId) {
      setError("Please select a member.");
      return;
    }

    if (!editingId && !form.workoutPlanId) {
      setError("Please select a workout plan.");
      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) < new Date(form.startDate)
    ) {
      setError("The end date cannot be earlier than the start date.");
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.patch(`/workout-assignments/${editingId}`, {
          endDate: form.endDate || undefined,
          notes: form.notes.trim(),
        });

        setSuccess("Workout assignment updated successfully.");
      } else {
        await api.post("/workout-assignments", {
          memberId: form.memberId,
          workoutPlanId: form.workoutPlanId,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          notes: form.notes.trim(),
        });

        setSuccess("Workout assigned successfully.");
      }

      setForm(initialForm);
      setEditingId(null);

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    assignment: WorkoutAssignment,
    status: string,
  ) {
    setError("");
    setSuccess("");
    setUpdatingId(assignment._id);

    try {
      await api.patch(
        `/workout-assignments/${assignment._id}`,
        { status },
      );

      setSuccess(
        `Assignment status changed to ${status.toLowerCase()}.`,
      );

      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#090b09] text-zinc-100">
      <header className="h-[66px] border-b border-zinc-800 bg-[#090b09]">
        <div className="flex h-full items-center justify-between px-5 sm:px-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-3 text-base font-medium text-zinc-200 transition hover:text-white"
          >
            <ArrowLeft size={22} strokeWidth={2} />
            <span>Back to Dashboard</span>
          </Link>

          <div className="inline-flex items-center gap-3 text-base text-zinc-400">
            <ShieldCheck
              size={23}
              strokeWidth={2}
              className="text-lime-400"
            />
            <span>Admin access</span>
          </div>
        </div>
      </header>

      <main className="w-full space-y-6 px-[30px] py-10 sm:px-[38px] sm:py-14">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-lime-400">
              Workouts
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Workout Assignments
            </h1>

            <p className="mt-3 max-w-3xl text-base leading-7 text-zinc-400">
              Assign workout plans to members and manage their training
              schedules.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className={secondaryButtonClass}
          >
            Refresh
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-lime-500/30 bg-lime-400/10 px-4 py-3 text-sm text-lime-300"
          >
            {success}
          </div>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Assignments"
            value={assignments.length}
          />
          <SummaryCard label="Active" value={activeCount} />
          <SummaryCard label="Completed" value={completedCount} />
          <SummaryCard label="Cancelled" value={cancelledCount} />
        </section>

        <section className={cardClass}>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? "Edit Assignment" : "Assign a Workout"}
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              {editingId
                ? "Update the assignment details below."
                : "Choose a member and workout plan to create an assignment."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="memberId" className={labelClass}>
                  Member
                </label>

                <select
                  id="memberId"
                  name="memberId"
                  value={form.memberId}
                  onChange={handleFormChange}
                  className={inputClass}
                  required={!editingId}
                  disabled={Boolean(editingId) || saving}
                >
                  <option value="">Select a member</option>

                  {members
                    .filter((member) =>
                      ["MEMBER", "USER"].includes(
                        (member.role || "MEMBER").toUpperCase(),
                      ),
                    )
                    .map((member) => (
                      <option key={member._id} value={member._id}>
                        {getMemberName(member)}
                        {member.email ? ` (${member.email})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label htmlFor="workoutPlanId" className={labelClass}>
                  Workout Plan
                </label>

                <select
                  id="workoutPlanId"
                  name="workoutPlanId"
                  value={form.workoutPlanId}
                  onChange={handleFormChange}
                  className={inputClass}
                  required={!editingId}
                  disabled={Boolean(editingId) || saving}
                >
                  <option value="">Select a workout plan</option>

                  {workoutPlans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {getPlanName(plan)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="startDate" className={labelClass}>
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={handleFormChange}
                  className={inputClass}
                  disabled={Boolean(editingId) || saving}
                />
              </div>

              <div>
                <label htmlFor="endDate" className={labelClass}>
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={handleFormChange}
                  className={inputClass}
                  disabled={saving}
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="notes" className={labelClass}>
                  Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleFormChange}
                  rows={3}
                  maxLength={1000}
                  placeholder="Add training instructions or notes..."
                  className={`${inputClass} resize-y`}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className={primaryButtonClass}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Assign Workout"}
              </button>

              {(editingId ||
                form.memberId ||
                form.workoutPlanId) && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className={secondaryButtonClass}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className={cardClass}>
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-white">
              All Assignments
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Search, filter, and manage existing workout assignments.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="assignmentSearch" className={labelClass}>
                Search
              </label>

              <input
                id="assignmentSearch"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search member, plan, or notes..."
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="statusFilter" className={labelClass}>
                Filter by Status
              </label>

              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">
              Loading workout assignments...
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-12 text-center">
              <p className="text-sm font-medium text-zinc-300">
                No assignments found
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Change your search or filter, or create an assignment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                    <th className="px-3 py-3 font-medium">Member</th>
                    <th className="px-3 py-3 font-medium">Workout Plan</th>
                    <th className="px-3 py-3 font-medium">Start Date</th>
                    <th className="px-3 py-3 font-medium">End Date</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Notes</th>
                    <th className="px-3 py-3 font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800/80">
                  {filteredAssignments.map((assignment) => {
                    const status = getStatus(assignment);

                    return (
                      <tr
                        key={assignment._id}
                        className="transition hover:bg-zinc-900/60"
                      >
                        <td className="px-3 py-4 font-medium text-zinc-200">
                          {getMemberName(
                            assignment.member || assignment.memberId,
                          )}
                        </td>

                        <td className="px-3 py-4 text-zinc-300">
                          {getPlanName(
                            assignment.workoutPlan ||
                              assignment.workoutPlanId,
                          )}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-zinc-400">
                          {formatDate(assignment.startDate)}
                        </td>

                        <td className="whitespace-nowrap px-3 py-4 text-zinc-400">
                          {formatDate(assignment.endDate)}
                        </td>

                        <td className="px-3 py-4">
                          <StatusBadge status={status} />
                        </td>

                        <td className="max-w-48 px-3 py-4 text-zinc-400">
                          <span className="line-clamp-2">
                            {assignment.notes || "—"}
                          </span>
                        </td>

                        <td className="px-3 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEditing(assignment)}
                              className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-lime-400 hover:text-lime-300"
                            >
                              Edit
                            </button>

                            {status === "ACTIVE" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void updateStatus(
                                      assignment,
                                      "COMPLETED",
                                    )
                                  }
                                  disabled={updatingId === assignment._id}
                                  className="rounded-lg border border-lime-500/30 px-2.5 py-1.5 text-xs font-semibold text-lime-300 transition hover:bg-lime-400/10 disabled:opacity-50"
                                >
                                  Complete
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void updateStatus(
                                      assignment,
                                      "CANCELLED",
                                    )
                                  }
                                  disabled={updatingId === assignment._id}
                                  className="rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-400/10 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {updatingId === assignment._id && (
                              <span className="text-xs text-zinc-500">
                                Updating...
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Showing {filteredAssignments.length} of {assignments.length}{" "}
            assignments
          </div>
        </section>
      </main>
    </div>
  );
}
