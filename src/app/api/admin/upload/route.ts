import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("Supabase credentials missing. Image uploads will fail.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

export async function POST(request: NextRequest) {
  try {
    // 1. Session verification
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: "Tidak terautentikasi." },
        { status: 401 }
      );
    }

    if (session.role !== "ADMIN" && session.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses ditolak." },
        { status: 403 }
      );
    }

    // 2. Parse request formData
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Tidak ada file yang diunggah." },
        { status: 400 }
      );
    }

    // 3. Generate unique file name
    const fileExt = file.name.split(".").pop() || "jpg";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fileName = `${uniqueId}.${fileExt}`;

    // 4. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("auction-images")
      .upload(fileName, buffer, {
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json(
        { success: false, message: `Gagal mengunggah ke storage: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Get public URL
    const { data: publicUrlData } = supabase.storage
      .from("auction-images")
      .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
    });
  } catch (error: any) {
    console.error("Upload API handler error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Terjadi kesalahan internal." },
      { status: 500 }
    );
  }
}
