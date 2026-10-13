import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const orderId = searchParams.get('order_id') || '';
  const keyId = searchParams.get('key_id') || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
  const amount = searchParams.get('amount') || '0';
  const currency = searchParams.get('currency') || 'INR';
  const bookingId = searchParams.get('booking_id') || '';

  if (!orderId || !keyId) {
    return new NextResponse('Missing required payment parameters.', { status: 400 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Complete Payment | VOLO Home Services</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
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
      color: #A78BFA;
      margin-top: 4px;
    }
    .btn {
      width: 100%;
      padding: 16px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%);
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 10px 20px rgba(124, 58, 237, 0.3);
      transition: all 0.2s;
    }
    .btn:active {
      transform: scale(0.98);
    }
    .status-msg {
      margin-top: 16px;
      font-size: 14px;
      font-weight: 600;
    }
    .status-success { color: #10B981; }
    .status-error { color: #EF4444; }
    .status-info { color: #818CF8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">SECURE RAZORPAY CHECKOUT</div>
    <h1>VOLO Home Services</h1>
    <p>Complete your booking online payment securely.</p>

    <div class="amount-box">
      <div class="amount-label">Grand Total</div>
      <div class="amount-val">₹${(Number(amount) / 100).toFixed(0) || Number(amount).toFixed(0)}</div>
    </div>

    <button id="pay-btn" class="btn" onclick="openPayment()">Pay Now with Razorpay</button>
    <div id="status" class="status-msg status-info"></div>
  </div>

  <script>
    function openPayment() {
      var options = {
        key: "${keyId}",
        amount: "${amount}",
        currency: "${currency}",
        name: "VOLO Home Services",
        description: "Booking Payment",
        order_id: "${orderId}",
        theme: { color: "#7C3AED" },
        handler: async function(response) {
          var statusEl = document.getElementById('status');
          statusEl.className = 'status-msg status-info';
          statusEl.innerText = 'Verifying payment with VOLO servers...';
          try {
            var verifyRes = await fetch('/api/customer/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            var data = await verifyRes.json();
            if (data.success) {
              statusEl.className = 'status-msg status-success';
              statusEl.innerText = 'Payment Successful! Technician dispatched.';
              document.getElementById('pay-btn').style.display = 'none';
              setTimeout(function() {
                window.location.href = '/customer/bookings/view?id=' + (data.bookingId || '${bookingId}');
              }, 1200);
            } else {
              statusEl.className = 'status-msg status-error';
              statusEl.innerText = 'Verification note: ' + (data.error || 'Payment recorded.');
            }
          } catch(err) {
            statusEl.className = 'status-msg status-error';
            statusEl.innerText = 'Payment received! Return to VOLO app.';
          }
        },
        modal: {
          ondismiss: function() {
            var statusEl = document.getElementById('status');
            statusEl.className = 'status-msg status-error';
            statusEl.innerText = 'Payment window was closed.';
          }
        }
      };

      try {
        var rzp = new Razorpay(options);
        rzp.open();
      } catch (err) {
        document.getElementById('status').innerText = 'Could not open Razorpay checkout: ' + err.message;
      }
    }

    // Auto-launch checkout
    window.addEventListener('load', function() {
      setTimeout(openPayment, 400);
    });
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
