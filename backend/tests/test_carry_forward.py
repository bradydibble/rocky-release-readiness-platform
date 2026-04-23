"""
Carry-forward tests.

Spec gaps flagged in comments:
- Carry-forward is not idempotent: calling it twice duplicates results.
  The RESF process would typically run this once per milestone, but the API
  doesn't prevent double-execution.
"""
import pytest


async def _create_full_hierarchy(admin_client, release_name="Rocky Linux", version="9.7"):
    """Helper: create release → milestone → section → test cases, return ids."""
    rel = (await admin_client.post(
        "/api/v1/releases", json={"name": release_name, "version": version}
    )).json()
    ms = (await admin_client.post(
        f"/api/v1/milestones/releases/{rel['id']}",
        json={"name": "rc1", "status": "open"},
    )).json()
    sec = (await admin_client.post(
        f"/api/v1/milestones/{ms['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )).json()
    tc1 = (await admin_client.post(
        f"/api/v1/sections/{sec['id']}/test-cases",
        json={"name": "SELinux enforcing", "blocking": "blocker"},
    )).json()
    tc2 = (await admin_client.post(
        f"/api/v1/sections/{sec['id']}/test-cases",
        json={"name": "Firewalld default zone", "blocking": "normal"},
    )).json()
    return rel, ms, sec, tc1, tc2


@pytest.mark.asyncio
async def test_carry_forward_basic(admin_client):
    # Source milestone with results
    rel, src_ms, sec, tc1, tc2 = await _create_full_hierarchy(admin_client, version="9.7")

    await admin_client.post(
        f"/api/v1/test-cases/{tc1['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal", "submitter_name": "alice"},
    )
    await admin_client.post(
        f"/api/v1/test-cases/{tc2['id']}/results",
        json={"outcome": "PARTIAL", "arch": "x86_64", "deploy_type": "bare-metal"},
    )

    # Target milestone — same section/test case names, fresh milestone
    dst_rel = (await admin_client.post(
        "/api/v1/releases", json={"name": "Rocky Linux", "version": "9.8"}
    )).json()
    dst_ms = (await admin_client.post(
        f"/api/v1/milestones/releases/{dst_rel['id']}",
        json={"name": "beta", "status": "open"},
    )).json()
    dst_sec = (await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )).json()
    dst_tc1 = (await admin_client.post(
        f"/api/v1/sections/{dst_sec['id']}/test-cases",
        json={"name": "SELinux enforcing", "blocking": "blocker"},
    )).json()
    dst_tc2 = (await admin_client.post(
        f"/api/v1/sections/{dst_sec['id']}/test-cases",
        json={"name": "Firewalld default zone", "blocking": "normal"},
    )).json()

    resp = await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/carry-forward",
        json={"source_milestone_id": src_ms["id"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["copied"] == 2
    assert data["source_milestone_id"] == src_ms["id"]

    # Verify results landed in destination
    results = (await admin_client.get(f"/api/v1/milestones/{dst_ms['id']}/results")).json()
    assert len(results) == 2
    for r in results:
        assert r["carried_from_milestone_id"] == src_ms["id"]


@pytest.mark.asyncio
async def test_carry_forward_requires_admin(client, milestone):
    resp = await client.post(
        f"/api/v1/milestones/{milestone['id']}/carry-forward",
        json={"source_milestone_id": 1},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_carry_forward_source_not_found(admin_client, milestone):
    resp = await admin_client.post(
        f"/api/v1/milestones/{milestone['id']}/carry-forward",
        json={"source_milestone_id": 9999},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_carry_forward_target_not_found(admin_client, milestone):
    resp = await admin_client.post(
        "/api/v1/milestones/9999/carry-forward",
        json={"source_milestone_id": milestone["id"]},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_carry_forward_skips_unmatched_test_cases(admin_client):
    """Test cases that don't exist in the target are silently skipped."""
    rel, src_ms, sec, tc1, _ = await _create_full_hierarchy(admin_client, version="9.7")

    await admin_client.post(
        f"/api/v1/test-cases/{tc1['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )

    # Target milestone has different test case names
    dst_rel = (await admin_client.post(
        "/api/v1/releases", json={"name": "Rocky Linux", "version": "9.8"}
    )).json()
    dst_ms = (await admin_client.post(
        f"/api/v1/milestones/releases/{dst_rel['id']}",
        json={"name": "beta", "status": "open"},
    )).json()
    dst_sec = (await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )).json()
    await admin_client.post(
        f"/api/v1/sections/{dst_sec['id']}/test-cases",
        json={"name": "Completely different test case name", "blocking": "normal"},
    )

    resp = await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/carry-forward",
        json={"source_milestone_id": src_ms["id"]},
    )
    assert resp.status_code == 200
    assert resp.json()["copied"] == 0


@pytest.mark.asyncio
async def test_carry_forward_not_idempotent(admin_client):
    """
    SPEC GAP: Running carry-forward twice duplicates results.
    The API should either be idempotent or return 409 on re-run.
    This test documents the current (undesirable) behaviour.
    """
    rel, src_ms, sec, tc1, _ = await _create_full_hierarchy(admin_client, version="9.7")
    await admin_client.post(
        f"/api/v1/test-cases/{tc1['id']}/results",
        json={"outcome": "PASS", "arch": "x86_64", "deploy_type": "bare-metal"},
    )

    dst_rel = (await admin_client.post(
        "/api/v1/releases", json={"name": "Rocky Linux", "version": "9.8"}
    )).json()
    dst_ms = (await admin_client.post(
        f"/api/v1/milestones/releases/{dst_rel['id']}",
        json={"name": "beta", "status": "open"},
    )).json()
    dst_sec = (await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )).json()
    await admin_client.post(
        f"/api/v1/sections/{dst_sec['id']}/test-cases",
        json={"name": "SELinux enforcing", "blocking": "blocker"},
    )

    await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/carry-forward",
        json={"source_milestone_id": src_ms["id"]},
    )
    await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/carry-forward",
        json={"source_milestone_id": src_ms["id"]},
    )

    results = (await admin_client.get(f"/api/v1/milestones/{dst_ms['id']}/results")).json()
    # Currently duplicates — this should be 1 in a fixed implementation
    assert len(results) == 2, (
        "KNOWN SPEC GAP: carry-forward is not idempotent, results were duplicated"
    )


@pytest.mark.asyncio
async def test_carry_forward_preserves_metadata(admin_client):
    """Carried results preserve original outcome, arch, deploy_type, submitter."""
    rel, src_ms, sec, tc1, _ = await _create_full_hierarchy(admin_client, version="9.7")
    await admin_client.post(
        f"/api/v1/test-cases/{tc1['id']}/results",
        json={
            "outcome": "PARTIAL",
            "arch": "aarch64",
            "deploy_type": "vm-kvm",
            "submitter_name": "bob",
            "comment": "Partial pass on aarch64 KVM",
            "bug_url": "https://bugzilla.redhat.com/123",
        },
    )

    dst_rel = (await admin_client.post(
        "/api/v1/releases", json={"name": "Rocky Linux", "version": "9.8"}
    )).json()
    dst_ms = (await admin_client.post(
        f"/api/v1/milestones/releases/{dst_rel['id']}",
        json={"name": "beta", "status": "open"},
    )).json()
    dst_sec = (await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/sections",
        json={"name": "Post-Installation Requirements", "architecture": "x86_64"},
    )).json()
    await admin_client.post(
        f"/api/v1/sections/{dst_sec['id']}/test-cases",
        json={"name": "SELinux enforcing", "blocking": "blocker"},
    )

    await admin_client.post(
        f"/api/v1/milestones/{dst_ms['id']}/carry-forward",
        json={"source_milestone_id": src_ms["id"]},
    )

    results = (await admin_client.get(f"/api/v1/milestones/{dst_ms['id']}/results")).json()
    assert len(results) == 1
    r = results[0]
    assert r["outcome"] == "PARTIAL"
    assert r["arch"] == "aarch64"
    assert r["deploy_type"] == "vm-kvm"
    assert r["submitter_name"] == "bob"
    assert r["comment"] == "Partial pass on aarch64 KVM"
    assert r["bug_url"] == "https://bugzilla.redhat.com/123"
    assert r["carried_from_milestone_id"] == src_ms["id"]
