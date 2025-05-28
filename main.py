import requests, os, json
from dotenv import load_dotenv

load_dotenv()

URL = "https://status.openai.com/summary.json"
SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL")
WATCHED = [x.strip() for x in os.getenv("WATCHED_COMPONENTS", "").split(",")]

SEEN_PATH = "seen.json"
if os.path.exists(SEEN_PATH):
    with open(SEEN_PATH) as f:
        seen = json.load(f)
else:
    seen = {"incidents": [], "components": {}}

def post_slack(msg):
    requests.post(SLACK_WEBHOOK, json={"text": msg})

def main():
    r = requests.get(URL)
    data = r.json()

    # Check component status changes
    for c in data["components"]:
        name = c["name"]
        status = c["status"]
        if name in WATCHED:
            prev = seen["components"].get(name)
            if prev != status:
                msg = f"*{name}* is now `{status}`"
                post_slack(msg)
                seen["components"][name] = status

    # Check new incident updates
    for i in data["incidents"]:
        id = i["id"]
        if id not in seen["incidents"]:
            affected = [c["name"] for c in i["components"] if c["name"] in WATCHED]
            if affected:
                msg = f"*Incident:* {i['name']}\nStatus: `{i['status']}`\nAffected: {', '.join(affected)}\n<{i['shortlink']}|View Incident>"
                post_slack(msg)
                seen["incidents"].append(id)

    with open(SEEN_PATH, "w") as f:
        json.dump(seen, f, indent=2)

if __name__ == "__main__":
    main()