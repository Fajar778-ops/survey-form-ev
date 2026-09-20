"use client";
import { useState } from "react";

export default function SurveyForm() {
  const [formData, setFormData] = useState({
    subyek: "", proyek: "", no_laporan: "", Lokasi: "", tanggal: "",
    alamat: "", surveyor: "", waktu_mulai: "", waktu_selesai: "",
    pic_nama: "", pic_hp: "", jenis_instalasi: "Pasang Baru [33 KVA] 1 Unit",
    arus_Listrik: "AC", sumber_Listrik: "SDP", vol_nyy_panel: "",
    vol_power_panel: "", vol_nyy_charging: "", vol_bc16: "",
    vol_bc50: "", vol_bc70: "", vol_grounding_rod: "", catatan: "",
  });

  const [images, setImages] = useState({
    foto_lokasi: null as File | null,
    foto_kwh: null as File | null,
    foto_area: null as File | null,
    foto_exkwh: null as File | null,
    foto_cctv: null as File | null,
    foto_jalur: null as File | null,
  });

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: any) => {
    setImages({ ...images, [e.target.name]: e.target.files?.[0] || null });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    alert("Memproses dokumen, mohon tunggu...");

    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => payload.append(key, value));
    Object.entries(images).forEach(([key, file]) => {
      if (file) payload.append(key, file);
    });

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        body: payload,
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Survey_${formData.proyek || "Report"}.docx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        alert("Gagal men-generate dokumen.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-gray-800 shadow-md rounded-md mt-10 mb-10">
      <h1 className="text-2xl font-bold text-center mb-6">Form Site Survey Report</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* BAGIAN 1: COVER */}
        <div className="p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">1. Cover & Info Umum</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold">Subyek</label><input type="text" name="subyek" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">Proyek</label><input type="text" name="proyek" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">No. Laporan</label><input type="text" name="no_laporan" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">Lokasi/Site</label><input type="text" name="Lokasi" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">Tanggal</label><input type="date" name="tanggal" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">Nama Surveyor</label><input type="text" name="surveyor" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">Waktu Mulai</label><input type="time" name="waktu_mulai" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">Waktu Selesai</label><input type="time" name="waktu_selesai" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Alamat Lengkap</label>
              <textarea name="alamat" onChange={handleChange} className="w-full border p-2 rounded" rows={2}></textarea>
            </div>
          </div>
        </div>

        {/* BAGIAN 2: DATA TEKNIS & KABEL */}
        <div className="p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">2. Data Teknis & BoQ</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div><label className="text-sm font-semibold">Nama PIC</label><input type="text" name="pic_nama" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div><label className="text-sm font-semibold">No. HP PIC</label><input type="text" name="pic_hp" onChange={handleChange} className="w-full border p-2 rounded" /></div>
            <div>
              <label className="text-sm font-semibold">Jenis Instalasi</label>
              <select name="jenis_instalasi" onChange={handleChange} className="w-full border p-2 rounded text-sm">
                <option value="Pasang Baru [33 KVA] 1 Unit">Pasang Baru</option><option value="Vgreen">Vgreen</option><option value="Tambah Daya">Tambah Daya</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Arus Listrik</label>
              <select name="arus_Listrik" onChange={handleChange} className="w-full border p-2 rounded text-sm">
                <option value="AC">AC</option><option value="DC">DC</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">Sumber Listrik</label>
              <select name="sumber_Listrik" onChange={handleChange} className="w-full border p-2 rounded text-sm">
                <option value="SDP">SDP</option><option value="kWh Meter">kWh Meter</option><option value="BOX PANEL">BOX PANEL</option>
              </select>
            </div>
          </div>
          
          {/* INPUT MATERIAL KABEL KEMBALI */}
          <h3 className="font-bold text-sm mt-6 mb-2 bg-gray-200 p-2 rounded">Volume Material (Isi Angka)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><label>NYY 4x16mm (Panel)</label><input type="number" name="vol_nyy_panel" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Meter"/></div>
            <div><label>Power Panel</label><input type="number" name="vol_power_panel" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Lot"/></div>
            <div><label>NYY 4x16mm (Charging)</label><input type="number" name="vol_nyy_charging" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Meter"/></div>
            <div><label>BC 16mm</label><input type="number" name="vol_bc16" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Meter"/></div>
            <div><label>BC 50mm</label><input type="number" name="vol_bc50" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Meter"/></div>
            <div><label>BC 70mm</label><input type="number" name="vol_bc70" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Meter"/></div>
            <div><label>Grounding Rod</label><input type="number" name="vol_grounding_rod" onChange={handleChange} className="w-full border p-2 rounded" placeholder="Set"/></div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-semibold">Catatan Surveyor</label>
            <textarea name="catatan" onChange={handleChange} className="w-full border p-2 rounded" rows={2}></textarea>
          </div>
        </div>

        {/* BAGIAN 3: DOKUMENTASI */}
        <div className="p-4 border rounded bg-gray-50">
          <h2 className="text-lg font-semibold mb-4 border-b pb-2">3. Dokumentasi (Harus JPG/PNG)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 border rounded bg-white"><label className="block text-xs font-bold mb-1">Documentation Location</label><input type="file" accept=".jpg,.jpeg,.png" name="foto_lokasi" onChange={handleImageChange} className="text-sm w-full" /></div>
            <div className="p-3 border rounded bg-white"><label className="block text-xs font-bold mb-1">Propose KWH & AC Combanner</label><input type="file" accept=".jpg,.jpeg,.png" name="foto_kwh" onChange={handleImageChange} className="text-sm w-full" /></div>
            <div className="p-3 border rounded bg-white"><label className="block text-xs font-bold mb-1">Area Charging Photo</label><input type="file" accept=".jpg,.jpeg,.png" name="foto_area" onChange={handleImageChange} className="text-sm w-full" /></div>
            <div className="p-3 border rounded bg-white"><label className="block text-xs font-bold mb-1">Existing KWH Photo</label><input type="file" accept=".jpg,.jpeg,.png" name="foto_exkwh" onChange={handleImageChange} className="text-sm w-full" /></div>
            <div className="p-3 border rounded bg-white"><label className="block text-xs font-bold mb-1">CCTV Cover Lot Parking</label><input type="file" accept=".jpg,.jpeg,.png" name="foto_cctv" onChange={handleImageChange} className="text-sm w-full" /></div>
            <div className="p-3 border rounded bg-white"><label className="block text-xs font-bold mb-1">EV Cable Wiring to Combanner</label><input type="file" accept=".jpg,.jpeg,.png" name="foto_jalur" onChange={handleImageChange} className="text-sm w-full" /></div>
          </div>
        </div>

        <div className="text-center">
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded shadow w-full md:w-auto">
            Generate Document (DOCX)
          </button>
        </div>
      </form>
    </div>
  );
}