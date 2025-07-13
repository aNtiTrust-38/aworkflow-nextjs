"use client";
import React, { useEffect, useState } from "react";
import Navigation from "components/Navigation";
import dynamic from "next/dynamic";

const SetupWizard = dynamic(() => import("components/SetupWizard").then(m => m.SetupWizard), { ssr: false });

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [showSetup, setShowSetup] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      try {
        const res = await fetch("/api/setup-status");
        if (!res.ok) throw new Error("Failed to check setup status");
        const data = await res.json();
        setShowSetup(!data.isSetup);
      } catch {
        // Fail open: don't block app
        setShowSetup(false);
      } finally {
        setChecking(false);
      }
    }
    checkSetup();
  }, []);

  return (
    <>
      <Navigation />
      {!checking && showSetup && (
        <div
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div style={{ background: "#fff", borderRadius: 8, padding: 24, minWidth: 320, maxWidth: 600, boxShadow: "0 2px 16px rgba(0,0,0,0.2)" }}>
            <SetupWizard />
          </div>
        </div>
      )}
      {children}
    </>
  );
}