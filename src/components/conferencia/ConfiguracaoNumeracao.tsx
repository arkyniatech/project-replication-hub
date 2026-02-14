import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Eye, RotateCcw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  getNumberingConfig,
  setNumberingConfig,
  buildDisplayNo,
  type NumberingConfig
} from "@/lib/session-numbering";

export function ConfiguracaoNumeracao() {
  const { toast } = useToast();
  const [config, setConfig] = useState<NumberingConfig>(() => getNumberingConfig());
  const [preview, setPreview] = useState<string>("");

  // Gerar preview sempre que a configuração mudar
  useEffect(() => {
    try {
      const previewNo = buildDisplayNo({
        lojaCodigo: "SP",
        yyyymmdd: "20250920",
        seq: 5,
        config
      });
      setPreview(previewNo);
    } catch (error) {
      setPreview("Erro no formato");
    }
  }, [config]);

  const handleSave = () => {
    try {
      setNumberingConfig(config);
      toast({
        title: "Configuração salva",
        description: "As alterações serão aplicadas apenas para novas sessões"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    const defaultConfig: NumberingConfig = {
      prefixo: 'CE',
      larguraSequencial: 2,
      mascara: 'PADRAO'
    };
    setConfig(defaultConfig);
  };

  const generateExamples = () => {
    const examples = [];
    for (let i = 1; i <= 3; i++) {
      try {
        const example = buildDisplayNo({
          lojaCodigo: "SP",
          yyyymmdd: "20250920",
          seq: i,
          config
        });
        examples.push(example);
      } catch (error) {
        examples.push(`Erro ${i}`);
      }
    }
    return examples;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Configuração de Numeração
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure o formato dos números das sessões de conferência de estoque.
            As alterações se aplicam apenas a novas sessões.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Configurações */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prefixo">Prefixo</Label>
              <Input
                id="prefixo"
                value={config.prefixo}
                onChange={(e) => setConfig(prev => ({ ...prev, prefixo: e.target.value.toUpperCase() }))}
                placeholder="CE"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Prefixo identificador (ex: CE, EST, CNF)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="largura">Largura do Sequencial</Label>
              <Select
                value={config.larguraSequencial.toString()}
                onValueChange={(value) => setConfig(prev => ({ 
                  ...prev, 
                  larguraSequencial: parseInt(value) 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2 dígitos (01, 02, ...)</SelectItem>
                  <SelectItem value="3">3 dígitos (001, 002, ...)</SelectItem>
                  <SelectItem value="4">4 dígitos (0001, 0002, ...)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mascara">Formato da Máscara</Label>
              <Select
                value={config.mascara}
                onValueChange={(value: 'PADRAO' | 'ALTERNATIVA') => 
                  setConfig(prev => ({ ...prev, mascara: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PADRAO">
                    Padrão: {config.prefixo}-LOJA-AAAAMMDD-SEQ
                  </SelectItem>
                  <SelectItem value="ALTERNATIVA">
                    Alternativo: AAAA/MM/DD-LOJA-SEQ
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <Label>Preview do Formato</Label>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-muted-foreground">Próxima sessão:</span>
                <Badge variant="outline" className="font-mono">
                  {preview}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Exemplos sequenciais:</p>
                <div className="flex gap-2 flex-wrap">
                  {generateExamples().map((example, index) => (
                    <Badge key={index} variant="secondary" className="font-mono text-xs">
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar Padrão
            </Button>

            <Button onClick={handleSave} className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Salvar Configuração
            </Button>
          </div>

          {/* Informações adicionais */}
          <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
            <p><strong>Tokens disponíveis:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-0.5">
              <li><code>LOJA</code>: Código normalizado da loja (máx. 6 chars, sem espaços/acentos)</li>
              <li><code>AAAA/MM/DD</code>: Data de criação da sessão</li>
              <li><code>SEQ</code>: Sequencial diário por loja (reinicia a cada dia)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}