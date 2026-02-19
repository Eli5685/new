from bot.services.supabase_service import supabase
import sys
sys.stdout.reconfigure(encoding='utf-8')

print("🔍 Checking 5 most recent profiles...")

try:
    res = supabase.table('profiles').select('*').order('created_at', desc=True).limit(5).execute()
    for p in res.data:
        print(f"User: {p['display_name']} | ChatID: {p.get('telegram_chat_id')} | Created: {p['created_at']}")
except Exception as e:
    print(f"❌ Error: {e}")
