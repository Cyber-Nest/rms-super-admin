"use client";

import React, { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RedirectorContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ticket = searchParams.get("ticket");
    if (ticket && typeof window !== "undefined") {
      let branchBaseUrl = process.env.NEXT_PUBLIC_BRANCH_APP_URL;

      if (!branchBaseUrl) {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const port = window.location.port;

        if (port === "3000") {
          branchBaseUrl = `${protocol}//${hostname}:3001`;
        } else if (port === "3002") {
          branchBaseUrl = `${protocol}//${hostname}:3000`;
        } else {
          branchBaseUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}`;
        }
      }

      const targetBranchUrl = `${branchBaseUrl}/impersonate?ticket=${encodeURIComponent(ticket)}`;
      window.location.href = targetBranchUrl;
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#11100F] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-3 border-neutral-600 border-t-brand-primary rounded-full animate-spin mx-auto" />
        <p className="text-xs font-700 text-neutral-300">
          Redirecting to Branch POS Terminal...
        </p>
      </div>
    </div>
  );
}

export default function ImpersonateRedirector() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#11100F]" />}>
      <RedirectorContent />
    </Suspense>
  );
}
