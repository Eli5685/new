import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

function AuthPage({ session }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const turnstileRef = useRef(null)
    const [turnstileToken, setTurnstileToken] = useState(null)
    const [error, setError] = useState(null)
    const [isLoading, setIsLoading] = useState(false)

    // Сохраняем tg chat_id из URL (приходит от бота)
    const tgChatId = searchParams.get('tg')
    const hasTgParam = !!tgChatId || !!localStorage.getItem('tg_chat_id')

    useEffect(() => {
        if (tgChatId) {
            localStorage.setItem('tg_chat_id', tgChatId)
        }
    }, [tgChatId])

    useEffect(() => {
        if (session) {
            const tg = searchParams.get('tg')
            navigate(tg ? `/success?tg=${tg}` : '/success')
        }
    }, [session, navigate, searchParams])

    useEffect(() => {
        // Не рендерим Turnstile если нет tg параметра
        if (!hasTgParam) return

        const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY
        if (!siteKey) return

        let widgetId = null

        const renderWidget = () => {
            if (window.turnstile && turnstileRef.current) {
                widgetId = window.turnstile.render(turnstileRef.current, {
                    sitekey: siteKey,
                    callback: (token) => {
                        setTurnstileToken(token)
                    },
                    'expired-callback': () => {
                        setTurnstileToken(null)
                    },
                    theme: 'dark',
                    language: 'ru',
                })
            }
        }

        if (window.turnstile) {
            renderWidget()
        } else {
            const interval = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(interval)
                    renderWidget()
                }
            }, 200)
            return () => clearInterval(interval)
        }

        return () => {
            if (widgetId !== null && window.turnstile) {
                window.turnstile.remove(widgetId)
            }
        }
    }, [hasTgParam])

    const handleGoogleLogin = async () => {
        if (!turnstileToken) {
            setError('Пожалуйста, пройдите проверку безопасности')
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/success`,
                },
            })

            if (error) {
                setError('Ошибка входа. Попробуйте ещё раз.')
                setIsLoading(false)
            }
        } catch (err) {
            setError('Произошла непредвиденная ошибка')
            setIsLoading(false)
        }
    }

    // Если нет tg параметра — показываем предупреждение
    if (!hasTgParam) {
        return (
            <div className="auth-container">
                <div className="auth-bg">
                    <div className="auth-orb auth-orb-1"></div>
                    <div className="auth-orb auth-orb-2"></div>
                    <div className="auth-orb auth-orb-3"></div>
                </div>

                <div className="auth-card">
                    <div className="auth-logo">
                        <div className="auth-logo-icon" style={{ borderColor: '#facc15', color: '#facc15' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </svg>
                        </div>
                        <h1>Войдите через бота</h1>
                        <p className="auth-subtitle">Вернитесь в Telegram и нажмите кнопку там</p>
                    </div>

                    <a href="https://t.me/tg_habits_bot" className="google-btn" style={{ background: '#24A1DE', color: 'white' }}>
                        <span>Открыть @tg_habits_bot</span>
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container">
            <div className="auth-bg">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
                <div className="auth-orb auth-orb-3"></div>
            </div>

            <div className="auth-card">
                <div className="auth-logo">
                    <h1>Трекер привычек</h1>
                    <p className="auth-subtitle">Личный кабинет</p>
                </div>

                <div className="turnstile-wrapper">
                    <div ref={turnstileRef}></div>
                </div>

                <button
                    className={`google-btn ${!turnstileToken ? 'google-btn-disabled' : ''} ${isLoading ? 'google-btn-loading' : ''}`}
                    onClick={handleGoogleLogin}
                    disabled={!turnstileToken || isLoading}
                >
                    {isLoading ? (
                        <div className="btn-spinner"></div>
                    ) : (
                        <svg className="google-icon" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                    )}
                    <span>{isLoading ? 'Подключение...' : 'Войти через Google'}</span>
                </button>

                {error && (
                    <div className="auth-error">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <span>{error}</span>
                    </div>
                )}

                <p className="auth-footer" style={{ opacity: 0.5 }}>
                    Secure authentication via Google
                </p>
            </div>
        </div>
    )
}

export default AuthPage
