import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DadosFiscaisSectionProps {
  ncm?: string;
  cfop?: string;
  aliquotaIss?: number;
  aliquotaIcms?: number;
  cstIcms?: string;
  onChange: (field: string, value: any) => void;
}

interface NCMComum {
  codigo: string;
  descricao: string;
  aliquota_iss_padrao: number;
  aliquota_icms_padrao: number;
}

export function DadosFiscaisSection({
  ncm,
  cfop,
  aliquotaIss = 5.0,
  aliquotaIcms = 18.0,
  cstIcms,
  onChange,
}: DadosFiscaisSectionProps) {
  const [ncmsComuns, setNcmsComuns] = useState<NCMComum[]>([]);
  const [buscandoNCM, setBuscandoNCM] = useState(false);

  useEffect(() => {
    carregarNCMsComuns();
  }, []);

  const carregarNCMsComuns = async () => {
    const { data } = await (supabase as any)
      .from('ncm_comuns')
      .select('*')
      .eq('ativo', true)
      .order('descricao');
    
    if (data) setNcmsComuns(data);
  };

  const aplicarNCMComum = (ncmData: NCMComum) => {
    onChange('ncm', ncmData.codigo);
    onChange('aliquota_iss', ncmData.aliquota_iss_padrao);
    onChange('aliquota_icms', ncmData.aliquota_icms_padrao);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados Fiscais e Contábeis</CardTitle>
        <CardDescription>
          Classificação fiscal e tributária do equipamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {ncmsComuns.length > 0 && (
          <div className="space-y-2">
            <Label>NCMs Comuns (Atalho)</Label>
            <Select onValueChange={(codigo) => {
              const ncmSelecionado = ncmsComuns.find(n => n.codigo === codigo);
              if (ncmSelecionado) aplicarNCMComum(ncmSelecionado);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um NCM comum..." />
              </SelectTrigger>
              <SelectContent>
                {ncmsComuns.map(ncmItem => (
                  <SelectItem key={ncmItem.codigo} value={ncmItem.codigo}>
                    {ncmItem.codigo} - {ncmItem.descricao}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ncm">NCM (Nomenclatura Comum)</Label>
            <Input
              id="ncm"
              placeholder="Ex: 8428.90.90"
              value={ncm || ''}
              onChange={(e) => onChange('ncm', e.target.value)}
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cfop">CFOP</Label>
            <Input
              id="cfop"
              placeholder="Ex: 5.102"
              value={cfop || ''}
              onChange={(e) => onChange('cfop', e.target.value)}
              maxLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aliquota_iss">Alíquota ISS (%)</Label>
            <Input
              id="aliquota_iss"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="5.00"
              value={aliquotaIss || ''}
              onChange={(e) => onChange('aliquota_iss', e.target.value ? parseFloat(e.target.value) : 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="aliquota_icms">Alíquota ICMS (%)</Label>
            <Input
              id="aliquota_icms"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="18.00"
              value={aliquotaIcms || ''}
              onChange={(e) => onChange('aliquota_icms', e.target.value ? parseFloat(e.target.value) : 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cst_icms">CST ICMS</Label>
            <Select value={cstIcms || ''} onValueChange={(v) => onChange('cst_icms', v)}>
              <SelectTrigger id="cst_icms">
                <SelectValue placeholder="Selecione o CST" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="00">00 - Tributada integralmente</SelectItem>
                <SelectItem value="10">10 - Tributada com cobrança de ICMS ST</SelectItem>
                <SelectItem value="20">20 - Com redução de BC</SelectItem>
                <SelectItem value="30">30 - Isenta ou não tributada com cobrança ST</SelectItem>
                <SelectItem value="40">40 - Isenta</SelectItem>
                <SelectItem value="41">41 - Não tributada</SelectItem>
                <SelectItem value="50">50 - Suspensão</SelectItem>
                <SelectItem value="51">51 - Diferimento</SelectItem>
                <SelectItem value="60">60 - ICMS cobrado anteriormente por ST</SelectItem>
                <SelectItem value="70">70 - Com redução de BC e cobrança ST</SelectItem>
                <SelectItem value="90">90 - Outras</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Consulte sempre seu contador para validar as classificações fiscais
        </p>
      </CardContent>
    </Card>
  );
}
