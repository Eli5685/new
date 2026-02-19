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
            navigate('/success')
        }
    }, [session, navigate])

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
                        <div className="auth-logo-icon auth-logo-icon-warn">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                            </svg>
                        </div>
                        <h1>Вход через бота</h1>
                        <p className="auth-subtitle">
                            Для регистрации используйте кнопку в Telegram-боте
                        </p>
                    </div>

                    <a href="https://t.me/tg_habits_bot" className="google-btn" style={{ textDecoration: 'none' }}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className="google-icon" style={{ width: 22, height: 22 }}>
                            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                        </svg>
                        <span>Открыть бота @tg_habits_bot</span>
                    </a>

                    <p className="auth-footer">
                        Нажмите /start в боте, затем кнопку «Войти через Google»
                    </p>
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
                    <div className="auth-logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <h1>Трекер привычек</h1>
                    <p className="auth-subtitle">Формируйте полезные привычки каждый день</p>
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

                <p className="auth-footer">
                    Нажимая «Войти», вы соглашаетесь с условиями использования
                </p>
            </div>
        </div>
    )
}

export default AuthPage
