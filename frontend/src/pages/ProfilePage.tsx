/*
AI Assistance Disclosure:
Tool: ChatGPT, date: 2026-04-11
Scope: Generated and edited profile page updates, including a link to the public profile view.
Author review: I validated correctness, edited for project style and checked page behavior manually.
*/
import { useRef, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { USER_API_URL } from "@/config";
import { createProtectedImageUrl } from "@/lib/image";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";

const presetProfilePhotos = [
  {
    id: "meadow",
    label: "Meadow",
    url: "https://cdn.pixabay.com/photo/2022/05/14/23/13/meadow-7196549_1280.jpg",
  },
  {
    id: "castle",
    label: "Castle",
    url: "https://cdn.pixabay.com/photo/2020/08/23/14/55/castle-5511046_1280.jpg",
  },
  {
    id: "fox",
    label: "Fox",
    url: "https://cdn.pixabay.com/photo/2015/04/10/01/41/fox-715588_1280.jpg",
  },
  {
    id: "art",
    label: "Art",
    url: "https://cdn.pixabay.com/photo/2016/06/25/12/55/art-1478831_1280.jpg",
  },
  {
    id: "winter-tree",
    label: "Tree",
    url: "https://cdn.pixabay.com/photo/2022/11/27/13/22/tree-7619791_1280.jpg",
  },
  {
    id: "bee",
    label: "Bee",
    url: "https://cdn.pixabay.com/photo/2020/05/25/18/35/bee-5219887_1280.jpg",
  },
  {
    id: "cortina",
    label: "Cortina",
    url: "https://cdn.pixabay.com/photo/2025/01/03/06/55/cortina-dampezzo-9307295_1280.jpg",
  },
  {
    id: "singapore",
    label: "City",
    url: "https://cdn.pixabay.com/photo/2017/07/31/06/20/singapore-2556628_1280.jpg",
  },
  {
    id: "skyscrapers",
    label: "Skyscrapers",
    url: "https://cdn.pixabay.com/photo/2018/02/27/06/30/skyscrapers-3184798_1280.jpg",
  },
  {
    id: "paris",
    label: "Paris",
    url: "https://cdn.pixabay.com/photo/2022/10/22/13/41/paris-7539257_1280.jpg",
  },
] as const;

export default function ProfilePage() {
  const { user, token, refreshProfile, updateProfile, uploadProfilePhoto } =
    useAuth();

  const [username, setUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [bio, setBio] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adminRequestLoading, setAdminRequestLoading] = useState(true);
  const [adminRequestSubmitting, setAdminRequestSubmitting] = useState(false);
  const [adminRequestReason, setAdminRequestReason] = useState("");
  const [adminRequests, setAdminRequests] = useState<
    {
      id: string;
      reason: string;
      status: "pending" | "approved" | "rejected";
      reviewedAt: string | null;
      createdAt: string;
    }[]
  >([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const navigation = useNavigate();
  const [deleteError, setDeleteError] = useState("");

  async function handleDeletionOfAccount() {
    if (
      !confirm("Are you sure you want to delete your account? This cannot be undone.")
    ) {
      return;
    }

    const res = await fetch(`${USER_API_URL}/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      navigation("/login");
    } else {
      const json = await res.json();
      setDeleteError(json.error || "Failed to delete account.");
    }
  }

  async function fetchMyAdminRequests() {
    if (!token) {
      return;
    }

    setAdminRequestLoading(true);
    try {
      const res = await fetch(`${USER_API_URL}/admin-requests/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load admin requests");
      }

      setAdminRequests(json.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load admin requests",
      );
    } finally {
      setAdminRequestLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        await refreshProfile();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [refreshProfile]);

  useEffect(() => {
    fetchMyAdminRequests();
  }, [token]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setUsername(user.username);
    setUniversity(user.university || "");
    setBio(user.bio || "");
  }, [user]);

  useEffect(() => {
    let objectUrlToRevoke: string | null = null;
    let cancelled = false;

    async function loadProtectedPhoto() {
      if (!token || !user?.profilePhotoUrl) {
        setPhotoPreview(null);
        return;
      }

      if (!user.profilePhotoUrl.includes("/api/users/")) {
        setPhotoPreview(user.profilePhotoUrl);
        return;
      }

      try {
        const objectUrl = await createProtectedImageUrl(
          user.profilePhotoUrl,
          token,
        );
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }

        objectUrlToRevoke = objectUrl;
        setPhotoPreview(objectUrl);
      } catch {
        if (!cancelled) {
          setPhotoPreview(null);
        }
      }
    }

    loadProtectedPhoto();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [token, user?.profilePhotoUrl]);

  async function handlePresetPhotoSelect(photoUrl: string) {
    setError("");
    setSuccess("");
    setUploading(true);

    try {
      await updateProfile({ profilePhotoUrl: photoUrl });
      setPhotoPreview(photoUrl);
      setSuccess("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set profile photo");
    } finally {
      setUploading(false);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setError("");
    setSuccess("");

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    setUploading(true);
    try {
      await uploadProfilePhoto(file);
      setSuccess("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

  async function handleProfileSave(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await updateProfile({ username, university, bio });
      setSuccess("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleAdminRequestSubmit(event: FormEvent) {
    event.preventDefault();

    if (!token) {
      setError("Not authenticated");
      return;
    }

    setError("");
    setSuccess("");
    setAdminRequestSubmitting(true);

    try {
      const res = await fetch(`${USER_API_URL}/admin-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: adminRequestReason }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to submit admin request");
      }

      setAdminRequestReason("");
      setSuccess("Admin privilege request submitted.");
      await fetchMyAdminRequests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit admin request",
      );
    } finally {
      setAdminRequestSubmitting(false);
    }
  }

  const hasPendingAdminRequest = adminRequests.some(
    (request) => request.status === "pending",
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="relative overflow-hidden px-6 pb-12 pt-24">
        <div className="pointer-events-none absolute inset-x-8 top-14 -z-10 h-[24rem] rounded-[3rem] bg-gradient-to-br from-sky-100 via-white to-emerald-50/80 blur-3xl dark:from-slate-950 dark:via-slate-950 dark:to-slate-900/60" />

        <div className="mx-auto max-w-5xl">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/90 px-3 py-1 text-xs text-sky-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-300" />
              Profile workspace
            </div>

            <div className="mt-6">
              <h1 className="text-4xl font-bold tracking-tight text-slate-950 dark:text-slate-100">
                Profile Settings
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Keep your profile demo-ready with a clear photo, university,
                and short bio so people can understand who you are at a glance.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Role: {user?.role}
                </span>
                {user?.university && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {user.university}
                  </span>
                )}
                {user?.id && (
                  <Link to={`/users/${user.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      View Public Profile
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="mt-6 rounded-2xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-200">
              {success}
            </div>
          )}

          {loading ? (
            <p className="mt-10 text-sm text-muted-foreground">Loading profile...</p>
          ) : (
            <div className="mt-8 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
              <div className="space-y-6">
                <section className="rounded-3xl border border-sky-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="group relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-sky-200/80 bg-white text-3xl font-semibold text-slate-500 shadow-sm transition-opacity focus-visible:ring-2 focus-visible:ring-ring dark:border-slate-700 dark:bg-slate-800"
                    >
                      {photoPreview ? (
                        <img
                          src={photoPreview}
                          alt={`${user?.username || "User"} profile`}
                          className={`h-full w-full object-cover ${uploading ? "opacity-50" : ""}`}
                        />
                      ) : (
                        <span>{user?.username?.[0]?.toUpperCase() || "?"}</span>
                      )}

                      <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-950/55 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                        <span className="mt-1 text-xs font-medium">Change photo</span>
                      </div>

                      {uploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/40">
                          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        </div>
                      )}
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />

                    <p className="mt-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                      {user?.username || "User"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {uploading ? "Uploading..." : "Click the avatar to update it"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      JPEG, PNG, or WEBP up to 5MB
                    </p>
                  </div>

                  <div className="mt-5 text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Quick Picks
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-5">
                      {presetProfilePhotos.map((photo) => {
                        const selected = user?.profilePhotoUrl === photo.url;

                        return (
                          <button
                            key={photo.id}
                            type="button"
                            disabled={uploading}
                            onClick={() => void handlePresetPhotoSelect(photo.url)}
                            className={`overflow-hidden rounded-xl border text-left transition-all ${
                              selected
                                ? "border-sky-400 ring-2 ring-sky-100 dark:border-slate-500 dark:ring-slate-700/70"
                                : "border-slate-200 hover:border-sky-300 dark:border-slate-700 dark:hover:border-slate-600"
                            }`}
                          >
                            <img
                              src={photo.url}
                              alt={photo.label}
                              className="h-14 w-full object-cover"
                            />
                            <div className="bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {photo.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground/70">
                      Upload your own photo or choose a preset image.
                    </p>
                  </div>
                </section>
              </div>

              <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">Public Profile</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Update the details other users will see when they visit your
                    profile.
                  </p>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="university" className="text-sm font-medium">
                      University
                    </Label>
                    <Input
                      id="university"
                      value={university}
                      onChange={(event) => setUniversity(event.target.value)}
                      maxLength={120}
                      placeholder="e.g. National University of Singapore"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-sm font-medium">
                      Bio
                    </Label>
                    <textarea
                      id="bio"
                      value={bio}
                      onChange={(event) => setBio(event.target.value)}
                      maxLength={500}
                      rows={6}
                      className="min-h-40 w-full rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-base outline-none transition-colors focus-visible:border-sky-300 focus-visible:ring-4 focus-visible:ring-sky-100 dark:border-slate-800 dark:bg-slate-950/70 dark:focus-visible:border-sky-800 dark:focus-visible:ring-sky-950/40"
                      placeholder="Tell others what topics you're practicing and your interview goals."
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Make this easy to scan in a quick demo.</span>
                      <span>{bio.length}/500</span>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full sm:w-auto min-w-40"
                    size="lg"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Profile"}
                  </Button>
                </form>
              </section>
                {user?.role !== "admin" && user?.role !== "superadmin" && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">
                      Request Admin Privileges
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Submit a short reason for why you should be granted admin
                      access.
                    </p>

                    <form onSubmit={handleAdminRequestSubmit} className="mt-4 space-y-4">
                      <textarea
                        value={adminRequestReason}
                        onChange={(event) => setAdminRequestReason(event.target.value)}
                        rows={4}
                        maxLength={500}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus-visible:border-slate-300 focus-visible:ring-4 focus-visible:ring-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus-visible:border-slate-600 dark:focus-visible:ring-slate-800/60"
                        placeholder="Describe your responsibilities and why you need admin access."
                      />
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{adminRequestReason.length}/500</span>
                        {hasPendingAdminRequest && (
                          <span>You already have a pending request.</span>
                        )}
                      </div>

                      <Button
                        type="submit"
                        disabled={
                          adminRequestSubmitting ||
                          hasPendingAdminRequest ||
                          !adminRequestReason.trim()
                        }
                      >
                        {adminRequestSubmitting ? "Submitting..." : "Submit Request"}
                      </Button>
                    </form>

                    <div className="mt-6">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Request History
                      </h3>
                      {adminRequestLoading ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          Loading requests...
                        </p>
                      ) : adminRequests.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          No admin requests submitted yet.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {adminRequests.map((request) => (
                            <div
                              key={request.id}
                              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:shadow-none"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(request.createdAt).toLocaleString()}
                                </span>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    request.status === "approved"
                                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                                      : request.status === "rejected"
                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                                        : "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
                                  }`}
                                >
                                  {request.status}
                                </span>
                              </div>
                              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {request.reason}
                              </p>
                              {request.reviewedAt && (
                                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                  Reviewed: {new Date(request.reviewedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                )}

                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
                  <h2 className="text-xl font-semibold text-rose-700 dark:text-rose-300">
                    Danger Zone
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    Permanently delete your account. This cannot be undone, so this
                    section is intentionally separated from the rest of your
                    profile actions.
                  </p>
                  <Button
                    variant="destructive"
                    className="mt-5"
                    onClick={handleDeletionOfAccount}
                  >
                    Delete Account
                  </Button>
                  {deleteError && (
                    <p className="mt-3 text-sm text-destructive">{deleteError}</p>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
