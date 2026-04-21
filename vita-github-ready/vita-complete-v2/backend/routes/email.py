"""
VI Vita Intelligence — Email Service (SendGrid)
================================================
Transactional emails for:
  - Order confirmation
  - Subscription receipt
  - Referral credit earned
  - Day 7 upgrade nudge
  - OTP fallback

Routes:
  POST /api/email/order-confirmation   → Send order confirmation
  POST /api/email/subscription-receipt → Send subscription receipt
  POST /api/email/referral-credit      → Notify referral credit earned
  POST /api/email/test                 → Admin: send test email
"""

import os
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from middleware.auth import verify_token

router = APIRouter()
logger = logging.getLogger("vi-email")

SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
FROM_EMAIL       = os.getenv("EMAIL_FROM", "hello@vitaintelligence.in")
FROM_NAME        = os.getenv("EMAIL_FROM_NAME", "VI Vita Intelligence")

# SendGrid Dynamic Template IDs (create in SendGrid dashboard)
# You can also use plain HTML — we provide both approaches below
TEMPLATES = {
    "order_confirmation":   os.getenv("SG_TMPL_ORDER",        ""),
    "subscription_receipt": os.getenv("SG_TMPL_SUBSCRIPTION",  ""),
    "referral_credit":      os.getenv("SG_TMPL_REFERRAL",      ""),
    "day7_nudge":           os.getenv("SG_TMPL_DAY7",          ""),
}


def _send_email(to_email: str, to_name: str, subject: str, html_content: str,
                template_id: str = "", template_data: dict = None) -> bool:
    """
    Send email via SendGrid.
    Returns True on success, False on failure (non-blocking).
    """
    if not SENDGRID_API_KEY:
        logger.warning(f"[EMAIL SKIPPED — no SENDGRID_API_KEY] To: {to_email} | Subject: {subject}")
        return False

    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail, To, From, Content

        sg = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)

        if template_id and template_data:
            # Use SendGrid Dynamic Template
            message = {
                "personalizations": [{
                    "to": [{"email": to_email, "name": to_name}],
                    "dynamic_template_data": template_data,
                }],
                "from":        {"email": FROM_EMAIL, "name": FROM_NAME},
                "template_id": template_id,
            }
            response = sg.client.mail.send.post(request_body=message)
        else:
            # Plain HTML email
            mail = Mail(
                from_email=From(FROM_EMAIL, FROM_NAME),
                to_emails=To(to_email, to_name),
                subject=subject,
                html_content=Content("text/html", html_content),
            )
            response = sg.client.mail.send.post(request_body=mail.get())

        success = response.status_code in (200, 202)
        if success:
            logger.info(f"Email sent to {to_email} | {subject}")
        else:
            logger.error(f"SendGrid error {response.status_code} to {to_email}")
        return success

    except Exception as e:
        logger.error(f"Email send failed to {to_email}: {e}")
        return False


# ── Email Template Builders (used when no SG template configured) ──

