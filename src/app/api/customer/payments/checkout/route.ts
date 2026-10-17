import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id') || '';
  const keyId = searchParams.get('key_id') || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const amount = searchParams.get('amount') || '0';
  const currency = searchParams.get('currency') || 'INR';
  const bookingId = searchParams.get('booking_id') || '';
  const returnUrl = searchParams.get('return_url') || '';

  if (!orderId || !keyId) {
    return new NextResponse('Missing required payment parameters.', { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Complete Payment | VOLO Home Services</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0B0A10;
      color: #FFFFFF;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #171524;
      border: 1px solid #2D2845;
      border-radius: 24px;
      padding: 32px 24px;
      width: 100%;
      max-width: 420px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .badge {
      display: inline-block;
      background: rgba(124, 58, 237, 0.15);
      border: 1px solid #7C3AED;
      color: #C4B5FD;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 8px; }
    p { color: #94A3B8; font-size: 14px; margin-bottom: 24px; line-height: 1.5; }
    .amount-box {
      background: #1F1C33;
      border: 1px solid #332E52;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .amount-label { font-size: 12px; color: #8E84B0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
    .amount-val { font-size: 32px; font-weight: 900; color: #A78BFA; margin-top: 4px; }
    .btn {
      width: 100%; padding: 16px; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
      color: #FFFFFF; font-size: 16px; font-weight: 800; cursor: pointer;
      box-shadow: 0 10px 20px rgba(124, 58, 237, 0.3); transition: all 0.2s;
    }
    .btn:active { transform: scale(0.98); }
    .status-msg { margin-top: 16px; font-size: 14px; font-weight: 600; }
    .status-success { color: #10B981; }
    .status-error { color: #EF4444; }
    .status-info { color: #818CF8; }
    .spinner {
      width: 36px; height: 36px; margin: 16px auto 0;
      border: 3px solid rgba(124,58,237,0.2);
      border-top-color: #7C3AED;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SECURE RAZORPAY CHECKOUT</div>
    <h1>VOLO Home Services</h1>
    <p>Complete your booking online payment securely.</p>
    <div class="amount-box">
      <div class="amount-label">Grand Total</div>
      <div class="amount-val">&#8377;${(Number(amount) / 100).toFixed(0)}</div>
    </div>
    <button id="pay-btn" class="btn" onclick="openPayment()">Pay Now with Razorpay</button>
    <div id="status" class="status-msg status-info"></div>
    <div id="spinner" class="spinner" style="display:none;"></div>

    <!-- Fallback: direct Razorpay hosted checkout (works even when JS is blocked) -->
    <form id="rzp-fallback-form" method="POST" action="https://api.razorpay.com/v1/checkout/embedded" style="display:none;">
      <input type="hidden" name="key_id" value="${keyId}" />
      <input type="hidden" name="order_id" value="${orderId}" />
      <input type="hidden" name="name" value="VOLO Home Services" />
      <input type="hidden" name="description" value="Booking Payment" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="currency" value="${currency}" />
      <input type="hidden" name="callback_url" value="${returnUrl || 'volo://payment-callback'}" />
      <input type="hidden" name="cancel_url" value="${(returnUrl || 'volo://payment-callback')}?status=cancelled" />
    </form>
  </div>

  <script>
    var scriptFailed = false;

    function showSpinner() {
      document.getElementById('spinner').style.display = 'block';
      document.getElementById('pay-btn').style.display = 'none';
    }
    function hideSpinner() {
      document.getElementById('spinner').style.display = 'none';
      document.getElementById('pay-btn').style.display = 'block';
    }

    function doFallback() {
      document.getElementById('status').className = 'status-msg status-info';
      document.getElementById('status').innerText = 'Redirecting to Razorpay...';
      showSpinner();
      setTimeout(function() {
        document.getElementById('rzp-fallback-form').submit();
      }, 400);
    }

    function openPayment() {
      var statusEl = document.getElementById('status');
      if (scriptFailed || typeof Razorpay === 'undefined') {
        doFallback();
        return;
      }
      showSpinner();
      statusEl.className = 'status-msg status-info';
      statusEl.innerText = 'Opening secure payment window...';

      var options = {
        key: '${keyId}',
        amount: '${amount}',
        currency: '${currency}',
        name: 'VOLO Home Services',
        description: 'Booking Payment',
        order_id: '${orderId}',
        theme: { color: '#7C3AED' },
        handler: function(response) {
          hideSpinner();
          statusEl.className = 'status-msg status-info';
          statusEl.innerText = 'Verifying payment...';
          fetch('/api/customer/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          }).catch(function() {});
          var base = '${returnUrl}' || 'volo://payment-callback';
          var sep = base.indexOf('?') === -1 ? '?' : '&';
          var redirectUri = base + sep +
            'razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id || '') +
            '&razorpay_payment_id=' + encodeURIComponent(response.razorpay_payment_id || '') +
            '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature || '') +
            '&booking_id=' + encodeURIComponent('${bookingId}');
          statusEl.className = 'status-msg status-success';
          statusEl.innerText = 'Payment Successful! Returning to VOLO...';
          setTimeout(function() { window.location.href = redirectUri; }, 600);
        },
        modal: {
          ondismiss: function() {
            hideSpinner();
            statusEl.className = 'status-msg status-error';
            statusEl.innerText = 'Payment cancelled. Tap button to retry.';
          }
        }
      };
      try {
        new Razorpay(options).open();
      } catch(err) {
        hideSpinner();
        doFallback();
      }
    }

    // Dynamically load Razorpay checkout.js
    // If script is blocked (Brave Shields etc.) — auto-redirect to hosted checkout
    (function() {
      var s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = function() {
        // Auto-open Razorpay modal as soon as script is ready
        setTimeout(function() { openPayment(); }, 300);
      };
      s.onerror = function() {
        scriptFailed = true;
        // Script blocked — immediately go to hosted Razorpay checkout (no JS needed)
        doFallback();
      };
      document.head.appendChild(s);
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
