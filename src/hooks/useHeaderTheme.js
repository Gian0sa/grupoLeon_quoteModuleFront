import { useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import {
  getHeaderTheme,
  updateHeaderTheme,
  setUserHeaderThemeAccess,
} from "../services/headerThemeService";
import {
  DEFAULT_HEADER_THEME_KEY,
  HEADER_THEMES,
  getHeaderThemeConfig,
} from "../shared/utils/headerThemes";

const STORAGE_KEY_PREFIX = "grupoLeon_headerTheme_";

function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId || "anon"}`;
}

function readLocalFallback(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return null;
    if (Object.prototype.hasOwnProperty.call(HEADER_THEMES, raw)) {
      return { themeKey: raw, configuredThemeKey: raw, activeThemeKey: raw };
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalFallback(userId, payload) {
  if (typeof window === "undefined" || !userId || !payload) return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(payload));
  } catch {
    // Ignorar errores de almacenamiento restringido
  }
}

function normalizeThemeKey(candidate) {
  return candidate && Object.prototype.hasOwnProperty.call(HEADER_THEMES, candidate)
    ? candidate
    : DEFAULT_HEADER_THEME_KEY;
}

function normalizeUserIds(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((id) => {
      const num = Number(id);
      return Number.isNaN(num) ? id : num;
    })
    .filter((id) => id !== null && id !== undefined && id !== "");
}

function normalizeUserThemesMap(rawMap) {
  if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
    return {};
  }
  const normalized = {};
  for (const [id, key] of Object.entries(rawMap)) {
    if (
      key &&
      key !== DEFAULT_HEADER_THEME_KEY &&
      Object.prototype.hasOwnProperty.call(HEADER_THEMES, key)
    ) {
      normalized[String(id)] = key;
    }
  }
  return normalized;
}

export function useHeaderTheme() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const localFallback = useMemo(() => readLocalFallback(userId), [userId]);

  const {
    data: remoteData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["headerTheme", userId],
    queryFn: getHeaderTheme,
    enabled: Boolean(isAuthenticated),
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Autoridad estricta del servidor: nunca permitir que localStorage otorgue canManageTheme
  const canManageTheme = useMemo(() => {
    if (!isAuthenticated || !remoteData) return false;
    return remoteData.canManageTheme === true;
  }, [isAuthenticated, remoteData]);

  const effectiveSource = remoteData || localFallback || null;

  const allowedUserIds = useMemo(
    () => normalizeUserIds(effectiveSource?.allowedUserIds),
    [effectiveSource]
  );

  const userThemes = useMemo(
    () => normalizeUserThemesMap(effectiveSource?.userThemes),
    [effectiveSource]
  );

  const configuredThemeKey = useMemo(() => {
    const raw =
      effectiveSource?.configuredThemeKey ||
      effectiveSource?.activeThemeKey ||
      effectiveSource?.activeTheme ||
      effectiveSource?.themeKey;
    return normalizeThemeKey(raw);
  }, [effectiveSource]);

  const hasThemeAccess = useMemo(() => {
    if (!isAuthenticated) return false;
    if (canManageTheme) return true;
    if (typeof effectiveSource?.hasThemeAccess === "boolean") {
      return effectiveSource.hasThemeAccess;
    }
    if (typeof effectiveSource?.hasAccess === "boolean") {
      return effectiveSource.hasAccess;
    }
    if (userId != null && Array.isArray(effectiveSource?.allowedUserIds)) {
      return effectiveSource.allowedUserIds.some(
        (id) => String(id) === String(userId)
      );
    }
    return false;
  }, [isAuthenticated, canManageTheme, effectiveSource, userId]);

  const themeKey = useMemo(() => {
    if (!isAuthenticated) return DEFAULT_HEADER_THEME_KEY;
    if (canManageTheme || hasThemeAccess) {
      return configuredThemeKey;
    }
    return DEFAULT_HEADER_THEME_KEY;
  }, [isAuthenticated, canManageTheme, hasThemeAccess, configuredThemeKey]);

  const theme = useMemo(() => getHeaderThemeConfig(themeKey), [themeKey]);

  // Persistir caché visual local (solo color/acceso visual; nunca privilegios administrativos)
  useEffect(() => {
    if (!isAuthenticated || !userId || !remoteData) return;
    writeLocalFallback(userId, {
      themeKey,
      activeThemeKey: themeKey,
      configuredThemeKey,
      hasThemeAccess,
    });
  }, [isAuthenticated, userId, remoteData, themeKey, configuredThemeKey, hasThemeAccess]);

  const updateThemeMutation = useMutation({
    mutationFn: (payload) => updateHeaderTheme(payload),
    onSuccess: (updatedData, variables) => {
      const currentCached =
        queryClient.getQueryData(["headerTheme", userId]) || remoteData || {};
      const nextThemeKey = normalizeThemeKey(
        updatedData?.configuredThemeKey ||
          updatedData?.activeThemeKey ||
          updatedData?.themeKey ||
          variables?.themeKey ||
          variables?.activeTheme
      );
      const nextAllowed = Array.isArray(updatedData?.allowedUserIds)
        ? normalizeUserIds(updatedData.allowedUserIds)
        : normalizeUserIds(currentCached?.allowedUserIds ?? allowedUserIds);
      const nextUserThemes =
        updatedData?.userThemes && typeof updatedData.userThemes === "object"
          ? normalizeUserThemesMap(updatedData.userThemes)
          : normalizeUserThemesMap(currentCached?.userThemes ?? userThemes);
      const nextCanManage = currentCached?.canManageTheme === true;

      const merged = {
        ...currentCached,
        ...(updatedData && typeof updatedData === "object" ? updatedData : {}),
        themeKey: nextThemeKey,
        activeThemeKey: nextThemeKey,
        configuredThemeKey: nextThemeKey,
        allowedUserIds: nextAllowed,
        userThemes: nextUserThemes,
        hasThemeAccess: Boolean(
          nextCanManage || updatedData?.hasThemeAccess || hasThemeAccess
        ),
        canManageTheme: nextCanManage,
      };

      queryClient.setQueryData(["headerTheme", userId], merged);
      writeLocalFallback(userId, {
        themeKey:
          merged.canManageTheme || merged.hasThemeAccess
            ? nextThemeKey
            : DEFAULT_HEADER_THEME_KEY,
        activeThemeKey:
          merged.canManageTheme || merged.hasThemeAccess
            ? nextThemeKey
            : DEFAULT_HEADER_THEME_KEY,
        configuredThemeKey: nextThemeKey,
        hasThemeAccess: Boolean(
          merged.canManageTheme || merged.hasThemeAccess
        ),
      });
    },
  });

  const setUserAccessMutation = useMutation({
    mutationFn: ({ userId: targetUserId, enabled, themeKey: targetThemeKey }) =>
      setUserHeaderThemeAccess(targetUserId, {
        ...(targetThemeKey !== undefined ? { themeKey: targetThemeKey } : {}),
        ...(typeof enabled === "boolean" ? { enabled } : {}),
      }),
    onSuccess: (updatedData, { userId: targetUserId, enabled, themeKey: targetThemeKey }) => {
      const currentCached =
        queryClient.getQueryData(["headerTheme", userId]) || remoteData || {};
      const baseAllowed = normalizeUserIds(
        currentCached?.allowedUserIds ?? allowedUserIds
      );
      const baseUserThemes = normalizeUserThemesMap(
        currentCached?.userThemes ?? userThemes
      );

      let nextUserThemes;
      if (updatedData?.userThemes && typeof updatedData.userThemes === "object") {
        nextUserThemes = normalizeUserThemesMap(updatedData.userThemes);
      } else {
        nextUserThemes = { ...baseUserThemes };
        const keyStr = String(targetUserId);
        if (targetThemeKey !== undefined) {
          if (!targetThemeKey || targetThemeKey === DEFAULT_HEADER_THEME_KEY) {
            delete nextUserThemes[keyStr];
          } else {
            nextUserThemes[keyStr] = targetThemeKey;
          }
        } else if (enabled && configuredThemeKey !== DEFAULT_HEADER_THEME_KEY) {
          nextUserThemes[keyStr] = configuredThemeKey;
        } else if (enabled === false) {
          delete nextUserThemes[keyStr];
        }
      }

      const nextAllowed = Array.isArray(updatedData?.allowedUserIds)
        ? normalizeUserIds(updatedData.allowedUserIds)
        : targetThemeKey !== undefined
        ? Object.keys(nextUserThemes).map((id) => Number(id) || id)
        : enabled
        ? Array.from(
            new Set([...baseAllowed, Number(targetUserId) || targetUserId])
          )
        : baseAllowed.filter((id) => String(id) !== String(targetUserId));

      const nextConfigured =
        updatedData?.configuredThemeKey ||
        updatedData?.activeThemeKey ||
        currentCached?.configuredThemeKey ||
        configuredThemeKey;

      const merged = {
        ...currentCached,
        ...(updatedData && typeof updatedData === "object" ? updatedData : {}),
        activeThemeKey:
          updatedData?.activeThemeKey ||
          currentCached?.activeThemeKey ||
          nextConfigured,
        configuredThemeKey: nextConfigured,
        allowedUserIds: nextAllowed,
        userThemes: nextUserThemes,
        canManageTheme: currentCached?.canManageTheme === true,
      };

      queryClient.setQueryData(["headerTheme", userId], merged);
    },
  });

  const updateTheme = useCallback(
    (payload) => updateThemeMutation.mutateAsync(payload),
    [updateThemeMutation]
  );

  const setUserAccess = useCallback(
    (params) => setUserAccessMutation.mutateAsync(params),
    [setUserAccessMutation]
  );

  return {
    themeKey,
    theme,
    hasThemeAccess,
    canManageTheme,
    configuredThemeKey,
    allowedUserIds,
    userThemes,
    updateTheme,
    setUserAccess,
    isUpdating:
      updateThemeMutation.isPending || setUserAccessMutation.isPending,
    isLoading,
    isError,
    refetch,
  };
}
