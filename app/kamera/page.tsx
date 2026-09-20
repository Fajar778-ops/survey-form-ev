"use client";
import { useEffect, useRef, useState } from "react";

export default function KameraFilter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const activeFilter = "/filter-depan.png";
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const [locationInfo, setLocationInfo] = useState({
    lat: "-",
    lng: "-",
    title: "Mendeteksi Lokasi...",
    detail: "Mencari detail alamat...",
  });

  useEffect(() => {
    startCamera();
    getGPSLocation();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "environment" } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Gagal mengakses kamera:", err);
      alert("Pastikan Anda memberikan izin akses kamera.");
    }
  };

  const getGPSLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);

          try {
            // Mengambil data alamat lengkap
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            
            if (data && data.display_name) {
              const parts = data.display_name.split(", ");
              // Membagi alamat jadi Judul Utama (Kota, Provinsi, Negara) dan Detail Jalan
              const title = parts.slice(-3).join(", ");
              const detail = parts.slice(0, 4).join(", ") + " --, Indonesia";
              
              setLocationInfo({ lat, lng, title, detail });
            }
          } catch (err) {
            setLocationInfo({ lat, lng, title: "Lokasi Tidak Diketahui", detail: "Gagal memuat alamat dari server." });
          }
        },
        (error) => {
          console.warn("GPS Ditolak:", error.message);
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Fungsi memuat Minimap dari OpenStreetMap
  const loadMinimap = (lat: string, lng: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (lat === "-" || lng === "-") return resolve(null);
      
      const zoom = 15;
      const latRad = parseFloat(lat) * (Math.PI / 180);
      const n = Math.pow(2, zoom);
      const xTile = Math.floor((parseFloat(lng) + 180.0) / 360.0 * n);
      const yTile = Math.floor((1.0 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2.0 * n);
      
      const img = new Image();
      img.crossOrigin = "anonymous"; // Syarat wajib agar Canvas tidak error (CORS)
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      // Memanggil potongan peta jalan asli
      img.src = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;
    });
  };

  // Format tanggal custom persis seperti GPS Map Camera
  const getFormattedDateTime = () => {
    const now = new Date();
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const day = days[now.getDay()];
    const dateStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getFullYear()}`;
    
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    
    const offset = -now.getTimezoneOffset() / 60;
    const gmtStr = `GMT${offset >= 0 ? '+' : ''}${offset.toString().padStart(2, '0')}.00`;
    
    return `${day}, ${dateStr} ${timeStr} ${gmtStr}`;
  };

  const handleCapture = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;

        // 1. Gambar Asli
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 2. Tumpuk Filter Marking
        const filterImg = new Image();
        filterImg.src = activeFilter;
        await new Promise((resolve) => {
          filterImg.onload = () => {
            ctx.drawImage(filterImg, 0, 0, canvas.width, canvas.height);
            resolve(true);
          };
        });

        // 3. Tarik Minimap Peta
        const mapImg = await loadMinimap(locationInfo.lat, locationInfo.lng);

        // 4. Gambar Watermark GPS Map Camera
        drawGPSWatermark(ctx, canvas.width, canvas.height, mapImg);

        // 5. Selesai, render ke layar
        const mergedDataUrl = canvas.toDataURL("image/png");
        setCapturedImage(mergedDataUrl);
      }
    }
  };

const drawGPSWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, mapImg: HTMLImageElement | null) => {
    const boxMargin = 15; // Jarak luar kotak ke tepi layar
    const boxPadding = 15; // Jarak dalam kotak (ruang bernapas)
    const boxWidth = width - (boxMargin * 2);
    
    // 1. Kalkulasi Font yang Sedikit Lebih Kecil & Proporsional
    const titleFontSize = Math.max(16, Math.floor(width * 0.03));
    const detailFontSize = Math.max(12, Math.floor(width * 0.02));
    const lineSpacing = detailFontSize + 8; // Spasi antar baris teks

    // 2. Ukuran map dibuat dinamis, pas untuk menutupi tinggi 4 baris teks (tidak sisa space)
    const mapSize = Math.floor(lineSpacing * 3.8); 
    
    // 3. TINGGI KOTAK OTOMATIS: Dihitung dari jumlah isi (Padding + Judul + Jarak + Ukuran Map + Padding)
    const boxHeight = (boxPadding * 2) + titleFontSize + 12 + mapSize;
    const boxY = boxMargin; // Tetap di atas
    
    // Gambar Background Hitam Transparan
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    if (ctx.roundRect) {
      ctx.roundRect(boxMargin, boxY, boxWidth, boxHeight, 15);
    } else {
      ctx.fillRect(boxMargin, boxY, boxWidth, boxHeight);
    }
    ctx.fill();

    // Tulis Judul Lokasi 
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.fillText(locationInfo.title, boxMargin + boxPadding, boxY + boxPadding + titleFontSize);

    // Titik Awal Gambar Map
    const mapX = boxMargin + boxPadding;
    const mapY = boxY + boxPadding + titleFontSize + 12;
    
    // Titik Awal Teks di sebelah Map
    const textX = mapX + mapSize + 15;
    let textY = mapY + detailFontSize - 2; // Sejajarkan baris pertama dengan pucuk atas map

    // Gambar Minimap
    if (mapImg) {
      ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);
      
      // Pin Merah (Ukurannya sekarang dinamis mengikuti ukuran map)
      ctx.beginPath();
      ctx.arc(mapX + (mapSize/2), mapY + (mapSize/2), mapSize * 0.06, 0, 2 * Math.PI); 
      ctx.fillStyle = "#ff0000";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      
      // Efek view biru (Juga dinamis mengikuti map)
      ctx.beginPath();
      ctx.moveTo(mapX + (mapSize/2), mapY + (mapSize/2));
      ctx.lineTo(mapX + (mapSize/2) - (mapSize * 0.15), mapY + (mapSize/2) + (mapSize * 0.25));
      ctx.lineTo(mapX + (mapSize/2) + (mapSize * 0.15), mapY + (mapSize/2) + (mapSize * 0.25));
      ctx.fillStyle = "rgba(0, 150, 255, 0.4)";
      ctx.fill();
    } else {
      ctx.fillStyle = "#555";
      ctx.fillRect(mapX, mapY, mapSize, mapSize);
    }

    // Gambar Teks Detail
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `${detailFontSize}px sans-serif`;
    ctx.fillText(`🇮🇩 ${locationInfo.detail}`, textX, textY);
    
    textY += lineSpacing;
    ctx.fillText(`Lat ${locationInfo.lat}, Long ${locationInfo.lng}`, textX, textY);
    
    textY += lineSpacing;
    ctx.fillText(getFormattedDateTime(), textX, textY);
    
    textY += lineSpacing;
    ctx.fillStyle = "#38bdf8"; 
    ctx.font = `bold ${detailFontSize}px sans-serif`;
    ctx.fillText("Note : Captured by Surveyor App", textX, textY);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
      <h1 className="text-xl font-bold mb-4 text-center">
        Kamera Surveyor EV<br/>
        <span className="text-sm font-normal text-gray-400">GPS Map Camera Mode</span>
      </h1>

      {!capturedImage ? (
        <div className="relative w-full bg-black rounded-lg overflow-hidden flex justify-center items-center shadow-xl border border-gray-700">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-auto object-cover"
          />
          <img 
            src={activeFilter} 
            alt="Filter Marking" 
            className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none opacity-80"
          />
        </div>
      ) : (
        <div className="w-full rounded-lg overflow-hidden border-2 border-green-500 shadow-xl">
          <img src={capturedImage} alt="Hasil Jepretan" className="w-full h-auto" />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      <div className="w-full mt-6 space-y-4">
        {!capturedImage ? (
          <button 
            onClick={handleCapture}
            className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition-all shadow-lg flex justify-center items-center gap-2"
          >
            📸 Jepret dengan GPS Stamp
          </button>
        ) : (
          <div className="flex gap-4">
            <button 
              onClick={() => setCapturedImage(null)}
              className="flex-1 bg-gray-700 py-3 rounded-lg font-bold hover:bg-gray-600"
            >
              🔄 Ulangi
            </button>
            <a 
              href={capturedImage}
              download="Survey_GPS_Stamped.png"
              className="flex-1 bg-green-600 py-3 rounded-lg font-bold text-center hover:bg-green-500 shadow-lg"
            >
              ⬇️ Simpan Foto
            </a>
          </div>
        )}
      </div>
      
      <a href="/" className="mt-8 text-sm text-gray-400 hover:text-white underline">
        ⬅ Kembali ke Form Laporan
      </a>
    </div>
  );
}