const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://remdzoqigfewxikcxpyd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlbWR6b3FpZ2Zld3hpa2N4cHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzk3NTgsImV4cCI6MjA3MzYxNTc1OH0.RiD_qz4IXrV-mZS3gpHFYRT8E6B0Tu8G9080-7rE-dM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
    console.log('Verifying schema on:', supabaseUrl);

    const columnsToCheck = [
        'current_class',
        'age',
        'gender',
        'location',
        'category_scores',
        'career_suggestion',
        'role',
        'onboarding_step'
    ];

    console.log('Checking for columns:', columnsToCheck.join(', '));

    try {
        // We select these columns. If any are missing, PostgREST throws an error.
        const { data, error } = await supabase
            .from('profiles')
            .select(columnsToCheck.join(','))
            .limit(1);

        if (error) {
            console.error('❌ SCHEMA VERIFICATION FAILED');
            console.error('Error Message:', error.message);
            console.error('Error Details:', error.details);
            console.error('Error Hint:', error.hint);
            console.error('Full Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ SCHEMA VERIFICATION PASSED');
            console.log('All columns exist and are accessible.');
        }
    } catch (err) {
        console.error('❌ UNEXPECTED EXCEPTION');
        console.error(err);
    }
}

verifySchema();
