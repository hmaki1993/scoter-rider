-- Allow these column additions to fail gracefully if they already exist
DO  
BEGIN 
    BEGIN
        ALTER TABLE gym_settings ADD COLUMN login_card_border_width NUMERIC DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column login_card_border_width already exists.';
    END;
    
    BEGIN
        ALTER TABLE gym_settings ADD COLUMN login_card_glow_size NUMERIC DEFAULT 60;
    EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column login_card_glow_size already exists.';
    END;

    BEGIN
        ALTER TABLE gym_settings ADD COLUMN login_card_glow_opacity NUMERIC DEFAULT 50;
    EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column login_card_glow_opacity already exists.';
    END;
    
    BEGIN
        ALTER TABLE user_settings ADD COLUMN login_card_border_width NUMERIC DEFAULT 1;
    EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column login_card_border_width already exists in user_settings.';
    END;
    
    BEGIN
        ALTER TABLE user_settings ADD COLUMN login_card_glow_size NUMERIC DEFAULT 60;
    EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column login_card_glow_size already exists in user_settings.';
    END;

    BEGIN
        ALTER TABLE user_settings ADD COLUMN login_card_glow_opacity NUMERIC DEFAULT 50;
    EXCEPTION WHEN duplicate_column THEN RAISE NOTICE 'column login_card_glow_opacity already exists in user_settings.';
    END;
END ;
