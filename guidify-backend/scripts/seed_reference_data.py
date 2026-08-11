"""
Automated reference-data seeder (no service-role key).

Loads course data from ../data/*.json, builds idempotent SQL
(CREATE TABLE IF NOT EXISTS + RLS policy + upsert), and applies it to Supabase
through the Management API using a personal access token
(SUPABASE_ACCESS_TOKEN) — never the service-role key.

Usage:
    python scripts/seed_reference_data.py --check                # validate data
    python scripts/seed_reference_data.py --write out.sql        # write SQL file
    python scripts/seed_reference_data.py --apply                # apply via Management API
    python scripts/seed_reference_data.py                        # print SQL to stdout

Environment:
    SUPABASE_URL            https://<project-ref>.supabase.co
    SUPABASE_ACCESS_TOKEN   Supabase Management API token (created in the dashboard)
"""

import argparse
import json
import os
from urllib.parse import urlparse

import requests

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO_ROOT, "data")
SEED_FILES = ["nqr_seed.json", "nsqf_courses.json"]
TABLE = "verified_courses"
MANAGEMENT_API = "https://api.supabase.com/v1"


def load_all_courses():
    """Load and merge course data. Earlier files win name conflicts (nqr is richer)."""
    merged = {}
    for filename in SEED_FILES:
        path = os.path.join(DATA_DIR, filename)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        rows = data if isinstance(data, list) else data.get("value", [])
        for row in rows:
            name = (row.get("course_name") or "").strip()
            if name:
                merged.setdefault(name, row)
    return list(merged.values())


def _sql_literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    if isinstance(value, (int, float)):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def _sql_array(values):
    if not values:
        return "NULL"
    return "ARRAY[" + ", ".join(_sql_literal(v) for v in values) + "]"


def build_sql(courses):
    rows = []
    for c in courses:
        rows.append(
            "("
            + ", ".join(
                [
                    _sql_literal(c.get("course_name")),
                    _sql_literal(c.get("nsqf_level")),
                    _sql_literal(c.get("sector")),
                    _sql_literal(c.get("certification_body")),
                    _sql_literal(c.get("duration_hours")),
                    _sql_literal(c.get("min_eligibility")),
                    _sql_array(c.get("job_roles")),
                ]
            )
            + ")"
        )

    values_sql = ",\n    ".join(rows) if rows else "('', NULL, NULL, NULL, NULL, NULL, NULL)"

    return f"""-- AUTO-GENERATED from guidify-backend/data/*.json by scripts/seed_reference_data.py
-- {TABLE}: NCVET/NSQF reference data.
-- RLS: public read. Writes are applied via the Supabase Management API or SQL
-- editor — no service-role key is used.

CREATE TABLE IF NOT EXISTS public.{TABLE} (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_name TEXT NOT NULL UNIQUE,
    nsqf_level INTEGER NOT NULL,
    sector TEXT,
    certification_body TEXT,
    duration_hours INTEGER,
    min_eligibility TEXT,
    job_roles TEXT[] DEFAULT '{{}}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_{TABLE}_level ON public.{TABLE}(nsqf_level);
CREATE INDEX IF NOT EXISTS idx_{TABLE}_sector ON public.{TABLE}(sector);

ALTER TABLE public.{TABLE} ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "{TABLE}_public_read" ON public.{TABLE};
CREATE POLICY "{TABLE}_public_read"
    ON public.{TABLE} FOR SELECT
    TO anon, authenticated
    USING (true);

INSERT INTO public.{TABLE}
    (course_name, nsqf_level, sector, certification_body, duration_hours, min_eligibility, job_roles)
VALUES
    {values_sql}
ON CONFLICT (course_name) DO NOTHING;
"""


def apply_sql(sql, project_ref, access_token):
    url = f"{MANAGEMENT_API}/projects/{project_ref}/database/query"
    resp = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        },
        json={"query": sql},
        timeout=60,
    )
    if resp.status_code != 200:
        raise SystemExit(f"Management API error {resp.status_code}: {resp.text}")
    return resp.json()


def main():
    parser = argparse.ArgumentParser(description="Seed Supabase reference data (no service role).")
    parser.add_argument("--check", action="store_true", help="Validate JSON data and exit")
    parser.add_argument("--write", metavar="PATH", help="Write generated SQL to PATH")
    parser.add_argument("--apply", action="store_true", help="Apply SQL via the Supabase Management API")
    args = parser.parse_args()

    courses = load_all_courses()
    if not courses:
        raise SystemExit(f"No courses found in {SEED_FILES}")
    print(f"Loaded {len(courses)} unique courses from {SEED_FILES}.")

    if args.check:
        return

    sql = build_sql(courses)

    if args.write:
        with open(args.write, "w", encoding="utf-8") as f:
            f.write(sql)
        print(f"Wrote SQL ({len(sql)} bytes) to {args.write}")
        return

    if args.apply:
        token = os.environ.get("SUPABASE_ACCESS_TOKEN")
        url = os.environ.get("SUPABASE_URL")
        if not token or not url:
            raise SystemExit("SUPABASE_ACCESS_TOKEN and SUPABASE_URL are required for --apply")
        ref = urlparse(url).netloc.split(".")[0]
        result = apply_sql(sql, ref, token)
        print(f"Applied via Management API (project {ref}). {len(courses)} courses upserted.")
        if result:
            print(json.dumps(result, indent=2)[:2000])
        return

    print(sql)


if __name__ == "__main__":
    main()
