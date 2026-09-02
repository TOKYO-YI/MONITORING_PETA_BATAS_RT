import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Image as ImageIcon, Map as MapIcon, Loader2 } from 'lucide-react';
import { supabase, isImageFile, isPdfFile, isGeoFile, type PetaRow } from '@/lib/supabase';
import type * as L from 'leaflet';

type MapPreviewProps = {
  peta: PetaRow;
};

export function MapPreview({ peta }: MapPreviewProps) {
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      // For placeholder paths (seed data), there's no actual file in storage
      if (peta.file_path.startsWith('placeholder/')) {
        if (!cancelled) {
          setPublicUrl(null);
          setLoading(false);
        }
        return;
      }

      const { data } = supabase.storage.from('peta').getPublicUrl(peta.file_path);
      if (!cancelled) setPublicUrl(data.publicUrl);

      if (isGeoFile(peta.file_type) && peta.file_type === 'geojson') {
        try {
          const { data: fileData, error } = await supabase.storage.from('peta').download(peta.file_path);
          if (!error && fileData) {
            const text = await fileData.text();
            if (!cancelled) setGeoData(text);
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [peta.file_path, peta.file_type]);

  // Render Leaflet map for GeoJSON
  useEffect(() => {
    if (!geoData || !mapRef.current) return;

    let mounted = true;

    import('leaflet').then((leaflet) => {
      if (!mounted || !mapRef.current) return;

      if (leafletMap.current) {
        leafletMap.current.remove();
      }

      const map = leaflet.default.map(mapRef.current).setView([-6.2, 106.8], 13);
      leafletMap.current = map;

      leaflet.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      try {
        const geo = JSON.parse(geoData);
        const layer = leaflet.default.geoJSON(geo, {
          style: { color: '#0d9488', weight: 3, fillOpacity: 0.15 },
        });
        layer.addTo(map);
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
      } catch {
        // invalid geojson
      }

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      mounted = false;
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [geoData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-50 rounded-lg dark:bg-slate-700">
        <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" size={28} />
      </div>
    );
  }

  // Placeholder seed data — no actual file
  if (!publicUrl) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 text-center dark:bg-slate-700">
        <FileText className="text-slate-400 dark:text-slate-500" size={32} />
        <p className="text-sm text-slate-500 dark:text-slate-400">Preview tidak tersedia untuk file ini.</p>
        <p className="text-xs text-slate-400 dark:text-slate-500">Silakan ganti dengan file asli.</p>
      </div>
    );
  }

  // Image preview
  if (isImageFile(peta.file_type)) {
    return (
      <div className="overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-700">
        <img src={publicUrl} alt={peta.nama_file} className="mx-auto max-h-[500px] object-contain" />
      </div>
    );
  }

  // PDF preview
  if (isPdfFile(peta.file_type)) {
    return (
      <div className="overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-700">
        <iframe src={publicUrl} title={peta.nama_file} className="h-[500px] w-full border-0" />
      </div>
    );
  }

  // GeoJSON preview with Leaflet
  if (isGeoFile(peta.file_type) && geoData) {
    return <div ref={mapRef} className="h-96 w-full rounded-lg" />;
  }

  // KML/KMZ — try iframe, but likely needs download
  if (isGeoFile(peta.file_type)) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 text-center dark:bg-slate-700">
        <MapIcon className="text-slate-400 dark:text-slate-500" size={32} />
        <p className="text-sm text-slate-500 dark:text-slate-400">Preview tidak tersedia untuk format {peta.file_type.toUpperCase()}.</p>
        <a
          href={publicUrl}
          download={peta.original_filename}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
        >
          <Download size={16} /> Download File
        </a>
      </div>
    );
  }

  // GIS files (tif, shp, zip, etc.) — no browser preview
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg bg-slate-50 text-center dark:bg-slate-700">
      <ImageIcon className="text-slate-400 dark:text-slate-500" size={32} />
      <p className="text-sm text-slate-500 dark:text-slate-400">Preview tidak tersedia untuk format {peta.file_type.toUpperCase()}.</p>
      <a
        href={publicUrl}
        download={peta.original_filename}
        className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
      >
        <Download size={16} /> Download File
      </a>
    </div>
  );
}
