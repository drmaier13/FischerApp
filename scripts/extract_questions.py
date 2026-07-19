from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

from docx import Document
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


QUESTION_ID = re.compile(r"^([A-Z]?\d+(?:\.\d+)+)\s+(.+)$", re.DOTALL)


def iter_blocks(document: Document):
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


def paragraph_images(paragraph: Paragraph):
    for blip in paragraph._p.xpath(".//a:blip"):
        relation_id = blip.get(qn("r:embed"))
        if not relation_id:
            continue
        part = paragraph.part.related_parts.get(relation_id)
        if part is None:
            continue
        extension = Path(str(part.partname)).suffix.lower() or ".bin"
        yield extension, part.blob


def is_bold(paragraph: Paragraph) -> bool:
    meaningful_runs = [run for run in paragraph.runs if run.text.strip()]
    return any(run.bold is True for run in meaningful_runs)


def save_image(output_dir: Path, extension: str, blob: bytes) -> str:
    digest = hashlib.sha256(blob).hexdigest()[:16]
    filename = f"{digest}{extension}"
    target = output_dir / filename
    if not target.exists():
        target.write_bytes(blob)
    return f"/images/{filename}"


def main() -> None:
    source = Path(sys.argv[1])
    output_json = Path(sys.argv[2])
    image_dir = Path(sys.argv[3])
    output_json.parent.mkdir(parents=True, exist_ok=True)
    image_dir.mkdir(parents=True, exist_ok=True)

    document = Document(source)
    questions: list[dict] = []
    current_category = "Allgemein"
    current: dict | None = None

    def finalize() -> None:
        nonlocal current
        if current is None:
            return
        current["explanation"] = "\n\n".join(current.pop("explanation_parts")).strip()
        current["correctAnswer"] = next(
            (index for index, answer in enumerate(current["answers"]) if answer.pop("correct")),
            -1,
        )
        questions.append(current)
        current = None

    for block in iter_blocks(document):
        if isinstance(block, Table):
            if current is not None and len(current["answers"]) >= 3:
                rows = [" | ".join(cell.text.strip() for cell in row.cells) for row in block.rows]
                current["explanation_parts"].append("\n".join(row for row in rows if row.strip(" |")))
            continue

        style = block.style.name if block.style else ""
        text = block.text.strip()

        if style == "Heading 2" and text:
            current_category = text
            continue

        if style == "Heading 3" and text:
            match = QUESTION_ID.match(text)
            if not match:
                continue
            finalize()
            current = {
                "id": match.group(1),
                "category": current_category,
                "question": " ".join(match.group(2).split()),
                "answers": [],
                "explanation_parts": [],
                "questionImages": [],
                "explanationImages": [],
            }

        if current is None:
            continue

        images = [save_image(image_dir, extension, blob) for extension, blob in paragraph_images(block)]
        if images:
            target = "questionImages" if len(current["answers"]) < 3 else "explanationImages"
            current[target].extend(images)

        if not text or style == "Heading 3":
            continue

        normalized = " ".join(text.split())
        if len(current["answers"]) < 3 and normalized.casefold() == "copyright":
            continue
        if len(current["answers"]) < 3:
            current["answers"].append({"text": normalized, "correct": is_bold(block)})
        else:
            current["explanation_parts"].append(normalized)

    finalize()

    payload = {
        "title": "Fischerprüfung Bayern 2026",
        "source": source.name,
        "questions": questions,
    }
    output_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    problems = {
        "questionCount": len(questions),
        "categories": {},
        "answerCountProblems": [q["id"] for q in questions if len(q["answers"]) != 3],
        "correctAnswerProblems": [q["id"] for q in questions if q["correctAnswer"] < 0],
        "missingExplanations": [q["id"] for q in questions if not q["explanation"]],
        "questionImageCount": sum(len(q["questionImages"]) for q in questions),
        "explanationImageCount": sum(len(q["explanationImages"]) for q in questions),
    }
    for question in questions:
        problems["categories"].setdefault(question["category"], 0)
        problems["categories"][question["category"]] += 1
    print(json.dumps(problems, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
