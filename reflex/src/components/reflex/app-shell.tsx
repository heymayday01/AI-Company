"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FloatingTopbar } from "./floating-topbar";
import { ListView } from "./views/list-view";
import { ReviewView } from "./views/review-view";
import { StatsView } from "./views/stats-view";
import { SettingsView } from "./views/settings-view";
import { Onboarding } from "./onboarding";
import { EmailDetailPage } from "./email-detail-page";
import { ReflexFooter } from "./reflex-footer";
import { useReflex } from "@/store/reflex";
import { spring } from "@/lib/reflex/motion";

export function AppShell() {
  const view = useReflex((s) => s.view);
  const emails = useReflex((s) => s.emails);
  const loading = useReflex((s) => s.loading);
  const connection = useReflex((s) => s.connection);
  const selectedEmailId = useReflex((s) => s.selectedEmailId);
  const fetchEmails = useReflex((s) => s.fetchEmails);
  const fetchStats = useReflex((s) => s.fetchStats);
  const fetchSyncStatus = useReflex((s) => s.fetchSyncStatus);

  useEffect(() => {
    fetchEmails();
    fetchStats();
    fetchSyncStatus();
  }, [fetchEmails, fetchStats, fetchSyncStatus]);

  const showOnboarding = !loading && emails.length === 0 && !connection;
  const showEmailDetail =
    (view === "board" || view === "review") &&
    !!selectedEmailId &&
    !showOnboarding;

  const pageKey = showOnboarding
    ? "onboarding"
    : showEmailDetail
    ? `detail-${selectedEmailId}`
    : view;

  return (
    <>
      <div className="reflex-ambient" aria-hidden />
      <div className="relative z-10 flex h-screen flex-col overflow-hidden">
        <FloatingTopbar />
        <main className="min-h-0 flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-4 pb-4 pt-1 lg:px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={pageKey}
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.995 }}
                transition={spring.smooth}
              >
                {showOnboarding ? (
                  <Onboarding />
                ) : showEmailDetail ? (
                  <EmailDetailPage />
                ) : view === "board" ? (
                  <ListView />
                ) : view === "review" ? (
                  <ReviewView />
                ) : view === "stats" ? (
                  <StatsView />
                ) : (
                  <SettingsView />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
        <ReflexFooter />
      </div>
    </>
  );
}
