import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetToken, title, message, url } = body;

    if (!targetToken) {
      return NextResponse.json({ error: "Push token is missing" }, { status: 400 });
    }

    // 🌟 ONE-SIGNAL API CALL (Secure Backend)
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        // 👇 FIX: "Basic " word add karna mandatory tha, iske bina 401 error aata hai
        "Authorization": "Basic os_v2_app_xhy5hwdypfhdvchoiklithssky66nrwfhrkeoqvmiba3ekrjy6l74os35hmocacgqak2372msqja2433uywmuhcfyesyiwozn2o522y" 
      },
      body: JSON.stringify({
        app_id: "b9f1d3d8-7879-4e3a-88ee-4296899e5256", 
        include_player_ids: [targetToken],
        headings: { en: title },
        contents: { en: message },
        url: url 
      })
    });

    const data = await response.json();
    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Backend Push Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}