"use client";
import { useEffect, useRef, useState } from "react";

export default function KameraFilter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Kunci ke 1 filter saja sesuai yang sudah Anda siapkan di folder public
  const activeFilter = "/filter-depan.png";
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Otomatis menyalakan kamera saat halaman dibuka
  useEffect(() => {
    startCamera();
  }, []);

  const startCamera = async () => {
    try {
      // Akses kamera belakang (environment)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      alert("Pastikan Anda memberikan izin akses kamera pada browser Anda.");
    }
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 1. Gambar aspal/lapangan nyata
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. Tumpuk dengan garis marking biru Anda
        const img = new Image();
        img.src = activeFilter;
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // 3. Render jadi foto PNG utuh
          const mergedDataUrl = canvas.toDataURL("image/png");
          setCapturedImage(mergedDataUrl);
        };
      }
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
      <h1 className="text-xl font-bold mb-6 text-center">Kamera Surveyor EV<br/><span className="text-sm font-normal text-gray-400">Marking Area Parkir</span></h1>

      {/* Tampilan Kamera / Preview Hasil */}
      {!capturedImage ? (
        <div className="relative w-full bg-black rounded-lg overflow-hidden flex justify-center items-center shadow-xl border border-gray-700">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-auto object-cover"
          />
          {/* Overlay Filter Anda */}
          <img 
            src={activeFilter} 
            alt="Filter Marking" 
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none opacity-80"
          />
        </div>
      ) : (
        <div className="w-full rounded-lg overflow-hidden border-2 border-green-500 shadow-xl shadow-green-900/20">
          <img src={capturedImage} alt="Hasil Jepretan" className="w-full h-auto" />
        </div>
      )}

      {/* Mesin Canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Tombol Aksi */}
      <div className="w-full mt-8 space-y-4">
        {!capturedImage ? (
          <button 
            onClick={handleCapture}
            className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 active:scale-95 transition-all shadow-lg shadow-blue-900/50"
          >
            📸 Jepret Foto
          </button>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => setCapturedImage(null)}
              className="flex-1 bg-gray-700 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
            >
              🔄 Ulangi
            </button>
            <a 
              href={capturedImage}
              download="Area_Charging_Marking.png"
              className="flex-1 bg-green-600 py-3 rounded-lg font-bold text-center hover:bg-green-500 transition-colors shadow-lg shadow-green-900/50"
            >
              ⬇️ Simpan
            </a>
          </div>
        )}
      </div>
      
      <a href="/" className="mt-10 text-sm text-gray-400 hover:text-white underline transition-colors">
        ⬅ Kembali ke Form Laporan
      </a>
    </div>
  );
}