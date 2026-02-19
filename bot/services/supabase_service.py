from supabase import create_client
from bot.config import SUPABASE_URL, SUPABASE_KEY

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_user_by_chat_id(chat_id: str):
    """Найти профиль пользователя по telegram_chat_id"""
    result = supabase.table('profiles').select('*').eq('telegram_chat_id', str(chat_id)).execute()
    return result.data[0] if result.data else None

def get_habits(chat_id: str):
    """Получить привычки пользователя по chat_id"""
    result = supabase.rpc('get_habits_by_chat_id', {'p_chat_id': str(chat_id)}).execute()
    return result.data or []

def get_public_habits(limit=20):
    result = supabase.table('habits').select(
        'action, place, time, periodicity'
    ).eq('is_public', True).limit(limit).execute()
    return result.data or []

def create_habit(habit_data):
    return supabase.table('habits').insert(habit_data).execute()

def unlink_chat_id(chat_id: str):
    """Отвязать telegram_chat_id от текущего профиля"""
    supabase.table('profiles').update(
        {'telegram_chat_id': None}
    ).eq('telegram_chat_id', str(chat_id)).execute()
