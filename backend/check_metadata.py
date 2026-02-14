import models
from database import Base

print("Imported models.")
print(f"Metadata keys: {list(Base.metadata.tables.keys())}")


from database import engine, SessionLocal
from sqlalchemy import text

# Add column if not exists
print("Adding is_important column...")
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE user_progress ADD COLUMN is_important BOOLEAN DEFAULT 0"))
        conn.commit()
    print("Column added successfully.")
except Exception as e:
    if "duplicate column name" in str(e):
        print("Column already exists.")
    else:
        print(f"Error adding column: {e}")

# Verify
with engine.connect() as conn:
    result = conn.execute(text("PRAGMA table_info(user_progress)"))
    columns = [row[1] for row in result]
    print(f"Columns in user_progress: {columns}")

if "is_important" in columns:
    print("Column confirmed.")


db = SessionLocal()
try:
    print("Querying UserProgress...")
    progs = db.query(models.UserProgress).all()
    print(f"Found {len(progs)} records.")
    for p in progs:
        print(f"Record: {p.user_id}, {p.chapter_id}")
        print(f"last_read_at value: {p.last_read_at}, type: {type(p.last_read_at)}")
        if p.last_read_at:
             try:
                 ts = p.last_read_at.timestamp()
                 print(f"Timestamp: {ts}")
             except AttributeError:
                 print("ERROR: last_read_at has no timestamp() method")
except Exception as e:
    print(f"Query failed: {e}")
finally:
    db.close()
