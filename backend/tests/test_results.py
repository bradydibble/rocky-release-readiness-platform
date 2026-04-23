"""
Result submission tests.

Spec gaps flagged in comments:
- DELETE /results/{id} has no auth check — anyone can delete results
- Quick submission still requires an `outcome` field in the schema even though
  it is ignored; schema should make outcome optional for quick mode
- Carry-forward is not idempotent (see test_carry_forward.py)
"""
import pytest


# ── Detailed result submission ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_detailed_pass(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "PASS",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submitter_name": "alice",
            "hardware_notes": "ThinkPad X1 Carbon Gen 11",
            "comment": "Installed cleanly, no issues.",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["outcome"] == "PASS"
    assert data["arch"] == "x86_64"
    assert data["submitter_name"] == "alice"
    assert data["submission_method"] == "detailed"
    assert data["carried_from_milestone_id"] is None


@pytest.mark.asyncio
async def test_submit_detailed_fail_with_bug_url(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "FAIL",
            "arch": "aarch64",
            "deploy_type": "vm-kvm",
            "bug_url": "https://bugzilla.redhat.com/show_bug.cgi?id=12345",
            "comment": "SELinux denials on first boot, see BZ#12345.",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["outcome"] == "FAIL"
    assert data["bug_url"] == "https://bugzilla.redhat.com/show_bug.cgi?id=12345"


@pytest.mark.asyncio
async def test_submit_detailed_partial(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PARTIAL", "arch": "x86_64", "deploy_type": "vm-kvm"},
    )
    assert resp.status_code == 201
    assert resp.json()["outcome"] == "PARTIAL"


@pytest.mark.asyncio
async def test_submit_detailed_skip(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "SKIP", "arch": "s390x", "deploy_type": "vm-zvm"},
    )
    assert resp.status_code == 201
    assert resp.json()["outcome"] == "SKIP"


@pytest.mark.asyncio
async def test_submit_multiple_results_same_test_case(client, test_case):
    """Multiple testers can submit results for the same test case."""
    for arch in ("x86_64", "aarch64"):
        resp = await client.post(
            f"/api/v1/test-cases/{test_case['id']}/results",
            json={"outcome": "PASS", "arch": arch, "deploy_type": "bare-metal"},
        )
        assert resp.status_code == 201

    resp = await client.get(f"/api/v1/test-cases/{test_case['id']}/results")
    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ── Quick result submission ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_quick_works_maps_to_pass(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "PASS",  # required by schema but overridden for quick mode
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submission_method": "quick",
            "quick_outcome": "works",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["outcome"] == "PASS"
    assert data["submission_method"] == "quick"
    assert data["quick_outcome"] == "works"


@pytest.mark.asyncio
async def test_quick_issues_maps_to_partial(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "PARTIAL",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submission_method": "quick",
            "quick_outcome": "issues",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["outcome"] == "PARTIAL"


@pytest.mark.asyncio
async def test_quick_broken_maps_to_fail(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "FAIL",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submission_method": "quick",
            "quick_outcome": "broken",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["outcome"] == "FAIL"


@pytest.mark.asyncio
async def test_quick_invalid_quick_outcome(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "PASS",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submission_method": "quick",
            "quick_outcome": "dunno",  # invalid
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_quick_missing_quick_outcome(client, test_case):
    """quick_outcome=None with submission_method=quick should fail validation."""
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "PASS",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submission_method": "quick",
            # quick_outcome omitted
        },
    )
    assert resp.status_code == 422


# ── Bug URL validation ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_bug_url_must_start_with_http(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "FAIL",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "bug_url": "bugzilla.redhat.com/1234",  # missing scheme
        },
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_bug_url_http_accepted(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={
            "outcome": "FAIL",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "bug_url": "http://bugzilla.redhat.com/1234",
        },
    )
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_bug_url_none_accepted(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    assert resp.status_code == 201
    assert resp.json()["bug_url"] is None


# ── Closed milestone enforcement ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_closed_milestone_rejects_new_results(client, test_case_in_closed):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case_in_closed['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    assert resp.status_code == 409
    assert "closed" in resp.json()["detail"].lower()


# ── 404 cases ─────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_submit_to_nonexistent_test_case(client):
    resp = await client.post(
        "/api/v1/test-cases/9999/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    assert resp.status_code == 404


# ── List endpoints ─────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_results_for_milestone(client, milestone, test_case):
    await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    resp = await client.get(f"/api/v1/milestones/{milestone['id']}/results")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_list_results_for_test_case(client, test_case):
    await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    resp = await client.get(f"/api/v1/test-cases/{test_case['id']}/results")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


# ── Delete ─────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_result(client, test_case):
    create_resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    result_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/v1/results/{result_id}")
    assert resp.status_code == 204
    # Confirm gone
    resp = await client.get(f"/api/v1/test-cases/{test_case['id']}/results")
    assert resp.json() == []


@pytest.mark.asyncio
async def test_delete_result_not_found(client):
    resp = await client.delete("/api/v1/results/9999")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_result_no_auth_required(client, test_case):
    """
    SPEC GAP: DELETE /results/{id} has no admin requirement.
    Any anonymous user can delete any result.
    This test documents the current behaviour; if auth is added later,
    this test should change to assert 401 for unauthenticated callers.
    """
    create_resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    result_id = create_resp.json()["id"]
    # unauthenticated client can delete — this is a gap
    resp = await client.delete(f"/api/v1/results/{result_id}")
    assert resp.status_code == 204


# ── X-Username header ─────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_x_username_used_as_submitter(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        headers={"X-Username": "tester-via-header"},
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )
    assert resp.status_code == 201
    assert resp.json()["submitter_name"] == "tester-via-header"


@pytest.mark.asyncio
async def test_body_submitter_name_takes_precedence_over_header(client, test_case):
    resp = await client.post(
        f"/api/v1/test-cases/{test_case['id']}/results",
        headers={"X-Username": "header-name"},
        json={
            "outcome": "PASS",
            "arch": "x86_64",
            "deploy_type": "bare-metal",
            "submitter_name": "body-name",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["submitter_name"] == "body-name"
