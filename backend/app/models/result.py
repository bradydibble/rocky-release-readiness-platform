from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Result(Base):
    __tablename__ = "results"

    id: Mapped[int] = mapped_column(primary_key=True)
    test_case_id: Mapped[int] = mapped_column(
        ForeignKey("test_cases.id", ondelete="CASCADE")
    )
    outcome: Mapped[str] = mapped_column(String(20))  # PASS / FAIL / PARTIAL / SKIP
    arch: Mapped[str] = mapped_column(String(50))
    deploy_type: Mapped[str] = mapped_column(String(100))
    hardware_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submission_method: Mapped[str] = mapped_column(String(20), default="detailed")  # quick | detailed
    quick_outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)  # works | issues | broken
    bug_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    submit_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    carried_from_milestone_id: Mapped[int | None] = mapped_column(
        ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    test_case: Mapped["TestCase"] = relationship(  # noqa: F821
        "TestCase", back_populates="results"
    )
    carried_from_milestone: Mapped["Milestone | None"] = relationship(  # noqa: F821
        "Milestone", foreign_keys=[carried_from_milestone_id]
    )
    user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", foreign_keys=[user_id]
    )
