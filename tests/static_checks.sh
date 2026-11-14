#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
for f in "$ROOT"/assets/js/*.js; do node --check "$f"; done
node --check < "$ROOT/appscript/Code.gs"
python -m json.tool "$ROOT/appscript/appsscript.json" >/dev/null
python - "$ROOT" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]);a=(p/'assets/js/app.js').read_text(); backend=(p/'appscript/Code.gs').read_text()
for key in ['new-topic','edit-topic','new-group','add-member','remove-member','present','next-slide','prev-slide','full-screen','zoom-slide','comment','revision','open-quiz']:
 assert key in a,key
for key in ['createTopic','updateTopic','createGroup','updateGroup','getMedia','addFeedback','setQuiz','answerQuiz','exportTopic']:
 assert f"case '{key}'" in backend,key
for field in ['membersJSON','requirements','targetUrl','type']:
 assert field in backend,field
assert 'no-cors' not in a
print('PASS: syntax, manifest, activity & membership UI, backend actions')
PY
