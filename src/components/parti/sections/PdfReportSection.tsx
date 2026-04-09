'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Download, Loader2, FileText } from 'lucide-react';
import { useDashboard } from '../PartyDashboardProvider';
import { OverviewSection } from './OverviewSection';
import { MapSection } from './MapSection';
import { CompetitorSection } from './CompetitorSection';
import { VoterProfileSection } from './VoterProfileSection';
import { VoterFlowSection } from './VoterFlowSection';
import { RegionalSection } from './RegionalSection';
import { WeaknessSection } from './WeaknessSection';
import { StrengthSection } from './StrengthSection';
import { ProjectionSection } from './ProjectionSection';
import { InsightsSection } from './InsightsSection';

type SectionKey =
  | 'overview'
  | 'map'
  | 'competitor'
  | 'voterProfile'
  | 'voterFlow'
  | 'regional'
  | 'weakness'
  | 'strength'
  | 'projection'
  | 'insights';

const SECTIONS: Array<{ key: SectionKey; label: string; description: string; component: React.ComponentType }> = [
  { key: 'overview', label: 'Genel Bakis', description: 'KPI kartlari ve performans trendi', component: OverviewSection },
  { key: 'map', label: 'Harita', description: 'Cografi performans haritasi', component: MapSection },
  { key: 'competitor', label: 'Rakip Karsilastirma', description: 'Secili rakiplerle yan yana', component: CompetitorSection },
  { key: 'voterProfile', label: 'Secmen Profili', description: 'Demografik breakdown', component: VoterProfileSection },
  { key: 'voterFlow', label: 'Kayip / Kazanc', description: '2023\'ten bu tura oy akisi', component: VoterFlowSection },
  { key: 'regional', label: 'Bolgesel', description: '7 Turkiye bolgesinde performans', component: RegionalSection },
  { key: 'weakness', label: 'Zayif Noktalar', description: 'Ulusal ortalamanin altinda', component: WeaknessSection },
  { key: 'strength', label: 'Guclu Noktalar', description: 'Ulusal ortalamanin ustunde', component: StrengthSection },
  { key: 'projection', label: 'Projeksiyon', description: 'D\'Hondt sandalye projeksiyonu', component: ProjectionSection },
  { key: 'insights', label: 'Uyarilar ve Icgoruler', description: 'Kural tabanli uyari feed', component: InsightsSection },
];

const DEFAULT_SELECTED: SectionKey[] = ['overview', 'regional', 'voterProfile', 'projection'];

export function PdfReportSection() {
  const { partyInfo } = useDashboard();
  const [selected, setSelected] = useState<Set<SectionKey>>(new Set(DEFAULT_SELECTED));
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState('');
  const [mounted, setMounted] = useState(false);
  const renderAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggle(key: SectionKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(SECTIONS.map((s) => s.key)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  async function handleDownload() {
    if (selected.size === 0) return;
    if (!renderAreaRef.current) return;

    setRendering(true);
    setProgress('PDF olusturuluyor...');

    try {
      // Dinamik import — istemci tarafinda tembel yuklenir
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // Gizli render alanindaki her section'un kartini ayri ayri canvasa cevir
      const sectionNodes = Array.from(
        renderAreaRef.current.querySelectorAll<HTMLElement>('[data-pdf-section]'),
      );

      if (sectionNodes.length === 0) {
        setProgress('Icerik bulunamadi');
        setRendering(false);
        return;
      }

      // A4 portre: 210 x 297 mm
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;

      // Baslik sayfasi
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('milletneder.com', margin, 30);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Parti Panel Raporu', margin, 40);

      if (partyInfo?.name) {
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(partyInfo.name, margin, 60);
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120);
      pdf.text(
        `Olusturma tarihi: ${new Date().toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        margin,
        70,
      );
      pdf.setTextColor(0);

      let isFirstPage = true;

      for (let i = 0; i < sectionNodes.length; i++) {
        const node = sectionNodes[i];
        const sectionKey = node.dataset.pdfSection as SectionKey;
        const sectionMeta = SECTIONS.find((s) => s.key === sectionKey);
        const label = sectionMeta?.label || sectionKey;

        setProgress(`${label} render ediliyor (${i + 1}/${sectionNodes.length})...`);

        const canvas = await html2canvas(node, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addPage();
        isFirstPage = false;

        // Section basligi
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(label, margin, 18);
        pdf.setDrawColor(200);
        pdf.line(margin, 22, pageWidth - margin, 22);

        const imgData = canvas.toDataURL('image/png');
        const maxImgHeight = pageHeight - 30 - margin;

        if (imgHeight <= maxImgHeight) {
          pdf.addImage(imgData, 'PNG', margin, 28, imgWidth, imgHeight);
        } else {
          // Cok yuksek: olcekle
          const scaledHeight = maxImgHeight;
          const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
          const xOffset = (pageWidth - scaledWidth) / 2;
          pdf.addImage(imgData, 'PNG', xOffset, 28, scaledWidth, scaledHeight);
        }
      }

      // Ilk bos sayfayi (baslik) koruyacak sekilde bitir
      void isFirstPage;

      const filename = `milletneder-${partyInfo?.short_name || 'parti'}-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdf.save(filename);

      setProgress('PDF indirildi');
      setTimeout(() => setProgress(''), 2000);
    } catch (e) {
      console.error(e);
      setProgress(e instanceof Error ? e.message : 'Hata olustu');
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">PDF Rapor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Panelinizin secili bolumlerini beyaz zeminli tek bir PDF olarak indirin.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base">Bolumler</CardTitle>
              <CardDescription>Raporunuzda yer almasini istediginiz bolumleri secin</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll} disabled={rendering}>
                Tumu
              </Button>
              <Button variant="outline" size="sm" onClick={clearAll} disabled={rendering}>
                Temizle
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SECTIONS.map((s) => (
              <label
                key={s.key}
                className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={selected.has(s.key)}
                  onCheckedChange={() => toggle(s.key)}
                  disabled={rendering}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium cursor-pointer">{s.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={handleDownload} disabled={rendering || selected.size === 0}>
          {rendering ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1.5" />
          )}
          {rendering ? 'Hazirlaniyor...' : `${selected.size} Bolum icin PDF Indir`}
        </Button>
        {progress && (
          <Badge variant="outline" className="text-xs">
            {progress}
          </Badge>
        )}
      </div>

      <Card>
        <CardContent className="pt-6 flex items-start gap-3">
          <FileText className="size-5 shrink-0 text-muted-foreground mt-0.5" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong className="text-foreground">Nasil calisir:</strong> Istemci tarafinda
              her secili bolum ayri ayri render edilir, A4 kagit olculerine gore PDF'e
              dondurulur.
            </p>
            <p>
              Logo, harita ve grafikler beyaz zeminde, resmi rapor formatinda. Ilk sayfada
              parti adi ve olusturma tarihi yer alir.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gizli render alani — PDF icerigi buradan cikarilir */}
      {mounted && (
        <div
          ref={renderAreaRef}
          aria-hidden="true"
          style={{
            position: 'fixed',
            left: '-10000px',
            top: 0,
            width: '900px',
            padding: '24px',
            backgroundColor: '#ffffff',
            color: '#000000',
          }}
        >
          {SECTIONS.filter((s) => selected.has(s.key)).map((s) => {
            const Component = s.component;
            return (
              <div
                key={s.key}
                data-pdf-section={s.key}
                style={{ marginBottom: '48px', backgroundColor: '#ffffff' }}
              >
                <Component />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
