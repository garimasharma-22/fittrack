
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  History,
  RefreshCw,
  Save,
  ShieldCheck,
  Target,
} from "lucide-react";
import api from "../services/api";

// ============================================================
// TYPES
// ============================================================

interface WorkoutExercise {
  name: string;
  description?: string;
  sets: number;
  repetitions: number;
  durationMinutes: number;
  restSeconds: number;
}

interface WorkoutPlan {
  _id: string;
  name: string;
  description?: string;
  difficulty: string;
  exercises: WorkoutExercise[];
  isActive: boolean;
}

interface WorkoutAssignment {
  _id: string;
  workoutPlanId: WorkoutPlan | string | null;
  startDate: string;
  endDate?: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  notes?: string;
  createdAt: string;
}

interface AssignmentsResponse {
  success: boolean;
  count: number;
  data: WorkoutAssignment[];
}

interface CompletedExercise {
  exerciseName: string;
  completedSets?: number;
  repetitions?: number;
  weightKg?: number;
  durationMinutes?: number;
  notes?: string;
}

interface WorkoutProgressRecord {
  _id: string;
  assignmentId: string | { _id: string; workoutPlanId?: string };
  workoutPlanId: WorkoutPlan | string | null;
  completedAt: string;
  exercises: CompletedExercise[];
  overallNotes?: string;
  createdAt?: string;
}

interface ProgressResponse {
  success: boolean;
  count: number;
  data: WorkoutProgressRecord[];
}

// ============================================================
// HELPERS
// ============================================================

function formatDate(date?: string): string {
  if (!date) return "Not specified";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not specified";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function getWorkoutPlan(
  plan: WorkoutPlan | string | null | undefined
): WorkoutPlan | null {
  return plan && typeof plan === "object" ? plan : null;
}

function getPlanName(
  plan: WorkoutPlan | string | null | undefined
): string {
  return getWorkoutPlan(plan)?.name ?? "Workout plan";
}

const statusStyles: Record<WorkoutAssignment["status"], string> = {
  ACTIVE: "border-lime-400/30 bg-lime-400/10 text-lime-300",
  COMPLETED: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  CANCELLED: "border-red-400/30 bg-red-400/10 text-red-300",
};

// ============================================================
// MAIN PAGE
// ============================================================

