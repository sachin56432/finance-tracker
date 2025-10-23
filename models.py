from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), index=True)      # length specified for MySQL
    amount = Column(Float)
    category = Column(String(50))
    created_at = Column(DateTime, default=datetime.utcnow)
