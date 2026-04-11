import { useCallback, useEffect, useRef, useState } from "react";
import { USER_API_URL } from "@/config";
import { createProtectedImageUrl } from "@/lib/image";

export interface PublicProfile {
  id: string;
  username: string;
  university: string;
  bio: string;
  profilePhotoUrl: string | null;
}

type UsePublicProfileOptions = {
  enabled?: boolean;
  pollIntervalMs?: number;
};

export function usePublicProfile(
  userId: string | null | undefined,
  token?: string | null,
  options: UsePublicProfileOptions = {},
) {
  const { enabled = true, pollIntervalMs = 10000 } = options;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(enabled && userId));
  const [error, setError] = useState("");
  const [photoRefreshKey, setPhotoRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    if (!enabled || !userId) {
      setProfile(null);
      setPhotoPreview(null);
      setLoading(false);
      setError("");
      return;
    }

    if (!hasLoadedRef.current) {
      setLoading(true);
    }

    try {
      const response = await fetch(`${USER_API_URL}/${userId}/profile`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || "Failed to fetch profile");
      }

      setProfile(json.data as PublicProfile);
      setError("");
      setPhotoRefreshKey((current) => current + 1);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
      hasLoadedRef.current = true;
    } finally {
      setLoading(false);
    }
  }, [enabled, token, userId]);

  useEffect(() => {
    hasLoadedRef.current = false;
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshProfile();
    }, pollIntervalMs);

    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") {
        void refreshProfile();
      }
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [enabled, pollIntervalMs, refreshProfile, userId]);

  useEffect(() => {
    let objectUrlToRevoke: string | null = null;
    let cancelled = false;

    async function loadPhoto() {
      if (!profile?.profilePhotoUrl) {
        setPhotoPreview(null);
        return;
      }

      if (!profile.profilePhotoUrl.includes("/api/users/")) {
        setPhotoPreview(profile.profilePhotoUrl);
        return;
      }

      try {
        const objectUrl = await createProtectedImageUrl(
          profile.profilePhotoUrl,
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

    void loadPhoto();

    return () => {
      cancelled = true;
      if (objectUrlToRevoke) {
        URL.revokeObjectURL(objectUrlToRevoke);
      }
    };
  }, [photoRefreshKey, profile?.profilePhotoUrl, token]);

  return {
    profile,
    photoPreview,
    loading,
    error,
    refreshProfile,
  };
}
