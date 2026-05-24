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

If you have a new PDF with Tamil-English sentence pairs, use this extraction script.

### One-Time Setup

```bash
python3 -m venv /tmp/pdfenv
source /tmp/pdfenv/bin/activate
pip install pymupdf pytesseract pdfplumber
```

You also need Tesseract OCR with Tamil support:

```bash
brew install tesseract tesseract-lang
```

### Extraction Script

Save this as `extract_pdf.py` in the project root and run it:

```bash
source /tmp/pdfenv/bin/activate
python3 extract_pdf.py 6.pdf
```

```python
"""
Extract Tamil-English sentence pairs from a PDF.
Uses OCR for Tamil text and PDF text extraction for English.

Usage: python3 extract_pdf.py <pdf_file> [book_number]
Example: python3 extract_pdf.py 6.pdf 6
"""

import sys
import pymupdf
import pytesseract
import pdfplumber
from PIL import Image
import io
import re
import json

def extract_from_pdf(filename):
    doc = pymupdf.open(filename)
    total_pages = len(doc)
    sentences = []

    for page_idx in range(1, total_pages):  # Skip first page (intro)
        page = doc[page_idx]

        # Render page as image for OCR (3x zoom for quality)
        mat = pymupdf.Matrix(3, 3)
        pix = page.get_pixmap(matrix=mat)
        img = Image.open(io.BytesIO(pix.tobytes("png")))

        # OCR with Tamil + English
        text = pytesseract.image_to_string(img, lang="tam+eng", config="--psm 6")

        lines = [l.strip() for l in text.split("\n") if l.strip()]
        lines = [l for l in lines if not re.match(r"^\d{1,3}$", l)]

        i = 0
        while i < len(lines) - 1:
            line = lines[i]
            has_tamil = any("\u0B80" <= c <= "\u0BFF" for c in line)

            if has_tamil:
                tamil_line = line.replace("\u200c", "").replace("\u200d", "")
                tamil_line = re.sub(r"\s+", " ", tamil_line).strip()

                english_parts = []
                j = i + 1
                while j < len(lines):
                    if any("\u0B80" <= c <= "\u0BFF" for c in lines[j]):
                        break
                    english_parts.append(lines[j])
                    j += 1

                if english_parts:
                    english_line = " ".join(english_parts)
                    english_line = english_line.replace("| ", "I ")
                    english_line = re.sub(r"\|([a-zA-Z])", r"I\1", english_line)
                    english_line = re.sub(r"\s+", " ", english_line).strip()

                    tamil_chars = sum(1 for c in tamil_line if "\u0B80" <= c <= "\u0BFF")
                    if tamil_chars >= 3 and len(english_line) >= 3:
                        sentences.append({
                            "id": len(sentences) + 1,
                            "tamil": tamil_line,
                            "english": english_line,
                        })
                    i = j
                else:
                    i += 1
            else:
                i += 1

    doc.close()

    # Try to replace English with cleaner PDF extraction
    english_from_pdf = []
    with pdfplumber.open(filename) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            if page_idx == 0:
                continue
            text = page.extract_text()
            if not text:
                continue
            plines = [l.strip() for l in text.split("\n") if l.strip()]
            if plines and plines[0].isdigit():
                plines = plines[1:]
            k = 0
            while k < len(plines):
                if any("\u0B80" <= c <= "\u0BFF" for c in plines[k]):
                    eng_parts = []
                    m = k + 1
                    while m < len(plines):
                        if any("\u0B80" <= c <= "\u0BFF" for c in plines[m]):
                            break
                        eng_parts.append(plines[m])
                        m += 1
                    if eng_parts:
                        eng = " ".join(eng_parts)
                        eng = re.sub(r"\s+\d{1,2}$", "", eng).strip()
                        if eng and not eng.isdigit():
                            english_from_pdf.append(eng)
                    k = m
                else:
                    k += 1

    if len(sentences) == len(english_from_pdf):
        for k in range(len(sentences)):
            sentences[k]["english"] = english_from_pdf[k]
        print(f"Replaced English with PDF extraction (cleaner)")

    return sentences


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 extract_pdf.py <pdf_file> [book_number]")
        sys.exit(1)

    pdf_file = sys.argv[1]
    book_num = sys.argv[2] if len(sys.argv) > 2 else pdf_file.replace(".pdf", "")

    print(f"Extracting from {pdf_file}...")
    sentences = extract_from_pdf(pdf_file)
    print(f"Extracted {len(sentences)} sentences")

    # Show first 3 for verification
    for s in sentences[:3]:
        print(f"  {s['id']}. {s['tamil']}")
        print(f"     {s['english']}")

    # Load existing data and add new book
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

- The PDF extraction uses OCR for Tamil text because these PDFs have a broken font encoding. Direct text extraction gives wrong Tamil characters.
- OCR may produce small errors in a few sentences. Review the output and fix manually if needed.
- The website auto-detects all `bookN` keys in `data.json`. No code change is needed when adding books.
- Learned progress is saved in the browser's localStorage. Adding new sentences won't affect existing progress.
