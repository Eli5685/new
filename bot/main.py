import time
from telebot import types
from bot.instance import bot
from bot.config import WEB_APP_URL
# Импортируем хендлеры, чтобы они зарегистрировались
import bot.handlers as handlers

def set_commands():
    """Установка команд бота в меню"""
    commands = [
        types.BotCommand("start", "🚀 Запуск / Главная"),
        types.BotCommand("habits", "📋 Мои привычки"),
        types.BotCommand("add", "➕ Добавить привычку"),
        types.BotCommand("public", "🌍 Публичные привычки"),
        types.BotCommand("profile", "👤 Профиль"),
        types.BotCommand("logout", "🔓 Сменить аккаунт"),
        types.BotCommand("help", "ℹ️ Помощь"),
    ]
    try:
        bot.set_my_commands(commands)
        print("✅ Команды настроены в BotFather")
    except Exception as e:
        print(f"⚠️ Не удалось настроить команды: {e}")

if __name__ == '__main__':
    print("🤖 Бот запускается...")
    print(f"🌐 Веб-приложение: {WEB_APP_URL}")
    
    # Настраиваем команды при запуске
    set_commands()
    
    # Запускаем поллинг
    while True:
        try:
            print("🚀 Polling started")
            bot.infinity_polling(timeout=60, long_polling_timeout=60)
        except Exception as e:
            print(f"❌ Polling error: {e}")
            time.sleep(5)
