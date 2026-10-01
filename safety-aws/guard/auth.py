"""The client credential every safety route uses (same check as handler.mjs and age/handler.py).

x-client-id / x-client-token, checked against the RPAPIR client table: the
SHA-256 of the token must equal the stored tokenHash, and the client must not
be revoked.
"""

import hashlib
import hmac
import os
import re

import boto3

_ddb = boto3.client("dynamodb")


def authenticated(headers: dict) -> bool:
    client_id, token = headers.get("x-client-id"), headers.get("x-client-token")
    if not isinstance(client_id, str) or not client_id or len(client_id) > 128:
        return False
    if not isinstance(token, str) or not token or len(token) > 512:
        return False
    item = _ddb.get_item(
        TableName=os.environ["CLIENT_TABLE_NAME"],
        Key={"clientId": {"S": client_id}},
        ConsistentRead=True,
        ProjectionExpression="tokenHash, revokedAt",
    ).get("Item") or {}
    expected = (item.get("tokenHash") or {}).get("S", "")
    if "revokedAt" in item or not re.fullmatch(r"[a-fA-F0-9]{64}", expected):
        return False
    return hmac.compare_digest(hashlib.sha256(token.encode()).hexdigest(), expected.lower())
