# security

Can the change be abused? Runs because blast radius is high or a sensitive path was touched; weigh findings by that radius.

Look for: missing or weakened authn/authz checks; untrusted input reaching SQL, shell, file paths, templates, eval, deserialisation or URLs (SSRF); secrets or tokens in code, logs or errors; overly broad permissions, CORS or CI tokens; new dependencies (pinning, maintainer, install scripts); crypto misuse; data exposure in responses or logs; CI workflows running untrusted PR code with secrets.

`blocker` for anything exploitable by an outside party. Name the entry point and what an attacker gains.
