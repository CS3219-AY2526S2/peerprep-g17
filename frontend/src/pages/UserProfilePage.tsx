import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { USER_API_URL } from "@/config";
import { createProtectedImageUrl } from "@/lib/image";

interface PublicProfile {
  id: string;
  username: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}



export default function UserProfilePage() {
  const { id } = useParams();
  const { token, user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchProfile() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${USER_API_URL}/${id}/profile`, token
          ? { headers: { Authorization: `Bearer ${token}` } }
          : undefined);

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to fetch profile");
        }

        if (!cancelled) {
          setProfile(json.data as PublicProfile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch profile");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  useEffect(() => {
    let objectUrlToRevoke: string | null = null;
    let cancelled = false;

    async function fetchPhoto() {
      if (!profile?.profilePhotoUrl) {
        setPhotoPreview(null);
        return;
      }

      if (!profile.profilePhotoUrl.includes("/api/users/")) {
        setPhotoPreview(profile.profilePhotoUrl);
        return;
      }

      try {
        const objectUrl = await createProtectedImageUrl(profile.profilePhotoUrl, token);

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

    fetchPhoto();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [profile?.profilePhotoUrl, token]);

  const isCurrentUser = !!profile && profile.id === currentUser?.id;
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-3xl px-6 pt-24 pb-12">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : profile ? (
          <section className="rounded-xl border border-border/50 p-6">
            <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted text-2xl font-semibold text-muted-foreground">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={`${profile.username} profile`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{profile.username[0]?.toUpperCase() || "?"}</span>
                )}
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight">{profile.username}</h1>
                {profile.university ? (
                  <p className="mt-2 text-sm text-muted-foreground">{profile.university}</p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No university listed.</p>
                )}
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Public profile
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-sm font-medium">Bio</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                {profile.bio || "No bio provided yet."}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {isCurrentUser && (
                <Link to="/profile">
                  <Button variant="outline">Edit My Profile</Button>
                </Link>
              )}
              {!currentUser && (
                <Link to="/login">
                  <Button>Log In to Connect</Button>
                </Link>
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
