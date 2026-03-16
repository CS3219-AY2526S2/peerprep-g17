import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function createProtectedImageUrl(
  photoUrl: string,
  token: string,
): Promise<string> {
  const res = await fetch(photoUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error("Failed to load photo");
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export default function ProfilePage() {
  const { user, token, refreshProfile, updateProfile, uploadProfilePhoto } = useAuth();

  const [username, setUsername] = useState("");
  const [university, setUniversity] = useState("");
  const [bio, setBio] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    if (!selectedFile) {
      loadProtectedPhoto();
    }

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [token, user?.profilePhotoUrl, selectedFile]);

  function handlePhotoSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setError("");
    setSuccess("");

    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) {
        URL.revokeObjectURL(prev);
      }
      return objectUrl;
    });
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

  async function handlePhotoUpload() {
    if (!selectedFile) {
      setError("Please choose a photo first.");
      return;
    }

    setError("");
    setSuccess("");
    setUploading(true);

    try {
      await uploadProfilePhoto(selectedFile);
      setSelectedFile(null);
      setSuccess("Profile photo updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  }

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

              <div className="mt-4 flex flex-col items-center gap-4">
                <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted text-3xl font-semibold text-muted-foreground">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt={`${user?.username || "User"} profile`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{user?.username?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </div>

                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelection}
                />
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WEBP up to 5MB
                </p>

                <Button
                  type="button"
                  className="w-full"
                  onClick={handlePhotoUpload}
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
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
      </main>
    </div>
  );
}
