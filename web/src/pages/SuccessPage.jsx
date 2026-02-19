import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

function SuccessPage({ session }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [user, setUser] = useState(null)
    const [countdown, setCountdown] = useState(5)
    const [linkStatus, setLinkStatus] = useState(null) // 'linking' | 'linked' | 'error'

    useEffect(() => {
        const tgChatId = searchParams.get('tg')
        if (tgChatId) {
            localStorage.setItem('tg_chat_id', tgChatId)
        }

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
    }, [session, navigate, searchParams])

    // Привязка Telegram chat_id к профилю
    const linkTelegram = async (userId) => {
        let tgChatId = searchParams.get('tg') || localStorage.getItem('tg_chat_id')
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
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>

            <div className="auth-card success-card">
                <h1 className="success-title">Готово!</h1>

                {avatarUrl && (
                    <div className="success-avatar">
                        <img src={avatarUrl} alt={displayName} referrerPolicy="no-referrer" />
                    </div>
                )}

                <p className="success-name">{displayName}</p>
                <p className="success-subtitle">
                    {linkStatus === 'linking' && '⏳ Привязка...'}
                    {linkStatus === 'linked' && 'Аккаунт привязан'}
                    {linkStatus === 'error' && 'Ошибка привязки'}
                    {!linkStatus && 'Вход выполнен'}
                </p>

                <div className="success-info">
                    Вернитесь в Telegram, чтобы продолжить. Если привязка не произошла, попробуйте нажать кнопку ещё раз.
                </div>

                <button className="bot-btn" onClick={handleBackToBot}>
                    <span>Открыть Telegram</span>
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
