# Adding New Sentences

## Data File

All sentences are stored in `app/data.json`. The structure looks like this:

```json
{
  "book1": [
    {
      "id": 1,
      "tamil": "கொஞ்சம் தண்ணி கொண்டு வா.",
      "english": "Bring some water."
    },
    {
      "id": 2,
      "tamil": "நீ எப்புடிப்பட்ட ஆளு-ன்னு எனக்கு தெரியும்.",
      "english": "I know what kind of person you are."
    }
  ],
  "book2": [...],
  "book3": [...],
  "book4": [...],
  "book5": [...]
}
```

## How to Add Sentences Manually

1. Open `app/data.json`
2. Find the book you want to add to (e.g. `"book1"`)
3. Add a new entry at the end of that book's array:

```json
{
  "id": 197,
  "tamil": "உன் தமிழ் வாக்கியம் இங்கே",
  "english": "Your English sentence here."
}
```

4. Make sure the `id` is the next number after the last sentence in that book

## How to Add a New Book

1. Open `app/data.json`
2. Add a new key like `"book6"` at the end:

```json
{
  "book1": [...],
  "book2": [...],
  "book3": [...],
  "book4": [...],
  "book5": [...],
  "book6": [
    {
      "id": 1,
      "tamil": "தமிழ் வாக்கியம்.",
      "english": "English sentence."
    }
  ]
}
```

3. The website automatically picks up new books and shows them as tabs. No code change needed.

## How to Add Sentences from a New PDF

If you have a new PDF (same format as the existing "English with Cheeni" PDFs), use this extraction script.

### Why Not Simple Text Extraction?

These PDFs use the **Nirmala UI** font with a broken `ToUnicode` CMap. Six Tamil characters are mapped to wrong Unicode codepoints:

| Wrong output | Correct character |
|---|---|
| ெ (vowel sign) | ச (consonant) |
| ை (vowel sign) | ம (consonant) |
| ொ (vowel sign) | ா (vowel sign) |
| ச (consonant) | ெ (vowel sign) |
| ற (consonant) | ே (vowel sign) |
| ய (consonant) | ை (vowel sign) |

The script below fixes the CMap in memory, re-extracts text, and reorders pre-base vowel signs from visual order to Unicode order.

### One-Time Setup

```bash
python3 -m venv /tmp/pdfenv
source /tmp/pdfenv/bin/activate
pip install pymupdf
```

### Extraction Script

Save this as `extract_pdf.py` in the project root and run it:

```bash
source /tmp/pdfenv/bin/activate
python3 extract_pdf.py 6.pdf 6
```

