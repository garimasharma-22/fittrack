
import {
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Power,
  Dumbbell,
  ImagePlus,
  X,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";

type Difficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

interface Exercise {
  name: string;
  description: string;
  sets: number;
  repetitions: number;
  durationMinutes: number;
  restSeconds: number;
}

interface WorkoutPlan {
  _id: string;
  name: string;
  description?: string;
  difficulty: Difficulty;
  exercises: Exercise[];
  imageUrl?: string;
  isActive: boolean;
}

interface ApiResponse {
  success: boolean;
  count?: number;
  data: WorkoutPlan[];
}

const emptyExercise = (): Exercise => ({
  name: "",
  description: "",
  sets: 3,
  repetitions: 12,
  durationMinutes: 10,
  restSeconds: 60,
});

const emptyForm = () => ({
  name: "",
  description: "",
  difficulty: "BEGINNER" as Difficulty,
  exercises: [emptyExercise()],
});

const inputClass =
  "w-full rounded-xl border border-zinc-800 bg-[#090b09] px-4 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-lime-400";

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err
  ) {
    const response = (
      err as {
        response?: {
          data?: { message?: string };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  return fallback;
}

export default function WorkoutPlans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const [imageFiles, setImageFiles] = useState<
    Record<string, File | null>
  >({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  async function loadPlans() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<ApiResponse>("/workout-plans");
      setPlans(response.data.data ?? []);
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Unable to load workout plans. Please check your login and backend."
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPlans();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm());
    setSelectedImage(null);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(plan: WorkoutPlan) {
    setEditingId(plan._id);

    setForm({
      name: plan.name,
      description: plan.description ?? "",
      difficulty: plan.difficulty,
      exercises: plan.exercises.map((exercise) => ({
        name: exercise.name,
        description: exercise.description ?? "",
        sets: exercise.sets ?? 3,
        repetitions: exercise.repetitions ?? 12,
        durationMinutes: exercise.durationMinutes ?? 10,
        restSeconds: exercise.restSeconds ?? 60,
      })),
    });

    setSelectedImage(null);
    setError("");
    setNotice("");
    setShowForm(true);
  }

  function updateExercise(
    index: number,
    field: keyof Exercise,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      exercises: previous.exercises.map((exercise, exerciseIndex) =>
        exerciseIndex === index
          ? {
              ...exercise,
              [field]:
                field === "name" || field === "description"
                  ? value
                  : Number(value),
            }
          : exercise
      ),
    }));
  }

  function addExercise() {
    setForm((previous) => ({
      ...previous,
      exercises: [...previous.exercises, emptyExercise()],
    }));
  }

  function removeExercise(index: number) {
    setForm((previous) => ({
      ...previous,
      exercises: previous.exercises.filter(
        (_, exerciseIndex) => exerciseIndex !== index
      ),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.name.trim()) {
      setError("Enter a workout plan name.");
      return;
    }

    if (
      form.exercises.length === 0 ||
      form.exercises.some((exercise) => !exercise.name.trim())
    ) {
      setError("Add at least one exercise and provide its name.");
      return;
    }

    for (const exercise of form.exercises) {
      if (
        !Number.isInteger(exercise.sets) ||
        exercise.sets < 1 ||
        !Number.isInteger(exercise.repetitions) ||
        exercise.repetitions < 1 ||
        !Number.isInteger(exercise.durationMinutes) ||
        exercise.durationMinutes < 1 ||
        !Number.isInteger(exercise.restSeconds) ||
        exercise.restSeconds < 0
      ) {
        setError(
          "Sets, repetitions, duration, and rest must be valid whole numbers."
        );
        return;
      }
    }

    if (
      selectedImage &&
      !["image/jpeg", "image/png", "image/webp"].includes(
        selectedImage.type
      )
    ) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (selectedImage && selectedImage.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        difficulty: form.difficulty,
        exercises: form.exercises.map((exercise) => ({
          name: exercise.name.trim(),
          description: exercise.description.trim(),
          sets: exercise.sets,
          repetitions: exercise.repetitions,
          durationMinutes: exercise.durationMinutes,
          restSeconds: exercise.restSeconds,
        })),
      };

      let savedPlanId = editingId;

      if (editingId) {
        await api.patch(`/workout-plans/${editingId}`, payload);
      } else {
        const response = await api.post("/workout-plans", payload);
        savedPlanId = response.data.data._id;
      }

      if (selectedImage && savedPlanId) {
        const imageData = new FormData();
        imageData.append("workoutImage", selectedImage);

        await api.patch(
          `/workout-plans/${savedPlanId}/image`,
          imageData
        );
      }

      setShowForm(false);
      setForm(emptyForm());
      setSelectedImage(null);
      setEditingId(null);

      setNotice(
        editingId
          ? "Workout plan updated successfully."
          : "Workout plan created successfully."
      );

      await loadPlans();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Could not save the workout plan. Please try again."
        )
      );
    } finally {
      setSaving(false);
    }
  }

  async function deactivatePlan(plan: WorkoutPlan) {
    const confirmed = window.confirm(
      `Deactivate "${plan.name}"? This will not permanently delete its record.`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await api.delete(`/workout-plans/${plan._id}`);

      setNotice(`"${plan.name}" has been deactivated.`);
      await loadPlans();
    } catch (err: unknown) {
      setError(
        getErrorMessage(err, "Could not deactivate this plan.")
      );
    }
  }

  async function uploadPlanImage(plan: WorkoutPlan) {
    const file = imageFiles[plan._id];

    if (!file) {
      setError("Choose an image first.");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The image must be 5 MB or smaller.");
      return;
    }

    const imageData = new FormData();
    imageData.append("workoutImage", file);

    setError("");
    setNotice("");

    try {
      await api.patch(`/workout-plans/${plan._id}/image`, imageData);

      setImageFiles((previous) => ({
        ...previous,
        [plan._id]: null,
      }));

      setNotice(`Image updated for "${plan.name}".`);
      await loadPlans();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          "Image upload failed. Check the backend upload field and file requirements."
        )
      );
    }
  }

  const activeCount = plans.filter((plan) => plan.isActive).length;

  return (
    <main className="min-h-screen bg-[#090b09] px-4 py-6 text-white sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        {/* Shared FitTrack header */}
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
            Admin access
          </div>
        </header>

        {/* Page title and primary action */}
        <section className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-lime-400">
              FitTrack Administration
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Workout Plans
            </h1>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Create and maintain workout programs for your members.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300"
          >
            <Plus size={16} />
            Create Plan
          </button>
        </section>

        {/* Summary cards */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <SummaryCard label="Total plans" value={plans.length} />
          <SummaryCard label="Active plans" value={activeCount} />
          <SummaryCard
            label="Inactive plans"
            value={plans.length - activeCount}
          />
        </section>

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-lime-800 bg-lime-950/40 p-4 text-sm text-lime-300"
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {/* Create/edit form */}
        {showForm && (
          <section className="mb-8 rounded-2xl border border-zinc-800 bg-[#111411] p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Workout Plan" : "Create Workout Plan"}
              </h2>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Plan name">
                  <input
                    required
                    maxLength={150}
                    value={form.name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Full Body Strength"
                    className={inputClass}
                  />
                </Field>

                <Field label="Difficulty">
                  <select
                    value={form.difficulty}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        difficulty: event.target.value as Difficulty,
                      }))
                    }
                    className={inputClass}
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                  </select>
                </Field>
              </div>

              <Field label="Description">
                <textarea
                  maxLength={2000}
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the goal of this workout plan"
                  className={inputClass}
                />
              </Field>

              <div>
                <h3 className="mb-4 text-lg font-semibold text-lime-300">
                  Exercises
                </h3>

                <div className="space-y-4">
                  {form.exercises.map((exercise, index) => (
                    <div
                      key={index}
                      className="rounded-xl border border-zinc-800 bg-[#090b09] p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <h4 className="text-sm font-semibold">
                          Exercise {index + 1}
                        </h4>

                        {form.exercises.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExercise(index)}
                            className="text-sm font-semibold text-red-400 transition hover:text-red-300"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Exercise name">
                          <input
                            required
                            maxLength={150}
                            value={exercise.name}
                            onChange={(event) =>
                              updateExercise(
                                index,
                                "name",
                                event.target.value
                              )
                            }
                            placeholder="Push-ups"
                            className={inputClass}
                          />
                        </Field>

                        <Field label="Exercise description">
                          <input
                            maxLength={1000}
                            value={exercise.description}
                            onChange={(event) =>
                              updateExercise(
                                index,
                                "description",
                                event.target.value
                              )
                            }
                            placeholder="Standard bodyweight push-ups"
                            className={inputClass}
                          />
                        </Field>

                        <NumberField
                          label="Sets"
                          min={1}
                          value={exercise.sets}
                          onChange={(value) =>
                            updateExercise(index, "sets", value)
                          }
                        />

                        <NumberField
                          label="Repetitions"
                          min={1}
                          value={exercise.repetitions}
                          onChange={(value) =>
                            updateExercise(index, "repetitions", value)
                          }
                        />

                        <NumberField
                          label="Duration (minutes)"
                          min={1}
                          value={exercise.durationMinutes}
                          onChange={(value) =>
                            updateExercise(index, "durationMinutes", value)
                          }
                        />

                        <NumberField
                          label="Rest (seconds)"
                          min={0}
                          value={exercise.restSeconds}
                          onChange={(value) =>
                            updateExercise(index, "restSeconds", value)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addExercise}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-lime-300 transition hover:border-lime-500"
                >
                  <Plus size={16} />
                  Add Exercise
                </button>
              </div>

              <Field label="Workout image (optional)">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setSelectedImage(event.target.files?.[0] ?? null)
                  }
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:rounded-xl file:border-0 file:bg-lime-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-black"
                />

                <p className="text-xs text-zinc-500">
                  JPEG, PNG, or WebP; maximum 5 MB.
                </p>
              </Field>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-lime-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && (
                    <LoaderCircle className="animate-spin" size={16} />
                  )}

                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Create Plan"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Workout plan list */}
        <section>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">All Workout Plans</h2>

            <button
              type="button"
              onClick={() => void loadPlans()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:border-lime-400 disabled:opacity-50"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-[#111411] py-12 text-sm text-zinc-400">
              <LoaderCircle className="animate-spin" size={18} />
              Loading workout plans...
            </div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-[#111411] px-5 py-12 text-center">
              <Dumbbell
                className="mx-auto mb-3 text-lime-400"
                size={36}
              />

              <h3 className="text-lg font-semibold">
                No workout plans yet
              </h3>

              <p className="mt-2 text-sm text-zinc-400">
                Create your first plan to get started.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan._id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-[#111411]"
                >
                  {plan.imageUrl ? (
                    <img
                      src={plan.imageUrl}
                      alt={plan.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-gradient-to-br from-lime-950 to-zinc-900">
                      <Dumbbell size={38} className="text-lime-400" />
                    </div>
                  )}

                  <div className="p-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-lime-950 px-3 py-1 text-xs font-semibold text-lime-300">
                        {plan.difficulty}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          plan.isActive
                            ? "bg-emerald-950 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {plan.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold">{plan.name}</h3>

                    <p className="mt-2 min-h-10 text-sm leading-6 text-zinc-400">
                      {plan.description || "No description provided."}
                    </p>

                    <p className="mt-4 text-sm text-zinc-300">
                      <Dumbbell className="mr-2 inline" size={15} />
                      {plan.exercises.length} exercise
                      {plan.exercises.length === 1 ? "" : "s"}
                    </p>

                    <div className="mt-4 space-y-2">
                      {plan.exercises.slice(0, 3).map((exercise, index) => (
                        <div
                          key={`${plan._id}-${index}`}
                          className="flex justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 break-words text-zinc-300">
                            {exercise.name}
                          </span>

                          <span className="shrink-0 text-xs text-zinc-500">
                            {exercise.sets ?? "—"} sets ×{" "}
                            {exercise.repetitions ?? "—"} reps
                          </span>
                        </div>
                      ))}

                      {plan.exercises.length > 3 && (
                        <p className="text-xs text-zinc-500">
                          +{plan.exercises.length - 3} more exercises
                        </p>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
                      <button
                        type="button"
                        onClick={() => openEditForm(plan)}
                        className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm font-semibold transition hover:border-lime-400 hover:text-lime-300"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>

                      {plan.isActive && (
                        <button
                          type="button"
                          onClick={() => void deactivatePlan(plan)}
                          className="inline-flex items-center gap-2 rounded-xl border border-red-900 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-950"
                        >
                          <Power size={14} />
                          Deactivate
                        </button>
                      )}

                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-zinc-800 px-3 py-2 text-sm font-semibold transition hover:border-lime-400">
                        <ImagePlus size={14} />
                        Choose image

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(event) =>
                            setImageFiles((previous) => ({
                              ...previous,
                              [plan._id]:
                                event.target.files?.[0] ?? null,
                            }))
                          }
                        />
                      </label>

                      {imageFiles[plan._id] && (
                        <button
                          type="button"
                          onClick={() => void uploadPlanImage(plan)}
                          className="rounded-xl bg-lime-400 px-3 py-2 text-sm font-semibold text-black transition hover:bg-lime-300"
                        >
                          Upload image
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-sm font-medium text-zinc-300">
      <span className="text-xs font-medium text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

function NumberField({
  label,
  min,
  value,
  onChange,
}: {
  label: string;
  min: number;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        step={1}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </Field>
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
    <div className="rounded-2xl border border-zinc-800 bg-[#111411] p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-lime-300">{value}</p>
    </div>
  );
}
