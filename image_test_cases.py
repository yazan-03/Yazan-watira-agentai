"""Exactly eight reproducible Image Understanding & OCR evaluation scenarios."""


IMAGE_TEST_CASES = [
    {
        "id": 1,
        "scenario": "Image without text — visual details",
        "image": "/static/image_test_cases/red_car.png",
        "question": "What color is the vehicle, and what type of vehicle is it?",
        "expected": "Identify a red car using visual details. Skip OCR and RAG.",
        "expected_ocr": None,
        "expected_mode": "VISUAL",
        "expected_rag": False,
        "assertions": {
            "answer_all": [
                [
                    "red"
                ],
                [
                    "car"
                ]
            ],
            "statuses": [
                "supported"
            ],
            "language": "en"
        }
    },
    {
        "id": 2,
        "scenario": "English text — invoice OCR",
        "image": "/static/image_test_cases/english_invoice.png",
        "question": "What is the invoice number and the payment deadline?",
        "expected": "Invoice EN-1042; payment deadline 31 October 2026. Answer in English.",
        "expected_ocr": "INVOICE\nInvoice number: EN-1042\nPayment deadline: 2026-10-31\nTotal: 125 JOD",
        "expected_mode": "OCR",
        "expected_rag": False,
        "assertions": {
            "answer_all": [
                [
                    "EN-1042"
                ],
                [
                    "2026-10-31",
                    "October 31",
                    "31 October"
                ]
            ],
            "ocr_all": [
                [
                    "EN-1042"
                ],
                [
                    "2026-10-31"
                ]
            ],
            "statuses": [
                "supported"
            ],
            "language": "en"
        }
    },
    {
        "id": 3,
        "scenario": "Arabic text — invoice OCR",
        "image": "/static/image_test_cases/arabic_invoice.png",
        "question": "ما رقم الفاتورة وما إجمالي المبلغ؟",
        "expected": "رقم الفاتورة AR-2048 والمبلغ الإجمالي 75 دينارًا، مع إجابة عربية.",
        "expected_ocr": "فاتورة\nرقم الفاتورة: AR-2048\nآخر موعد للدفع: 15-11-2026\nالمجموع: 75 دينار أردني",
        "expected_mode": "OCR",
        "expected_rag": False,
        "assertions": {
            "answer_all": [
                [
                    "AR-2048"
                ],
                [
                    "75",
                    "٧٥"
                ]
            ],
            "ocr_all": [
                [
                    "AR-2048"
                ],
                [
                    "75",
                    "٧٥"
                ],
                [
                    "فاتورة"
                ]
            ],
            "statuses": [
                "supported"
            ],
            "language": "ar"
        }
    },
    {
        "id": 4,
        "scenario": "Arabic and English text in one image",
        "image": "/static/image_test_cases/bilingual_label.png",
        "question": "ما اسم المنتج وما تاريخ انتهاء الصلاحية المكتوب؟",
        "expected": "شاي المورينغا / MORINGA TEA، انتهاء الصلاحية 30 يونيو 2027. إجابة بالعربية مع الحفاظ على النص المختلط.",
        "expected_ocr": "MORINGA TEA\nشاي المورينغا\nExpiry date: 2027-06-30\nتاريخ الانتهاء: 30-06-2027",
        "expected_mode": "OCR",
        "expected_rag": False,
        "assertions": {
            "answer_all": [
                [
                    "مورينغا",
                    "مورينجا",
                    "moringa"
                ],
                [
                    "2027-06-30",
                    "30-06-2027",
                    "30 يونيو",
                    "٣٠ يونيو",
                    "30 حزيران",
                    "٣٠ حزيران"
                ]
            ],
            "ocr_all": [
                [
                    "MORINGA TEA"
                ],
                [
                    "شاي"
                ],
                [
                    "2027-06-30"
                ]
            ],
            "statuses": [
                "supported"
            ],
            "language": "ar"
        }
    },
    {
        "id": 5,
        "scenario": "Blurry image — unreadable text",
        "image": "/static/image_test_cases/blurred_invoice.png",
        "question": "What is the complete invoice number? Do not guess unclear characters.",
        "expected": "Recognize the invoice text but mark the blurred number unreadable; do not invent or recover a hidden identifier.",
        "expected_ocr": "INVOICE\nInvoice number: [UNREADABLE]",
        "expected_mode": "OCR",
        "expected_rag": False,
        "assertions": {
            "answer_none": [
                "SECRET-5931"
            ],
            "ocr_all": [
                [
                    "[UNREADABLE]"
                ]
            ],
            "statuses": [
                "unavailable",
                "partial"
            ],
            "language": "en"
        }
    },
    {
        "id": 6,
        "scenario": "Visual understanding and OCR together",
        "image": "/static/image_test_cases/blue_sign.png",
        "question": "What color is the sign, and what word is written on it?",
        "expected": "A blue sign bearing the word OPEN. Combine visual color evidence with OCR.",
        "expected_ocr": "OPEN",
        "expected_mode": "BOTH",
        "expected_rag": False,
        "assertions": {
            "answer_all": [
                [
                    "blue"
                ],
                [
                    "OPEN"
                ]
            ],
            "ocr_all": [
                [
                    "OPEN"
                ]
            ],
            "statuses": [
                "supported"
            ],
            "language": "en"
        }
    },
    {
        "id": 7,
        "scenario": "Requested field absent from image",
        "image": "/static/image_test_cases/label_missing_field.png",
        "question": "ما الرقم التسلسلي لهذا المنتج؟",
        "expected": "الإقرار بالعربية بأن الرقم التسلسلي غير موجود في الصورة؛ عدم اختراع رقم أو إضافة مصادر RAG.",
        "expected_ocr": "MORINGA TEA\nNet weight: 100 g",
        "expected_mode": "OCR",
        "expected_rag": False,
        "assertions": {
            "statuses": [
                "unavailable"
            ],
            "language": "ar",
            "answer_none": [
                "serial number is 100",
                "الرقم التسلسلي 100"
            ]
        }
    },
    {
        "id": 8,
        "scenario": "Image OCR plus existing knowledge-base RAG",
        "image": "/static/image_test_cases/yoga_card.png",
        "question": "Identify the activity named in the image. According to our knowledge-base documents, how can it help reduce stress?",
        "expected": "Read YOGA / يوغا, then use the yoga KB document to describe supported stress-related benefits. Distinguish the image's label from KB information and cite the yoga source.",
        "expected_ocr": "YOGA\nيوغا",
        "expected_mode": "OCR",
        "expected_rag": True,
        "assertions": {
            "answer_all": [
                [
                    "yoga"
                ],
                [
                    "stress"
                ]
            ],
            "ocr_all": [
                [
                    "YOGA"
                ]
            ],
            "sources_required": True,
            "expected_sources": ["5_Introduction_to_Yoga.docx"],
            "statuses": [
                "supported"
            ],
            "language": "en"
        }
    }
]
