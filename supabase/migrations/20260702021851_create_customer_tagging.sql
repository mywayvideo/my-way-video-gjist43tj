CREATE TABLE IF NOT EXISTS public.customer_tagging (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    email TEXT,
    tag_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_tagging_customer_reason
    ON public.customer_tagging(customer_id, tag_reason);

ALTER TABLE public.customer_tagging ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_tagging TO authenticated;

DROP POLICY IF EXISTS "admin_select_customer_tagging" ON public.customer_tagging;
DROP POLICY IF EXISTS "admin_insert_customer_tagging" ON public.customer_tagging;
DROP POLICY IF EXISTS "admin_delete_customer_tagging" ON public.customer_tagging;
DROP POLICY IF EXISTS "admin_update_customer_tagging" ON public.customer_tagging;

CREATE POLICY "admin_select_customer_tagging" ON public.customer_tagging
    FOR SELECT TO authenticated USING (public.check_is_admin());

CREATE POLICY "admin_insert_customer_tagging" ON public.customer_tagging
    FOR INSERT TO authenticated WITH CHECK (public.check_is_admin());

CREATE POLICY "admin_delete_customer_tagging" ON public.customer_tagging
    FOR DELETE TO authenticated USING (public.check_is_admin());

CREATE POLICY "admin_update_customer_tagging" ON public.customer_tagging
    FOR UPDATE TO authenticated USING (public.check_is_admin()) WITH CHECK (public.check_is_admin());

CREATE OR REPLACE FUNCTION public.scan_customer_spam()
RETURNS INTEGER AS $$
DECLARE
    v_total INTEGER;
BEGIN
    IF NOT public.check_is_admin() THEN
        RAISE EXCEPTION 'Permission denied: admin role required';
    END IF;

    INSERT INTO public.customer_tagging (customer_id, email, tag_reason, metadata)
    SELECT c.id, c.email, 'invalid_format', jsonb_build_object('pattern', 'invalid_email_format')
    FROM public.customers c
    WHERE c.email IS NULL OR c.email = '' OR c.email !~ '^[^@]+@[^@]+\.[^@]+$'
    ON CONFLICT (customer_id, tag_reason) DO NOTHING;

    INSERT INTO public.customer_tagging (customer_id, email, tag_reason, metadata)
    SELECT c.id, c.email, 'suspicious_alias',
        jsonb_build_object('matched_keyword',
            CASE
                WHEN lower(split_part(c.email, '@', 1)) ~ 'test' THEN 'test'
                WHEN lower(split_part(c.email, '@', 1)) ~ 'random' THEN 'random'
                WHEN lower(split_part(c.email, '@', 1)) ~ 'user' THEN 'user'
                WHEN lower(split_part(c.email, '@', 1)) ~ 'admin' THEN 'admin'
                WHEN lower(split_part(c.email, '@', 1)) ~ 'support' THEN 'support'
            END
        )
    FROM public.customers c
    WHERE c.email IS NOT NULL AND c.email != ''
        AND lower(split_part(c.email, '@', 1)) ~ '(test|random|user|admin|support)'
    ON CONFLICT (customer_id, tag_reason) DO NOTHING;

    INSERT INTO public.customer_tagging (customer_id, email, tag_reason, metadata)
    SELECT c.id, c.email, 'excessive_numbers',
        jsonb_build_object('digit_count', length(regexp_replace(split_part(c.email, '@', 1), '[^0-9]', '', 'g')))
    FROM public.customers c
    WHERE c.email IS NOT NULL AND c.email != ''
        AND length(regexp_replace(split_part(c.email, '@', 1), '[^0-9]', '', 'g')) >= 5
    ON CONFLICT (customer_id, tag_reason) DO NOTHING;

    SELECT COUNT(*) INTO v_total FROM public.customer_tagging;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.scan_customer_spam() TO authenticated;

INSERT INTO public.customer_tagging (customer_id, email, tag_reason, metadata)
SELECT c.id, c.email, 'invalid_format', jsonb_build_object('pattern', 'invalid_email_format')
FROM public.customers c
WHERE c.email IS NULL OR c.email = '' OR c.email !~ '^[^@]+@[^@]+\.[^@]+$'
ON CONFLICT (customer_id, tag_reason) DO NOTHING;

INSERT INTO public.customer_tagging (customer_id, email, tag_reason, metadata)
SELECT c.id, c.email, 'suspicious_alias',
    jsonb_build_object('matched_keyword',
        CASE
            WHEN lower(split_part(c.email, '@', 1)) ~ 'test' THEN 'test'
            WHEN lower(split_part(c.email, '@', 1)) ~ 'random' THEN 'random'
            WHEN lower(split_part(c.email, '@', 1)) ~ 'user' THEN 'user'
            WHEN lower(split_part(c.email, '@', 1)) ~ 'admin' THEN 'admin'
            WHEN lower(split_part(c.email, '@', 1)) ~ 'support' THEN 'support'
        END
    )
FROM public.customers c
WHERE c.email IS NOT NULL AND c.email != ''
    AND lower(split_part(c.email, '@', 1)) ~ '(test|random|user|admin|support)'
ON CONFLICT (customer_id, tag_reason) DO NOTHING;

INSERT INTO public.customer_tagging (customer_id, email, tag_reason, metadata)
SELECT c.id, c.email, 'excessive_numbers',
    jsonb_build_object('digit_count', length(regexp_replace(split_part(c.email, '@', 1), '[^0-9]', '', 'g')))
FROM public.customers c
WHERE c.email IS NOT NULL AND c.email != ''
    AND length(regexp_replace(split_part(c.email, '@', 1), '[^0-9]', '', 'g')) >= 5
ON CONFLICT (customer_id, tag_reason) DO NOTHING;
