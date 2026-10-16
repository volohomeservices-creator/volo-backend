import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/worker/wallet-topup/checkout
 * Renders a self-contained Razorpay checkout page for Captain wallet top-up.
 * Used by both mobile (WebView) and web (popup/redirect).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id') || '';
  const keyId = searchParams.get('key_id') || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const amount = searchParams.get('amount') || '0';
  const currency = searchParams.get('currency') || 'INR';
  const displayAmount = searchParams.get('display_amount') || '0';
  const returnUrl = searchParams.get('return_url') || '';

  if (!orderId || !keyId) {
    return new NextResponse('Missing required payment parameters.', { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Add Funds | VOLO Captain Wallet</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js" onerror="onScriptLoadError()"></script>
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
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10B981;
      color: #6EE7B7;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 999px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin-bottom: 8px;
    }
    p {
      color: #94A3B8;
      font-size: 14px;
      margin-bottom: 24px;
      line-height: 1.5;
    }
    .amount-box {
      background: #1F1C33;
      border: 1px solid #332E52;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .amount-label {
      font-size: 12px;
      color: #8E84B0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    .amount-val {
      font-size: 32px;
      font-weight: 900;
      color: #10B981;
      margin-top: 4px;
    }
    .btn {
      width: 100%;
      padding: 16px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3);
      transition: all 0.2s;
    }
    .btn:active { transform: scale(0.98); }
    .status-msg { margin-top: 16px; font-size: 14px; font-weight: 600; }
    .status-success { color: #10B981; }
    .status-error { color: #EF4444; }
    .status-info { color: #818CF8; }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      font-size: 13px;
    }
    .info-row span:first-child { color: #8E84B0; font-weight: 600; }
    .info-row span:last-child { color: #E2E8F0; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">CAPTAIN WALLET TOP-UP</div>
    <h1>Add Funds to Wallet</h1>
    <p>Securely add money to your VOLO Captain commission wallet via UPI, cards, or net banking.</p>

    <div class="amount-box">
      <div class="amount-label">Top-Up Amount</div>
      <div class="amount-val">₹${Number(displayAmount) || (Number(amount) / 100).toFixed(0)}</div>
    </div>

    <div style="margin-bottom:20px; text-align:left;">
      <div class="info-row">
        <span>Payment for</span>
        <span>Commission Wallet</span>
      </div>
      <div class="info-row">
        <span>Powered by</span>
        <span>Razorpay</span>
      </div>
    </div>

    <button id="pay-btn" class="btn" onclick="openPayment()">Pay Now — Add Funds</button>
    <div id="status" class="status-msg status-info"></div>

    <form id="rzp-fallback-form" method="POST" action="https://api.razorpay.com/v1/checkout/embedded" style="display:none;">
      <input type="hidden" name="key_id" value="${keyId}" />
      <input type="hidden" name="order_id" value="${orderId}" />
      <input type="hidden" name="name" value="VOLO Captain Wallet" />
      <input type="hidden" name="description" value="Wallet Recharge" />
    </form>
  </div>

  <script>
    var scriptBlocked = false;
    function onScriptLoadError() {
      scriptBlocked = true;
    }

    function openPayment() {
      var statusEl = document.getElementById('status');

      if (typeof Razorpay === 'undefined' || scriptBlocked) {
        statusEl.className = 'status-msg status-info';
        statusEl.innerText = 'Redirecting to Razorpay Secure Gateway...';
        document.getElementById('rzp-fallback-form').submit();
        return;
      }

      var options = {
        key: "${keyId}",
        amount: "${amount}",
        currency: "${currency}",
        name: "VOLO Home Services",
        description: "Captain Wallet Top-Up",
        order_id: "${orderId}",
        theme: { color: "#10B981" },
        handler: async function(response) {
          statusEl.className = 'status-msg status-info';
          statusEl.innerText = 'Verifying payment...';
          try {
            await fetch('/api/worker/wallet-topup/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
          } catch(err) {
            console.error('Verify error:', err);
          }

          var targetUrl = "${returnUrl}";
          if (targetUrl) {
            statusEl.className = 'status-msg status-success';
            statusEl.innerText = 'Wallet funded successfully! Returning...';
            var redirectUri = targetUrl + (targetUrl.indexOf('?') === -1 ? '?' : '&') +
              'razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id) +
              '&razorpay_payment_id=' + encodeURIComponent(response.razorpay_payment_id) +
              '&razorpay_signature=' + encodeURIComponent(response.razorpay_signature);
            window.location.href = redirectUri;
          } else {
            statusEl.className = 'status-msg status-success';
            statusEl.innerText = 'Wallet funded! Please return to app.';
            setTimeout(function() {
              window.location.href = 'volo://wallet-topup-callback?razorpay_order_id=' + encodeURIComponent(response.razorpay_order_id);
            }, 800);
          }
        },
        modal: {
          ondismiss: function() {
            statusEl.className = 'status-msg status-error';
            statusEl.innerText = 'Payment window was closed.';
          }
        }
      };

      try {
        var rzp = new Razorpay(options);
        rzp.open();
      } catch (err) {
        document.getElementById('rzp-fallback-form').submit();
      }
    }

    window.addEventListener('load', function() {
      setTimeout(function() {
        if (typeof Razorpay !== 'undefined') {
          openPayment();
        }
      }, 500);
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
