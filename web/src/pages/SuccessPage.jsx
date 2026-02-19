import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

function SuccessPage({ session }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [user, setUser] = useState(null)
    const [countdown, setCountdown] = useState(5)
    // 'linking' | 'linked' | 'error' | 'already_linked'
    const [linkStatus, setLinkStatus] = useState(null)
    const isLinkingRef = useRef(false) // Guard against double-firing

    useEffect(() => {
        // 1. Capture tg param immediately
        const tgChatId = searchParams.get('tg')
        if (tgChatId) {
            localStorage.setItem('tg_chat_id', tgChatId)
        }

        // 2. Handle session
        if (!session) {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
                if (s) {
                    setUser(s.user)
                    checkAndLink(s.user)
                } else {
                    navigate('/')
                }
            })
        } else {
            setUser(session.user)
            checkAndLink(session.user)
        }
    }, [session, navigate, searchParams])

    const checkAndLink = async (currentUser) => {
        const tgChatId = searchParams.get('tg') || localStorage.getItem('tg_chat_id')

        // If we don't have a chat_id to link, just show "Done"
        if (!tgChatId) {
            setLinkStatus('linked')
            return
        }

        // Use ref to prevent duplicate calls
        if (isLinkingRef.current) return
        isLinkingRef.current = true

        setLinkStatus('linking')

        // Helper to notify bot
        const notifyBot = async () => {
            await supabase.functions.invoke('notify-auth', {
                body: {
                    chat_id: tgChatId,
                    name: currentUser.user_metadata?.full_name || 'Друг'
                }
            })
        }

        try {
            // Check if already linked to this specific chat_id
            const { data: profile } = await supabase
                .from('profiles')
                .select('telegram_chat_id')
                .eq('id', currentUser.id)
                .single()

            if (profile && profile.telegram_chat_id === tgChatId) {
                // Already linked correctly
                // IMPORTANT: Notify bot anyway, because user might have cleared chat history
                await notifyBot()

                setLinkStatus('linked')
                localStorage.removeItem('tg_chat_id')
                return
            }

            // Not linked or linked to different chat_id -> Perform linking

            // 1. Unlink chat_id from others
            await supabase
                .from('profiles')
                .update({ telegram_chat_id: null })
                .eq('telegram_chat_id', tgChatId)
                .neq('id', currentUser.id)

            // 2. Link to current user
            const { error } = await supabase
                .from('profiles')
                .update({ telegram_chat_id: tgChatId })
                .eq('id', currentUser.id)

            if (error) throw error

            // 3. Notify bot
            await notifyBot()

            setLinkStatus('linked')
            localStorage.removeItem('tg_chat_id')

        } catch (err) {
            console.error('Link error:', err)
            setLinkStatus('error')
        } finally {
            isLinkingRef.current = false
        }
    }

    const handleBackToBot = () => {
        window.location.href = 'https://t.me/tg_habits_bot?start=login_success'
    }

    if (!user) {
        return <div className="loading-screen"><div className="spinner"></div></div>
    }

    return (
        <div className="auth-container">
            <div className="auth-bg">
                <div className="auth-orb auth-orb-1"></div>
                <div className="auth-orb auth-orb-2"></div>
            </div>

            <div className="auth-card success-card">
                {linkStatus === 'linking' ? (
                    <div className="spinner" style={{ margin: '0 auto 20px' }}></div>
                ) : (
                    <div className="success-icon-wrapper">
                        {linkStatus === 'error' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        )}
                    </div>
                )}

                <h1 className="success-title">
                    {linkStatus === 'linking' && 'Подключение...'}
                    {linkStatus === 'linked' && 'Готово!'}
                    {linkStatus === 'error' && 'Ошибка'}
                </h1>

                <p className="success-subtitle">
                    {linkStatus === 'linked' && 'Теперь можно закрыть это окно'}
                    {linkStatus === 'error' && 'Не удалось связать аккаунты'}
                </p>

                <button className="bot-btn" onClick={handleBackToBot}>
                    Открыть Telegram
                </button>
            </div>
        </div>
    )
}

export default SuccessPage