export default function MyWorkouts() {
  const [assignments, setAssignments] = useState<WorkoutAssignment[]>([]);
  const [progressRecords, setProgressRecords] = useState<
    WorkoutProgressRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [workoutError, setWorkoutError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [savingAssignment, setSavingAssignment] = useState<string | null>(
    null
  );

  // ----------------------------------------------------------
  // LOAD ASSIGNMENTS
  // ----------------------------------------------------------

  async function loadWorkouts() {
    setWorkoutError("");

    try {
      const response = await api.get<AssignmentsResponse>(
        "/workout-assignments"
      );

      setAssignments(
        Array.isArray(response.data.data) ? response.data.data : []
      );
    } catch (error: unknown) {
      console.error("Unable to load workout assignments:", error);
      setWorkoutError("Unable to load your workouts. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ----------------------------------------------------------
  // LOAD PROGRESS HISTORY
  // ----------------------------------------------------------

  async function loadProgress() {
    setProgressError("");

    try {
      const response = await api.get<ProgressResponse>("/workout-progress");

      setProgressRecords(
        Array.isArray(response.data.data) ? response.data.data : []
      );
    } catch (error: unknown) {
      console.error("Unable to load workout history:", error);
      setProgressError(
        "Unable to load workout history. Your assigned workouts are still available."
      );
    } finally {
      setProgressLoading(false);
    }
  }

  // ----------------------------------------------------------
  // INITIAL LOAD
  // ----------------------------------------------------------

  useEffect(() => {
    void loadWorkouts();
    void loadProgress();
  }, []);

  // ----------------------------------------------------------
  // REFRESH
  // ----------------------------------------------------------

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await Promise.all([loadWorkouts(), loadProgress()]);
    } finally {
      setRefreshing(false);
    }
  }

  // ----------------------------------------------------------
  // RECORD A COMPLETED WORKOUT
  // ----------------------------------------------------------

  async function handleRecordWorkout(
    event: FormEvent<HTMLFormElement>,
    assignment: WorkoutAssignment
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const plan = getWorkoutPlan(assignment.workoutPlanId);

    setSubmitError("");
    setSuccessMessage("");

    if (!assignment._id) {
      setSubmitError("The workout assignment ID is missing.");
      return;
    }

    if (!plan) {
      setSubmitError(
        "Workout plan details are unavailable. Please refresh the page."
      );
      return;
    }

    if (assignment.status !== "ACTIVE") {
      setSubmitError(
        "Only active workout assignments can record workouts."
      );
      return;
    }

    try {
      const exercises: CompletedExercise[] = [];

      plan.exercises.forEach((exercise, index) => {
        if (!formData.has(`completed-${index}`)) {
          return;
        }

        const setsText = String(
          formData.get(`sets-${index}`) ?? ""
        ).trim();

        const repetitionsText = String(
          formData.get(`repetitions-${index}`) ?? ""
        ).trim();

        const completedSets = Number(setsText);
        const repetitions = Number(repetitionsText);

        if (
          setsText === "" ||
          !Number.isInteger(completedSets) ||
          completedSets < 0
        ) {
          throw new Error(
            `Enter a valid number of completed sets for ${exercise.name}.`
          );
        }

        if (
          repetitionsText === "" ||
          !Number.isInteger(repetitions) ||
          repetitions < 0
        ) {
          throw new Error(
            `Enter a valid number of repetitions for ${exercise.name}.`
          );
        }

        const weightText = String(
          formData.get(`weight-${index}`) ?? ""
        ).trim();

        const durationText = String(
          formData.get(`duration-${index}`) ?? ""
        ).trim();

        const weightKg =
          weightText === "" ? undefined : Number(weightText);

        const durationMinutes =
          durationText === "" ? undefined : Number(durationText);

        if (
          weightKg !== undefined &&
          (!Number.isFinite(weightKg) || weightKg < 0)
        ) {
          throw new Error(
            `Enter a valid non-negative weight for ${exercise.name}.`
          );
        }

        if (
          durationMinutes !== undefined &&
          (!Number.isFinite(durationMinutes) || durationMinutes < 0)
        ) {
          throw new Error(
            `Enter a valid non-negative duration for ${exercise.name}.`
          );
        }

        const notes = String(
          formData.get(`exerciseNotes-${index}`) ?? ""
        ).trim();

        exercises.push({
          exerciseName: exercise.name,
          completedSets,
          repetitions,
          ...(weightKg !== undefined ? { weightKg } : {}),
          ...(durationMinutes !== undefined ? { durationMinutes } : {}),
          ...(notes ? { notes } : {}),
        });
      });

      if (exercises.length === 0) {
        throw new Error("Select at least one exercise that you completed.");
      }

      const overallNotes = String(
        formData.get("overallNotes") ?? ""
      ).trim();

      if (overallNotes.length > 2000) {
        throw new Error("Session notes cannot exceed 2000 characters.");
      }

      setSavingAssignment(assignment._id);

      await api.post("/workout-progress", {
        assignmentId: assignment._id,
        exercises,
        ...(overallNotes ? { overallNotes } : {}),
      });

      setSuccessMessage(
        `Your workout for "${plan.name}" was saved successfully.`
      );

      form.reset();
      await loadProgress();
    } catch (error: unknown) {
      console.error("Failed to save workout progress:", error);

      setSubmitError(
        error instanceof Error
          ? error.message
          : "Unable to save workout progress. Please try again."
      );
    } finally {
      setSavingAssignment(null);
    }
  }

  // ----------------------------------------------------------
  // SUMMARY COUNTS
  // ----------------------------------------------------------

  const activeCount = assignments.filter(
    (assignment) => assignment.status === "ACTIVE"
  ).length;

  const totalSessions = progressRecords.length;

  const totalExercisesCompleted = progressRecords.reduce(
    (total, record) => total + (record.exercises?.length ?? 0),
    0
  );

  // ----------------------------------------------------------
  // RENDER PAGE
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#090b09] text-white">
      {/* SHARED FITTRACK HEADER */}
      <header className="flex min-h-[66px] items-center justify-between gap-4 border-b border-zinc-800 px-4 sm:px-6 lg:px-8">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-3 text-sm font-medium text-zinc-200 transition hover:text-lime-400"
        >
          <ArrowLeft size={21} />
          <span>Back to Dashboard</span>
        </Link>

        <div className="inline-flex shrink-0 items-center gap-2 text-sm text-zinc-300">
          <ShieldCheck size={21} className="text-lime-400" />
          <span>Admin access</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* PAGE TITLE */}
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-lime-400">
              <Dumbbell size={15} />
              FitTrack / Workouts
            </p>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              My Workouts
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              View assigned workouts, record completed exercises, and track
              your workout history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-zinc-800 bg-[#111411] px-4 py-2.5 text-sm font-semibold text-white transition hover:border-lime-400/40 hover:text-lime-400 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "animate-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* SUCCESS MESSAGE */}
        {successMessage && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-xl border border-lime-400/30 bg-lime-400/10 p-3 text-sm text-lime-200"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p className="flex-1">{successMessage}</p>
            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
              className="text-lime-200 hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        {/* SUBMISSION ERROR */}
        {submitError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
          >
            <p>{submitError}</p>
            <button
              type="button"
              onClick={() => setSubmitError("")}
              className="mt-2 text-xs font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={<Dumbbell size={20} />}
            label="Total assignments"
            value={assignments.length}
          />

          <SummaryCard
            icon={<Activity size={20} />}
            label="Active workouts"
            value={activeCount}
          />

          <SummaryCard
            icon={<CheckCircle2 size={20} />}
            label="Recorded sessions"
            value={totalSessions}
          />

          <SummaryCard
            icon={<Target size={20} />}
            label="Exercises completed"
            value={totalExercisesCompleted}
          />
        </div>

        {/* ASSIGNED WORKOUTS */}
        <section className="mb-9">
          <SectionHeading
            icon={<Dumbbell size={20} />}
            title="Assigned workouts"
            description="Your workout plans and assigned exercises."
          />

          {loading ? (
            <LoadingMessage message="Loading your workouts..." />
          ) : workoutError ? (
            <ErrorMessage
              message={workoutError}
              onRetry={() => void loadWorkouts()}
            />
          ) : assignments.length === 0 ? (
            <EmptyState
              icon={<Dumbbell size={27} />}
              title="No workouts assigned yet"
              description="Your workout plans will appear here when an administrator assigns them to you."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {assignments.map((assignment) => {
                const plan = getWorkoutPlan(assignment.workoutPlanId);

                return (
                  <article
                    key={assignment._id}
                    className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111411]"
                  >
                    {/* ASSIGNMENT DETAILS */}
                    <div className="border-b border-zinc-800 p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">
                            <Dumbbell size={21} />
                          </div>

                          <div className="min-w-0">
                            <h3 className="break-words text-lg font-semibold text-white">
                              {getPlanName(assignment.workoutPlanId)}
                            </h3>
                            <p className="mt-1 text-xs text-zinc-400">
                              {plan?.difficulty ?? "Difficulty not specified"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[assignment.status]}`}
                        >
                          {assignment.status}
                        </span>
                      </div>

                      {plan?.description && (
                        <p className="mt-3 text-sm leading-6 text-zinc-400">
                          {plan.description}
                        </p>
                      )}

                      <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <DateDetail
                          label="Start date"
                          date={assignment.startDate}
                        />
                        <DateDetail
                          label="End date"
                          date={assignment.endDate}
                        />
                      </div>

                      {assignment.notes && (
                        <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0b0d0b] p-3">
                          <p className="text-xs font-medium text-zinc-500">
                            Assignment notes
                          </p>
                          <p className="mt-1 text-sm leading-5 text-zinc-300">
                            {assignment.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* PLANNED EXERCISES */}
                    <div className="p-4 sm:p-5">
                      <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Target size={17} className="text-lime-400" />
                        Exercises in this plan
                      </h4>

                      {!plan ? (
                        <p className="text-sm text-zinc-400">
                          Workout plan details are unavailable. Try refreshing
                          the page.
                        </p>
                      ) : plan.exercises.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                          No exercises have been added to this plan.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {plan.exercises.map((exercise, index) => (
                            <div
                              key={`${exercise.name}-${index}`}
                              className="rounded-xl border border-zinc-800 bg-[#0b0d0b] p-3"
                            >
                              <div className="flex items-start gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-lime-400/10 text-xs font-semibold text-lime-400">
                                  {index + 1}
                                </span>

                                <div className="min-w-0 flex-1">
                                  <h5 className="text-sm font-semibold text-white">
                                    {exercise.name}
                                  </h5>

                                  {exercise.description && (
                                    <p className="mt-1 text-sm leading-5 text-zinc-400">
                                      {exercise.description}
                                    </p>
                                  )}

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <DetailChip
                                      label={`${exercise.sets} sets`}
                                    />
                                    <DetailChip
                                      label={`${exercise.repetitions} reps`}
                                    />
                                    {exercise.durationMinutes > 0 && (
                                      <DetailChip
                                        label={`${exercise.durationMinutes} min`}
                                      />
                                    )}
                                    {exercise.restSeconds > 0 && (
                                      <DetailChip
                                        label={`${exercise.restSeconds}s rest`}
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* RECORD WORKOUT FORM */}
                    {assignment.status === "ACTIVE" && plan && (
                      <div className="border-t border-zinc-800 bg-[#0d100d] p-4 sm:p-5">
                        <div className="mb-4">
                          <h4 className="flex items-center gap-2 text-base font-semibold text-white">
                            <CheckCircle2
                              size={18}
                              className="text-lime-400"
                            />
                            Record your workout
                          </h4>
                          <p className="mt-1 text-sm leading-5 text-zinc-400">
                            Select the exercises you completed and enter your
                            actual training details.
                          </p>
                        </div>

                        {plan.exercises.length === 0 ? (
                          <p className="text-sm text-zinc-400">
                            This plan has no exercises to record.
                          </p>
                        ) : (
                          <form
                            onSubmit={(event) =>
                              void handleRecordWorkout(event, assignment)
                            }
                            className="space-y-3"
                          >
                            {plan.exercises.map((exercise, index) => (
                              <div
                                key={`${exercise.name}-record-${index}`}
                                className="rounded-xl border border-zinc-800 bg-[#111411] p-3"
                              >
                                <label className="flex cursor-pointer items-start gap-3">
                                  <input
                                    type="checkbox"
                                    name={`completed-${index}`}
                                    className="mt-1 h-4 w-4 accent-lime-400"
                                  />
                                  <span>
                                    <span className="block text-sm font-semibold text-white">
                                      {exercise.name}
                                    </span>
                                    <span className="mt-1 block text-xs text-zinc-500">
                                      Planned: {exercise.sets} sets ×{" "}
                                      {exercise.repetitions} reps
                                    </span>
                                  </span>
                                </label>

                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <FormField
                                    label="Sets completed"
                                    name={`sets-${index}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    defaultValue={String(exercise.sets)}
                                    required
                                  />

                                  <FormField
                                    label="Repetitions completed"
                                    name={`repetitions-${index}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    defaultValue={String(exercise.repetitions)}
                                    required
                                  />

                                  <FormField
                                    label="Weight in kg (optional)"
                                    name={`weight-${index}`}
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="e.g. 20"
                                  />

                                  <FormField
                                    label="Duration in minutes (optional)"
                                    name={`duration-${index}`}
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="e.g. 15"
                                  />
                                </div>

                                <div className="mt-3">
                                  <label
                                    htmlFor={`exerciseNotes-${assignment._id}-${index}`}
                                    className="mb-1.5 block text-xs font-medium text-zinc-400"
                                  >
                                    Exercise notes (optional)
                                  </label>
                                  <input
                                    id={`exerciseNotes-${assignment._id}-${index}`}
                                    name={`exerciseNotes-${index}`}
                                    type="text"
                                    maxLength={1000}
                                    placeholder="Add a note about this exercise"
                                    className="w-full rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400/60"
                                  />
                                </div>
                              </div>
                            ))}

                            <div>
                              <label
                                htmlFor={`overallNotes-${assignment._id}`}
                                className="mb-1.5 block text-xs font-medium text-zinc-400"
                              >
                                Session notes (optional)
                              </label>
                              <textarea
                                id={`overallNotes-${assignment._id}`}
                                name="overallNotes"
                                rows={3}
                                maxLength={2000}
                                placeholder="How did your workout go?"
                                className="w-full resize-y rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400/60"
                              />
                              <p className="mt-1 text-right text-xs text-zinc-500">
                                Maximum 2000 characters
                              </p>
                            </div>

                            <button
                              type="submit"
                              disabled={savingAssignment !== null}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Save size={16} />
                              {savingAssignment === assignment._id
                                ? "Saving workout..."
                                : "Save completed workout"}
                            </button>
                          </form>
                        )}
                      </div>
                    )}

                    {/* NON-ACTIVE ASSIGNMENTS */}
                    {assignment.status !== "ACTIVE" && (
                      <div className="border-t border-zinc-800 bg-[#0d100d] px-4 py-3 sm:px-5">
                        <p className="text-sm leading-5 text-zinc-400">
                          {assignment.status === "COMPLETED"
                            ? "This assignment is marked completed. Its saved progress is shown in your workout history."
                            : "This assignment is cancelled and cannot be used to record a workout."}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* WORKOUT HISTORY */}
        <section>
          <SectionHeading
            icon={<History size={20} />}
            title="Workout progress history"
            description="Review recorded sessions and completed exercises."
          />

          {progressLoading ? (
            <LoadingMessage message="Loading workout history..." />
          ) : progressError ? (
            <ErrorMessage
              message={progressError}
              onRetry={() => void loadProgress()}
            />
          ) : progressRecords.length === 0 ? (
            <EmptyState
              icon={<Activity size={27} />}
              title="No workout sessions recorded"
              description="Record a completed workout above. Your saved sessions will appear here."
            />
          ) : (
            <div className="space-y-4">
              {progressRecords.map((record) => (
                <article
                  key={record._id}
                  className="rounded-2xl border border-zinc-800 bg-[#111411] p-4 sm:p-5"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="flex items-start gap-3">
                      <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">
                        <CheckCircle2 size={20} />
                      </div>

                      <div>
                        <h3 className="text-base font-semibold text-white">
                          {getPlanName(record.workoutPlanId)}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-400">
                          <span className="flex items-center gap-1.5">
                            <CalendarDays size={14} />
                            {formatDate(record.completedAt)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Target size={14} />
                            {record.exercises?.length ?? 0} exercises
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-lime-400/20 bg-lime-400/10 px-3 py-1 text-xs font-semibold text-lime-300">
                      <CheckCircle2 size={13} />
                      Recorded
                    </span>
                  </div>

                  {record.exercises && record.exercises.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {record.exercises.map((exercise, index) => (
                        <div
                          key={`${record._id}-${exercise.exerciseName}-${index}`}
                          className="rounded-xl border border-zinc-800 bg-[#0b0d0b] p-3"
                        >
                          <h4 className="text-sm font-semibold text-white">
                            {exercise.exerciseName}
                          </h4>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {exercise.completedSets !== undefined && (
                              <DetailChip
                                label={`${exercise.completedSets} sets`}
                              />
                            )}
                            {exercise.repetitions !== undefined && (
                              <DetailChip
                                label={`${exercise.repetitions} reps`}
                              />
                            )}
                            {exercise.weightKg !== undefined && (
                              <DetailChip label={`${exercise.weightKg} kg`} />
                            )}
                            {exercise.durationMinutes !== undefined && (
                              <DetailChip
                                label={`${exercise.durationMinutes} min`}
                              />
                            )}
                          </div>

                          {exercise.notes && (
                            <p className="mt-3 text-sm leading-5 text-zinc-400">
                              {exercise.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {record.overallNotes && (
                    <div className="mt-4 rounded-xl border border-zinc-800 bg-[#0b0d0b] p-3">
                      <p className="text-xs font-medium text-zinc-500">
                        Session notes
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-zinc-300">
                        {record.overallNotes}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* INFORMATION */}
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-zinc-800 bg-[#111411] p-4">
          <Clock size={17} className="mt-0.5 shrink-0 text-lime-400" />
          <p className="text-sm leading-5 text-zinc-400">
            Your history displays sessions saved successfully to your account.
            Saving a session does not automatically change an assignment&apos;s
            status; that is handled separately by the backend.
          </p>
        </div>
      </main>
    </div>
  );
}

// ============================================================
// SECTION HEADING
// ============================================================

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-[#111411] p-4 transition hover:border-lime-400/30 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">{label}</p>
        <div className="rounded-xl bg-lime-400/10 p-2.5 text-lime-400">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-lime-300">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  label,
  name,
  type,
  min,
  step,
  defaultValue,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  type: string;
  min?: string;
  step?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-xs font-medium text-zinc-400"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        min={min}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-zinc-800 bg-[#090b09] px-3 py-2 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400/60"
      />
    </div>
  );
}

// ============================================================
// DATE DETAIL
// ============================================================

function DateDetail({
  label,
  date,
}: {
  label: string;
  date?: string;
}) {
  return (
    <div className="flex items-start gap-2 text-sm text-zinc-300">
      <CalendarDays
        size={16}
        className="mt-0.5 shrink-0 text-lime-400"
      />
      <div>
        <p className="text-xs text-zinc-500">{label}</p>
        <p className="mt-1 text-sm">{formatDate(date)}</p>
      </div>
    </div>
  );
}

// ============================================================
// DETAIL CHIP
// ============================================================

function DetailChip({ label }: { label: string }) {
  return (
    <span className="rounded-lg border border-zinc-800 bg-[#090b09] px-2.5 py-1 text-xs text-zinc-300">
      {label}
    </span>
  );
}

// ============================================================
// LOADING MESSAGE
// ============================================================

function LoadingMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-[#111411] px-4 py-10 text-sm text-zinc-400">
      <RefreshCw size={18} className="animate-spin text-lime-400" />
      <p>{message}</p>
    </div>
  );
}

// ============================================================
// ERROR MESSAGE
// ============================================================

function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-7 text-center"
    >
      <p className="text-sm text-red-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-xl border border-zinc-800 px-4 py-2 text-sm font-semibold text-white transition hover:border-lime-400/40 hover:text-lime-300"
      >
        Try again
      </button>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#111411] px-5 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-lime-400/10 text-lime-400">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-5 text-zinc-400">
        {description}
      </p>
    </div>
  );
}
