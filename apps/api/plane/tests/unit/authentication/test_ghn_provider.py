from plane.authentication.provider.oauth.ghn import GHNOAuthProvider


def test_resolve_email_prefers_configured_internal_email():
    info = {
        "internal_email": "internal@ghn.vn",
        "work_email": "work@ghn.vn",
        "personal_email": "personal@example.com",
    }

    assert GHNOAuthProvider._resolve_email(info, "internal_email") == "internal@ghn.vn"


def test_resolve_email_falls_back_to_internal_email_for_unknown_primary_field():
    info = {
        "work_email": "work@ghn.vn",
        "internal_email": "internal@ghn.vn",
    }

    assert GHNOAuthProvider._resolve_email(info, "preferred_email") == "internal@ghn.vn"


def test_resolve_email_falls_back_to_candidate_code_when_no_email_exists():
    info = {
        "candidate_code": "EMP001",
    }

    assert GHNOAuthProvider._resolve_email(info, "internal_email") == "EMP001@ghn.vn"


def test_new_api_payload_fields_are_available_for_mapping():
    info = {
        "id": 29681190,
        "domain_name": "huylxn",
        "internal_email": "huylxn@ghn.dev",
        "avatar": "https://example.com/avatar.png",
    }

    provider_id = str(info.get("_id") or info.get("id") or "fallback-user-id")
    username = str(info.get("username") or info.get("domain_name") or "") or None

    assert GHNOAuthProvider._resolve_email(info, "internal_email") == "huylxn@ghn.dev"
    assert provider_id == "29681190"
    assert username == "huylxn"
