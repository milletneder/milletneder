'use client';

import { useEffect, useRef } from 'react';

export default function KreosusWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Widget div'ini oluştur
    const widget = document.createElement('div');
    widget.id = 'kreosus';
    widget.setAttribute('data-id', '5427');
    widget.setAttribute('data-start-page', '0');
    widget.setAttribute('data-bg-color', 'ffffff');
    widget.setAttribute('data-iframe-api', 'true');
    containerRef.current.appendChild(widget);

    // Script zaten yüklüyse tekrar ekleme
    if (!document.getElementById('kreosus-iframe-api')) {
      const script = document.createElement('script');
      script.id = 'kreosus-iframe-api';
      script.src = 'https://kreosus.com/public/kreosus/iframe/js/iframe-api.js';
      document.body.appendChild(script);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []);

  return <div ref={containerRef} />;
}
