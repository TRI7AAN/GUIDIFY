import React from "react";
import SEO from "../components/ui/SEO";

export default function OrgProfilesPage() {
  return (
    <div className="p-6">
      <SEO
        title="Organizations"
        description="Organization profiles and information"
        canonicalUrl="/org-profiles"
      />
      <div className="glass-card p-8 text-center">
        <h1 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Organizations
        </h1>
        <p className="text-surface-700">
          Organization profiles and career opportunities are coming soon. Check
          back shortly or explore the Career Roadmap in the meantime.
        </p>
      </div>
    </div>
  );
}
