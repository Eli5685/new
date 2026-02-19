import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

function SuccessPage({ session }) {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [countdown, setCountdown] = useState(5)
    const [linkStatus, setLinkStatus] = useState(null) // 'linking' | 'linked' | 'error'

    useEffect(() => {
        if (!session) {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
                if (s) {
                    setUser(s.user)
                    linkTelegram(s.user.id)
                } else {
                    navigate('/')
                }
            })
        } else {
            setUser(session.user)
            linkTelegram(session.user.id)
        }
    }, [session, navigate])

    // Привязка Telegram chat_id к профилю
    const linkTelegram = async (userId) => {
        const tgChatId = localStorage.getItem('tg_chat_id')
        if (!tgChatId) return

        setLinkStatus('linking')

        try {
            // Сначала отвязываем chat_id от любого другого профиля (смена аккаунта)
            await supabase
                .from('profiles')
                .update({ telegram_chat_id: null })
                .eq('telegram_chat_id', tgChatId)
                .neq('id', userId)

            // Привязываем chat_id к текущему профилю
            const { error, count } = await supabase
                .from('profiles')
                .update({ telegram_chat_id: tgChatId }, { count: 'exact' })
                .eq('id', userId)
                .select() // Need to select to get count or data

            if (error || (count === 0 && !error)) {
                console.error('Link error or no profile:', error)
                if (count === 0) alert("Ошибка: Профиль пользователя не найден. Попробуйте перезайти.")
                setLinkStatus('error')
            } else {
                setLinkStatus('linked')
                localStorage.removeItem('tg_chat_id')

                // Отправляем приветственное сообщение в Telegram
                try {
                    await supabase.functions.invoke('notify-auth', {
                        body: { chat_id: tgChatId, name: user.user_metadata?.full_name || 'Друг' }
                    })
                } catch (e) {
                    console.error('Notify error:', e)
                }
            }
        } catch (err) {
            console.error('Link error:', err)
            setLinkStatus('error')
        }
    }

    useEffect(() => {
        if (!user) return

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [user])

    const handleBackToBot = () => {
        window.location.href = 'https://t.me/tg_habits_bot'
    }

    if (!user) {
        return (
            <div className="loading-screen">
                <div className="spinner"></div>
            </div>
        )
    }

    const displayName = user.user_metadata?.full_name || user.email
    const avatarUrl = user.user_metadata?.avatar_url

    return (
        <div className="auth-container">
            <div className="auth-bg">
                <div className="auth-orb auth-orb-1 auth-orb-success"></div>
                <div className="auth-orb auth-orb-2 auth-orb-success"></div>
                <div className="auth-orb auth-orb-3 auth-orb-success"></div>
            </div>

            <div className="auth-card success-card">
                <div className="success-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                </div>

                <h1 className="success-title">Добро пожаловать!</h1>

                {avatarUrl && (
                    <div className="success-avatar">
                        <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
                    </div>
                )}

                <p className="success-name">{displayName}</p>
                <p className="success-subtitle">
                    {linkStatus === 'linking' && '⏳ Привязываем Telegram...'}
                    {linkStatus === 'linked' && '✅ Telegram привязан! Вы готовы к работе'}
                    {linkStatus === 'error' && '⚠️ Не удалось привязать Telegram'}
                    {!linkStatus && 'Вы успешно авторизованы'}
                </p>

                <div className="success-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span>Вернитесь в Telegram-бота, чтобы начать управлять своими привычками</span>
                </div>

                <button className="bot-btn" onClick={handleBackToBot}>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="tg-icon">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                    <span>Перейти в бота</span>
                    {countdown > 0 && <span className="countdown">({countdown})</span>}
                </button>

                <button className="logout-btn" onClick={async () => {
                    await supabase.auth.signOut()
                    navigate('/')
                }}>
                    Выйти из аккаунта
                </button>
            </div>
        </div>
    )
}

export default SuccessPage
