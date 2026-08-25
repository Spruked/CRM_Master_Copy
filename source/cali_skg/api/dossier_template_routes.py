from __future__ import annotations

import csv
import io
from typing import Dict

from fastapi import APIRouter, Depends, Response

from cali_skg.api.relationship_routes import verify_admin

router = APIRouter(prefix="/cali/intelligence/dossiers/templates", tags=["cali-dossier-templates"])

CSV_TEMPLATE_FIELDS = [
    "Name",
    "Relationship Type",
    "Email",
    "Email 2",
    "Phone",
    "Phone 2",
    "Address",
    "Organization",
    "Role or Job Title",
    "Notes",
    "Priority",
    "Lifecycle ID",
    "Source",
    "Owner",
    "Next Follow Up At",
    "VIV Business Context",
    "VIV Relationship",
    "Group or Segment",
]


@router.get("/csv")
def csv_template(_: str = Depends(verify_admin)) -> Response:
    output = io.StringIO(newline="")
    writer = csv.writer(output, lineterminator="\r\n")
    writer.writerow(CSV_TEMPLATE_FIELDS)
    return Response(
        content="\ufeff" + output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="viv-dossier-template.csv"'},
    )


@router.get("/vcf")
def vcf_template(_: str = Depends(verify_admin)) -> Response:
    content = "\r\n".join(
        [
            "BEGIN:VCARD",
            "VERSION:4.0",
            "UID:replace-with-stable-id",
            "FN:Replace With Full Name",
            "EMAIL;TYPE=work:person@example.com",
            "TEL;TYPE=cell:+1-555-555-0100",
            "ADR;TYPE=home:;;Street Address;City;State;Postal Code;Country",
            "ORG:Organization Name",
            "TITLE:Role or Job Title",
            "NOTE:Notes and verified context belong here.",
            "X-VIV-BUSINESS-CONTEXT:personal",
            "X-VIV-RELATIONSHIP:professional",
            "X-VIV-SEGMENT:example-group",
            "REV:20260825T000000Z",
            "END:VCARD",
            "",
        ]
    )
    return Response(
        content=content,
        media_type="text/vcard; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="viv-dossier-template.vcf"'},
    )


@router.get("/schema")
def template_schema(_: str = Depends(verify_admin)) -> Dict[str, object]:
    return {
        "csv_fields": CSV_TEMPLATE_FIELDS,
        "vcf_extensions": [
            "X-VIV-BUSINESS-CONTEXT",
            "X-VIV-RELATIONSHIP",
            "X-VIV-SEGMENT",
        ],
        "lifecycle_ids": {
            "prospect": "Horizon",
            "qualified": "Evaluating",
            "contacted": "Engaged",
            "meeting_scheduled": "Active",
            "proposal": "Advancing",
            "won": "Established",
            "lost": "Archive",
        },
        "notes": [
            "Lifecycle ID is the stable transport value; the VIV interface displays the corresponding lifecycle label.",
            "Messages remain communications. Signal is reserved for information promoted as relevant intelligence.",
        ],
    }
