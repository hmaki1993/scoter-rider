
export const applyThemeStyles = (themeId: string) => {
    try {
        const root = document.documentElement;

        if (themeId === 'midnight') {
            // Refined Midnight Blue - Deep & Elegant
            root.style.setProperty('--color-primary', '#818cf8'); // Indigo 400
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#1e293b'); // Slate 800
            root.style.setProperty('--color-background', '#0f172a'); // Slate 900
            root.style.setProperty('--color-surface', 'rgba(30, 41, 59, 0.7)');
            root.style.setProperty('--color-accent', '#c084fc'); // Purple 400
            root.style.setProperty('color', '#f1f5f9');
        } else if (themeId === 'obsidian') {
            // Polished Obsidian - Sleek Black
            root.style.setProperty('--color-primary', '#a78bfa'); // Purple
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#18181b'); // Zinc 900
            root.style.setProperty('--color-background', '#09090b'); // Zinc 950
            root.style.setProperty('--color-surface', 'rgba(24, 24, 27, 0.7)');
            root.style.setProperty('--color-accent', '#a78bfa'); // Purple
            root.style.setProperty('color', '#fafafa');
        } else if (themeId === 'emerald') {
            // Deep Emerald - Professional Green
            root.style.setProperty('--color-primary', '#34d399'); // Emerald 400
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#064e3b'); // Emerald 900
            root.style.setProperty('--color-background', '#022c22'); // Emerald 950
            root.style.setProperty('--color-surface', 'rgba(6, 78, 59, 0.7)');
            root.style.setProperty('--color-accent', '#2dd4bf'); // Teal 400
            root.style.setProperty('color', '#ecfdf5');
        } else if (themeId === 'crimson') {
            // Rich Crimson - Sophisticated Red
            root.style.setProperty('--color-primary', '#fb7185'); // Rose 400
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#4c0519'); // Rose 900
            root.style.setProperty('--color-background', '#190a0f'); // Darker
            root.style.setProperty('--color-surface', 'rgba(76, 5, 25, 0.7)');
            root.style.setProperty('--color-accent', '#f43f5e'); // Rose 500
            root.style.setProperty('color', '#fff1f2');
        } else if (themeId === 'amber') {
            // Warm Amber - Golden Premium
            root.style.setProperty('--color-primary', '#fbbf24'); // Amber 400
            root.style.setProperty('--color-primary-foreground', '#18181b');
            root.style.setProperty('--color-secondary', '#451a03'); // Amber 950
            root.style.setProperty('--color-background', '#1a140a');
            root.style.setProperty('--color-surface', 'rgba(69, 26, 3, 0.7)');
            root.style.setProperty('--color-accent', '#f59e0b'); // Amber 500
            root.style.setProperty('color', '#fffbeb');
        } else if (themeId === 'deepsea') {
            // Deep Ocean - Royal Teal
            root.style.setProperty('--color-primary', '#22d3ee'); // Cyan 400
            root.style.setProperty('--color-primary-foreground', '#0f172a');
            root.style.setProperty('--color-secondary', '#164e63'); // Cyan 900
            root.style.setProperty('--color-background', '#082f49'); // Cyan 950
            root.style.setProperty('--color-surface', 'rgba(22, 78, 99, 0.7)');
            root.style.setProperty('--color-accent', '#06b6d4'); // Cyan 500
            root.style.setProperty('color', '#ecfeff');
        } else if (themeId === 'royal') {
            // Royal Velvet - Regal Purple
            root.style.setProperty('--color-primary', '#c084fc'); // Purple 400
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#3b0764'); // Purple 950
            root.style.setProperty('--color-background', '#14091a');
            root.style.setProperty('--color-surface', 'rgba(59, 7, 100, 0.7)');
            root.style.setProperty('--color-accent', '#a855f7'); // Purple 500
            root.style.setProperty('color', '#faf5ff');
        } else if (themeId === 'minddazzle') {
            // Minddazzle Elite - Premium Deep Teal & Plum
            root.style.setProperty('--color-primary', '#622347');    // Plum
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#122E34');  // Deep Teal
            root.style.setProperty('--color-background', '#0E1D21'); // Charcoal
            root.style.setProperty('--color-surface', 'rgba(18, 46, 52, 0.7)');
            root.style.setProperty('--color-accent', '#677E8A');     // Steel Blue
            root.style.setProperty('color', '#ABAFB5');             // Muted Gray
        } else {
            // Refined Default
            applyThemeStyles('midnight');
        }
    } catch (e) {
        console.error('Error applying theme:', e);
    }
};

export const initializeTheme = () => {
    try {
        const savedTheme = localStorage.getItem('theme') || 'midnight';
        applyThemeStyles(savedTheme);
    } catch (error) {
        console.error('Failed to load theme:', error);
    }
};

export const getResponsiveLoginSettings = (settings: any, isMobile: boolean) => {
    if (!isMobile) return settings;
    return {
        ...settings,
        login_bg_url: settings.login_mobile_bg_url || settings.login_bg_url,
        login_logo_url: settings.login_mobile_logo_url || settings.login_logo_url || settings.logo_url,
        login_card_opacity: settings.login_mobile_card_opacity ?? settings.login_card_opacity,
        login_card_color: settings.login_mobile_card_color || settings.login_card_color,
        login_card_border_color: settings.login_mobile_card_border_color || settings.login_card_border_color,
        login_card_scale: settings.login_mobile_card_scale ?? settings.login_card_scale,
        login_show_logo: settings.login_mobile_show_logo ?? settings.login_show_logo,
        login_text_color: settings.login_mobile_text_color || settings.login_text_color,
        login_accent_color: settings.login_mobile_accent_color || settings.login_accent_color,
        login_logo_opacity: settings.login_mobile_logo_opacity ?? settings.login_logo_opacity,
        login_logo_scale: settings.login_mobile_logo_scale ?? settings.login_logo_scale,
        login_logo_x_offset: settings.login_mobile_logo_x_offset ?? settings.login_logo_x_offset ?? 0,
        login_logo_y_offset: settings.login_mobile_logo_y_offset ?? settings.login_logo_y_offset ?? -220,
        login_bg_blur: settings.login_mobile_bg_blur ?? settings.login_bg_blur,
        login_bg_brightness: settings.login_mobile_bg_brightness ?? settings.login_bg_brightness,
        login_bg_zoom: settings.login_mobile_bg_zoom ?? settings.login_bg_zoom,
        login_bg_x_offset: settings.login_mobile_bg_x_offset ?? settings.login_bg_x_offset ?? 0,
        login_bg_y_offset: settings.login_mobile_bg_y_offset ?? settings.login_bg_y_offset ?? 0,
        login_bg_fit: settings.login_mobile_bg_fit || settings.login_bg_fit,
        login_bg_opacity: settings.login_mobile_bg_opacity ?? settings.login_bg_opacity,
        login_card_x_offset: settings.login_mobile_card_x_offset ?? settings.login_card_x_offset ?? 0,
        login_card_y_offset: settings.login_mobile_card_y_offset ?? settings.login_card_y_offset ?? 0,
        login_card_width: settings.login_mobile_card_width ?? settings.login_card_width,
        login_card_height: settings.login_mobile_card_height ?? settings.login_card_height,
        login_heading_size: settings.login_mobile_heading_size ?? settings.login_heading_size,
        login_input_size: settings.login_mobile_input_size ?? settings.login_input_size,
        login_label_size: settings.login_mobile_label_size ?? settings.login_label_size,
        academy_name: settings.academy_name,
    };
};
