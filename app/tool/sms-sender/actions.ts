"use server"; 

export async function sendSmsViaPhone(serverUrl: string, to: string, message: string) {
  try {
    const baseUrl = serverUrl.startsWith('http') ? serverUrl : `http://${serverUrl}`;
    
    // 🌟 Is app ka endpoint /send-sms hota hai
    const finalUrl = `${baseUrl.replace(/\/$/, '')}/send-sms`;

    const response = await fetch(finalUrl, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      // 🌟 Ye app 'to' ki jagah 'phone' keyword maangti hai
      body: JSON.stringify({ 
        phone: to, 
        message: message 
      }),
      cache: 'no-store' 
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: `App Rejected (${response.status})` };
    }
  } catch (error: any) {
    console.error("Network Error:", error);
    return { success: false, error: 'Cannot reach phone IP. Check WiFi.' };
  }
}