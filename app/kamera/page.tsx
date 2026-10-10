"use client";
import { useEffect, useRef, useState } from "react";

export default function KameraFilter() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const [unitType, setUnitType] = useState("DC60");
  const [unitCount, setUnitCount] = useState(1);

  const separator = unitType.startsWith("DC") ? "_" : "-";
  const finalFilterPath = `/filter-${unitType}${separator}${unitCount}.png`;

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
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            
            if (data && data.display_name) {
              const parts = data.display_name.split(", ");
              const title = parts.slice(-3).join(", ");
              // Memotong detail teks agar tidak terlalu panjang dan keluar layar
              let detail = parts.slice(0, 4).join(", ");
              if (detail.length > 45) detail = detail.substring(0, 45) + "...";
              detail += " --, ID";
              
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

  const loadMinimap = (lat: string, lng: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      if (lat === "-" || lng === "-") return resolve(null);
      
      const zoom = 15;
      const latRad = parseFloat(lat) * (Math.PI / 180);
      const n = Math.pow(2, zoom);
      const xTile = Math.floor((parseFloat(lng) + 180.0) / 360.0 * n);
      const yTile = Math.floor((1.0 - Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI) / 2.0 * n);
      
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `https://tile.openstreetmap.org/${zoom}/${xTile}/${yTile}.png`;
    });
  };

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
        // Menggunakan resolusi murni bawaan dari kamera HP agar filter dan teks selalu muat
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 960;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const filterImg = new Image();
        filterImg.src = finalFilterPath; 
        await new Promise((resolve) => {
          filterImg.onload = () => {
            // Kalkulasi anti-gepeng agar filter menyesuaikan kanvas alami
            const hRatio = canvas.width / filterImg.width;
            const vRatio = canvas.height / filterImg.height;
            const ratio = Math.max(hRatio, vRatio); 
            
            const newWidth = filterImg.width * ratio;
            const newHeight = filterImg.height * ratio;
            
            const x = (canvas.width - newWidth) / 2;
            const y = (canvas.height - newHeight) / 2;

            ctx.drawImage(
              filterImg, 
              0, 0, filterImg.width, filterImg.height, 
              x, y, newWidth, newHeight                
            );
            resolve(true);
          };
          filterImg.onerror = () => {
             console.warn("Gambar filter tidak ditemukan:", finalFilterPath);
             resolve(true);
          }
        });

        const mapImg = await loadMinimap(locationInfo.lat, locationInfo.lng);
        drawGPSWatermark(ctx, canvas.width, canvas.height, mapImg);

        const mergedDataUrl = canvas.toDataURL("image/png");
        setCapturedImage(mergedDataUrl);
      }
    }
  };

  const drawGPSWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number, mapImg: HTMLImageElement | null) => {
    const boxMargin = 15; 
    const boxPadding = 15; 
    const boxWidth = width - (boxMargin * 2);
    
    const titleFontSize = Math.max(16, Math.floor(width * 0.03));
    const detailFontSize = Math.max(12, Math.floor(width * 0.022));
    const lineSpacing = detailFontSize + 8; 

    const mapSize = Math.floor(lineSpacing * 3.8); 
    const boxHeight = (boxPadding * 2) + titleFontSize + 12 + mapSize;
    const boxY = boxMargin; 
    
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    if (ctx.roundRect) {
      ctx.roundRect(boxMargin, boxY, boxWidth, boxHeight, 15);
    } else {
      ctx.fillRect(boxMargin, boxY, boxWidth, boxHeight);
    }
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.fillText(locationInfo.title, boxMargin + boxPadding, boxY + boxPadding + titleFontSize);

    const mapX = boxMargin + boxPadding;
    const mapY = boxY + boxPadding + titleFontSize + 12;
    const textX = mapX + mapSize + 15;
    let textY = mapY + detailFontSize - 2; 

    if (mapImg) {
      ctx.drawImage(mapImg, mapX, mapY, mapSize, mapSize);
      
      ctx.beginPath();
      ctx.arc(mapX + (mapSize/2), mapY + (mapSize/2), mapSize * 0.06, 0, 2 * Math.PI); 
      ctx.fillStyle = "#ff0000";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      
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
    ctx.fillText("Note : Captured by EV Surveyor App", textX, textY);
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-gray-900 min-h-screen text-white flex flex-col items-center justify-center">
      <h1 className="text-xl font-bold mb-2 text-center">
        Kamera Survey EV
      </h1>

      {/* Kamera dibiarkan menyala di latar belakang (hidden) agar instan saat diulang */}
      <div className={`relative w-full bg-black rounded-lg overflow-hidden flex justify-center items-center shadow-xl border border-gray-700 ${capturedImage ? 'hidden' : 'block'}`}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className="w-full h-auto"
        />
        <img 
          src={finalFilterPath} 
          alt="Filter Marking" 
          className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none opacity-85"
        />
      </div>

      {/* Tampilan Hasil Foto */}
      {capturedImage && (
        <div className="w-full rounded-lg overflow-hidden border-2 border-green-500 shadow-xl">
          <img src={capturedImage} alt="Hasil Jepretan" className="w-full h-auto" />
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />

      {/* Menu Pilihan Tipe & Jumlah */}
      <div className="w-full mt-4 space-y-3">
        {!capturedImage ? (
          <>
            <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
              <div className="mb-3">
                <label className="text-xs text-gray-400 block mb-1">Pilih Tipe Unit</label>
                <select 
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                  className="w-full bg-gray-700 text-white text-sm font-bold p-2.5 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="DC60">DC 60</option>
                  <option value="DC20">DC 20</option>
                  <option value="BSS6">BSS 6</option>
                  <option value="BSS12">BSS 12</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Jumlah Unit:</label>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      onClick={() => setUnitCount(num)}
                      className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all shadow-md ${
                        unitCount === num 
                          ? "bg-blue-500 text-white border-2 border-blue-300 scale-105" 
                          : "bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600"
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button 
              onClick={handleCapture}
              className="w-full bg-blue-600 py-4 rounded-xl font-bold text-lg hover:bg-blue-500 transition-all shadow-lg flex justify-center items-center gap-2"
            >
              📸 {unitCount}x {unitType}
            </button>
          </>
        ) : (
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setCapturedImage(null)} // Tidak butuh startCamera lagi karena video hanya di-hidden
              className="flex-1 bg-gray-700 py-3 rounded-lg font-bold hover:bg-gray-600"
            >
              🔄 Ulangi
            </button>
            <a 
              href={capturedImage}
              download={`Survey_${unitType}_${unitCount}Unit.png`}
              className="flex-1 bg-green-600 py-3 rounded-lg font-bold text-center hover:bg-green-500 shadow-lg"
            >
              ⬇️ Simpan Foto
            </a>
          </div>
        )}
      </div>
      
      <a href="/" className="mt-6 block text-center text-sm text-gray-400 hover:text-white underline pb-4">
        ⬅ Kembali ke Form Laporan
      </a>
    </div>
  );
}