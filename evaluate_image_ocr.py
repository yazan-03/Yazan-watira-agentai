"""Run the eight real image scenarios and save their observed results.

Usage: python evaluate_image_ocr.py
The deterministic checks cover routing, OCR fields, answer facts, abstention,
language, and source presence. They are smoke checks, not a semantic judge;
the exported answers and images should also be reviewed by a presenter.
"""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import re
import time
import unicodedata

from image_test_cases import IMAGE_TEST_CASES


PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_FILE = PROJECT_ROOT / "image_test_results.json"


def _normalize(text):
    text = unicodedata.normalize("NFKC", str(text or "")).casefold()
    text = text.translate(str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789"))
    text = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", text)
    return " ".join(text.split())


def _has_all_groups(text, groups):
    normalized = _normalize(text)
    return all(any(_normalize(option) in normalized for option in group) for group in groups)


def check_result(test_case, result):
    """Apply conservative, auditable checks without another model call."""
    answer = result.get("answer", "")
    ocr_text = result.get("ocr_text")
    assertions = test_case.get("assertions", {})
    expects_ocr = test_case["expected_mode"] in {"OCR", "BOTH"}
    checks = {
        "nonempty_answer": bool(isinstance(answer, str) and answer.strip()),
        "selected_mode": result.get("mode") == test_case["expected_mode"],
        "conditional_ocr": result.get("ocr_required") is expects_ocr,
        "rag_usage": result.get("rag_used") is test_case["expected_rag"],
        "expected_answer_facts": _has_all_groups(answer, assertions.get("answer_all", [])),
        "expected_ocr_fields": _has_all_groups(ocr_text, assertions.get("ocr_all", [])),
        "no_invented_field": not any(
            _normalize(forbidden) in _normalize(answer)
            for forbidden in assertions.get("answer_none", [])
        ),
        "grounding_status": result.get("status") in assertions.get(
            "statuses", ["supported", "partial", "unavailable"]
        ),
    }
    if not expects_ocr:
        checks["no_unnecessary_ocr_output"] = ocr_text in {None, ""}
    if assertions.get("sources_required"):
        checks["supporting_kb_sources"] = bool(result.get("sources"))
        if assertions.get("expected_sources"):
            checks["correct_kb_source"] = set(assertions["expected_sources"]).issubset(
                set(result.get("sources", []))
            )
    elif not test_case["expected_rag"]:
        checks["no_unrelated_kb_sources"] = not result.get("sources")
    language = assertions.get("language")
    if language == "ar":
        checks["answer_language"] = bool(re.search(r"[\u0621-\u064a]", answer))
    elif language == "en":
        checks["answer_language"] = bool(re.search(r"[A-Za-z]{3,}", answer))
    if result.get("language"):
        checks["reported_language"] = result["language"] == language
    # In an unreadable-number case, reject a guessed ID in OCR as well.
    if test_case["id"] == 5:
        checks["no_hidden_id_in_ocr"] = "secret-5931" not in _normalize(ocr_text)
    return checks


def evaluate_test_case(test_case, processor):
    image_url = test_case["image"]
    image_path = (PROJECT_ROOT / image_url.lstrip("/")).resolve()
    if not image_path.is_relative_to(PROJECT_ROOT / "static" / "image_test_cases"):
        raise ValueError("Evaluation fixture is outside static/image_test_cases.")
    result = {}
    errors = []
    started = time.perf_counter()
    tested_at = datetime.now(timezone.utc).isoformat()
    try:
        if not image_path.is_file():
            raise FileNotFoundError(f"Missing fixture: {image_path.name}")
        result = processor(image_path, test_case["question"])
        if not isinstance(result, dict):
            raise ValueError("Image processor returned an invalid result.")
        checks = check_result(test_case, result)
    except Exception as exc:
        errors.append(f"{type(exc).__name__}: {exc}")
        checks = {"processing_completed": False}
    elapsed_seconds = time.perf_counter() - started
    passed = not errors and all(checks.values())
    failed_checks = [name for name, value in checks.items() if not value]
    warnings = result.get("warnings", [])
    if not isinstance(warnings, list):
        warnings = [str(warnings)]
    limitations = [*errors, *warnings]
    if failed_checks:
        limitations.append("Failed checks: " + ", ".join(failed_checks))
    return {
        "id": test_case["id"],
        "scenario": test_case["scenario"],
        "image": image_url,
        "image_sha256": hashlib.sha256(image_path.read_bytes()).hexdigest() if image_path.is_file() else None,
        "question": test_case["question"],
        "expected": test_case["expected"],
        "expected_ocr": test_case["expected_ocr"],
        "expected_mode": test_case["expected_mode"],
        "expected_rag": test_case["expected_rag"],
        "mode": result.get("mode"),
        "has_text": result.get("has_text"),
        "ocr_required": result.get("ocr_required"),
        "ocr_text": result.get("ocr_text"),
        "answer": result.get("answer", ""),
        "decision_reason": result.get("decision_reason", ""),
        "rag_used": result.get("rag_used", False),
        "sources": result.get("sources", []),
        "agent_status": result.get("status"),
        "actual_result": "All deterministic checks passed; review the saved answer and image."
        if passed else "Failed: " + ", ".join(failed_checks),
        "status": "passed" if passed else "failed",
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
        "errors_or_limitations": " ".join(limitations) or "No processing errors observed. Semantic review remains necessary.",
        "elapsed_seconds": round(elapsed_seconds, 3),
        "latency_ms": round(elapsed_seconds * 1000),
        "tested_at": tested_at,
    }


def run_image_evaluation(output_path=OUTPUT_FILE, processor=None, ids=None):
    if len(IMAGE_TEST_CASES) != 8 or {case["id"] for case in IMAGE_TEST_CASES} != set(range(1, 9)):
        raise ValueError("The deliverable must contain exactly eight cases with IDs 1–8.")
    if processor is None:
        from image_service import process_image_question
        processor = process_image_question
    cases = [case for case in IMAGE_TEST_CASES if ids is None or case["id"] in ids]
    if not cases:
        raise ValueError("No test cases were selected.")
    results = []
    for case in cases:
        print(f"Running image case {case['id']}: {case['scenario']}", flush=True)
        observed = evaluate_test_case(case, processor)
        results.append(observed)
        print(f"Case {case['id']}: {observed['status']} ({observed['elapsed_seconds']:.1f}s)", flush=True)
    passed = sum(result["status"] == "passed" for result in results)
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "evaluation_method": "Deterministic routing, OCR-field, answer-fact, language, abstention, and source smoke checks. No results are simulated.",
        "limitations": "String matching cannot prove full semantic correctness or faithfulness. Review each actual answer and OCR transcript with its image.",
        "summary": {
            "total_test_cases": len(results), "passed": passed,
            "failed": len(results) - passed,
            "complete_eight_case_run": len(results) == 8,
            "average_latency_ms": round(sum(result["latency_ms"] for result in results) / len(results)),
        },
        "results": results,
    }
    output_path = Path(output_path)
    output_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved observed results to {output_path}", flush=True)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT_FILE)
    parser.add_argument("--ids", type=int, nargs="+", choices=range(1, 9), help="Optional targeted rerun; default runs all eight cases.")
    arguments = parser.parse_args()
    run_image_evaluation(arguments.output, ids=arguments.ids)
