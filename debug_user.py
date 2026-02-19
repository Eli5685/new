from bot.services.supabase_service import get_user_by_chat_id, supabase

import sys
sys.stdout.reconfigure(encoding='utf-8')

chat_id = "8520800449"

print(f"🔍 Checking for chat_id: {chat_id}")

# 1. Try using the service helper
user = get_user_by_chat_id(chat_id)
if user:
    print(f"✅ Found user via helper: {user['display_name']} (ID: {user['id']})")
else:
    print("❌ Helper returned None")

# 2. Try raw query to see if it exists but RLS hides it
try:
    # Service key should bypass RLS, so this is the truth
    res = supabase.table('profiles').select('*').eq('telegram_chat_id', chat_id).execute()
    print(f"📊 Raw Query Result: {len(res.data)} records found.")
    if res.data:
        print(f"   Record: {res.data[0]}")
except Exception as e:
    print(f"❌ Raw query error: {e}")
