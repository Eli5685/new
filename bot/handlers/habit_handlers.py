from telebot import types
from bot.instance import bot
from bot.services.supabase_service import get_user_by_chat_id, get_habits, get_public_habits, create_habit
from bot.utils.states import user_states

@bot.message_handler(commands=['habits'])
def cmd_habits(message):
    chat_id = message.chat.id
    user = get_user_by_chat_id(chat_id)
    if not user:
        bot.send_message(chat_id, "⚠️ Вы ещё не зарегистрированы. Используйте /start")
        return

    habits = get_habits(chat_id)
    if not habits:
        bot.send_message(
            chat_id,
            "📭 У вас пока нет привычек.\n\nИспользуйте /add чтобы добавить первую!",
            parse_mode='Markdown'
        )
        return

    text = "🏋️ *Ваши привычки:*\n\n"
    for i, h in enumerate(habits, 1):
        status = "🟢" if h.get('habit_last_run') else "⚪"
        pleasant = " (приятная)" if h.get('habit_is_pleasant') else ""
        text += (
            f"{status} *{i}. {h['habit_action']}*{pleasant}\n"
            f"   📍 {h['habit_place']} • ⏰ {h['habit_time'][:5]}\n"
            f"   🔄 каждые {h['habit_periodicity']} дн.\n\n"
        )
    bot.send_message(chat_id, text, parse_mode='Markdown')

@bot.message_handler(commands=['public'])
def cmd_public(message):
    habits = get_public_habits()
    if not habits:
        bot.send_message(message.chat.id, "📭 Публичных привычек пока нет.")
        return

    text = "🌍 *Публичные привычки:*\n\n"
    for i, h in enumerate(habits, 1):
        text += (
            f"*{i}. {h['action']}*\n"
            f"   📍 {h['place']} • ⏰ {h['time'][:5]}\n"
            f"   🔄 каждые {h['periodicity']} дн.\n\n"
        )
    bot.send_message(message.chat.id, text, parse_mode='Markdown')

# ===================== ADD WIZARD =====================

@bot.message_handler(commands=['add'])
def cmd_add(message):
    chat_id = message.chat.id
    user = get_user_by_chat_id(chat_id)
    if not user:
        bot.send_message(chat_id, "⚠️ Вы ещё не зарегистрированы. Используйте /start")
        return

    user_states[chat_id] = {'step': 'action', 'user_id': user['id']}
    bot.send_message(
        chat_id,
        "➕ *Создание новой привычки*\n\n"
        "Шаг 1/5: Что вы хотите делать?\n"
        "Например: _Делать зарядку_\n\n"
        "Для отмены: /cancel",
        parse_mode='Markdown'
    )

@bot.message_handler(commands=['cancel'])
def cmd_cancel(message):
    chat_id = message.chat.id
    if chat_id in user_states:
        del user_states[chat_id]
        bot.send_message(chat_id, "❌ Действие отменено.")
    else:
        bot.send_message(chat_id, "ℹ️ Нечего отменять.")

@bot.message_handler(func=lambda m: m.chat.id in user_states)
def handle_add_steps(message):
    chat_id = message.chat.id
    state = user_states[chat_id]
    text = message.text.strip()

    if state['step'] == 'action':
        state['action'] = text
        state['step'] = 'place'
        bot.send_message(
            chat_id,
            "📍 Шаг 2/5: Где? (место выполнения)\n"
            "Например: _Дома, В парке, В зале_",
            parse_mode='Markdown'
        )

    elif state['step'] == 'place':
        state['place'] = text
        state['step'] = 'time'
        bot.send_message(
            chat_id,
            "⏰ Шаг 3/5: Во сколько? (формат ЧЧ:ММ)\n"
            "Например: _08:00_ или _19:30_",
            parse_mode='Markdown'
        )

    elif state['step'] == 'time':
        try:
            parts = text.split(':')
            h, m = int(parts[0]), int(parts[1])
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise ValueError
            time_str = f"{h:02d}:{m:02d}:00"
        except (ValueError, IndexError):
            bot.send_message(chat_id, "❌ Неверный формат. Введите время как ЧЧ:ММ (например, 08:00)")
            return

        state['time'] = time_str
        state['step'] = 'periodicity'

        markup = types.InlineKeyboardMarkup(row_width=4)
        buttons = [
            types.InlineKeyboardButton(f"{i} дн.", callback_data=f"period_{i}")
            for i in range(1, 8)
        ]
        markup.add(*buttons)

        bot.send_message(
            chat_id,
            "🔄 Шаг 4/5: Как часто? (каждые N дней)",
            reply_markup=markup
        )

@bot.callback_query_handler(func=lambda call: call.data.startswith('period_'))
def handle_periodicity(call):
    chat_id = call.message.chat.id
    if chat_id not in user_states:
        return

    state = user_states[chat_id]
    state['periodicity'] = int(call.data.split('_')[1])
    state['step'] = 'pleasant'

    markup = types.InlineKeyboardMarkup()
    markup.add(
        types.InlineKeyboardButton("✅ Да, приятная", callback_data="pleasant_yes"),
        types.InlineKeyboardButton("📋 Нет, полезная", callback_data="pleasant_no")
    )

    bot.edit_message_text(
        f"🔄 Периодичность: каждые {state['periodicity']} дн.\n\n"
        "⭐ Шаг 5/5: Это приятная привычка?\n\n"
        "_Приятная — то, что доставляет удовольствие (чашка кофе, прогулка)_\n"
        "_Полезная — то, что требует усилий (зарядка, учёба)_",
        chat_id=chat_id,
        message_id=call.message.message_id,
        parse_mode='Markdown',
        reply_markup=markup
    )

@bot.callback_query_handler(func=lambda call: call.data.startswith('pleasant_'))
def handle_pleasant(call):
    chat_id = call.message.chat.id
    if chat_id not in user_states:
        return

    state = user_states[chat_id]
    is_pleasant = call.data == 'pleasant_yes'

    try:
        habit_data = {
            'user_id': state['user_id'],
            'action': state['action'],
            'place': state['place'],
            'time': state['time'],
            'periodicity': state['periodicity'],
            'is_pleasant': is_pleasant,
            'is_public': False,
            'execution_time': '00:02:00',
            'reward': '🎉 Отлично! Привычка выполнена!' if not is_pleasant else None
        }

        create_habit(habit_data)
        del user_states[chat_id]

        bot.edit_message_text(
            f"✅ *Привычка создана!*\n\n"
            f"📋 {state['action']}\n"
            f"📍 {state['place']}\n"
            f"⏰ {state['time'][:5]}\n"
            f"🔄 Каждые {state['periodicity']} дн.\n"
            f"{'⭐ Приятная' if is_pleasant else '💪 Полезная'}\n\n"
            f"Я буду напоминать вам в Telegram! 🔔",
            chat_id=chat_id,
            message_id=call.message.message_id,
            parse_mode='Markdown'
        )

    except Exception as e:
        del user_states[chat_id]
        error_msg = str(e)
        if 'habits_pleasant_no_extras' in error_msg:
            msg = "У приятной привычки не может быть награды"
        elif 'habits_non_pleasant_needs_motivation' in error_msg:
            msg = "У полезной привычки должна быть награда"
        else:
            msg = f"Ошибка: {error_msg}"

        bot.edit_message_text(
            f"❌ Не удалось создать привычку.\n{msg}",
            chat_id=chat_id,
            message_id=call.message.message_id
        )
