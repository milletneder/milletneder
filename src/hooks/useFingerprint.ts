"use client";

import { useState, useEffect } from "react";

interface UseFingerprintResult {
  fingerprint: string | null;
  loading: boolean;
  error: Error | null;
}

export function useFingerprint(): UseFingerprintResult {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFingerprint() {
      try {
        const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
        const fp = await FingerprintJS.load();
        const result = await fp.get();

        if (!cancelled) {
          setFingerprint(result.visitorId);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err : new Error("Fingerprint alınamadı")
          );
          setLoading(false);
        }
      }
    }

    loadFingerprint();

    return () => {
      cancelled = true;
    };
  }, []);

  return { fingerprint, loading, error };
}
