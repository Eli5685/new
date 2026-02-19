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

    // Сохраняем tg chat_id из URL
    const tgChatId = searchParams.get('tg')

    useEffect(() => {
        if (tgChatId) {
            localStorage.setItem('tg_chat_id', tgChatId)
        }
    }, [tgChatId])

    useEffect(() => {
        // Если пришли от бота (есть tgChatId) -> разлогиниваемся, чтобы войти "начисто"
        // Это решает проблему "закэшированной сессии", которая не обновляет базу
        if (session && tgChatId) {
            const handleSignOut = async () => {
                await supabase.auth.signOut()
            }
            handleSignOut()
        }
        // Если просто открыли страницу (без tg) и уже залогинены -> перекидываем в успех
        else if (session && !tgChatId) {
            navigate('/success')
        }
    }, [session, navigate, tgChatId])

    useEffect(() => {
        if (!tgChatId) return

        if (turnstileRef.current) {
            turnstileRef.current.innerHTML = ''
        }

        const renderTurnstile = () => {
            if (window.turnstile) {
                window.turnstile.render(turnstileRef.current, {
                    sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
                    callback: (token) => {
                        setTurnstileToken(token)
                    },
                })
            }
        }

        if (window.turnstile) {
            renderTurnstile()
        } else {
            const checkTurnstile = setInterval(() => {
                if (window.turnstile) {
                    clearInterval(checkTurnstile)
                    renderTurnstile()
                }
            }, 100)
            return () => clearInterval(checkTurnstile)
        }
    }, [tgChatId])


    const handleGoogleLogin = async () => {
        if (!turnstileToken) {
            setError('Подтвердите, что вы не робот')
            return
        }

        setIsLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/success`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                captchaToken: turnstileToken
            }
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        }
    }

    if (!tgChatId) {
        return (
            <div className="auth-container">
                <div className="auth-bg"></div>
                <div className="auth-card">
                    <div className="auth-logo-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h1>Ошибка</h1>
                    <p className="auth-subtitle">Пожалуйста, откройте это приложение через Telegram бота</p>

                    <a href="https://t.me/tg_habits_bot" className="google-btn">
                        Открыть Telegram
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="auth-container">
            <div className="auth-bg"></div>

            <div className="auth-card">
                <div className="auth-logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <polyline points="10 17 15 12 10 7" />
                        <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                </div>
                <h1>Войти</h1>
                <p className="auth-subtitle">Синхронизируйте аккаунт с ботом в один клик</p>

                <div className="turnstile-wrapper" ref={turnstileRef}></div>

                {error && (
                    <div className="auth-error" style={{ color: '#ff6b6b', marginBottom: '24px', fontSize: '14px', textAlign: 'center', fontWeight: '500' }}>
                        {error}
                    </div>
                )}

                <button
                    className={`google-btn ${!turnstileToken || isLoading ? 'google-btn-disabled' : ''}`}
                    onClick={handleGoogleLogin}
                    disabled={!turnstileToken || isLoading}
                >
                    {isLoading ? (
                        <div className="spinner"></div>
                    ) : (
                        <>
                            <svg className="google-icon" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            <span>Продолжить через Google</span>
                        </>
                    )}
                </button>

                <p className="auth-footer">
                    Secure Cloud Encryption
                </p>
            </div>
        </div>
    )
}

export default AuthPage
