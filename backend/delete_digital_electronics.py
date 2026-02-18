from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def delete_questions():
    db: Session = SessionLocal()
    try:
        subject = "Digital Electronics"
        print(f"Deleting questions for subject: {subject}...")
        
        # Count before delete
        count = db.query(models.MasterQuestion).filter(models.MasterQuestion.subject == subject).count()
        print(f"Found {count} questions.")
        
        if count > 0:
            db.query(models.MasterQuestion).filter(models.MasterQuestion.subject == subject).delete(synchronize_session=False)
            db.commit()
            print("Deletion complete.")
        else:
            print("No questions found.")
            
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_questions()
