import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

function SuccessPage({ session }) {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [user, setUser] = useState(null)
    // 'linking' | 'linked' | 'error' | 'already_linked'
    const [linkStatus, setLinkStatus] = useState(null)
    const isLinkingRef = useRef(false) // Guard against double-firing
    const [errorMessage, setErrorMessage] = useState(null)

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
        setErrorMessage(null)

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
            // FORCE UPDATE: Always update the DB, do not trust local state.
            // If the user came with ?tg=..., they WANT to link this account.

            // 1. Unlink chat_id from potential other users (steal mechanism)
            await supabase
                .from('profiles')
                .update({ telegram_chat_id: null })
                .eq('telegram_chat_id', tgChatId)
                .neq('id', currentUser.id)

            // 2. Link to current user (Upsert/Update)
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
            setErrorMessage(err.message || 'Не удалось связать аккаунты')
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
            <div className="auth-bg"></div>

            <div className="auth-card">
                {linkStatus === 'linking' ? (
                    <div className="spinner" style={{ margin: '0 auto 40px' }}></div>
                ) : (
                    <div className="success-icon-wrapper">
                        {linkStatus === 'error' ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#ff6b6b">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#34A853">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        )}
                    </div>
                )}

                <h1>
                    {linkStatus === 'linking' && 'Подключение'}
                    {linkStatus === 'linked' && 'Готово!'}
                    {linkStatus === 'error' && 'Ошибка'}
                </h1>

                <p className="success-subtitle">
                    {linkStatus === 'linked' && 'Ваш аккаунт успешно привязан. Теперь вы можете использовать все функции бота.'}
                    {linkStatus === 'error' && (errorMessage || 'Не удалось привязать аккаунт. Попробуйте еще раз.')}
                    {linkStatus === 'linking' && 'Синхронизируем ваш профиль...'}
                </p>

                <button className="bot-btn" onClick={handleBackToBot}>
                    Вернуться в Telegram
                </button>

                <p className="auth-footer">
                    Authorized Session
                </p>
            </div>
        </div>
    )
}

export default SuccessPage
