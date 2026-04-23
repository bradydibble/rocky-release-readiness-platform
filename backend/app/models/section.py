from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base

SECTION_CATEGORIES = (
    "installer",
    "cloud",
    "post_install",
    "repository",
    "virtualization",
    "guest_compat",
    "upgrade",
    "security",
    "hardware",
    "operations",
    "release_gate",
)


class Section(Base):
    __tablename__ = "sections"

    id: Mapped[int] = mapped_column(primary_key=True)
    milestone_id: Mapped[int] = mapped_column(
        ForeignKey("milestones.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(255))
    architecture: Mapped[str | None] = mapped_column(String(50), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)

    milestone: Mapped["Milestone"] = relationship(  # noqa: F821
        "Milestone", back_populates="sections"
    )
    test_cases: Mapped[list["TestCase"]] = relationship(  # noqa: F821
        "TestCase",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="TestCase.sort_order",
    )