```python
"""
Extract Tamil-English sentence pairs from a PDF.
Fixes the broken ToUnicode CMap in Nirmala UI font, then extracts clean text.

Usage: python3 extract_pdf.py <pdf_file> <book_number>
Example: python3 extract_pdf.py 6.pdf 6
"""

import sys
import pymupdf
import re
import json


def fix_cmap(cmap_text):
    """Fix 6 wrong character mappings in the Nirmala UI ToUnicode CMap."""
    # CID 0B79: ெ(0BC6) → ச(0B9A)
    cmap_text = re.sub(
        r"(<0B77>\s+<0B7[9A]>\s+\[<0B95>\s+<0B99>\s+)<0BC6>",
        r"\g<1><0B9A>",
        cmap_text,
    )
    # CID 0B82: ை(0BC8) → ம(0BAE)
    cmap_text = re.sub(
        r"<0B82>\s+<0B82>\s+\[<0BC8>\]",
        "<0B82> <0B82> [<0BAE>]",
        cmap_text,
    )
    # CID 0B8F: ொ(0BCA) → ா(0BBE)
    cmap_text = re.sub(
        r"<0B8F>\s+<0B8F>\s+\[<0BCA>\]",
        "<0B8F> <0B8F> [<0BBE>]",
        cmap_text,
    )
    # CIDs 0B96-0B98: [ச,ற,ய] → [ெ,ே,ை]
    cmap_text = re.sub(
        r"<0B96>\s+<0B98>\s+\[<0B9A>\s+<0BB1>\s+<0BAF>\]",
        "<0B96> <0B98> [<0BC6> <0BC7> <0BC8>]",
        cmap_text,
    )
    return cmap_text


def reorder_tamil(text):
    """Reorder pre-base vowel signs (ெ, ே, ை) from visual to Unicode order.
    Also combine: ெ+consonant+ா → consonant+ொ, ே+consonant+ா → consonant+ோ
    """
    tamil_consonants = set("கஙசஞடணதநனபமயரறலளழவஷஸஹஜ")
    result = list(text)
    i = 0
    while i < len(result) - 1:
        ch = result[i]
        next_ch = result[i + 1]
        if ch in ("ெ", "ே", "ை") and next_ch in tamil_consonants:
            result[i] = next_ch
            result[i + 1] = ch
            if i + 2 < len(result) and result[i + 2] == "ா":
                if ch == "ெ":
                    result[i + 1] = "ொ"
                    result.pop(i + 2)
                elif ch == "ே":
                    result[i + 1] = "ோ"
                    result.pop(i + 2)
            i += 2
        else:
            i += 1
    return "".join(result)


def find_nirmala_cmap_xref(doc):
    """Find the ToUnicode CMap xref for Nirmala UI font."""
    for xref in range(1, doc.xref_length()):
        try:
            obj = doc.xref_object(xref)
            if "Nirmala" in obj and "ToUnicode" in obj:
                m = re.search(r"/ToUnicode\s+(\d+)\s+0\s+R", obj)
                if m:
                    return int(m.group(1))
        except Exception:
            pass
    return None


def extract_from_pdf(filename):
    doc = pymupdf.open(filename)

    cmap_xref = find_nirmala_cmap_xref(doc)
    if cmap_xref is None:
        print("WARNING: Nirmala UI CMap not found. Tamil text may be wrong.")
    else:
        cmap_bytes = doc.xref_stream(cmap_xref)
        cmap_text = cmap_bytes.decode("utf-8", errors="replace")
        fixed_cmap = fix_cmap(cmap_text)
        doc.update_stream(cmap_xref, fixed_cmap.encode("utf-8"))

    sentences = []
    total_pages = len(doc)

    for page_idx in range(1, total_pages):
        page = doc[page_idx]
        text = page.get_text()
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        if lines and lines[0].isdigit():
            lines = lines[1:]
        lines = [l for l in lines if not re.match(r"^\d{1,3}$", l)]

        i = 0
        while i < len(lines) - 1:
            has_tamil = any("\u0B80" <= c <= "\u0BFF" for c in lines[i])
            if has_tamil:
                tamil_line = lines[i]
                english_parts = []
                j = i + 1
                while j < len(lines):
                    if any("\u0B80" <= c <= "\u0BFF" for c in lines[j]):
                        break
                    english_parts.append(lines[j])
                    j += 1
                if english_parts:
                    english = " ".join(english_parts)
                    english = re.sub(r"\s+\d{1,2}$", "", english).strip()
                    tamil_fixed = reorder_tamil(tamil_line)
                    tamil_fixed = re.sub(r"\s+", " ", tamil_fixed).strip()
                    tamil_chars = sum(
                        1 for c in tamil_fixed if "\u0B80" <= c <= "\u0BFF"
                    )
                    if english and not english.isdigit() and tamil_chars >= 3:
                        sentences.append(
                            {
                                "id": len(sentences) + 1,
                                "tamil": tamil_fixed,
                                "english": english,
                            }
                        )
                    i = j
                else:
                    i += 1
            else:
                i += 1

    doc.close()
    return sentences


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 extract_pdf.py <pdf_file> <book_number>")
        print("Example: python3 extract_pdf.py 6.pdf 6")
        sys.exit(1)

    pdf_file = sys.argv[1]
    book_num = sys.argv[2]

    print(f"Extracting from {pdf_file}...")
    sentences = extract_from_pdf(pdf_file)
    print(f"Extracted {len(sentences)} sentences")

    for s in sentences[:3]:
        print(f"  {s['id']}. {s['tamil']}")
        print(f"     {s['english']}")

    data_path = "app/data.json"
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    book_key = f"book{book_num}"
    data[book_key] = sentences

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Added as '{book_key}' in {data_path}")
    print(f"Run 'npm run dev' and check the website.")
```

## Important Notes

- These PDFs have a **broken font encoding** (Nirmala UI ToUnicode CMap). The script fixes it in memory before extracting.
- No OCR needed — the fix happens at the PDF level, so extraction is fast and accurate.
- The website auto-detects all `bookN` keys in `data.json`. No code change needed when adding books.
- Learned progress is saved in the browser's localStorage. Adding new sentences won't affect existing progress.
- Only `pymupdf` is needed as a dependency (no Tesseract/OCR required).
