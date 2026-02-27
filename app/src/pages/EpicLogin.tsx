import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { LoginRenderer } from './settings/components/LoginRenderer';

export default function EpicLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const navigate = useNavigate();
    const { settings, updateSettings, hasLoaded } = useTheme();
    const { t, i18n } = useTranslation();

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/app');
            }
        };
        checkSession();
    }, [navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            navigate('/app');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to login');
            }
        } finally {
            setLoading(false);
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        updateSettings({ language: newLang });
    };

    if (!hasLoaded) return null;

    return (
        <div className="fixed inset-0 w-full h-screen bg-black overflow-hidden select-none">
            <LoginRenderer
                activeSettings={settings}
                designMode={isMobile ? 'mobile' : 'desktop'}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                loading={loading}
                error={error}
                handleLogin={handleLogin}
                toggleLanguage={toggleLanguage}
                t={t}
                i18n={i18n}
                isMobile={isMobile}
            />
        </div>
    );
}
