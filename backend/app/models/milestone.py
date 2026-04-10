from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(primary_key=True)
    release_id: Mapped[int] = mapped_column(ForeignKey("releases.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(50))  # lookahead / beta / rc1 / rc2
    status: Mapped[str] = mapped_column(String(20), default="open")  # open / closed
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    release: Mapped["Release"] = relationship("Release", back_populates="milestones")  # noqa: F821
    sections: Mapped[list["Section"]] = relationship(  # noqa: F821
        "Section",
        back_populates="milestone",
        cascade="all, delete-orphan",
        order_by="Section.sort_order",
    )
