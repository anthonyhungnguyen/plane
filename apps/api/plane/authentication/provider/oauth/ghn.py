# Python imports
import os
from urllib.parse import urlencode, urlparse, urlunparse

import requests

# Module imports
from plane.authentication.adapter.oauth import OauthAdapter
from plane.db.models import Account, User
from plane.authentication.adapter.error import (
    AuthenticationException,
    AUTHENTICATION_ERROR_CODES,
)
from plane.license.utils.instance_value import get_configuration_value


class GHNOAuthProvider(OauthAdapter):
    """
    Custom OAuth2 provider for GHN SSO-style flow.

    Flow overview (aligned to existing adapter lifecycle):
    - get_auth_url(): Build authorization URL with state & redirect_uri
    - set_token_data(): Exchange `code` for access_token using JSON body
      and (optionally) verify access token to obtain `user_id`
    - set_user_data(): Fetch employee info by `user_id` and map to Plane fields
    """

    provider = "ghn"
    scope = os.environ.get("GHN_SSO_SCOPE", "read")

    def _ghn_username(self):
        username = (self.user_data or {}).get("user", {}).get("username")
        return str(username).strip().lower() if username else None

    def resolve_user_for_login(self, email):
        provider_id = (self.user_data or {}).get("user", {}).get("provider_id")
        provider_id = str(provider_id).strip() if provider_id else None
        if provider_id:
            account = (
                Account.objects.select_related("user")
                .filter(provider=self.provider, provider_account_id=provider_id)
                .first()
            )
            if account:
                return account.user

        username = self._ghn_username()
        if username:
            user = User.objects.filter(username=username).first()
            if user:
                return user

        return super().resolve_user_for_login(email)

    def get_signup_username(self):
        return self._ghn_username() or super().get_signup_username()

    @staticmethod
    def _get_email_field_candidates(primary_email_field):
        normalized_primary_field = (primary_email_field or "internal_email").strip() or "internal_email"
        email_fields = []

        for field in [normalized_primary_field, "internal_email", "work_email", "personal_email"]:
            if field not in email_fields:
                email_fields.append(field)

        return email_fields

    @classmethod
    def _resolve_email(cls, info, primary_email_field):
        for field in cls._get_email_field_candidates(primary_email_field):
            value = str(info.get(field) or "").strip()
            if value:
                return value

        candidate_code = str(info.get("candidate_code") or "").strip()
        if candidate_code:
            return f"{candidate_code}@ghn.vn"

        return ""

    def __init__(self, request, code=None, state=None, callback=None):
        (
            APP_KEY,
            APP_SECRET,
            AUTHORIZE_URL,
            TOKEN_URL,
            VERIFY_TOKEN_URL,
            EMPLOYEE_INFO_URL,
            EMPLOYEE_INFO_AUTH,
            PRIMARY_EMAIL_FIELD,
            IS_GHN_ENABLED,
        ) = get_configuration_value(
            [
                {"key": "GHN_SSO_APP_KEY", "default": os.environ.get("GHN_SSO_APP_KEY")},
                {"key": "GHN_SSO_APP_SECRET", "default": os.environ.get("GHN_SSO_APP_SECRET")},
                {"key": "GHN_SSO_AUTHORIZE_URL", "default": os.environ.get("GHN_SSO_AUTHORIZE_URL")},
                {"key": "GHN_SSO_GEN_ACCESS_TOKEN_URL", "default": os.environ.get("GHN_SSO_GEN_ACCESS_TOKEN_URL")},
                {"key": "GHN_SSO_VERIFY_ACCESS_TOKEN_URL", "default": os.environ.get("GHN_SSO_VERIFY_ACCESS_TOKEN_URL")},
                {"key": "GHN_EMPLOYEE_INFO_URL", "default": os.environ.get("GHN_EMPLOYEE_INFO_URL")},
                {"key": "GHN_EMPLOYEE_INFO_AUTH", "default": os.environ.get("GHN_EMPLOYEE_INFO_AUTH")},
                {
                    "key": "GHN_SSO_PRIMARY_EMAIL_FIELD",
                    "default": os.environ.get("GHN_SSO_PRIMARY_EMAIL_FIELD", "internal_email"),
                },
                {"key": "IS_GHN_ENABLED", "default": os.environ.get("IS_GHN_ENABLED", "0")},
            ]
        )

        if not (IS_GHN_ENABLED == "1" and APP_KEY and APP_SECRET and AUTHORIZE_URL and TOKEN_URL and EMPLOYEE_INFO_URL):
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["OAUTH_NOT_CONFIGURED"],
                error_message="OAUTH_NOT_CONFIGURED",
            )

        # Sanitize app key in case someone pasted a value with a query string
        self.app_key = (APP_KEY or "").split("?")[0]
        self.client_secret = APP_SECRET
        # Normalize authorize URL to remove any query/fragment (e.g., '?app_key=...')
        _parsed_auth = urlparse(AUTHORIZE_URL or "")
        self.authorize_url = urlunparse((_parsed_auth.scheme, _parsed_auth.netloc, _parsed_auth.path, "", "", ""))
        self.verify_token_url = VERIFY_TOKEN_URL
        self.employee_info_url = EMPLOYEE_INFO_URL
        self.employee_info_auth = EMPLOYEE_INFO_AUTH
        self.primary_email_field = PRIMARY_EMAIL_FIELD

        # Build redirect and auth URL
        redirect_uri = f"""{"https" if request.is_secure() else "http"}://{request.get_host()}/auth/ghn/callback/"""
        # GHN expects `app_key` in authorize query (not `client_id`)
        url_params = {
            "app_key": self.app_key,
            "scope": self.scope,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "state": state,
        }
        auth_url = f"{self.authorize_url}?{urlencode(url_params)}"

        # Use TOKEN_URL as token_url for base adapter purposes
        super().__init__(
            request,
            self.provider,
            self.app_key,
            self.scope,
            redirect_uri,
            auth_url,
            TOKEN_URL,
            "",  # userinfo_url unused; we call custom employee info API
            self.client_secret,
            code,
            callback=callback,
        )

        # Will store user_id from verification step
        self.user_id = None

    def authentication_error_code(self):
        # Fallback to generic messages in UI
        return "OAUTH_NOT_CONFIGURED"

    def set_token_data(self):
        """Exchange authorization code and verify access token.

        Expected JSON contract per GHN SSO example:
        - POST TOKEN_URL with JSON: { authorization_code, app_key, app_secret, user_agent, remote_ip }
        - POST VERIFY_TOKEN_URL with JSON: { access_token, app_key, app_secret, user_agent, remote_ip }
        """
        try:
            ua = self.request.META.get("HTTP_USER_AGENT", "")
            ip = self.request.META.get("REMOTE_ADDR", "")

            token_resp = requests.post(
                url=self.get_token_url(),
                timeout=60,
                json={
                    "authorization_code": self.code,
                    "app_key": self.app_key,
                    "app_secret": self.client_secret,
                    "user_agent": ua,
                    "remote_ip": ip,
                },
            )
            token_resp.raise_for_status()
            token_json = token_resp.json() or {}
            access_token = (token_json.get("data") or {}).get("access_token") or token_json.get("access_token")
            if not access_token:
                raise AuthenticationException(
                    error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED"],
                    error_message="AUTHENTICATION_FAILED",
                )

            # Optionally verify token to obtain user_id
            user_id = None
            if self.verify_token_url:
                verify_resp = requests.post(
                    url=self.verify_token_url,
                    timeout=60,
                    json={
                        "access_token": access_token,
                        "app_key": self.app_key,
                        "app_secret": self.client_secret,
                        "user_agent": ua,
                        "remote_ip": ip,
                    },
                )
                verify_resp.raise_for_status()
                verify_json = verify_resp.json() or {}
                user_id = (verify_json.get("data") or {}).get("user_id") or verify_json.get("user_id")

            self.user_id = user_id

            super().set_token_data(
                {
                    "access_token": access_token,
                    # Expirations unknown; set None
                    "refresh_token": None,
                    "access_token_expired_at": None,
                    "refresh_token_expired_at": None,
                    "id_token": "",
                }
            )
        except AuthenticationException:
            raise
        except requests.RequestException as exc:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED"],
                error_message="AUTHENTICATION_FAILED",
            ) from exc

    def set_user_data(self):
        """Fetch user info from employee info endpoint and map fields."""
        try:
            if not self.user_id:
                # If verify step not configured to return user_id, try to fetch from token data or fail
                raise AuthenticationException(
                    error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED"],
                    error_message="AUTHENTICATION_FAILED",
                )

            headers = {
                "Content-Type": "application/json",
            }
            if self.employee_info_auth:
                headers["Authorization"] = self.employee_info_auth

            info_resp = requests.post(
                url=self.employee_info_url,
                timeout=60,
                headers=headers,
                json={"employee_id": self.user_id},
            )
            info_resp.raise_for_status()
            info_json = info_resp.json() or {}
            info = info_json.get("data") or info_json

            # Extract fields with fallbacks
            full_name = (info.get("full_name") or "").strip()
            if full_name:
                parts = full_name.split()
                first_name = parts[-1]
                last_name = " ".join(parts[:-1]) if len(parts) > 1 else ""
            else:
                first_name = ""
                last_name = ""

            email = self._resolve_email(info, self.primary_email_field)

            provider_id = str(info.get("_id") or info.get("id") or self.user_id)
            avatar = info.get("avatar", "")

            user_data = {
                "email": email,
                "user": {
                    "avatar": avatar,
                    "first_name": first_name,
                    "last_name": last_name,
                    "provider_id": provider_id,
                    "is_password_autoset": True,
                    "username": str(info.get("username") or info.get("domain_name") or "") or None,
                },
            }
            super().set_user_data(user_data)
        except requests.RequestException:
            raise AuthenticationException(
                error_code=AUTHENTICATION_ERROR_CODES["AUTHENTICATION_FAILED"],
                error_message="AUTHENTICATION_FAILED",
            )
