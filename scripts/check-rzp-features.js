const Razorpay = require('razorpay');
const fs = require('fs');

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  const content = fs.readFileSync(file, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || '').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[match[1]] = val;
    }
  }
  return env;
}

const env = { ...loadEnv('d:/volo/volo/apps/backend/.env'), ...loadEnv('d:/volo/volo/apps/backend/.env.local') };
const key_id = env.NEXT_PUBLIC_RAZORPAY_KEY_ID || env.RAZORPAY_KEY_ID;
const key_secret = env.RAZORPAY_KEY_SECRET;

const rzp = new Razorpay({ key_id, key_secret });

async function checkAccount() {
  console.log('Testing Razorpay Payments list...');
  try {
    const payments = await rzp.payments.all({ count: 1 });
    console.log('Standard PG Payments works! Count:', payments.items?.length);
  } catch (e) {
    console.log('Payments error:', e.error || e.message);
  }

  console.log('\nTesting RazorpayX contacts (direct api)...');
  try {
    // RazorpayX endpoint is https://api.razorpay.com/v1/contacts
    const authHeader = 'Basic ' + Buffer.from(`${key_id}:${key_secret}`).toString('base64');
    const res = await fetch('https://api.razorpay.com/v1/contacts', {
      headers: { 'Authorization': authHeader }
    });
    const data = await res.json();
    console.log('RazorpayX Contacts status:', res.status, data);
  } catch (e) {
    console.log('RazorpayX test error:', e.message);
  }
}

checkAccount();
