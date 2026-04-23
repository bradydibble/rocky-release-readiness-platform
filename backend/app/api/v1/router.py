from fastapi import APIRouter

from app.api.v1 import admin, auth, export, import_results, milestones, releases, results, sections, test_cases

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(releases.router)
api_router.include_router(milestones.router)
api_router.include_router(sections.router)
api_router.include_router(test_cases.router)
api_router.include_router(results.router)
api_router.include_router(export.router)
api_router.include_router(import_results.router)
api_router.include_router(admin.router)
