// File: app/api/razorpay/route.ts
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const instance = new Razorpay({
      key_id: 'rzp_live_Sm6dnONggYc7iv', // 👉 IMPORTANT: Ise replace karna!
      key_secret: 'ASu4P8VbERO1nYKZ7bX35AA7', // 👉 IMPORTANT: Ise replace karna!
    });

    const options = {
      amount: 100 * 100, // ₹100 ko paise (10000) mein convert kiya hai
      currency: "INR",
      receipt: `rcpt_${Date.now()}`
    };

    const order = await instance.orders.create(options);
    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Razorpay Error:", error);
    return NextResponse.json({ success: false, error: "Payment creation failed" }, { status: 500 });
  }
}