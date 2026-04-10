from pydantic import BaseModel, ConfigDict


class SectionCreate(BaseModel):
    name: str
    architecture: str | None = None
    sort_order: int = 0


class SectionUpdate(BaseModel):
    name: str | None = None
    architecture: str | None = None
    sort_order: int | None = None


class SectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    milestone_id: int
    name: str
    architecture: str | None
    sort_order: int
