from telebot import types
from bot.instance import bot
from bot.config import WEB_APP_URL
from bot.services.supabase_service import get_user_by_chat_id, get_habits, unlink_chat_id

@bot.message_handler(commands=['start'])
def cmd_start(message):
    """Приветствие и регистрация"""
    chat_id = message.chat.id
    user = get_user_by_chat_id(chat_id)

    if user:
        bot.send_message(
            chat_id,
            f"👋 С возвращением, *{user['display_name']}*!\n\n"
            f"Используйте /habits для просмотра привычек\n"
            f"или /help для списка всех команд.\n\n"
            f"💡 Хотите сменить аккаунт? → /logout",
            parse_mode='Markdown'
        )
    else:
        # Генерируем ссылку на сайт с chat_id
        auth_url = f"{WEB_APP_URL}?tg={chat_id}"

        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton(
            text="🔑 Войти через Google",
            url=auth_url
        ))

        bot.send_message(
            chat_id,
            "👋 Добро пожаловать в *Трекер привычек*!\n\n"
            "Для начала вам нужно войти через Google.\n"
            "Нажмите кнопку ниже 👇",
            parse_mode='Markdown',
            reply_markup=markup
        )

@bot.message_handler(commands=['help'])
def cmd_help(message):
    """Список команд"""
    bot.send_message(
        message.chat.id,
        "📋 *Доступные команды:*\n\n"
        "/start — Начало работы / регистрация\n"
        "/habits — Мои привычки\n"
        "/add — Добавить привычку\n"
        "/public — Публичные привычки\n"
        "/profile — Мой профиль\n"
        "/logout — Сменить Google-аккаунт\n"
        "/help — Эта справка",
        parse_mode='Markdown'
    )

@bot.message_handler(commands=['profile'])
def cmd_profile(message):
    """Показать профиль"""
    chat_id = message.chat.id
    user = get_user_by_chat_id(chat_id)

    if not user:
        bot.send_message(chat_id, "⚠️ Вы ещё не зарегистрированы. Используйте /start")
        return

    habits_count = len(get_habits(chat_id))

    bot.send_message(
        chat_id,
        f"👤 *Ваш профиль:*\n\n"
        f"📛 Имя: {user['display_name']}\n"
        f"🆔 Telegram ID: `{chat_id}`\n"
        f"📊 Привычек: {habits_count}\n"
        f"📅 Зарегистрирован: {user['created_at'][:10]}",
        parse_mode='Markdown'
    )

@bot.message_handler(commands=['logout'])
def cmd_logout(message):
    """Выйти из аккаунта / сменить Google-аккаунт"""
    chat_id = message.chat.id
    user = get_user_by_chat_id(chat_id)

    if not user:
        bot.send_message(
            chat_id,
            "ℹ️ Вы ещё не привязали аккаунт.\nИспользуйте /start для входа."
        )
        return

    markup = types.InlineKeyboardMarkup()
    markup.add(
        types.InlineKeyboardButton("✅ Да, выйти", callback_data="logout_confirm"),
        types.InlineKeyboardButton("❌ Отмена", callback_data="logout_cancel")
    )

    bot.send_message(
        chat_id,
        f"🔓 *Выход из аккаунта*\n\n"
        f"Текущий аккаунт: *{user['display_name']}*\n\n"
        f"⚠️ Привычки сохранятся на этом аккаунте.\n"
        f"После выхода вы сможете войти в другой Google-аккаунт.\n\n"
        f"Подтвердить выход?",
        parse_mode='Markdown',
        reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data == 'logout_confirm')
def handle_logout_confirm(call):
    """Подтверждение выхода"""
    chat_id = call.message.chat.id
    try:
        unlink_chat_id(chat_id)
        # Генерируем ссылку для нового входа
        auth_url = f"{WEB_APP_URL}?tg={chat_id}"
        markup = types.InlineKeyboardMarkup()
        markup.add(types.InlineKeyboardButton(
            text="🔑 Войти в другой аккаунт",
            url=auth_url
        ))
        bot.edit_message_text(
            "✅ Вы успешно вышли из аккаунта.\n\n"
            "Нажмите кнопку ниже, чтобы войти в другой Google-аккаунт 👇",
            chat_id=chat_id,
            message_id=call.message.message_id,
            reply_markup=markup
        )
    except Exception as e:
        bot.edit_message_text(
            f"❌ Ошибка при выходе: {e}",
            chat_id=chat_id,
            message_id=call.message.message_id
        )

@bot.callback_query_handler(func=lambda call: call.data == 'logout_cancel')
def handle_logout_cancel(call):
    bot.edit_message_text(
        "👌 Выход отменён. Всё осталось как было!",
        chat_id=call.message.chat.id,
        message_id=call.message.message_id
    )
