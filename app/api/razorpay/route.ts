// File: app/api/razorpay/route.ts
import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

export async function POST(req: Request) {
  try {
    const body = await req.json(); // 🌟 FIX: Frontend se dynamic amount aayega
    const paymentAmount = body.amount || 100; // Fallback to 100 if missing

    const instance = new Razorpay({
      key_id: 'rzp_live_Sm6dnONggYc7iv', 
      key_secret: 'ASu4P8VbERO1nYKZ7bX35AA7', 
    });

    const options = {
      amount: Math.round(paymentAmount * 100), // Rupees ko paise mein convert kiya
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