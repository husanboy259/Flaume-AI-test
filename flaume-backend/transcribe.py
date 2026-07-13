import sys, json
from faster_whisper import WhisperModel

# "small" = good quality, understands many languages (including Uzbek).
# First run downloads the model (~500 MB) - be patient once, then it's cached.
model = WhisperModel("small", device="cpu", compute_type="int8")

segments, info = model.transcribe(sys.argv[1])
text = " ".join(s.text.strip() for s in segments)

print(json.dumps({"text": text, "language": info.language}, ensure_ascii=False))
