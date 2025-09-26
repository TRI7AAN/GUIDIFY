CREATE TABLE IF NOT EXISTS user_consent (
    user_id UUID PRIMARY KEY,
    agreed_to_terms BOOLEAN DEFAULT FALSE,
    agreed_to_privacy BOOLEAN DEFAULT FALSE,
    data_sharing_opt_in BOOLEAN DEFAULT FALSE,
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    ip_address TEXT,
    agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action TEXT,
    accessed_by UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
