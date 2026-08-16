import React from "react";
import SEO from "../components/ui/SEO";

export default function StatsPage() {
  return (
    <div className="p-6">
      <SEO
        title="Statistics"
        description="User statistics and analytics dashboard"
        canonicalUrl="/stats"
      />
      <div className="glass-card p-8 text-center">
        <h1 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Statistics
        </h1>
        <p className="text-surface-700">
          Detailed learning analytics are coming soon. In the meantime, check
          your Dashboard for your streak, roadmap progress, and activity heatmap.
        </p>
      </div>
    </div>
  );
}
