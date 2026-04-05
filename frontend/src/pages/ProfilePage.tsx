import { useRef, useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { USER_API_URL } from "@/config";
import { createProtectedImageUrl } from "@/lib/image";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";



export default function ProfilePage() {
  const { user, token, refreshProfile, updateProfile, uploadProfilePhoto } = useAuth();

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
    const [deleteError, setDeleteError] = useState("")
  
    async function handleDeletionOfAccount() {
      if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) {
        return;
      }
      const res = await fetch(`${USER_API_URL}/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })
  
    if (res.ok) {
      navigation("/login")
    } else {
      const json = await res.json()
      setDeleteError(json.error || "Failed to delete account.")
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

      try {
        const objectUrl = await createProtectedImageUrl(user.profilePhotoUrl, token);
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

  /**
   * Immediately uploads the selected photo when the user picks a file.
   * Shows a local preview optimistically while uploading.
   */
  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file) return;

    setError("");
    setSuccess("");

    // Show optimistic preview
    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev);
      return objectUrl;
    });

    // Upload immediately
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

      <main className="mx-auto max-w-3xl px-6 pt-24 pb-12">
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Update your public profile details.
        </p>

        {error && (
          <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading profile...</p>
        ) : (
          <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
            <section className="rounded-xl border border-border/50 p-5">
              <h2 className="text-sm font-medium">Profile Photo</h2>

              <div className="mt-4 flex flex-col items-center gap-3">
                {/* Clickable avatar — opens file picker */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="group relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted text-3xl font-semibold text-muted-foreground transition-opacity focus-visible:ring-2 focus-visible:ring-ring"
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

                  {/* Hover overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                      <circle cx="12" cy="13" r="3"/>
                    </svg>
                    <span className="mt-1 text-xs font-medium">Change</span>
                  </div>

                  {/* Uploading spinner overlay */}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    </div>
                  )}
                </button>

                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                <p className="text-xs text-muted-foreground">
                  {uploading ? "Uploading…" : "Click photo to change"}
                </p>
                <p className="text-[11px] text-muted-foreground/60">
                  JPEG, PNG, or WEBP up to 5MB
                </p>
              </div>
            </section>

            <section className="rounded-xl border border-border/50 p-5">
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="university">University</Label>
                  <Input
                    id="university"
                    value={university}
                    onChange={(event) => setUniversity(event.target.value)}
                    maxLength={120}
                    placeholder="e.g. National University of Singapore"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    maxLength={500}
                    rows={6}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    placeholder="Tell others what topics you're practicing and your interview goals."
                  />
                  <p className="text-xs text-muted-foreground">{bio.length}/500</p>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={saving}>
                  {saving ? "Saving..." : "Save Profile"}
                </Button>
              </form>
            </section>
          </div>
        )}

        {user?.role !== "admin" && user?.role !== "superadmin" && (
          <section className="mt-8 rounded-xl border border-border/50 p-5">
            <h2 className="text-lg font-semibold tracking-tight">
              Request Admin Privileges
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit a short reason for why you should be granted admin access.
            </p>

            <form onSubmit={handleAdminRequestSubmit} className="mt-4 space-y-3">
              <textarea
                value={adminRequestReason}
                onChange={(event) => setAdminRequestReason(event.target.value)}
                rows={4}
                maxLength={500}
                required
                className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                placeholder="Describe your responsibilities and why you need admin access."
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
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
              <h3 className="text-sm font-medium">Request History</h3>
              {adminRequestLoading ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Loading requests...
                </p>
              ) : adminRequests.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No admin requests submitted yet.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {adminRequests.map((request) => (
                    <div
                      key={request.id}
                      className="rounded-lg border border-border/50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleString()}
                        </span>
                        <span
                          className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                            request.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-700"
                              : request.status === "rejected"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-primary/10 text-primary"
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {request.reason}
                      </p>
                      {request.reviewedAt && (
                        <p className="mt-2 text-xs text-muted-foreground">
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
          <section className="mt-8 rounded-xl border border-destructive/30 p-5">
            <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Permanently delete your account. Note that this cannot be undone.
              </p>
          <Button
              variant="destructive"
              className="mt-4"
              onClick={handleDeletionOfAccount}
          >
            Delete Account
          </Button>
          {deleteError && (
            <p className="mt-2 text-sm text-destructive">{deleteError}</p>
          )}
          </section>
      </main>
    </div>
  );
}