def _order_confirmation_html(order_id: str, amount: int, products: list,
                              shipping: dict, payment_method: str) -> str:
    product_list = "".join(f"<li>{p.replace('_', ' ').title()}</li>" for p in products)
    pay_badge    = "Cash on Delivery" if payment_method == "cod" else "Online Payment"
    return f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
      <div style="background:#C9A84C;padding:16px;border-radius:8px;text-align:center;">
        <h1 style="color:white;margin:0;">VI Vita Intelligence</h1>
      </div>
      <h2 style="color:#1a1a1a;">Order Confirmed! 🎉</h2>
      <p>Your order has been placed successfully.</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Order ID</b></td>
            <td style="padding:8px;border-bottom:1px solid #eee;">{order_id}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Amount</b></td>
            <td style="padding:8px;border-bottom:1px solid #eee;">₹{amount}</td></tr>
        <tr><td style="padding:8px;border-bottom:1px solid #eee;"><b>Payment</b></td>
            <td style="padding:8px;border-bottom:1px solid #eee;">{pay_badge}</td></tr>
        <tr><td style="padding:8px;"><b>Deliver To</b></td>
            <td style="padding:8px;">{shipping.get('city', '')}, {shipping.get('state', '')}</td></tr>
      </table>
      <h3>Products Ordered:</h3>
      <ul>{product_list}</ul>
      <p style="color:#666;font-size:13px;">
        We'll send you a WhatsApp message with your tracking details once dispatched.
        Expected delivery: 5–7 business days.
      </p>
      <p style="color:#C9A84C;font-weight:bold;">The VI Health Team</p>
    </body></html>
    """


def _referral_credit_html(credit_rs: int, referral_code: str, total_credit: int) -> str:
    return f"""
    <html><body style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;">
      <div style="background:#C9A84C;padding:16px;border-radius:8px;text-align:center;">
        <h1 style="color:white;margin:0;">VI Vita Intelligence</h1>
      </div>
      <h2>You earned ₹{credit_rs}! 🎊</h2>
      <p>Someone used your referral code <b>{referral_code}</b> and placed their first order.</p>
      <div style="background:#f0f0f0;padding:16px;border-radius:8px;text-align:center;">
        <p style="margin:0;font-size:32px;font-weight:bold;color:#C9A84C;">₹{credit_rs}</p>
        <p style="margin:4px 0 0;color:#666;">Added to your VI Wallet</p>
      </div>
      <p>Your total VI Wallet balance: <b>₹{total_credit}</b></p>
      <p>Use your wallet credit on your next order at checkout.</p>
      <p style="color:#C9A84C;font-weight:bold;">The VI Health Team</p>
    </body></html>
    """


# ── Routes ────────────────────────────────────────────────────────

class OrderEmailBody(BaseModel):
    userId:        str
    orderId:       str
    email:         str
    name:          str
    amount:        int
    products:      list
    shipping:      dict
    paymentMethod: Optional[str] = "online"

class ReferralEmailBody(BaseModel):
    userId:       str
    email:        str
    name:         str
    creditRs:     int
    referralCode: str
    totalCredit:  int

class TestEmailBody(BaseModel):
    email: str


@router.post("/order-confirmation")
def send_order_confirmation(body: OrderEmailBody, cu: dict = Depends(verify_token)):
    """Send order confirmation email. Called by orders route after successful payment."""
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    tmpl_id   = TEMPLATES["order_confirmation"]
    tmpl_data = {
        "name":           body.name,
        "order_id":       body.orderId,
        "amount":         body.amount,
        "products":       body.products,
        "payment_method": body.paymentMethod,
        "city":           body.shipping.get("city", ""),
    }

    sent = _send_email(
        to_email     = body.email,
        to_name      = body.name,
        subject      = f"Your VI Order {body.orderId} is Confirmed!",
        html_content = _order_confirmation_html(
            body.orderId, body.amount, body.products,
            body.shipping, body.paymentMethod
        ),
        template_id   = tmpl_id,
        template_data = tmpl_data if tmpl_id else None,
    )

    return {"sent": sent, "to": body.email}


@router.post("/referral-credit")
def send_referral_credit_email(body: ReferralEmailBody, cu: dict = Depends(verify_token)):
    """Notify user they earned referral credit."""
    if cu.get("uid") != body.userId and not cu.get("dev"):
        raise HTTPException(status_code=403, detail="Forbidden")

    sent = _send_email(
        to_email     = body.email,
        to_name      = body.name,
        subject      = f"You earned ₹{body.creditRs} from VI referral! 🎉",
        html_content = _referral_credit_html(body.creditRs, body.referralCode, body.totalCredit),
        template_id   = TEMPLATES["referral_credit"],
        template_data = {
            "name":         body.name,
            "credit_rs":    body.creditRs,
            "referral_code": body.referralCode,
            "total_credit": body.totalCredit,
        } if TEMPLATES["referral_credit"] else None,
    )

    return {"sent": sent, "to": body.email}


@router.post("/test")
def send_test_email(body: TestEmailBody, cu: dict = Depends(verify_token)):
    """Admin-only: Send a test email to verify SendGrid config."""
    from firebase_admin import firestore as fb_fs
    db  = fb_fs.client()
    uid = cu.get("uid")
    if not db.collection("admins").document(uid).get().exists:
        raise HTTPException(status_code=403, detail="Admin only")

    sent = _send_email(
        to_email     = body.email,
        to_name      = "VI Admin",
        subject      = "VI Email System — Test",
        html_content = "<h1>Email working! ✅</h1><p>SendGrid is configured correctly for VI.</p>",
    )
    return {"sent": sent, "to": body.email, "sendgrid_key_set": bool(SENDGRID_API_KEY)}
