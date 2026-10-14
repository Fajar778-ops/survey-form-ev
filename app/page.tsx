"use client";
import { Analytics } from "@vercel/analytics/react";
import { useState } from "react";
import Link from "next/link";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import { saveAs } from "file-saver";
import * as pdfjsLib from "pdfjs-dist";

// Setup Worker PDF.js
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export default function FormLaporan() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [woss, setWoss] = useState(["", "", "", "", ""]);
  const [lokasi, setLokasi] = useState({ site: "", alamat: "", gmaps: "" });
  const [waktu, setWaktu] = useState({ tanggal: "", mulai: "", selesai: "" });

  const [cs, setCs] = useState({
    dc120: { checked: false, qty: "" },
    dc60: { checked: false, qty: "" },
    dc30: { checked: false, qty: "" },
    dc20: { checked: false, qty: "" },
    bss12_1: { checked: false, qty: "" },
    bss12_3: { checked: false, qty: "" },
    bss6_1: { checked: false, qty: "" },
  });

  const [listrik, setListrik] = useState({
    pln: false,
    tapping: false,
    others: "",
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    spk_pdf: null,
    dokumentasi_lokasi: null,
    foto_kwh: null,
    foto_areaCS: null,
    foto_pondasi: null,
    foto_cctv: null,
    foto_jalur_kabel: null,
    foto_eks_pole: null,
  });

  const handleWossChange = (index: number, value: string) => {
    const newWoss = [...woss];
    newWoss[index] = value;
    setWoss(newWoss);
  };

  const handleCsChange = (key: string, field: "checked" | "qty", value: any) => {
    setCs({ ...cs, [key]: { ...cs[key as keyof typeof cs], [field]: value } });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files && e.target.files[0]) {
      setFiles({ ...files, [key]: e.target.files[0] });
    }
  };

  // --- MESIN UTAMA GENERATE WORD ---
  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      // --- FUNGSI BANTUAN MEMBACA FILE MENJADI BUFFER (AMAN) ---
      const base64ToArrayBuffer = (base64: string) => {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer; 
      };

      const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
      };

      // Buat gambar kosong 1x1 Pixel (Transparan)
      const blankImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
      const blankImageBuffer = base64ToArrayBuffer(blankImageBase64);

      // 1. Ambil Template Word
      const response = await fetch("/TEMPLATE LAPORAN VGREEN HAM.docx");
      if (!response.ok) throw new Error("File template Word tidak ditemukan di folder public.");
      const templateBuffer = await response.arrayBuffer();

      // 2. Siapkan Data Teks
      const data: any = {
        nno_woss1: woss[0],
        no_woss2: woss[1],
        tahun_woss: woss[2],
        no_woss3: woss[3],
        no_woss4: woss[4],
        lokasi_site: lokasi.site,
        alamat_site: lokasi.alamat,
        gmaps: lokasi.gmaps,
        tanggal_survey: waktu.tanggal,
        jam_mulai: waktu.mulai,
        jam_selesai: waktu.selesai,
        c_pln: listrik.pln ? "☑" : "☐",
        c_tapping: listrik.tapping ? "☑" : "☐",
        input_eks: listrik.others,
      };

      // 3. Merakit Data Mesin CS & BSS
      Object.keys(cs).forEach((key) => {
        const item = cs[key as keyof typeof cs];
        data[`c_${key}`] = item.checked ? "☑" : ""; 
        data[`q_${key}`] = item.checked ? item.qty : "";
      });

      // 4. Siapkan Kamus Penyimpanan Gambar Asli (Dictionary)
      // Kita TIDAK menyimpan gambar mentah ke dalam variabel "data", 
      // melainkan menyimpannya ke brankas rahasia "imageDictionary"
      const imageDictionary: { [key: string]: ArrayBuffer } = {};
      const fotoKeys = ["dokumentasi_lokasi", "foto_kwh", "foto_areaCS", "foto_pondasi", "foto_cctv", "foto_jalur_kabel", "foto_eks_pole"];
      
      for (const key of fotoKeys) {
        data[key] = key; // Tulis kata kuncinya (String) ke Word
        if (files[key]) {
          imageDictionary[key] = await readFileAsArrayBuffer(files[key]!);
        }
      }

      // 5. Proses PDF (Ubah setiap halamannya jadi gambar)
      if (files.spk_pdf) {
        const arrayBuffer = await readFileAsArrayBuffer(files.spk_pdf);
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 2.0 }); 
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          if (ctx) {
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            
            const base64Data = canvas.toDataURL("image/png").replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            
            // Beri nama unik untuk setiap halaman
            const pageKey = `spk_page_${i}`;
            
            // Masukkan cuma nama kuncinya (String) ke Word
            images.push({ foto_halaman_spk: pageKey }); 
            
            // Simpan gambar mentahnya di brankas
            imageDictionary[pageKey] = base64ToArrayBuffer(base64Data);
          }
        }
        data.lembar_spk = images;
      } else {
        data.lembar_spk = []; 
      }

      // 6. Konfigurasi Image Module
      const imageOptions = {
        getImage: (tagValue: string, tagName: string) => {
          // tagValue sekarang PASTI berbentuk String (nama kunci)
          if (imageDictionary[tagValue]) {
            return imageDictionary[tagValue];
          }
          // Jika gambar tidak ada di brankas, kasih gambar transparan
          return blankImageBuffer; 
        },
        getSize: (img: any, tagValue: string, tagName: string) => {
          if (tagName === "foto_halaman_spk") return [600, 850]; 
          
          // Jika gambar kosong, paksa ukurannya jadi titik 1x1 piksel
          if (!imageDictionary[tagValue] && tagName !== "foto_halaman_spk") {
            return [1, 1];
          }
          return [300, 400]; // Ukuran normal
        },
      };

      const imageModule = new ImageModule(imageOptions);

      // 7. Proses Kompilasi Docxtemplater
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        modules: [imageModule],
        paragraphLoop: true,
        linebreaks: true,
        // Ini penjaga terakhir: Jika ada Tag typo/tidak dikenal di Word, biarkan kosong tanpa crash
        nullGetter(part) {
          if (!part.module) return "";
          if (part.module === "image") return "blank";
          return "";
        }
      });

      // 8. Render Laporan
      doc.render(data);

      // 9. Download Laporan
      const out = doc.getZip().generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      saveAs(out, `Report_Survey_${lokasi.site || "EV"}.docx`);
      alert("Laporan berhasil dibuat! Cek folder Download Anda.");

    } catch (error: any) {
      console.error(error);
      alert(`Gagal membuat laporan: ${error.message || "Terjadi kesalahan sistem. Cek konsol."}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 bg-gray-50 min-h-screen text-gray-800">
      <h1 className="text-2xl font-extrabold text-center mb-6 text-blue-900">FORM SURVEY EVCS & BSS</h1>
      
      <div className="space-y-6">
        {/* --- SECTION 1: INFO DASAR --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">1. Informasi Dasar</h2>
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">No WOSS:</label>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" className="w-full p-2 border rounded text-center focus:ring-2 focus:ring-blue-500" value={woss[i]} onChange={(e) => handleWossChange(i, e.target.value)} />
                  {i < 4 && <span className="text-gray-400 font-bold">/</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div><label className="block text-sm font-semibold mb-1">Lokasi / Site:</label><input type="text" className="w-full p-2 border rounded" value={lokasi.site} onChange={(e) => setLokasi({...lokasi, site: e.target.value})} /></div>
            <div><label className="block text-sm font-semibold mb-1">Alamat:</label><textarea className="w-full p-2 border rounded" rows={2} value={lokasi.alamat} onChange={(e) => setLokasi({...lokasi, alamat: e.target.value})}></textarea></div>
            <div><label className="block text-sm font-semibold mb-1">Link GMaps:</label><input type="text" className="w-full p-2 border rounded" value={lokasi.gmaps} onChange={(e) => setLokasi({...lokasi, gmaps: e.target.value})} /></div>
          </div>
        </div>

        {/* --- SECTION 2: WAKTU SURVEY --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">2. Waktu Survey</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Tanggal:</label><input type="date" className="w-full p-2 border rounded" value={waktu.tanggal} onChange={(e) => setWaktu({...waktu, tanggal: e.target.value})} /></div>
            <div><label className="block text-sm font-semibold mb-1">Jam Mulai:</label><input type="time" className="w-full p-2 border rounded" value={waktu.mulai} onChange={(e) => setWaktu({...waktu, mulai: e.target.value})} /></div>
            <div><label className="block text-sm font-semibold mb-1">Jam Selesai:</label><input type="time" className="w-full p-2 border rounded" value={waktu.selesai} onChange={(e) => setWaktu({...waktu, selesai: e.target.value})} /></div>
          </div>
        </div>

        {/* --- SECTION 3: CHARGING STATION --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">3. Data Mesin (CS & BSS)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(cs).map((key) => (
              <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                <label className="flex items-center gap-2 font-medium cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" checked={cs[key as keyof typeof cs].checked} onChange={(e) => handleCsChange(key, "checked", e.target.checked)} />
                  {key.toUpperCase().replace("_", " ")}
                </label>
                {cs[key as keyof typeof cs].checked && (
                  <input type="number" placeholder="Qty" className="w-20 p-1 border rounded text-center" value={cs[key as keyof typeof cs].qty} onChange={(e) => handleCsChange(key, "qty", e.target.value)} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* --- SECTION 4: KELISTRIKAN --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">4. Sumber Listrik</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="w-5 h-5" checked={listrik.pln} onChange={(e) => setListrik({...listrik, pln: e.target.checked})} /> PLN Connection</label>
            <label className="flex items-center gap-2 font-medium"><input type="checkbox" className="w-5 h-5" checked={listrik.tapping} onChange={(e) => setListrik({...listrik, tapping: e.target.checked})} /> Tapping</label>
            <div className="flex items-center gap-2 mt-2">
              <span className="font-medium">Others:</span>
              <input type="text" placeholder="Genset dll..." className="flex-1 p-2 border rounded" value={listrik.others} onChange={(e) => setListrik({...listrik, others: e.target.value})} />
            </div>
          </div>
        </div>

        {/* --- SECTION 5: DOKUMEN & FOTO --- */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
          <h2 className="font-bold text-lg mb-4 border-b pb-2">5. Unggah Dokumen & Foto</h2>
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <label className="block font-bold text-red-700 mb-1">📄 File WOSS (Gunakan file dengan format PDF, dengan oritentasi potrait):</label>
              <input type="file" accept="application/pdf" className="w-full text-sm" onChange={(e) => handleFileChange(e, "spk_pdf")} />
            </div>
            {[
              { id: "dokumentasi_lokasi", label: "Dokumentasi Lokasi" },
              { id: "foto_kwh", label: "Foto KWH Existing" },
              { id: "foto_areaCS", label: "Foto Area Charging (Filter Kamera)" },
              { id: "foto_pondasi", label: "Foto Pondasi Charging" },
              { id: "foto_cctv", label: "Foto Area CCTV" },
              { id: "foto_jalur_kabel", label: "Foto Jalur Kabel" },
              { id: "foto_eks_pole", label: "Foto Existing Near Pole" },
            ].map((item) => (
              <div key={item.id}>
                <label className="block text-sm font-semibold mb-1">📸 {item.label}:</label>
                <input type="file" accept="image/*" className="w-full text-sm border p-2 rounded bg-gray-50" onChange={(e) => handleFileChange(e, item.id)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- TOMBOL AKSI BAWAH --- */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4 sticky bottom-4 z-10 p-4 bg-white/80 backdrop-blur-md border rounded-xl shadow-lg">
        <Link href="/kamera" target="_blank" className="flex-1">
          <button className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 shadow flex items-center justify-center gap-2">
            <span>📷 Buka Kamera GPS</span>
          </button>
        </Link>
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`flex-1 w-full text-white font-bold py-3 rounded-lg shadow flex items-center justify-center gap-2 ${isGenerating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
        >
          <span>{isGenerating ? "⏳ Sedang Menyusun Laporan..." : "📑 Generate Laporan Word"}</span>
        </button>
      </div>
    </div>
  );
}