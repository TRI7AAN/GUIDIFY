const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ksiiuhftnmjsgwrizpno.supabase.co';
const supabaseKey = 'sb_publishable_vOn6X849Hz9tAM-JcgNgGg_ZyudrDIz';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
    console.log('Verifying schema on:', supabaseUrl);

    // Current schema (schema.md §1-2): learners + learner_profiles
    const checks = [
        { table: 'learners', columns: ['id', 'email', 'full_name', 'segment', 'target_role', 'onboarding_completed'] },
        { table: 'learner_profiles', columns: ['learner_id', 'questionnaire_data', 'resume_data', 'skills', 'interests', 'strengths', 'weaknesses'] }
    ];

    let failed = false;

    for (const { table, columns } of checks) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select(columns.join(','))
                .limit(1);

            if (error) {
                failed = true;
                console.error(`❌ ${table}: VERIFICATION FAILED`);
                console.error('  Error Message:', error.message);
                console.error('  Error Details:', error.details);
            } else {
                console.log(`✅ ${table}: PASSED (${columns.length} columns exist)`);
            }
        } catch (err) {
            failed = true;
            console.error(`❌ ${table}: UNEXPECTED EXCEPTION`);
            console.error(err);
        }
    }

    if (failed) {
        process.exit(1);
    } else {
        console.log('✅ SCHEMA VERIFICATION PASSED');
    }
}

verifySchema();
