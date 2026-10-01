"""Downloading a provider result image without SSRF exposure.

The same rules as the backend's downloadPublicImage (fabricvton/app/safety.server.ts):
HTTPS on the default port only, no credentials in the URL, no redirects, every
resolved address must be public IPv4, and the connection is pinned to the
address that was checked (no second DNS lookup an attacker could change).
"""

import http.client
import ipaddress
import socket
import ssl
from urllib.parse import urlsplit


class FetchError(Exception):
    """The URL is not allowed, or the image could not be downloaded."""


def _public(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    return ip.version == 4 and ip.is_global and not ip.is_multicast and not ip.is_reserved


class _PinnedHTTPSConnection(http.client.HTTPSConnection):
    def __init__(self, host: str, address: str, timeout: float):
        super().__init__(host, 443, timeout=timeout, context=ssl.create_default_context())
        self._address = address

    def connect(self):
        sock = socket.create_connection((self._address, 443), self.timeout)
        self.sock = self._context.wrap_socket(sock, server_hostname=self.host)


def download(url: str, max_bytes: int, timeout: float = 10.0) -> bytes:
    if not isinstance(url, str) or len(url) > 2048:
        raise FetchError("bad_url")
    parts = urlsplit(url)
    if parts.scheme != "https" or parts.port not in (None, 443) or parts.username or parts.password or not parts.hostname:
        raise FetchError("bad_url")
    try:
        infos = socket.getaddrinfo(parts.hostname, 443, family=socket.AF_INET, type=socket.SOCK_STREAM)
    except OSError as exc:
        raise FetchError("dns") from exc
    addresses = sorted({info[4][0] for info in infos})
    if not addresses or not all(_public(a) for a in addresses):
        raise FetchError("not_public")
    connection = _PinnedHTTPSConnection(parts.hostname, addresses[0], timeout)
    try:
        path = (parts.path or "/") + (f"?{parts.query}" if parts.query else "")
        connection.request("GET", path, headers={"Accept": "image/jpeg,image/png", "User-Agent": "clothsy-guard"})
        response = connection.getresponse()
        if response.status != 200:
            raise FetchError(f"status_{response.status}")
        length = response.getheader("content-length")
        if length and length.isdigit() and int(length) > max_bytes:
            raise FetchError("too_large")
        data = response.read(max_bytes + 1)
        if len(data) > max_bytes:
            raise FetchError("too_large")
        return data
    except (OSError, http.client.HTTPException) as exc:
        raise FetchError("network") from exc
    finally:
        connection.close()
