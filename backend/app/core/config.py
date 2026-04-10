from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PORT: int = 8000
    ADMIN_TOKEN: str = "changeme"
    SECRET_KEY: str = "changeme"
    DATABASE_URL: str = "postgresql+asyncpg://r3p:changeme@localhost:5432/r3p"


settings = Settings()
