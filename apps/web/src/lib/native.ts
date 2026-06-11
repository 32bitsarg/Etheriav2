"use client";

// Lazy-loaded Capacitor native features.
// All functions are safe to call on web — they no-op silently when not on a native platform.

let _isNative: boolean | null = null;

async function isNative(): Promise<boolean> {
  if (_isNative !== null) return _isNative;
  try {
    const { Capacitor } = await import("@capacitor/core");
    _isNative = Capacitor.isNativePlatform();
  } catch {
    _isNative = false;
  }
  return _isNative;
}

// ── Haptics ─────────────────────────────────────────────────────────────────

export async function hapticLight() {
  if (!await isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {}
}

export async function hapticMedium() {
  if (!await isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {}
}

export async function hapticHeavy() {
  if (!await isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch {}
}

export async function hapticSuccess() {
  if (!await isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
}

export async function hapticWarning() {
  if (!await isNative()) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Warning });
  } catch {}
}

// ── Keep Awake ───────────────────────────────────────────────────────────────

export async function keepAwake() {
  if (!await isNative()) return;
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.keepAwake();
  } catch {}
}

export async function allowSleep() {
  if (!await isNative()) return;
  try {
    const { KeepAwake } = await import("@capacitor-community/keep-awake");
    await KeepAwake.allowSleep();
  } catch {}
}

// ── Badge ────────────────────────────────────────────────────────────────────

export async function setBadge(count: number) {
  if (!await isNative()) return;
  try {
    const { Badge } = await import("@capawesome/capacitor-badge");
    if (count <= 0) {
      await Badge.clear();
    } else {
      await Badge.set({ count });
    }
  } catch {}
}

export async function clearBadge() {
  if (!await isNative()) return;
  try {
    const { Badge } = await import("@capawesome/capacitor-badge");
    await Badge.clear();
  } catch {}
}

// ── Preferences (secure key-value, replaces localStorage for sensitive data) ─

export async function prefSet(key: string, value: string) {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.set({ key, value });
  } catch {
    // Fallback to localStorage on web
    localStorage.setItem(key, value);
  }
}

export async function prefGet(key: string): Promise<string | null> {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    return localStorage.getItem(key);
  }
}

export async function prefRemove(key: string) {
  try {
    const { Preferences } = await import("@capacitor/preferences");
    await Preferences.remove({ key });
  } catch {
    localStorage.removeItem(key);
  }
}

// ── Share ────────────────────────────────────────────────────────────────────

export async function shareText(title: string, text: string, url?: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
    const { Share } = await import("@capacitor/share");
    await Share.share({ title, text, url, dialogTitle: title });
  } catch {}
}

// ── Local Notifications ──────────────────────────────────────────────────────

export async function scheduleLocalNotification(opts: {
  id: number;
  title: string;
  body: string;
  scheduleAt: Date;
}) {
  if (!await isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return;
    await LocalNotifications.schedule({
      notifications: [{
        id: opts.id,
        title: opts.title,
        body: opts.body,
        schedule: { at: opts.scheduleAt },
        sound: undefined,
        smallIcon: "ic_launcher",
      }],
    });
  } catch {}
}

export async function cancelLocalNotification(id: number) {
  if (!await isNative()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch {}
}
