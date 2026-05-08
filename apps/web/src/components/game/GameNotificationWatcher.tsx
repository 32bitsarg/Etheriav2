"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { GameReportType } from "@etheria/shared";
import { useI18n } from "@/i18n";
import {
  useActiveBattles,
  useAllianceMembership,
  useBarbarianAttackAlerts,
  useGameReports,
  useMailMessages,
} from "@/hooks/useCity";
import { useGameStore } from "@/stores/gameStore";
import { useToastStore, type ToastIcon, type ToastType } from "@/stores/toastStore";

const reportIconByType: Record<GameReportType, ToastIcon> = {
  BATTLE: "battle",
  TRADE: "report",
  BARBARIAN: "barbarian",
  SYSTEM: "report",
  ALLIANCE: "alliance",
  MARKET: "market",
  QUEST: "quest",
  SPY_INTEL: "spy",
  INCOMING_ATTACK: "battle",
  SPY_DETECTED: "spy",
};

const reportToastTypeByType: Record<GameReportType, ToastType> = {
  BATTLE: "warning",
  TRADE: "info",
  BARBARIAN: "warning",
  SYSTEM: "info",
  ALLIANCE: "info",
  MARKET: "success",
  QUEST: "success",
  SPY_INTEL: "info",
  INCOMING_ATTACK: "error",
  SPY_DETECTED: "warning",
};

function rememberInitial(ids: string[], seen: MutableRefObject<Set<string>>, ready: MutableRefObject<boolean>) {
  if (ready.current) return false;
  ids.forEach((id) => seen.current.add(id));
  ready.current = true;
  return true;
}

function formatCountdown(value: string) {
  const target = new Date(value).getTime();
  const diff = Math.max(0, target - Date.now());
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function GameNotificationWatcher() {
  const { t } = useI18n();
  const cityId = useGameStore((s) => s.cityId);
  const addToast = useToastStore((s) => s.addToast);

  const mailData = useMailMessages(true);
  const reportsData = useGameReports(true);
  const barbarianAlerts = useBarbarianAttackAlerts(cityId);
  const activeBattles = useActiveBattles(cityId);
  const allianceData = useAllianceMembership();

  const seenMail = useRef(new Set<string>());
  const seenReports = useRef(new Set<string>());
  const seenBarbarianAlerts = useRef(new Set<string>());
  const seenIncomingBattles = useRef(new Set<string>());
  const seenAllianceEvents = useRef(new Set<string>());

  const mailReady = useRef(false);
  const reportsReady = useRef(false);
  const barbarianReady = useRef(false);
  const battlesReady = useRef(false);
  const allianceReady = useRef(false);

  useEffect(() => {
    if (!mailData.data) return;
    const unread = mailData.data?.inbox?.filter((message) => !message.readAt) ?? [];
    if (rememberInitial(unread.map((message) => message.id), seenMail, mailReady)) return;

    unread.forEach((message) => {
      if (seenMail.current.has(message.id)) return;
      seenMail.current.add(message.id);
      addToast({
        type: "info",
        icon: "mail",
        title: t("play.notifications.mailTitle"),
        message: `${message.senderName}: ${message.subject}`,
        duration: 8000,
      });
    });
  }, [addToast, mailData.data?.inbox, t]);

  useEffect(() => {
    if (!reportsData.data) return;
    const unread = reportsData.data?.reports?.filter((report) => !report.readAt) ?? [];
    if (rememberInitial(unread.map((report) => report.id), seenReports, reportsReady)) return;

    unread.forEach((report) => {
      if (seenReports.current.has(report.id)) return;
      seenReports.current.add(report.id);
      addToast({
        type: reportToastTypeByType[report.type],
        icon: reportIconByType[report.type],
        title: report.title,
        message: report.summary,
        duration: report.type === "BATTLE" || report.type === "BARBARIAN" ? 10000 : 8000,
      });
    });
  }, [addToast, reportsData.data?.reports]);

  useEffect(() => {
    if (!barbarianAlerts.data) return;
    const unread = barbarianAlerts.data?.filter((alert) => !alert.read) ?? [];
    if (rememberInitial(unread.map((alert) => alert.id), seenBarbarianAlerts, barbarianReady)) return;

    unread.forEach((alert) => {
      if (seenBarbarianAlerts.current.has(alert.id)) return;
      seenBarbarianAlerts.current.add(alert.id);
      addToast({
        type: "warning",
        icon: "barbarian",
        title: t("play.notifications.barbarianAttackTitle"),
        message: `${alert.campName} - ${t("play.notifications.arrivesIn")} ${formatCountdown(alert.arrivesAt)}`,
        duration: 10000,
      });
    });
  }, [addToast, barbarianAlerts.data, t]);

  useEffect(() => {
    if (!activeBattles.data) return;
    const incoming =
      activeBattles.data?.filter((battle) => battle.defenderCityId === cityId && battle.status === "MARCHING") ?? [];
    if (rememberInitial(incoming.map((battle) => battle.id), seenIncomingBattles, battlesReady)) return;

    incoming.forEach((battle) => {
      if (seenIncomingBattles.current.has(battle.id)) return;
      seenIncomingBattles.current.add(battle.id);
      addToast({
        type: "error",
        icon: "battle",
        title: t("play.notifications.incomingAttackTitle"),
        message: `${t("play.notifications.arrivesIn")} ${formatCountdown(battle.arrivesAt)}`,
        duration: 12000,
      });
    });
  }, [activeBattles.data, addToast, cityId, t]);

  useEffect(() => {
    if (!allianceData.data) return;
    const events = allianceData.data?.events ?? [];
    if (rememberInitial(events.map((event) => String(event.id)), seenAllianceEvents, allianceReady)) return;

    events.slice(0, 3).forEach((event) => {
      const id = String(event.id);
      if (seenAllianceEvents.current.has(id)) return;
      seenAllianceEvents.current.add(id);
      addToast({
        type: "info",
        icon: "alliance",
        title: t("play.notifications.allianceTitle"),
        message: String(event.message ?? event.title ?? event.type ?? t("play.notifications.allianceUpdate")),
        duration: 8000,
      });
    });
  }, [addToast, allianceData.data?.events, t]);

  return null;
}
