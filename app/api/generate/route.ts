import { NextResponse } from "next/server";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

// Menggunakan fork package yang lebih baru dan stabil
const ImageModule = require("@slosarek/docxtemplater-image-module-free");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Gambar PNG transparan 1x1 pixel untuk form yang tidak diisi fotonya
    const blankImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64"
    );

    const getBuffer = async (fieldName: string) => {
      const file = formData.get(fieldName) as File | null;
      if (!file || typeof file === "string" || file.size === 0) {
        return blankImage;
      }
      return Buffer.from(await file.arrayBuffer());
    };

    // Kembali menggunakan template asli Anda
    const templatePath = path.resolve(process.cwd(), "public", "template_2.docx");
    const content = fs.readFileSync(templatePath, "binary");
    const zip = new PizZip(content);

    const imageOptions = {
      centered: false,
      getImage(tagValue: any) {
        if (!tagValue || !Buffer.isBuffer(tagValue)) return blankImage;
        return tagValue;
      },
      getSize(img: any, tagValue: any) {
        if (tagValue === blankImage) return [1, 1];
        return [300, 225]; 
      },
    };
    
    const imageModule = new ImageModule(imageOptions);

    const doc = new Docxtemplater(zip, {
      modules: [imageModule],
      paragraphLoop: true,
      linebreaks: true,
    });

    const textData: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") textData[key] = value;
    }

    const foto_lokasi = await getBuffer("foto_lokasi");
    const foto_kwh = await getBuffer("foto_kwh");
    const foto_area = await getBuffer("foto_area");
    const foto_exkwh = await getBuffer("foto_exkwh");
    const foto_cctv = await getBuffer("foto_cctv");
    const foto_jalur = await getBuffer("foto_jalur");

    doc.render({
      ...textData,
      foto_lokasi,
      foto_kwh,
      foto_area,
      foto_exkwh,
      foto_cctv,
      foto_jalur,
    });


    // 1. Generate file sebagai Node Buffer
    const buf = doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });

    // 2. KONVERSI WAJIB TYPESCRIPT: Ubah Node Buffer ke standar Web API
    const webBuffer = new Uint8Array(buf);

    // 3. Gunakan 'Response' standar web (bukan NextResponse)
    return new Response(webBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Survey_${textData.proyek || "Report"}.docx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
  } catch (error: any) {
    console.error("Error generating docx:", error);
    // NextResponse masih aman digunakan khusus untuk respons berformat JSON (error)
    return NextResponse.json({ error: "Gagal memproses dokumen", detail: error.message }, { status: 500 });
  }
}