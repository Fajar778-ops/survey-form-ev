import { NextResponse } from "next/server";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import fs from "fs";
import path from "path";

const ImageModule = require("@slosarek/docxtemplater-image-module-free");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const blankImage = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      "base64"
    );

    const getBuffer = async (fieldName: string) => {
      const file = formData.get(fieldName) as File | null;
      if (!file || typeof file === "string" || file.size === 0) return blankImage;
      const arrayBuffer = await file.arrayBuffer();
      return Buffer.from(arrayBuffer);
    };

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

    doc.render({
      ...textData,
      foto_lokasi: await getBuffer("foto_lokasi"),
      foto_kwh: await getBuffer("foto_kwh"),
      foto_area: await getBuffer("foto_area"),
      foto_exkwh: await getBuffer("foto_exkwh"),
      foto_cctv: await getBuffer("foto_cctv"),
      foto_jalur: await getBuffer("foto_jalur"),
    });

    // 1. Ekstrak sebagai Uint8Array murni bawaan Web
    const uint8Data = doc.getZip().generate({ type: "uint8array", compression: "DEFLATE" });
    
    // 2. Bungkus ke dalam objek Blob (Tidak mungkin ditolak oleh Vercel/TypeScript)
    const fileBlob = new Blob([uint8Data], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    // 3. Kirim NextResponse yang sudah bersih dari error TypeScript
    return new NextResponse(fileBlob, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Survey_${textData.proyek || "Report"}.docx"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating docx:", error);
    return NextResponse.json({ error: "Gagal memproses dokumen", detail: error.message }, { status: 500 });
  }
}