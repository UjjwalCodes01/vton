#!/usr/bin/env bash
# Route an environment's custom domains to its Express Mode services:
#
#   infra/scripts/attach-domains.sh <staging|prod> [--check]
#
# Reads custom_domains from infra/env/<env>.tfvars. For each app, finds the
# listener rule Express Mode made for the service (the one matching its
# cl-<id>.ecs.<region>.on.aws host) and adds the custom domain to that rule's
# host-header values. Same rule, so canary deployments keep shifting traffic
# for both names. Safe to run again: a domain already there is left alone.
# The certificate for the domains is attached by Terraform (env/domains.tf);
# run this after that apply. --check only reports what is routed where.
set -euo pipefail
cd "$(dirname "$0")/../.."
export MSYS_NO_PATHCONV=1

ENV_NAME="${1:?env: staging or prod}"
MODE="${2:-apply}"
case "$ENV_NAME" in staging|prod) ;; *) echo "env must be staging or prod" >&2; exit 1 ;; esac
PY=python3; "$PY" -c '' 2>/dev/null || PY=python

"$PY" - "$ENV_NAME" "$MODE" <<'EOF'
import json, re, subprocess, sys

env, mode = sys.argv[1], sys.argv[2]
region = "us-east-1"

def aws(*args):
    out = subprocess.check_output(["aws", *args, "--region", region, "--output", "json"])
    return json.loads(out) if out.strip() else {}

tfvars = open(f"infra/env/{env}.tfvars", encoding="utf-8").read()
block = re.search(r"^custom_domains\s*=\s*\{(.*?)^\}", tfvars, re.S | re.M)
if not block:
    sys.exit(f"no custom_domains in infra/env/{env}.tfvars")
domains = dict(re.findall(r'^\s*(\w+)\s*=\s*"([^"]+)"', block.group(1), re.M))

account = aws("sts", "get-caller-identity")["Account"]
lbs = aws("resourcegroupstaggingapi", "get-resources", "--resource-type-filters", "elasticloadbalancing:loadbalancer",
          "--tag-filters", "Key=AmazonECSManaged,Values=true", "Key=project,Values=clothsy", f"Key=env,Values={env}")
lb_arns = [r["ResourceARN"] for r in lbs.get("ResourceTagMappingList", [])]
if len(lb_arns) != 1:
    sys.exit(f"expected one Express load balancer for {env}, found {len(lb_arns)}")
listener = [l for l in aws("elbv2", "describe-listeners", "--load-balancer-arn", lb_arns[0])["Listeners"] if l["Port"] == 443][0]
rules = aws("elbv2", "describe-rules", "--listener-arn", listener["ListenerArn"])["Rules"]

def hosts_of(rule):
    for c in rule["Conditions"]:
        if c["Field"] == "host-header":
            return c.get("HostHeaderConfig", {}).get("Values") or c.get("Values") or []
    return []

failed = False
for app, domain in sorted(domains.items()):
    service_arn = f"arn:aws:ecs:{region}:{account}:service/clothsy-{env}/clothsy-{env}-{app}"
    configs = aws("ecs", "describe-express-gateway-service", "--service-arn", service_arn)["service"]["activeConfigurations"]
    endpoint = max(configs, key=lambda c: c["createdAt"])["ingressPaths"][0]["endpoint"]
    express_host = endpoint.split("://", 1)[-1].rstrip("/")
    rule = next((r for r in rules if express_host in hosts_of(r)), None)
    if rule is None:
        print(f"[{app}] no listener rule for {express_host}"); failed = True; continue
    hosts = hosts_of(rule)
    if domain in hosts:
        print(f"[{app}] {domain} already routed (rule {rule['Priority']})"); continue
    if mode == "--check":
        print(f"[{app}] {domain} NOT routed yet (rule {rule['Priority']} has {', '.join(hosts)})"); continue
    conditions = [c for c in rule["Conditions"] if c["Field"] != "host-header"]
    conditions.append({"Field": "host-header", "HostHeaderConfig": {"Values": hosts + [domain]}})
    aws("elbv2", "modify-rule", "--rule-arn", rule["RuleArn"], "--conditions", json.dumps(conditions))
    print(f"[{app}] {domain} added to rule {rule['Priority']} (with {express_host})")
sys.exit(1 if failed else 0)
EOF
