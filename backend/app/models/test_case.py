from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class TestCase(Base):
    __tablename__ = "test_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(500))
    procedure_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    blocking: Mapped[str] = mapped_column(String(20), default="normal")  # blocker / normal
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    admin_signoff: Mapped[bool] = mapped_column(Boolean, default=False)
    signoff_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    signoff_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    section: Mapped["Section"] = relationship("Section", back_populates="test_cases")  # noqa: F821
    results: Mapped[list["Result"]] = relationship(  # noqa: F821
        "Result",
        back_populates="test_case",
        cascade="all, delete-orphan",
    )
